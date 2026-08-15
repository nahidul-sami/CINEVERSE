const pool = require("../config/db");

exports.getAllMovies = async (req, res) => {
    const { genre_id } = req.query;

    try {
        let query = "SELECT * FROM movies ORDER BY movie_id DESC";
        let queryParams = [];

        if (genre_id) {
            query = `
                SELECT DISTINCT m.*
                FROM movies m
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                WHERE mg.genre_id = $1
                ORDER BY m.movie_id DESC
            `;
            queryParams = [genre_id];
        }

        const result = await pool.query(query, queryParams);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("GET MOVIES ERROR:", error);
        res.status(500).json({ message: "Server error while fetching movies", error: error.message });
    }
};

exports.getMovieById = async (req, res) => {
    const { id } = req.params;

    try {
        const movieResult = await pool.query("SELECT * FROM movies WHERE movie_id = $1", [id]);

        if (movieResult.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        const genres = await pool.query(
            `SELECT g.genre_id, g.name
             FROM genres g
             JOIN movie_genres mg ON g.genre_id = mg.genre_id
             WHERE mg.movie_id = $1
             ORDER BY g.genre_id`,
            [id]
        );

        const cast = await pool.query(
            `SELECT p.person_id, p.name, mc.character_name, mc.credit_type
             FROM person p
             JOIN movie_cast_crew mc ON p.person_id = mc.person_id
             WHERE mc.movie_id = $1
             ORDER BY p.name`,
            [id]
        );

        const streaming = await pool.query(
            `SELECT sp.platform_id, sp.name, sp.logo_url, sp.country, ms.url AS stream_url
             FROM movie_streaming ms
             JOIN streaming_platforms sp ON sp.platform_id = ms.platform_id
             WHERE ms.movie_id = $1
             ORDER BY sp.name`,
            [id]
        );

        res.status(200).json({
            movie: movieResult.rows[0],
            genres: genres.rows,
            cast: cast.rows,
            streaming: streaming.rows
        });
    } catch (error) {
        console.error("GET MOVIE BY ID ERROR:", error);
        res.status(500).json({ message: "Server error while fetching movie details", error: error.message });
    }
};

exports.createMovie = async (req, res) => {
    const {
        title,
        description,
        release_year,
        duration,
        language,
        rating,
        poster_url,
        trailer_url
    } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
    }

    try {
        const newMovie = await pool.query(
            `INSERT INTO movies
            (title, description, release_year, duration, language, rating, poster_url, trailer_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                title,
                description,
                release_year || null,
                duration || null,
                language || null,
                rating || null,
                poster_url || null,
                trailer_url || null
            ]
        );

        res.status(201).json({ message: "Movie added successfully", movie: newMovie.rows[0] });
    } catch (error) {
        console.error("ADD MOVIE ERROR:", error);
        res.status(500).json({ message: "Server error while adding movie", error: error.message });
    }
};