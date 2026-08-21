const pool = require("../config/db");

exports.getWatchHistory = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT wh.history_id, wh.movie_id, wh.watched_at, wh.progress,
                    m.title, m.poster_url, m.release_year, m.rating
             FROM watch_history wh
             JOIN movies m ON m.movie_id = wh.movie_id
             WHERE wh.user_id = $1
             ORDER BY wh.watched_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ history: result.rows });
    } catch (error) {
        console.error("GET WATCH HISTORY ERROR:", error);
        res.status(500).json({ message: "Server error while fetching watch history", error: error.message });
    }
};

exports.addToWatchHistory = async (req, res) => {
    const { movie_id, progress } = req.body;

    if (!movie_id) {
        return res.status(400).json({ message: "Movie ID is required" });
    }

    if (progress !== undefined && (!Number.isInteger(progress) || progress < 0 || progress > 100)) {
        return res.status(400).json({ message: "Progress must be an integer between 0 and 100" });
    }

    try {
        const movie = await pool.query("SELECT movie_id FROM movies WHERE movie_id = $1", [movie_id]);
        if (movie.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        const result = await pool.query(
            `INSERT INTO watch_history (user_id, movie_id, progress)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, movie_id)
             DO UPDATE SET progress = EXCLUDED.progress, watched_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.user.user_id, movie_id, progress ?? null]
        );

        res.status(200).json({ message: "Watch history updated", history: result.rows[0] });
    } catch (error) {
        console.error("ADD WATCH HISTORY ERROR:", error);
        res.status(500).json({ message: "Server error while adding watch history", error: error.message });
    }
};

exports.updateWatchProgress = async (req, res) => {
    const { id } = req.params;
    const { progress } = req.body;

    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        return res.status(400).json({ message: "Progress must be an integer between 0 and 100" });
    }

    try {
        const result = await pool.query(
            `UPDATE watch_history
             SET progress = $1, watched_at = CURRENT_TIMESTAMP
             WHERE history_id = $2 AND user_id = $3
             RETURNING *`,
            [progress, id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Watch history item not found" });
        }

        res.status(200).json({ message: "Watch progress updated", history: result.rows[0] });
    } catch (error) {
        console.error("UPDATE WATCH PROGRESS ERROR:", error);
        res.status(500).json({ message: "Server error while updating watch progress", error: error.message });
    }
};

exports.deleteFromWatchHistory = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM watch_history WHERE history_id = $1 AND user_id = $2 RETURNING history_id",
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Watch history item not found" });
        }

        res.status(200).json({ message: "Movie removed from watch history" });
    } catch (error) {
        console.error("DELETE WATCH HISTORY ERROR:", error);
        res.status(500).json({ message: "Server error while deleting watch history", error: error.message });
    }
};