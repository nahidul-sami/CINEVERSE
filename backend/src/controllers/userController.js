const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const safeUserFields = `
    u.user_id,
    u.name,
    u.username,
    u.display_name,
    u.bio,
    u.profile_image,
    u.email,
    u.role,
    u.created_at
`;

const normalizeProfileImage = (value) => {
    if (!value) return null;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return value.startsWith("/") ? `http://localhost:5000${value}` : `http://localhost:5000/${value}`;
};

const formatUser = (user) => ({
    user_id: user.user_id,
    name: user.name,
    username: user.username,
    display_name: user.display_name || user.name,
    bio: user.bio || "",
    profile_image: normalizeProfileImage(user.profile_image),
    email: user.email || null,
    role: user.role,
    created_at: user.created_at,
});

const getUserStats = async (userId) => {
    const [watchedRes, reviewRes, friendsRes, watchlistRes] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS watched FROM watch_history WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*)::int AS reviews FROM reviews WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*)::int AS friends FROM friendships WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'", [userId]),
        pool.query("SELECT COUNT(*)::int AS watchlists FROM watchlist WHERE user_id = $1", [userId]),
    ]);

    return {
        watched: Number(watchedRes.rows[0]?.watched || 0),
        reviews: Number(reviewRes.rows[0]?.reviews || 0),
        friends: Number(friendsRes.rows[0]?.friends || 0),
        watchlists: Number(watchlistRes.rows[0]?.watchlists || 0),
    };
};

const getRecentWatched = async (userId) => {
    const result = await pool.query(
        `SELECT wh.history_id, wh.watched_at, m.movie_id, m.title, m.poster_url, m.average_rating
         FROM watch_history wh
         JOIN movies m ON m.movie_id = wh.movie_id
         WHERE wh.user_id = $1
         ORDER BY wh.watched_at DESC
         LIMIT 4`,
        [userId]
    );
    return result.rows;
};

const getRecentReviews = async (userId) => {
    const result = await pool.query(
        `SELECT r.review_id, r.movie_id, r.rating, r.review_text, r.created_at,
                m.title, m.poster_url
         FROM reviews r
         JOIN movies m ON m.movie_id = r.movie_id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC
         LIMIT 3`,
        [userId]
    );
    return result.rows;
};

const getUserWatchlists = async (userId) => {
    const result = await pool.query(
        `SELECT watchlist_id, name, created_at
         FROM watchlist
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
    );
    return result.rows;
};

exports.getOwnProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ${safeUserFields}
             FROM users u
             WHERE u.user_id = $1`,
            [req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = result.rows[0];
        const stats = await getUserStats(req.user.user_id);
        const recentWatched = await getRecentWatched(req.user.user_id);
        const recentReviews = await getRecentReviews(req.user.user_id);
        const watchlists = await getUserWatchlists(req.user.user_id);

        res.status(200).json({
            success: true,
            user: formatUser(user),
            stats,
            recentWatched,
            recentReviews,
            watchlists,
        });
    } catch (error) {
        console.error("GET OWN PROFILE ERROR:", error);
        res.status(500).json({ message: "Server error while fetching profile" });
    }
};

exports.updateOwnProfile = async (req, res) => {
    const { name, username, display_name, bio } = req.body;
    const nextName = typeof name === "string" ? name.trim() : "";
    const nextUsername = typeof username === "string" ? username.trim() : "";
    const nextDisplayName = typeof display_name === "string" ? display_name.trim() : "";
    const nextBio = typeof bio === "string" ? bio.trim() : "";

    if (!nextName && !nextUsername && !nextDisplayName && !bio && bio !== "") {
        return res.status(400).json({ message: "No profile changes supplied" });
    }

    try {
        const current = await pool.query("SELECT user_id, username, name, display_name FROM users WHERE user_id = $1", [req.user.user_id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const safeName = nextName || current.rows[0].name;
        const safeUsername = nextUsername || current.rows[0].username;
        const safeDisplayName = nextDisplayName || current.rows[0].display_name || current.rows[0].name;

        if (safeUsername && safeUsername !== current.rows[0].username) {
            const duplicate = await pool.query("SELECT user_id FROM users WHERE username = $1 AND user_id <> $2", [safeUsername, req.user.user_id]);
            if (duplicate.rows.length > 0) {
                return res.status(409).json({ message: "This username is already taken" });
            }
        }

        const updated = await pool.query(
            `UPDATE users
             SET name = $1,
                 username = $2,
                 display_name = $3,
                 bio = $4
             WHERE user_id = $5
             RETURNING ${safeUserFields}`,
            [safeName, safeUsername, safeDisplayName, nextBio !== undefined ? nextBio : current.rows[0].bio || "", req.user.user_id]
        );

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: formatUser(updated.rows[0]),
        });
    } catch (error) {
        console.error("UPDATE OWN PROFILE ERROR:", error);
        res.status(500).json({ message: "Server error while updating profile" });
    }
};

exports.searchUsers = async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(Number(req.query.limit) || 8, 20);

    if (!q) {
        return res.status(200).json({ success: true, users: [] });
    }

    try {
        const result = await pool.query(
            `SELECT user_id, name, username, display_name, bio, profile_image
             FROM users
             WHERE LOWER(username) LIKE LOWER($1)
                OR LOWER(COALESCE(display_name, name)) LIKE LOWER($1)
                OR LOWER(name) LIKE LOWER($1)
             ORDER BY CASE
                 WHEN LOWER(username) = LOWER($2) THEN 0
                 WHEN LOWER(username) LIKE LOWER($2 || '%') THEN 1
                 ELSE 2
             END, name ASC
             LIMIT $3`,
            [`%${q}%`, q, limit]
        );

        res.status(200).json({
            success: true,
            users: result.rows.map((user) => ({
                user_id: user.user_id,
                name: user.name,
                username: user.username,
                display_name: user.display_name || user.name,
                bio: user.bio || "",
                profile_image: normalizeProfileImage(user.profile_image),
            })),
        });
    } catch (error) {
        console.error("SEARCH USERS ERROR:", error);
        res.status(500).json({ message: "Server error while searching users" });
    }
};

exports.getPublicProfile = async (req, res) => {
    const { userId } = req.params;

    if (!userId || Number.isNaN(Number(userId))) {
        return res.status(400).json({ message: "Valid user ID is required" });
    }

    try {
        const result = await pool.query(
            `SELECT user_id, name, username, display_name, bio, profile_image, created_at
             FROM users
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = result.rows[0];
        const stats = await getUserStats(Number(userId));
        const recentWatched = await getRecentWatched(Number(userId));
        const recentReviews = await getRecentReviews(Number(userId));
        const watchlists = await getUserWatchlists(Number(userId));

        res.status(200).json({
            success: true,
            user: {
                user_id: user.user_id,
                name: user.name,
                username: user.username,
                display_name: user.display_name || user.name,
                bio: user.bio || "",
                profile_image: normalizeProfileImage(user.profile_image),
                created_at: user.created_at,
            },
            stats,
            recentWatched,
            recentReviews,
            watchlists,
        });
    } catch (error) {
        console.error("GET PUBLIC PROFILE ERROR:", error);
        res.status(500).json({ message: "Server error while fetching public profile" });
    }
};

exports.uploadProfilePicture = async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "Please select an image file" });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
        return res.status(400).json({ message: "Only JPG, JPEG, PNG, and WEBP images are allowed" });
    }

    const uploadPath = path.join(__dirname, "../../uploads/profile");
    const relativePath = `/uploads/profile/${path.basename(file.path)}`;

    try {
        const updated = await pool.query(
            `UPDATE users
             SET profile_image = $1
             WHERE user_id = $2
             RETURNING ${safeUserFields}`,
            [relativePath, req.user.user_id]
        );

        if (updated.rows.length === 0) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            user: formatUser(updated.rows[0]),
        });
    } catch (error) {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        console.error("UPLOAD PROFILE PICTURE ERROR:", error);
        res.status(500).json({ message: "Server error while uploading profile picture" });
    }
};

exports.removeProfilePicture = async (req, res) => {
    try {
        const updated = await pool.query(
            `UPDATE users
             SET profile_image = NULL
             WHERE user_id = $1
             RETURNING ${safeUserFields}`,
            [req.user.user_id]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            success: true,
            message: "Profile picture removed successfully",
            user: formatUser(updated.rows[0]),
        });
    } catch (error) {
        console.error("REMOVE PROFILE PICTURE ERROR:", error);
        res.status(500).json({ message: "Server error while removing profile picture" });
    }
};
