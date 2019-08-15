-- +goose Up
ALTER TABLE article ADD user_id int(10) UNSIGNED DEFAULT NULL;
ALTER TABLE article ADD CONSTRAINT article_fk_user FOREIGN KEY (user_id) REFERENCES user(id);