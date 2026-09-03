const pool = require("../config/db");

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
            `SELECT friendship_id
             FROM friendships
             WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
               AND status != 'rejected'`,
            [req.user.user_id, friend_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: "Friend request already exists or you are already friends" });
        }

        const result = await pool.query(
            "INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending') RETURNING *",
            [req.user.user_id, friend_id]
        );

        res.status(201).json({ message: "Friend request sent successfully", friendship: result.rows[0] });
    } catch (error) {
        console.error("SEND FRIEND REQUEST ERROR:", error);
        res.status(500).json({ message: "Server error while sending friend request", error: error.message });
    }
};

exports.respondToFriendRequest = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be accepted or rejected" });
    }

    try {
        const friendship = await pool.query("SELECT * FROM friendships WHERE friendship_id = $1", [id]);

        if (friendship.rows.length === 0) {
            return res.status(404).json({ message: "Friend request not found" });
        }

        const row = friendship.rows[0];
        if (Number(row.friend_id) !== Number(req.user.user_id)) {
            return res.status(403).json({ message: "Only the recipient can respond to this friend request" });
        }

        if (row.status !== 'pending') {
            return res.status(409).json({ message: "Friend request has already been answered" });
        }

        const result = await pool.query(
            "UPDATE friendships SET status = $1 WHERE friendship_id = $2 RETURNING *",
            [status, id]
        );

        res.status(200).json({ message: "Friend request updated successfully", friendship: result.rows[0] });
    } catch (error) {
        console.error("RESPOND TO FRIEND REQUEST ERROR:", error);
        res.status(500).json({ message: "Server error while responding to friend request", error: error.message });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.friendship_id, f.status, f.created_at,
                    u.user_id, u.name, u.email
             FROM friendships f
             JOIN users u ON u.user_id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
             WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
             ORDER BY f.created_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ friends: result.rows });
    } catch (error) {
        console.error("GET FRIENDS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching friends", error: error.message });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.friendship_id, f.status, f.created_at,
                    u.user_id AS sender_id, u.name AS sender_name, u.email AS sender_email
             FROM friendships f
             JOIN users u ON u.user_id = f.user_id
             WHERE f.friend_id = $1 AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ requests: result.rows });
    } catch (error) {
        console.error("GET PENDING FRIEND REQUESTS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching pending friend requests", error: error.message });
    }
};

exports.getSentRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.friendship_id, f.status, f.created_at,
                    u.user_id AS recipient_id, u.name AS recipient_name, u.email AS recipient_email
             FROM friendships f
             JOIN users u ON u.user_id = f.friend_id
             WHERE f.user_id = $1 AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [req.user.user_id]
        );

        res.status(200).json({ requests: result.rows });
    } catch (error) {
        console.error("GET SENT FRIEND REQUESTS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching sent friend requests", error: error.message });
    }
};

exports.removeFriend = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM friendships WHERE friendship_id = $1 AND (user_id = $2 OR friend_id = $2) RETURNING friendship_id",
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Friendship not found" });
        }

        res.status(200).json({ message: "Friendship removed successfully" });
    } catch (error) {
        console.error("REMOVE FRIEND ERROR:", error);
        res.status(500).json({ message: "Server error while removing friendship", error: error.message });
    }
};

exports.lookupUserByEmail = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const result = await pool.query("SELECT user_id, name FROM users WHERE email = $1", [email.trim()]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user: result.rows[0] });
    } catch (error) {
        console.error("LOOKUP USER BY EMAIL ERROR:", error);
        res.status(500).json({ message: "Server error while looking up user", error: error.message });
    }
};