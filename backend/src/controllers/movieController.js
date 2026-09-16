const pool = require("../config/db");

exports.searchMovies = async (req, res) => {
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;

    if (!search) {
        return res.status(400).json({ message: "Search text is required" });
    }

    try {
        const result = await pool.query(
            `WITH matched_movies AS (
                SELECT DISTINCT m.movie_id, m.title, m.poster_url, m.release_year,
                    m.rating, m.average_rating,
                    GREATEST(
                        similarity(m.title, $1),
                        similarity(COALESCE(p.name, ''), $1),
                        similarity(COALESCE(g.name, ''), $1)
                    ) AS relevance
                FROM movies m
                LEFT JOIN movie_genres mg ON mg.movie_id = m.movie_id
                LEFT JOIN genres g ON g.genre_id = mg.genre_id
                LEFT JOIN movie_cast_crew mcc ON mcc.movie_id = m.movie_id
                LEFT JOIN person p ON p.person_id = mcc.person_id
                WHERE m.title ILIKE $2
                   OR g.name ILIKE $2
                   OR p.name ILIKE $2
                   OR similarity(m.title, $1) >= 0.25
            )
            SELECT *, COUNT(*) OVER() AS total_results
            FROM matched_movies
            ORDER BY relevance DESC, average_rating DESC NULLS LAST, title ASC
            LIMIT $3 OFFSET $4`,
            [search, `%${search}%`, limit, offset]
        );

        const total = Number(result.rows[0]?.total_results || 0);
        res.status(200).json({
            results: result.rows.map(({ total_results, ...movie }) => movie),
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("SEARCH MOVIES ERROR:", error);
        res.status(500).json({ message: "Unable to search movies" });
    }
};

exports.getRecommendations = async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 30);

    try {
        const result = await pool.query(
            `WITH activity AS (
                SELECT movie_id, 2 AS weight FROM watch_history WHERE user_id = $1
                UNION ALL
                SELECT wi.movie_id, 1 AS weight
                FROM watchlist_items wi
                JOIN watchlist w ON w.watchlist_id = wi.watchlist_id
                WHERE w.user_id = $1
                UNION ALL
                SELECT movie_id, 2 AS weight FROM reviews WHERE user_id = $1
            ), preferred_genres AS (
                SELECT mg.genre_id, SUM(a.weight) AS preference_score
                FROM activity a
                JOIN movie_genres mg ON mg.movie_id = a.movie_id
                GROUP BY mg.genre_id
            ), excluded_movies AS (
                SELECT movie_id FROM watch_history WHERE user_id = $1
                UNION
                SELECT wi.movie_id
                FROM watchlist_items wi
                JOIN watchlist w ON w.watchlist_id = wi.watchlist_id
                WHERE w.user_id = $1
            )
            SELECT m.movie_id, m.title, m.poster_url, m.release_year, m.rating,
                m.description, m.average_rating,
                COALESCE(SUM(CASE WHEN pg.genre_id IS NOT NULL THEN pg.preference_score ELSE 0 END), 0) * 5
                    + CASE WHEN COALESCE(m.rating, 0) >= 8 THEN 2 ELSE 0 END
                    + CASE WHEN COALESCE(m.average_rating, 0) >= 7 THEN 2 ELSE 0 END
                    + CASE WHEN COALESCE(m.release_year, 0) >= EXTRACT(YEAR FROM CURRENT_DATE) - 5 THEN 1 ELSE 0 END
                    AS recommendation_score,
                COALESCE(
                    'Recommended because you like ' || STRING_AGG(DISTINCT CASE WHEN pg.genre_id IS NOT NULL THEN g.name END, ', '),
                    'Popular with Cineverse members'
                ) AS reason,
                COALESCE(ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), ARRAY[]::VARCHAR[]) AS genres
            FROM movies m
            LEFT JOIN movie_genres mg ON mg.movie_id = m.movie_id
            LEFT JOIN genres g ON g.genre_id = mg.genre_id
            LEFT JOIN preferred_genres pg ON pg.genre_id = mg.genre_id
            WHERE NOT EXISTS (SELECT 1 FROM excluded_movies e WHERE e.movie_id = m.movie_id)
            GROUP BY m.movie_id
            ORDER BY recommendation_score DESC, m.average_rating DESC NULLS LAST, m.movie_id DESC
            LIMIT $2`,
            [req.user.user_id, limit]
        );

        res.status(200).json({ recommendations: result.rows });
    } catch (error) {
        console.error("GET RECOMMENDATIONS ERROR:", error);
        res.status(500).json({ message: "Unable to load recommendations" });
    }
};

exports.getAllMovies = async (req, res) => {
    const { genre_id, q } = req.query;
    const search = typeof q === "string" ? q.trim() : "";
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);

    try {
        const queryParams = [];
        const filters = [];

        if (genre_id) {
            queryParams.push(genre_id);
            filters.push(`mg.genre_id = $${queryParams.length}`);
        }

        if (search) {
            queryParams.push(`%${search}%`);
            filters.push(`(m.title ILIKE $${queryParams.length} OR m.description ILIKE $${queryParams.length})`);
        }

        queryParams.push(limit);
        const query = `
            SELECT DISTINCT m.*
            FROM movies m
            ${genre_id ? "LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id" : ""}
            ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
            ORDER BY m.average_rating DESC NULLS LAST, m.movie_id DESC
            LIMIT $${queryParams.length}
        `;

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
            `SELECT p.person_id, p.name, p.profile_url, mc.character_name, mc.credit_type
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

        const images = await pool.query(
            `SELECT image_id, image_url, image_type FROM movie_images WHERE movie_id = $1 ORDER BY image_id`,
            [id]
        );

        res.status(200).json({
            movie: movieResult.rows[0],
            genres: genres.rows,
            cast: cast.rows,
            streaming: streaming.rows,
            images: images.rows
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
        backdrop_url,
        trailer_url
    } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
    }

    try {
        const newMovie = await pool.query(
            `INSERT INTO movies
            (title, description, release_year, duration, language, rating, poster_url, backdrop_url, trailer_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                title,
                description,
                release_year || null,
                duration || null,
                language || null,
                rating || null,
                poster_url || null,
                backdrop_url || null,
                trailer_url || null
            ]
        );

        res.status(201).json({ message: "Movie added successfully", movie: newMovie.rows[0] });
    } catch (error) {
        console.error("ADD MOVIE ERROR:", error);
        res.status(500).json({ message: "Server error while adding movie", error: error.message });
    }
};

exports.addMovieImage = async (req, res) => {
    const { id } = req.params;
    const { image_url, image_type } = req.body;

    if (!image_url || !image_type) {
        return res.status(400).json({ message: "image_url and image_type are required" });
    }

    if (!['gallery', 'backdrop'].includes(image_type)) {
        return res.status(400).json({ message: "image_type must be 'gallery' or 'backdrop'" });
    }

    try {
        // Check if movie exists
        const movieCheck = await pool.query("SELECT movie_id FROM movies WHERE movie_id = $1", [id]);
        if (movieCheck.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        const newImage = await pool.query(
            `INSERT INTO movie_images (movie_id, image_url, image_type)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, image_url, image_type]
        );

        res.status(201).json({ message: "Image added successfully", image: newImage.rows[0] });
    } catch (error) {
        console.error("ADD MOVIE IMAGE ERROR:", error);
        res.status(500).json({ message: "Server error while adding image", error: error.message });
    }
};

exports.deleteMovie = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM movies WHERE movie_id = $1 RETURNING movie_id",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        res.status(200).json({ message: "Movie deleted successfully" });
    } catch (error) {
        console.error("DELETE MOVIE ERROR:", error);
        res.status(500).json({ message: "Server error while deleting movie", error: error.message });
    }
};

exports.updateMovie = async (req, res) => {
    const { id } = req.params;
    const { title, description, release_year, duration, language, rating, poster_url, backdrop_url, trailer_url } = req.body;
    if (!title || !title.trim() || !description || !description.trim()) {
        return res.status(400).json({ message: "Title and description are required" });
    }

    try {
        const result = await pool.query(
            `UPDATE movies
             SET title = $1, description = $2, release_year = $3, duration = $4,
                 language = $5, rating = $6, poster_url = $7, backdrop_url = $8, trailer_url = $9
             WHERE movie_id = $10
             RETURNING *`,
            [title.trim(), description.trim(), release_year || null, duration || null, language || null,
                rating || null, poster_url || null, backdrop_url || null, trailer_url || null, id]
        );
        if (!result.rows.length) return res.status(404).json({ message: "Movie not found" });
        res.status(200).json({ message: "Movie updated successfully", movie: result.rows[0] });
    } catch (error) {
        console.error("UPDATE MOVIE ERROR:", error);
        res.status(500).json({ message: "Unable to update movie" });
    }
};

exports.deleteMovieImage = async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM movie_images WHERE image_id = $1 RETURNING image_id",
            [req.params.imageId]
        );
        if (!result.rows.length) return res.status(404).json({ message: "Image not found" });
        res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
        console.error("DELETE MOVIE IMAGE ERROR:", error);
        res.status(500).json({ message: "Unable to delete movie image" });
    }
};