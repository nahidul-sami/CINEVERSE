const pool = require("../config/db");

// Get all genres
exports.getAllGenres = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT genre_id, name, description FROM genres ORDER BY name ASC"
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("GET GENRES ERROR:", error);
        res.status(500).json({ message: "Server error while fetching genres", error: error.message });
    }
};

// Get single genre by ID
exports.getGenreById = async (req, res) => {
    const { id } = req.params;

    try {
        const genreResult = await pool.query(
            "SELECT genre_id, name, description FROM genres WHERE genre_id = $1",
            [id]
        );

        if (genreResult.rows.length === 0) {
            return res.status(404).json({ message: "Genre not found" });
        }

        res.status(200).json(genreResult.rows[0]);
    } catch (error) {
        console.error("GET GENRE BY ID ERROR:", error);
        res.status(500).json({ message: "Server error while fetching genre", error: error.message });
    }
};

// Create new genre (Admin only)
exports.createGenre = async (req, res) => {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Genre name is required" });
    }

    try {
        const existingGenre = await pool.query(
            "SELECT * FROM genres WHERE LOWER(name) = LOWER($1)",
            [name.trim()]
        );

        if (existingGenre.rows.length > 0) {
            return res.status(400).json({ message: "Genre already exists" });
        }

        const newGenre = await pool.query(
            "INSERT INTO genres (name, description) VALUES ($1, $2) RETURNING genre_id, name, description",
            [name.trim(), description || null]
        );

        res.status(201).json({ message: "Genre created successfully", genre: newGenre.rows[0] });
    } catch (error) {
        console.error("CREATE GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while creating genre", error: error.message });
    }
};

// Update genre (Admin only)
exports.updateGenre = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Genre name is required" });
    }

    try {
        const updatedGenre = await pool.query(
            "UPDATE genres SET name = $1, description = $2 WHERE genre_id = $3 RETURNING genre_id, name, description",
            [name.trim(), description || null, id]
        );

        if (updatedGenre.rows.length === 0) {
            return res.status(404).json({ message: "Genre not found" });
        }

        res.status(200).json({ message: "Genre updated successfully", genre: updatedGenre.rows[0] });
    } catch (error) {
        console.error("UPDATE GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while updating genre", error: error.message });
    }
};

// Delete genre (Admin only)
exports.deleteGenre = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM genres WHERE genre_id = $1 RETURNING genre_id",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Genre not found" });
        }

        res.status(200).json({ message: "Genre deleted successfully" });
    } catch (error) {
        console.error("DELETE GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while deleting genre", error: error.message });
    }
};
// Assign a genre to a movie (Admin only)
exports.addGenreToMovie = async (req, res) => {
    const { movieId } = req.params;
    const { genre_id } = req.body;

    if (!genre_id) {
        return res.status(400).json({ message: "genre_id is required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO movie_genres (movie_id, genre_id) 
             VALUES ($1, $2) 
             RETURNING movie_id, genre_id`,
            [movieId, genre_id]
        );

        res.status(201).json({ message: "Genre added to movie successfully", data: result.rows[0] });
    } catch (error) {
        console.error("ADD MOVIE GENRE ERROR:", error);
        if (error.code === "23505") {
            return res.status(409).json({ message: "This genre is already assigned to the movie" });
        }
        res.status(500).json({ message: "Server error while adding genre to movie", error: error.message });
    }
};

// Remove a genre from a movie (Admin only)
exports.removeGenreFromMovie = async (req, res) => {
    const { movieId, genreId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM movie_genres 
             WHERE movie_id = $1 AND genre_id = $2 
             RETURNING movie_id, genre_id`,
            [movieId, genreId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Genre mapping not found for this movie" });
        }

        res.status(200).json({ message: "Genre removed from movie successfully" });
    } catch (error) {
        console.error("REMOVE MOVIE GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while removing genre from movie", error: error.message });
    }
};

// Get all movies under a specific genre
exports.getMoviesByGenre = async (req, res) => {
    const { genreId } = req.params;

    try {
        const result = await pool.query(
            `SELECT m.* 
             FROM movies m
             JOIN movie_genres mg ON m.movie_id = mg.movie_id
             WHERE mg.genre_id = $1
             ORDER BY m.release_year DESC NULLS LAST, m.title ASC`,
            [genreId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("GET MOVIES BY GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while fetching movies for genre", error: error.message });
    }
};