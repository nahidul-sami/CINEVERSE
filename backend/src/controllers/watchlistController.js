const pool = require("../config/db");

exports.getWatchlists = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT w.watchlist_id, w.name, w.created_at,
                    COUNT(wi.items_id)::int AS movie_count
             FROM watchlist w
             LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.watchlist_id
             WHERE w.user_id = $1
             GROUP BY w.watchlist_id
             ORDER BY w.created_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ watchlists: result.rows });
    } catch (error) {
        console.error("GET WATCHLISTS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching watchlists", error: error.message });
    }
};

exports.getWatchlistById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT w.watchlist_id, w.name, w.created_at,
                    COALESCE(
                        json_agg(m ORDER BY m.movie_id DESC)
                        FILTER (WHERE m.movie_id IS NOT NULL),
                        '[]'
                    ) AS movies
             FROM watchlist w
             LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.watchlist_id
             LEFT JOIN movies m ON m.movie_id = wi.movie_id
             WHERE w.watchlist_id = $1 AND w.user_id = $2
             GROUP BY w.watchlist_id`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Watchlist not found" });
        }

        res.status(200).json({ watchlist: result.rows[0] });
    } catch (error) {
        console.error("GET WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while fetching watchlist", error: error.message });
    }
};

exports.createWatchlist = async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Watchlist name is required" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO watchlist (user_id, name) VALUES ($1, $2) RETURNING *",
            [req.user.user_id, name.trim()]
        );

        res.status(201).json({ message: "Watchlist created successfully", watchlist: result.rows[0] });
    } catch (error) {
        console.error("CREATE WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while creating watchlist", error: error.message });
    }
};

exports.updateWatchlist = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Watchlist name is required" });
    }

    try {
        const result = await pool.query(
            "UPDATE watchlist SET name = $1 WHERE watchlist_id = $2 AND user_id = $3 RETURNING *",
            [name.trim(), id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Watchlist not found" });
        }

        res.status(200).json({ message: "Watchlist updated successfully", watchlist: result.rows[0] });
    } catch (error) {
        console.error("UPDATE WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while updating watchlist", error: error.message });
    }
};

exports.deleteWatchlist = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM watchlist WHERE watchlist_id = $1 AND user_id = $2 RETURNING watchlist_id",
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Watchlist not found" });
        }

        res.status(200).json({ message: "Watchlist deleted successfully" });
    } catch (error) {
        console.error("DELETE WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while deleting watchlist", error: error.message });
    }
};

exports.addMovieToWatchlist = async (req, res) => {
    const { id } = req.params;
    const { movie_id } = req.body;

    if (!movie_id) {
        return res.status(400).json({ message: "Movie ID is required" });
    }

    try {
        const watchlist = await pool.query(
            "SELECT watchlist_id FROM watchlist WHERE watchlist_id = $1 AND user_id = $2",
            [id, req.user.user_id]
        );

        if (watchlist.rows.length === 0) {
            return res.status(404).json({ message: "Watchlist not found" });
        }

        const movie = await pool.query("SELECT movie_id FROM movies WHERE movie_id = $1", [movie_id]);
        if (movie.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        const result = await pool.query(
            `INSERT INTO watchlist_items (watchlist_id, movie_id)
             VALUES ($1, $2)
             ON CONFLICT (watchlist_id, movie_id) DO NOTHING
             RETURNING *`,
            [id, movie_id]
        );

        if (result.rows.length === 0) {
            return res.status(409).json({ message: "Movie is already in this watchlist" });
        }

        res.status(201).json({ message: "Movie added to watchlist", item: result.rows[0] });
    } catch (error) {
        console.error("ADD MOVIE TO WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while adding movie to watchlist", error: error.message });
    }
};

exports.removeMovieFromWatchlist = async (req, res) => {
    const { id, movieId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM watchlist_items wi
             USING watchlist w
             WHERE wi.watchlist_id = w.watchlist_id
               AND wi.watchlist_id = $1
               AND wi.movie_id = $2
               AND w.user_id = $3
             RETURNING wi.items_id`,
            [id, movieId, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found in watchlist" });
        }

        res.status(200).json({ message: "Movie removed from watchlist" });
    } catch (error) {
        console.error("REMOVE MOVIE FROM WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while removing movie from watchlist", error: error.message });
    }
};