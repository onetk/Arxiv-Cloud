-- +goose Up
CREATE TABLE article_tag (
  id int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id int(10) UNSIGNED NOT NULL,
  tag VARCHAR(255) NOT NULL,
  ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT article_tag_fk_article FOREIGN KEY (article_id) REFERENCES article (id) on delete cascade on update cascade
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- +goose Down
DROP TABLE article_tag;