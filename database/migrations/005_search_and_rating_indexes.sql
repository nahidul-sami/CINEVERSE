CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS movies_title_trgm_idx
    ON movies USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS movies_description_trgm_idx
    ON movies USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS movie_genres_genre_movie_idx
    ON movie_genres (genre_id, movie_id);

UPDATE movies AS m
SET average_rating = (
    SELECT ROUND(AVG(r.rating), 2)
    FROM reviews AS r
    WHERE r.movie_id = m.movie_id
);