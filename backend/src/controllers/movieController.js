const pool = require("../config/db");

exports.getAllMovies = async (req, res) => {
    const { genre_id } = req.query;

    try {
        let query = "SELECT * FROM movies";
        let queryParams = [];

        if (genre_id) {
            query = `
                SELECT m.* FROM movies m
                JOIN movie_genres mg ON m.movie_id = mg.movie_id
                WHERE mg.genre_id = $1
            `;
            queryParams.push(genre_id);
        }

        const result = await pool.query(query, queryParams);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("GET MOVIES ERROR:", error);
        res.status(500).json({ message: "Server error while fetching movies" });
    }
};

exports.getMovieById = async (req, res) => {
    const { id } = req.params;

    try {
        const movie = await pool.query("SELECT * FROM movies WHERE movie_id = $1", [id]);

        if (movie.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        const genres = await pool.query(
            "SELECT g.genre_id, g.name FROM genres g JOIN movie_genres mg ON g.genre_id = mg.genre_id WHERE mg.movie_id = $1",
            [id]
        );

        const cast = await pool.query(
            "SELECT p.person_id, p.name, mc.character_name, mc.credit_type FROM person p JOIN movie_cast_crew mc ON p.person_id = mc.person_id WHERE mc.movie_id = $1",
            [id]
        );

        const streaming = await pool.query(
            "SELECT sp.name, sp.logo_url, ms.url, ms.subscription_type FROM streaming_platforms sp JOIN movie_streaming ms ON sp.platform_id = ms.platform_id WHERE ms.movie_id = $1",
            [id]
        );

        res.status(200).json({
            movie: movie.rows[0],
            genres: genres.rows,
            cast: cast.rows,
            streaming: streaming.rows
        });
    } catch (error) {
        console.error("GET MOVIE BY ID ERROR:", error);
        res.status(500).json({ message: "Server error while fetching movie details" });
    }
};

exports.createMovie = async (req, res) => {
    const { title, description, release_year, duration, language,  rating, poster_url, trailer_url } = req.body;

    try {
        const newMovie = await pool.query(
            `INSERT INTO movies 
            (title, description, release_year, duration, language,  rating, poster_url, trailer_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [title, description, release_year, duration, language,  rating, poster_url, trailer_url]
        );

        res.status(201).json({ message: "Movie added successfully", movie: newMovie.rows[0] });
    } catch (error) {
        console.error("ADD MOVIE ERROR:", error);
        res.status(500).json({ message: "Server error while adding movie" });
    }
};