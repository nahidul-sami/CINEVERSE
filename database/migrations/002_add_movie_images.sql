ALTER TABLE movies ADD COLUMN backdrop_url TEXT;

CREATE TABLE movie_images (
    image_id SERIAL PRIMARY KEY,
    movie_id INT NOT NULL,
    image_url TEXT NOT NULL,
    image_type VARCHAR(20) NOT NULL DEFAULT 'gallery' CHECK (image_type IN ('gallery', 'backdrop')),

    CONSTRAINT fk_movie_images_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);
