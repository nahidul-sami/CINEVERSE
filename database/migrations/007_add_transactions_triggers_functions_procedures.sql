-- 1. Keep movies.average_rating synchronized with reviews.
CREATE OR REPLACE FUNCTION update_movie_average_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_movie_id INT;
BEGIN
    target_movie_id := CASE
        WHEN TG_OP = 'DELETE' THEN OLD.movie_id
        ELSE NEW.movie_id
    END;

    IF TG_OP = 'UPDATE' AND OLD.movie_id IS DISTINCT FROM NEW.movie_id THEN
        UPDATE movies
        SET average_rating = COALESCE(
            (
                SELECT ROUND(AVG(r.rating), 2)
                FROM reviews r
                WHERE r.movie_id = OLD.movie_id
            ),
            NULL
        )
        WHERE movie_id = OLD.movie_id;
    END IF;

    UPDATE movies
    SET average_rating = COALESCE(
        (
            SELECT ROUND(AVG(r.rating), 2)
            FROM reviews r
            WHERE r.movie_id = target_movie_id
        ),
        NULL
    )
    WHERE movie_id = target_movie_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_movie_average_rating ON reviews;

CREATE TRIGGER trg_update_movie_average_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_movie_average_rating();

-- 2. Calculate a user's engagement score from their activity counts.
CREATE OR REPLACE FUNCTION get_user_engagement_score(p_user_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    watch_history_count NUMERIC;
    review_count NUMERIC;
    watchlist_count NUMERIC;
BEGIN
    SELECT COUNT(*) INTO watch_history_count
    FROM watch_history
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO review_count
    FROM reviews
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO watchlist_count
    FROM watchlist
    WHERE user_id = p_user_id;

    RETURN (watch_history_count * 1)
        + (review_count * 2)
        + (watchlist_count * 1.5);
END;
$$;

-- 3. Create a movie and all of its genre and credit links in one call.
CREATE OR REPLACE PROCEDURE add_movie_with_credits(
    p_title VARCHAR,
    p_description TEXT,
    p_release_year INT,
    p_duration INT,
    p_language VARCHAR,
    p_rating DECIMAL,
    p_poster_url TEXT,
    p_trailer_url TEXT,
    p_genre_ids INT[],
    p_credits JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    new_movie_id INT;
    genre_id INT;
    credit JSONB;
BEGIN
    INSERT INTO movies (
        title, description, release_year, duration, language, rating,
        poster_url, trailer_url
    )
    VALUES (
        p_title, p_description, p_release_year, p_duration, p_language,
        p_rating, p_poster_url, p_trailer_url
    )
    RETURNING movie_id INTO new_movie_id;

    IF new_movie_id IS NULL THEN
        RAISE EXCEPTION 'Movie insert did not return a movie_id';
    END IF;

    FOREACH genre_id IN ARRAY COALESCE(p_genre_ids, ARRAY[]::INT[]) LOOP
        INSERT INTO movie_genres (movie_id, genre_id)
        VALUES (new_movie_id, genre_id);
    END LOOP;

    FOR credit IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(p_credits, '[]'::JSONB))
    LOOP
        INSERT INTO movie_cast_crew (movie_id, person_id, credit_type, character_name)
        VALUES (
            new_movie_id,
            (credit->>'person_id')::INT,
            credit->>'credit_type',
            credit->>'character_name'
        );
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
