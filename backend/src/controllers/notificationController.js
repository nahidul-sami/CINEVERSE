const pool = require("../config/db");

exports.getNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT n.notification_id, n.user_id, n.notification_type, n.share_id,
                    n.friendship_id, n.is_read, n.created_at,
                    CASE
                        WHEN n.notification_type = 'friend_request' THEN requester.name
                        WHEN n.notification_type = 'friend_accepted' THEN accepter.name
                        ELSE sharer.name
                    END AS user_name,
                    w.name AS watchlist_name,
                    COUNT(*) FILTER (WHERE n.is_read = false) OVER ()::int AS unread_count
             FROM notifications n
             LEFT JOIN friendships f ON f.friendship_id = n.friendship_id
             LEFT JOIN users requester ON requester.user_id = f.user_id
             LEFT JOIN users accepter ON accepter.user_id = f.friend_id
             LEFT JOIN watchlist_share ws ON ws.share_id = n.share_id
             LEFT JOIN watchlist w ON w.watchlist_id = ws.watchlist_id
             LEFT JOIN users sharer ON sharer.user_id = ws.shared_by
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ notifications: result.rows, unread_count: result.rows[0]?.unread_count || 0 });
    } catch (error) {
        console.error("GET NOTIFICATIONS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching notifications", error: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2 RETURNING *",
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification marked as read", notification: result.rows[0] });
    } catch (error) {
        console.error("MARK NOTIFICATION AS READ ERROR:", error);
        res.status(500).json({ message: "Server error while marking notification as read", error: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING notification_id",
            [req.user.user_id]
        );

        res.status(200).json({ message: "Notifications marked as read", updated_count: result.rows.length });
    } catch (error) {
        console.error("MARK ALL NOTIFICATIONS AS READ ERROR:", error);
        res.status(500).json({ message: "Server error while marking notifications as read", error: error.message });
    }
};
