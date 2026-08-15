-- =========================================================
-- CINEVERSE SEED DATA
-- =========================================================


-- =========================================================
-- 1. USERS
-- =========================================================

INSERT INTO users (name, email, password, role)
VALUES
('Admin User', 'admin@cineverse.com', '$2b$10$X3v/jrF/OCVMA3Uc2wfMk.1/D2TWaUfmzZkJd/fgzQ3OjyCXmUGzS', 'admin'),
('Omi', 'omi@gmail.com', '$2b$10$5SWQGIEh.bqi.MTednIcnOlzrV1ursIEyn8dAVb15nrMoeYTHUUJi', 'user'),
('Rahim', 'rahim@gmail.com', '$2b$10$5SWQGIEh.bqi.MTednIcnOlzrV1ursIEyn8dAVb15nrMoeYTHUUJi', 'user'),
('Karim', 'karim@gmail.com', '$2b$10$5SWQGIEh.bqi.MTednIcnOlzrV1ursIEyn8dAVb15nrMoeYTHUUJi', 'user');


-- =========================================================
-- 2. GENRES
-- =========================================================

INSERT INTO genres (name, description)
VALUES
('Action', 'Movies focused on action, combat and adventure.'),
('Sci-Fi', 'Movies involving science, technology and futuristic concepts.'),
('Drama', 'Movies focused on emotional and dramatic storytelling.'),
('Thriller', 'Movies designed to create suspense and excitement.'),
('Comedy', 'Movies primarily intended to entertain and make audiences laugh.'),
('Adventure', 'Movies involving exploration, journeys and exciting experiences.');


-- =========================================================
-- 3. PERSON
-- =========================================================

INSERT INTO person
(name, birth_date, biography, profile_url, person_type)
VALUES
(
    'Christopher Nolan',
    '1970-07-30',
    'British-American filmmaker known for complex storytelling.',
    'https://example.com/nolan',
    'Director'
),
(
    'Leonardo DiCaprio',
    '1974-11-11',
    'American actor known for numerous acclaimed films.',
    'https://example.com/dicaprio',
    'Actor'
),
(
    'Matthew McConaughey',
    '1969-11-04',
    'American actor known for dramatic and science fiction roles.',
    'https://example.com/mcconaughey',
    'Actor'
),
(
    'Denis Villeneuve',
    '1967-10-03',
    'Canadian filmmaker known for science fiction and drama films.',
    'https://example.com/villeneuve',
    'Director'
);


-- =========================================================
-- 4. MOVIES
-- =========================================================

INSERT INTO movies
(title, release_year, rating, language, trailer_url,
 poster_url, description, average_rating, duration)
VALUES
(
    'Interstellar',
    2014,
    8.7,
    'English',
    'https://example.com/interstellar-trailer',
    'https://example.com/interstellar-poster',
    'A group of explorers travel through a wormhole in space.',
    8.70,
    169
),
(
    'Inception',
    2010,
    8.8,
    'English',
    'https://example.com/inception-trailer',
    'https://example.com/inception-poster',
    'A skilled thief enters the dreams of others to steal information.',
    8.80,
    148
),
(
    'Dune',
    2021,
    8.0,
    'English',
    'https://example.com/dune-trailer',
    'https://example.com/dune-poster',
    'A young nobleman becomes involved in a struggle over a desert planet.',
    8.00,
    155
),
(
    'The Dark Knight',
    2008,
    9.0,
    'English',
    'https://example.com/dark-knight-trailer',
    'https://example.com/dark-knight-poster',
    'Batman faces a dangerous criminal mastermind in Gotham City.',
    9.00,
    152
);


-- =========================================================
-- 5. STREAMING PLATFORMS
-- =========================================================

INSERT INTO streaming_platforms
(name, logo_url, country, url, subscription_type)
VALUES
(
    'Netflix',
    'https://example.com/netflix-logo',
    'United States',
    'https://www.netflix.com',
    'Subscription'
),
(
    'Amazon Prime Video',
    'https://example.com/prime-logo',
    'United States',
    'https://www.primevideo.com',
    'Subscription'
),
(
    'Disney+',
    'https://example.com/disney-logo',
    'United States',
    'https://www.disneyplus.com',
    'Subscription'
);


-- =========================================================
-- 6. WATCHLIST
-- =========================================================

INSERT INTO watchlist
(user_id, name)
VALUES
(2, 'My Favorites'),
(2, 'Watch Later'),
(3, 'Sci-Fi Collection'),
(4, 'Weekend Movies');


-- =========================================================
-- 7. FRIENDSHIPS
-- =========================================================

INSERT INTO friendships
(user_id, friend_id, status)
VALUES
(2, 3, 'accepted'),
(2, 4, 'pending'),
(3, 4, 'accepted');


-- =========================================================
-- 8. MOVIE_GENRES
-- =========================================================

-- Interstellar → Sci-Fi, Drama, Adventure
INSERT INTO movie_genres (movie_id, genre_id)
VALUES
(1, 2),
(1, 3),
(1, 6),

-- Inception → Sci-Fi, Thriller, Drama
(2, 2),
(2, 4),
(2, 3),

-- Dune → Sci-Fi, Adventure, Drama
(3, 2),
(3, 6),
(3, 3),

-- The Dark Knight → Action, Thriller, Drama
(4, 1),
(4, 4),
(4, 3);


-- =========================================================
-- 9. MOVIE_CAST_CREW
-- =========================================================

-- Interstellar
INSERT INTO movie_cast_crew
(movie_id, person_id, credit_type, character_name)
VALUES
(1, 1, 'Director', NULL),
(1, 3, 'Actor', 'Cooper'),

-- Inception
(2, 1, 'Director', NULL),
(2, 2, 'Actor', 'Cobb'),

-- Dune
(3, 4, 'Director', NULL),

-- The Dark Knight
(4, 1, 'Director', NULL);


-- =========================================================
-- 10. MOVIE_STREAMING
-- =========================================================

INSERT INTO movie_streaming
(movie_id, platform_id, url)
VALUES
(1, 1, 'https://example.com/interstellar'),
(1, 2, 'https://example.com/interstellar-prime'),
(2, 1, 'https://example.com/inception'),
(3, 1, 'https://example.com/dune'),
(3, 3, 'https://example.com/dune-disney'),
(4, 2, 'https://example.com/dark-knight');


-- =========================================================
-- 11. REVIEWS
-- =========================================================

INSERT INTO reviews
(movie_id, user_id, rating, review_text)
VALUES
(1, 2, 9.5, 'Amazing science fiction movie with a great story.'),
(1, 3, 9.0, 'One of my favorite movies.'),
(2, 2, 9.0, 'Very creative and visually impressive.'),
(3, 3, 8.5, 'Great world building and visuals.'),
(4, 4, 9.5, 'Excellent superhero movie.');


-- =========================================================
-- 12. WATCH_HISTORY
-- =========================================================

INSERT INTO watch_history
(user_id, movie_id, watched_at, progress)
VALUES
(2, 1, CURRENT_TIMESTAMP, 100),
(2, 2, CURRENT_TIMESTAMP, 100),
(3, 1, CURRENT_TIMESTAMP, 100),
(3, 3, CURRENT_TIMESTAMP, 100),
(4, 4, CURRENT_TIMESTAMP, 100);


-- =========================================================
-- 13. WATCHLIST_ITEMS
-- =========================================================

INSERT INTO watchlist_items
(watchlist_id, movie_id)
VALUES
-- Omi's My Favorites
(1, 1),
(1, 2),

-- Omi's Watch Later
(2, 3),
(2, 4),

-- Rahim's Sci-Fi Collection
(3, 1),
(3, 3),

-- Karim's Weekend Movies
(4, 2),
(4, 4);


-- =========================================================
-- 14. WATCHLIST_SHARE
-- =========================================================

INSERT INTO watchlist_share
(watchlist_id, shared_by, shared_with)
VALUES
(1, 2, 3),
(2, 2, 4);