CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(80),
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS profile_image TEXT;

UPDATE users
SET display_name = COALESCE(NULLIF(display_name, ''), name),
    username = COALESCE(NULLIF(username, ''), CONCAT('user_', user_id))
WHERE display_name IS NULL OR display_name = '' OR username IS NULL OR username = '';

ALTER TABLE users
    ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
    ON users (username);

CREATE INDEX IF NOT EXISTS users_username_search_idx
    ON users USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_display_name_search_idx
    ON users USING gin (LOWER(display_name) gin_trgm_ops);