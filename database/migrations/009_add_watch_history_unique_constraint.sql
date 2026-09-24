DELETE FROM watch_history older
USING watch_history newer
WHERE older.user_id = newer.user_id
  AND older.movie_id = newer.movie_id
  AND older.watched_at < newer.watched_at;

ALTER TABLE watch_history
    ADD CONSTRAINT unique_user_movie_history
    UNIQUE (user_id, movie_id);
