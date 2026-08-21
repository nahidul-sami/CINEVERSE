const pool = require("../config/db");

exports.getSharedWatchlists = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ws.share_id, ws.watchlist_id, ws.shared_at,
                    w.name AS watchlist_name, ws.shared_by,
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

exports.shareWatchlist = async (req, res) => {
    const { watchlist_id, shared_with } = req.body;

    if (!watchlist_id || !shared_with) {
        return res.status(400).json({ message: "Watchlist ID and recipient ID are required" });
    }

    if (Number(shared_with) === Number(req.user.user_id)) {
        return res.status(400).json({ message: "You cannot share a watchlist with yourself" });
    }

    try {
        const watchlist = await pool.query(
            "SELECT watchlist_id FROM watchlist WHERE watchlist_id = $1 AND user_id = $2",
            [watchlist_id, req.user.user_id]
        );
        if (watchlist.rows.length === 0) {
            return res.status(404).json({ message: "Watchlist not found" });
        }

        const recipient = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [shared_with]);
        if (recipient.rows.length === 0) {
            return res.status(404).json({ message: "Recipient user not found" });
        }

        const result = await pool.query(
            `INSERT INTO watchlist_share (watchlist_id, shared_by, shared_with)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [watchlist_id, req.user.user_id, shared_with]
        );

        res.status(201).json({ message: "Watchlist shared successfully", share: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Watchlist is already shared with this user" });
        }

        console.error("SHARE WATCHLIST ERROR:", error);
        res.status(500).json({ message: "Server error while sharing watchlist", error: error.message });
    }
};

exports.deleteWatchlistShare = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM watchlist_share
             WHERE share_id = $1 AND (shared_by = $2 OR shared_with = $2)
             RETURNING share_id`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Watchlist share not found" });
        }

        res.status(200).json({ message: "Watchlist share removed" });
    } catch (error) {
        console.error("DELETE WATCHLIST SHARE ERROR:", error);
        res.status(500).json({ message: "Server error while deleting watchlist share", error: error.message });
    }
};