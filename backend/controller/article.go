package controller

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"cloud.google.com/go/translate"
	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"golang.org/x/net/html"
	"golang.org/x/text/language"

	"github.com/voyagegroup/treasure-app/httputil"
	"github.com/voyagegroup/treasure-app/model"
	"github.com/voyagegroup/treasure-app/repository"
	"github.com/voyagegroup/treasure-app/service"
)

type Paper struct {
	Title    string
	Abstract string
}

type Result struct {
	Keyphrase string `xml:"Keyphrase"`
	Score     string `xml:"Score"`
}

type Article struct {
	dbx *sqlx.DB
}

type ArticleComment struct {
	dbx *sqlx.DB
}

type ArticleTag struct {
	dbx *sqlx.DB
}

func NewArticle(dbx *sqlx.DB) *Article {
	return &Article{dbx: dbx}
}

func NewArticleComment(dbx *sqlx.DB) *ArticleComment {
	return &ArticleComment{dbx: dbx}
}

func NewArticleTag(dbx *sqlx.DB) *ArticleTag {
	return &ArticleTag{dbx: dbx}
}

func (a *Article) Index(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	articles, err := repository.AllArticle(a.dbx)
	if err != nil {
		return http.StatusInternalServerError, nil, err
	}
	// fmt.Println(reflect.TypeOf(articles))
	return http.StatusOK, articles, nil
}

func (a *Article) TagIndex(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	tags, err := repository.AllTag(a.dbx)

	if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	return http.StatusOK, tags, nil
}

func searchArxiv(keyword string, limit int) (map[int][]string, error) {

	resp, err := http.Get("http://export.arxiv.org/api/query?search_query=all:" + keyword + "&start=0&max_results=" + strconv.Itoa(limit))

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := html.Parse(resp.Body)
	if err != nil {
		return nil, err
	}

	var count int = 0
	dictionary := make(map[int][]string)

	var paper Paper
	var f func(*html.Node)

	f = func(n *html.Node) {

		if n.Type == html.ElementNode && n.Data == "title" {
			paper.Title = n.FirstChild.Data
		}
		if n.Type == html.ElementNode && n.Data == "summary" {
			paper.Abstract = n.FirstChild.Data
		}
		if n.Type == html.ElementNode && n.Data == "entry" {
			dictionary[count] = []string{paper.Title, paper.Abstract}
			count++
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)
	return dictionary, nil
}

func translateText(targetLanguage, text string) (string, error) {
	ctx := context.Background()

	lang, err := language.Parse(targetLanguage)
	if err != nil {
		return "", err
	}

	client, err := translate.NewClient(ctx)
	if err != nil {
		return "", err
	}
	defer client.Close()

	resp, err := client.Translate(ctx, []string{text}, lang, nil)
	if err != nil {
		return "", err
	}
	return resp[0].Text, nil
}

func extractKeyword(text string) ([]string, error) {

	baseUrl, err := url.Parse("https://jlp.yahooapis.jp/KeyphraseService/V1/extract?")
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	params := url.Values{}
	params.Add("appid", os.Getenv("YAHOO_KEYWORD_API"))
	// params.Add("sentence", url.QueryEscape(text))
	params.Add("sentence", text)
	params.Add("output", "json")

	baseUrl.RawQuery = params.Encode()

	resp, err := http.Get(baseUrl.String())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	doc, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// やっっっっっばい
	docStrs := string(doc)[1 : len(string(doc))-1]
	docTrim := strings.Replace(docStrs, "\"", "`", -1)
	docUni8, _ := strconv.Unquote("\"" + docTrim + "\"")
	docReplace := strings.Replace(docUni8, "`", "", -1)
	docArray := strings.Split(docReplace, ",")

	return docArray, nil
}

func (a *Article) TagCreate(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {

	articles, err := repository.AllArticle(a.dbx)
	if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	keywords, err := extractKeyword(articles[2].Body)
	if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	for j := 1; j < len(keywords); j++ {
		splitKeys := strings.Split(keywords[j], ":")
		newArticleTag := &model.ArticleTag{Tag: splitKeys[0]} //, Body: splitKeys[1]}

		articleTagService := service.NewArticleTagService(a.dbx)
		id, err := articleTagService.CreateArticleTag(newArticleTag)

		if err != nil {
			return http.StatusInternalServerError, nil, err
		}
		newArticleTag.ID = id
	}

	return http.StatusOK, articles, nil
}

func (a *Article) CreatePaper(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {

	vars := r.URL.Query()
	keyword := vars["keyword"][0]

	dictionary, err := searchArxiv(keyword, 3)

	if err != nil {
		return http.StatusBadRequest, nil, err
	}

	for i := 0; i < len(dictionary); i++ {
		translated, err := translateText("ja", dictionary[i][1])
		if err != nil {
			return http.StatusBadRequest, nil, err
		}
		dictionary[i] = []string{dictionary[i][0], dictionary[i][1], translated}
	}

	if err != nil {
		return http.StatusBadRequest, nil, err
	}

	// ここでdictionaryに欠損ないか = DBに正しく入るかの処理をしたい
	for j := 1; j < len(dictionary); j++ {
		newArticle := &model.Article{Title: dictionary[j][0], Body: dictionary[j][2]}
		fmt.Println(j)
		fmt.Println(dictionary[j][0])

		// 認証無しはやばいので。。。 現状Getのクエリで対処している部分をPostでUserID付与の状態に

		// if err := json.NewDecoder(r.Body).Decode(&newArticle); err != nil {
		// 	return http.StatusBadRequest, nil, err
		// }
		// user, err := httputil.GetUserFromContext(r.Context())
		// if err != nil {
		// 	fmt.Println(err)
		// }
		// newArticle.UserID = &user.ID

		articleService := service.NewArticleService(a.dbx)
		id, err := articleService.Create(newArticle)

		if err != nil {
			return http.StatusInternalServerError, nil, err
		}
		newArticle.ID = id

		keywords, err := extractKeyword(dictionary[j][2])
		if err != nil {
			return http.StatusInternalServerError, nil, err
		}

		for k := 1; k < len(keywords); k++ {
			splitKeys := strings.Split(keywords[k], ":")
			// fmt.Println(splitKeys[0])
			dictionary[j] = append(dictionary[j], splitKeys[0])
			fmt.Println(dictionary[j])
			// fmt.Println(dictionary[j][2+j])

			newArticleTag := &model.ArticleTag{ArticleID: id, Tag: splitKeys[0]} //, Body: splitKeys[1]}

			articleTagService := service.NewArticleTagService(a.dbx)
			id, err := articleTagService.CreateArticleTag(newArticleTag)

			if err != nil {
				return http.StatusInternalServerError, nil, err
			}
			newArticleTag.ID = id
		}
		fmt.Println("ok")

	}

	fmt.Println("ok2")

	return http.StatusOK, dictionary, nil
}

func (a *Article) SearchIndex(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	vars := mux.Vars(r)
	tag, ok := vars["tag"]
	if !ok {
		return http.StatusBadRequest, nil, &httputil.HTTPError{Message: "invalid path parameter"}

	}

	articles, err := repository.SearchArticle(a.dbx, tag)
	if err != nil && err == sql.ErrNoRows {
		return http.StatusNotFound, nil, err
	} else if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	return http.StatusOK, articles, nil
}

func (a *Article) Show(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return http.StatusBadRequest, nil, &httputil.HTTPError{Message: "invalid path parameter"}
	}
	fmt.Println("show")
	aid, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return http.StatusBadRequest, nil, err
	}

	article, err := repository.FindArticle(a.dbx, aid)
	if err != nil && err == sql.ErrNoRows {
		return http.StatusNotFound, nil, err
	} else if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	return http.StatusCreated, article, nil
}

func (a *Article) Create(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	newArticle := &model.Article{}
	fmt.Println("tes")

	if err := json.NewDecoder(r.Body).Decode(&newArticle); err != nil {
		return http.StatusBadRequest, nil, err
	}

	user, err := httputil.GetUserFromContext(r.Context())
	if err != nil {
		fmt.Println(err)
	}
	newArticle.UserID = &user.ID

	articleService := service.NewArticleService(a.dbx)
	fmt.Println(newArticle)
	id, err := articleService.Create(newArticle)
	if err != nil {
		return http.StatusInternalServerError, nil, err
	}
	newArticle.ID = id

	return http.StatusCreated, newArticle, nil
}

func (a *Article) Update(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return http.StatusBadRequest, nil, &httputil.HTTPError{Message: "invalid path parameter"}
	}
	fmt.Println("update")

	aid, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return http.StatusBadRequest, nil, err
	}

	reqArticle := &model.Article{}
	if err := json.NewDecoder(r.Body).Decode(&reqArticle); err != nil {
		return http.StatusBadRequest, nil, err
	}

	articleService := service.NewArticleService(a.dbx)
	err = articleService.Update(aid, reqArticle)
	if err != nil && errors.Cause(err) == sql.ErrNoRows {
		return http.StatusNotFound, nil, err
	} else if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	return http.StatusNoContent, nil, nil
}

func (a *Article) Destroy(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		return http.StatusBadRequest, nil, &httputil.HTTPError{Message: "invalid path parameter"}
	}
	fmt.Println("destroy")

	aid, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return http.StatusBadRequest, nil, err
	}

	articleService := service.NewArticleService(a.dbx)
	err = articleService.Destroy(aid)
	if err != nil && errors.Cause(err) == sql.ErrNoRows {
		return http.StatusNotFound, nil, err
	} else if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	return http.StatusNoContent, nil, nil
}

func (a *Article) DestroyAll(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {

	articleService := service.NewArticleService(a.dbx)
	err := articleService.DestroyAll()
	if err != nil && errors.Cause(err) == sql.ErrNoRows {
		return http.StatusNotFound, nil, err
	} else if err != nil {
		return http.StatusInternalServerError, nil, err
	}

	return http.StatusNoContent, nil, nil
}

func (a *ArticleComment) CreateArticleComment(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	newArticleComment := &model.ArticleComment{}
	if err := json.NewDecoder(r.Body).Decode(&newArticleComment); err != nil {
		return http.StatusBadRequest, nil, err
	}

	user, err := httputil.GetUserFromContext(r.Context())
	if err != nil {
		fmt.Println(err)
	}
	newArticleComment.UserID = &user.ID

	articleCommentService := service.NewArticleCommentService(a.dbx)
	id, err := articleCommentService.CreateArticleComment(newArticleComment)
	if err != nil {
		return http.StatusInternalServerError, nil, err
	}
	newArticleComment.ID = id

	return http.StatusCreated, newArticleComment, nil
}

func (a *ArticleTag) CreateArticleTag(w http.ResponseWriter, r *http.Request) (int, interface{}, error) {
	newArticleTag := &model.ArticleTag{}
	if err := json.NewDecoder(r.Body).Decode(&newArticleTag); err != nil {
		return http.StatusBadRequest, nil, err
	}

	articleTagService := service.NewArticleTagService(a.dbx)
	id, err := articleTagService.CreateArticleTag(newArticleTag)
	if err != nil {
		return http.StatusInternalServerError, nil, err
	}
	newArticleTag.ID = id

	return http.StatusCreated, newArticleTag, nil
}
