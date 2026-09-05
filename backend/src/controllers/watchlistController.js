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

exports.shareWatchlist = async (req, res) => {
    const { id } = req.params;
    const { shared_with } = req.body;

    if (!shared_with) {
        return res.status(400).json({ message: "Recipient user ID is required" });
    }

    if (Number(shared_with) === Number(req.user.user_id)) {
        return res.status(400).json({ message: "You cannot share a watchlist with yourself" });
    }

    try {
        const watchlist = await pool.query(
            "SELECT watchlist_id FROM watchlist WHERE watchlist_id = $1 AND user_id = $2",
            [id, req.user.user_id]
        );

        if (watchlist.rows.length === 0) {
            return res.status(404).json({ message: "Watchlist not found" });
        }

        const recipient = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [shared_with]);
        if (recipient.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const existing = await pool.query(
            "SELECT share_id FROM watchlist_share WHERE watchlist_id = $1 AND shared_with = $2",
            [id, shared_with]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: "Already shared with this user" });
        }

        const result = await pool.query(
            "INSERT INTO watchlist_share (watchlist_id, shared_by, shared_with) VALUES ($1, $2, $3) RETURNING *",
            [id, req.user.user_id, shared_with]
        );

        await pool.query(
            "INSERT INTO notifications (user_id, notification_type, share_id) VALUES ($1, 'watchlist_share', $2)",
            [shared_with, result.rows[0].share_id]
        );

        res.status(201).json({ message: "Watchlist shared successfully", share: result.rows[0] });
    } catch (error) {
        console.error("SHARE WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while sharing watchlist", error: error.message });
    }
};

exports.getSharedWithMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ws.share_id, ws.watchlist_id, ws.shared_at,
                    w.name AS watchlist_name, u.user_id AS shared_by,
                    u.name AS shared_by_name
             FROM watchlist_share ws
             JOIN watchlist w ON w.watchlist_id = ws.watchlist_id
             JOIN users u ON u.user_id = ws.shared_by
             WHERE ws.shared_with = $1
             ORDER BY ws.shared_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ shared_watchlists: result.rows });
    } catch (error) {
        console.error("GET SHARED WATCHLISTS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching shared watchlists", error: error.message });
    }
};

exports.getSharedWatchlistById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT ws.share_id, ws.shared_at, w.watchlist_id, w.name, u.name AS shared_by_name,
                    COALESCE(
                        json_agg(m ORDER BY m.movie_id DESC)
                        FILTER (WHERE m.movie_id IS NOT NULL),
                        '[]'
                    ) AS movies
             FROM watchlist_share ws
             JOIN watchlist w ON w.watchlist_id = ws.watchlist_id
             JOIN users u ON u.user_id = ws.shared_by
             LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.watchlist_id
             LEFT JOIN movies m ON m.movie_id = wi.movie_id
             WHERE ws.watchlist_id = $1 AND ws.shared_with = $2
             GROUP BY ws.share_id, ws.shared_at, w.watchlist_id, w.name, u.name`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Shared watchlist not found" });
        }

        res.status(200).json({ watchlist: result.rows[0] });
    } catch (error) {
        console.error("GET SHARED WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while fetching shared watchlist", error: error.message });
    }
};