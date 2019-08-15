-- +goose Up
CREATE TABLE article_tag (
  article_id int(10) UNSIGNED NOT NULL,
  tag_id int(10) UNSIGNED NOT NULL,
  ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, tag_id),
  CONSTRAINT article_tag_fk_article FOREIGN KEY (article_id) REFERENCES article (id),
  CONSTRAINT article_tag_fk_tag FOREIGN KEY (tag_id) REFERENCES tag (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;