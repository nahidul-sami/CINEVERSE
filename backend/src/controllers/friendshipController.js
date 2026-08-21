const pool = require("../config/db");

exports.getFriendships = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.friendship_id, f.status, f.created_at,
                    f.user_id, sender.name AS sender_name,
                    f.friend_id, receiver.name AS receiver_name
             FROM friendships f
             JOIN users sender ON sender.user_id = f.user_id
             JOIN users receiver ON receiver.user_id = f.friend_id
             WHERE f.user_id = $1 OR f.friend_id = $1
             ORDER BY f.created_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ friendships: result.rows });
    } catch (error) {
        console.error("GET FRIENDSHIPS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching friendships", error: error.message });
    }
};

exports.sendFriendRequest = async (req, res) => {
    const { friend_id } = req.body;

    if (!friend_id) {
        return res.status(400).json({ message: "Friend ID is required" });
    }

    if (Number(friend_id) === Number(req.user.user_id)) {
        return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    try {
        const friend = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [friend_id]);
        if (friend.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const existing = await pool.query(
            `SELECT friendship_id FROM friendships
             WHERE (user_id = $1 AND friend_id = $2)
                OR (user_id = $2 AND friend_id = $1)`,
            [req.user.user_id, friend_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: "Friendship request already exists" });
        }

        const result = await pool.query(
            `INSERT INTO friendships (user_id, friend_id, status)
             VALUES ($1, $2, 'pending')
             RETURNING *`,
            [req.user.user_id, friend_id]
        );

        res.status(201).json({ message: "Friend request sent", friendship: result.rows[0] });
    } catch (error) {
        console.error("SEND FRIEND REQUEST ERROR:", error);
        res.status(500).json({ message: "Server error while sending friend request", error: error.message });
    }
};

exports.updateFriendshipStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be accepted or rejected" });
    }

    try {
        const result = await pool.query(
            `UPDATE friendships
             SET status = $1
             WHERE friendship_id = $2 AND friend_id = $3 AND status = 'pending'
             RETURNING *`,
            [status, id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Pending friend request not found" });
        }

        res.status(200).json({ message: `Friend request ${status}`, friendship: result.rows[0] });
    } catch (error) {
        console.error("UPDATE FRIENDSHIP ERROR:", error);
        res.status(500).json({ message: "Server error while updating friendship", error: error.message });
    }
};

exports.deleteFriendship = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM friendships
             WHERE friendship_id = $1 AND (user_id = $2 OR friend_id = $2)
             RETURNING friendship_id`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Friendship not found" });
        }

        res.status(200).json({ message: "Friendship removed" });
    } catch (error) {
        console.error("DELETE FRIENDSHIP ERROR:", error);
        res.status(500).json({ message: "Server error while deleting friendship", error: error.message });
    }
};