-- =========================================================
-- CINEVERSE DATABASE SCHEMA
-- =========================================================


-- =========================================================
1. USERS
=========================================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'user'))
);


-- =========================================================
-- 2. GENRES
-- =========================================================

CREATE TABLE genres (
    genre_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);


-- =========================================================
-- 3. PERSON
-- =========================================================

CREATE TABLE person (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    birth_date DATE,
    biography TEXT,
    profile_url TEXT,
    person_type VARCHAR(50)
);


-- =========================================================
-- 4. MOVIES
-- =========================================================

CREATE TABLE movies (
    movie_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    release_year INT,
    rating DECIMAL(3,1),
    language VARCHAR(100),
    trailer_url TEXT,
    poster_url TEXT,
    description TEXT,
    average_rating DECIMAL(3,2),
    duration INT
);


-- =========================================================
-- 5. STREAMING PLATFORMS
-- =========================================================

CREATE TABLE streaming_platforms (
    platform_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    logo_url TEXT,
    country VARCHAR(100),
    url TEXT,
    subscription_type VARCHAR(100)
);


-- =========================================================
-- 6. WATCHLIST
-- =========================================================

CREATE TABLE watchlist (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_watchlist_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 7. FRIENDSHIPS
-- =========================================================

CREATE TABLE friendships (
    friendship_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_friendship_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_friendship_friend
        FOREIGN KEY (friend_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_different_users
        CHECK (user_id <> friend_id)
);


-- =========================================================
-- 8. MOVIE_GENRES
-- =========================================================

CREATE TABLE movie_genres (
    movie_id INT NOT NULL,
    genre_id INT NOT NULL,

    PRIMARY KEY (movie_id, genre_id),

    CONSTRAINT fk_movie_genres_movie
        FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_movie_genres_genre
        FOREIGN KEY (genre_id)
        REFERENCES genres(genre_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 9. MOVIE_CAST_CREW
-- =========================================================

CREATE TABLE movie_cast_crew (
    movie_id INT NOT NULL,
    person_id INT NOT NULL,
    credit_type VARCHAR(50),
    character_name VARCHAR(150),

    PRIMARY KEY (movie_id, person_id, credit_type),

    CONSTRAINT fk_cast_crew_movie
        FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cast_crew_person
        FOREIGN KEY (person_id)
        REFERENCES person(person_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 10. MOVIE_STREAMING
-- =========================================================

CREATE TABLE movie_streaming (
    movie_streaming_id SERIAL PRIMARY KEY,
    movie_id INT NOT NULL,
    platform_id INT NOT NULL,
    url TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movie_streaming_movie
        FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_movie_streaming_platform
        FOREIGN KEY (platform_id)
        REFERENCES streaming_platforms(platform_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_movie_platform
        UNIQUE (movie_id, platform_id)
);


-- =========================================================
-- 11. REVIEWS
-- =========================================================

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    movie_id INT NOT NULL,
    user_id INT NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_movie
        FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_review_rating
        CHECK (rating >= 0 AND rating <= 10),

    CONSTRAINT unique_user_movie_review
        UNIQUE (user_id, movie_id)
);


-- =========================================================
-- 12. WATCH_HISTORY
-- =========================================================

CREATE TABLE watch_history (
    history_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INT,

    CONSTRAINT fk_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_history_movie
        FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_progress
        CHECK (progress >= 0 AND progress <= 100)
);


-- =========================================================
-- 13. WATCHLIST_ITEMS
-- =========================================================

CREATE TABLE watchlist_items (
    items_id SERIAL PRIMARY KEY,
    watchlist_id INT NOT NULL,
    movie_id INT NOT NULL,

    CONSTRAINT fk_watchlist_items_watchlist
        FOREIGN KEY (watchlist_id)
        REFERENCES watchlist(watchlist_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_watchlist_items_movie
        FOREIGN KEY (movie_id)
        REFERENCES movies(movie_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_watchlist_movie
        UNIQUE (watchlist_id, movie_id)
);


-- =========================================================
-- 14. WATCHLIST_SHARE
-- =========================================================

CREATE TABLE watchlist_share (
    share_id SERIAL PRIMARY KEY,
    watchlist_id INT NOT NULL,
    shared_by INT NOT NULL,
    shared_with INT NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_share_watchlist
        FOREIGN KEY (watchlist_id)
        REFERENCES watchlist(watchlist_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_share_sender
        FOREIGN KEY (shared_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_share_receiver
        FOREIGN KEY (shared_with)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_share_users
        CHECK (shared_by <> shared_with)
);