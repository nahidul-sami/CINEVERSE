DELETE FROM reviews older
USING reviews newer
WHERE older.user_id = newer.user_id
  AND older.movie_id = newer.movie_id
  AND older.created_at < newer.created_at;

ALTER TABLE reviews
    ADD CONSTRAINT unique_user_movie_review
    UNIQUE (user_id, movie_id);
