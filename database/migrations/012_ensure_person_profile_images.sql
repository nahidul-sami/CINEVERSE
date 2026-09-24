-- Keep person profile images available for existing and fresh databases.
ALTER TABLE person
    ADD COLUMN IF NOT EXISTS profile_url TEXT;

CREATE INDEX IF NOT EXISTS idx_person_profile_url
    ON person(profile_url);
