package model

type ArticleTag struct {
	ID        int64  `db:"id" json:"id"`
	ArticleID int64  `db:"article_id" json:"article_id"`
	Tag       string `db:"tag" json:"tag"`
}

type ArticleComment struct {
	ID        int64  `db:"id" json:"id"`
	Body      string `db:"body" json:"body"`
	UserID    *int64 `db:"user_id" json:"user_id"`
	ArticleID int64  `db:"article_id" json:"article_id"`
}

type Article struct {
	ID        int64   `db:"id" json:"id"`
	Title     string  `db:"title" json:"title"`
	Body      string  `db:"body" json:"body"`
	UserID    *int64  `db:"user_id" json:"user_id"`
	ArticleID int64   `db:"article_id" json:"article_id"`
	Tag       *string `db:"tag" json:"tag"`
}
