-- Safely adds the unique_movie_platform constraint to movie_streaming if it's
-- missing on this database (schema.sql declares it, but databases created
-- before that line was added won't have it — this fixes that gap without
-- erroring if it already exists).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_movie_platform'
    ) THEN
        ALTER TABLE movie_streaming
            ADD CONSTRAINT unique_movie_platform UNIQUE (movie_id, platform_id);
    END IF;
END $$;