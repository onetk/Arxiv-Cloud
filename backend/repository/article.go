package repository

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/voyagegroup/treasure-app/model"
)

func AllArticle(db *sqlx.DB) ([]model.Article, error) {
	fmt.Println("ok")
	a := make([]model.Article, 0)
	if err := db.Select(&a, `SELECT id, title, body, user_id FROM article`); err != nil {
		return nil, err
	}
	return a, nil
}

func AllTag(db *sqlx.DB) ([]model.ArticleTag, error) {
	a := make([]model.ArticleTag, 0)

	if err := db.Select(&a, `SELECT id, article_id, tag FROM article_tag`); err != nil {
		return nil, err
	}

	return a, nil
}



func FindArticleByTag(db *sqlx.DB, tag string) ([]model.Article, error) {
	a := make([]model.Article, 0)
	if err := db.Select(&a,
		` SELECT
				article.id, title, body, user_id, article.tag
			FROM
				article
					INNER JOIN
						article_tag
						ON
							article.id = article_tag.article_id
			WHERE
				article_tag.tag= ? `, tag); err != nil {
		return nil, err
	}
	return a, nil
}

func FindArticle(db *sqlx.DB, id int64) (*model.Article, error) {
	a := model.Article{}
	if err := db.Get(&a, `
SELECT id, title, body FROM article WHERE id = ?
`, id); err != nil {
		return nil, err
	}
	return &a, nil
}

func CreateArticle(db *sqlx.Tx, a *model.Article) (sql.Result, error) {
	stmt, err := db.Prepare(`
INSERT INTO article (user_id, title, body) VALUES (?, ?, ?)
`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()
	return stmt.Exec(a.UserID, a.Title, a.Body)
}

func UpdateArticle(db *sqlx.Tx, id int64, a *model.Article) (sql.Result, error) {
	stmt, err := db.Prepare(`
UPDATE article SET title = ?, body = ? WHERE id = ?
`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()
	return stmt.Exec(a.Title, a.Body, id)
}

func DestroyArticle(db *sqlx.Tx, id int64) (sql.Result, error) {
	stmt, err := db.Prepare(`
DELETE FROM article WHERE id = ?
`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()
	return stmt.Exec(id)
}

func DestroyAllArticle(db *sqlx.Tx) (sql.Result, error) {
	fmt.Println("-- ↓↓↓ --  before  -- ↓↓↓ --")

	a := make([]model.Article, 0)
	if err := db.Select(&a, `SELECT id, title, body, user_id FROM article`); err != nil {
		return nil, err
	}
	fmt.Println(a)
	fmt.Println("--  before  -- / --  after --")

	stmt, err := db.Prepare(`
DELETE FROM article
`)
	if err != nil {
		return nil, err
	}

	b := make([]model.Article, 0)
	if err := db.Select(&b, `SELECT id, title, body, user_id FROM article`); err != nil {
		return nil, err
	}
	fmt.Println(b)
	fmt.Println("-- ↑↑↑ --  after  -- ↑↑↑ --")
	defer stmt.Close()
	return stmt.Exec()
}

func CreateArticleComment(db *sqlx.Tx, a *model.ArticleComment) (sql.Result, error) {
	stmt, err := db.Prepare(`
INSERT INTO article_comment (user_id, article_id, body) VALUES (?, ?, ?)
`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()
	return stmt.Exec(a.UserID, a.ArticleID, a.Body)
}

func CreateArticleTag(db *sqlx.Tx, a *model.ArticleTag) (sql.Result, error) {
	stmt, err := db.Prepare(`
INSERT INTO article_tag (article_id, tag) VALUES (?, ?)
`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()
	return stmt.Exec(a.ArticleID, a.Tag)
}
