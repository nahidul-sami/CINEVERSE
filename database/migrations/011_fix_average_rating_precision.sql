ALTER TABLE movies
    ALTER COLUMN average_rating TYPE NUMERIC(4,2)
    USING average_rating::NUMERIC(4,2);
