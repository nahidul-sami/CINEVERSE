const pool = require("../config/db");

exports.getPlatforms = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT platform_id, name, logo_url, country, url, subscription_type
             FROM streaming_platforms
             ORDER BY name ASC`
        );
        res.status(200).json({ platforms: result.rows });
    } catch (error) {
        console.error("GET PLATFORMS ERROR:", error);
        res.status(500).json({ message: "Unable to load streaming platforms" });
    }
};

exports.createPlatform = async (req, res) => {
    const { name, logo_url, country, url, subscription_type } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Platform name is required" });

    try {
        const result = await pool.query(
            `INSERT INTO streaming_platforms (name, logo_url, country, url, subscription_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name.trim(), logo_url || null, country || null, url || null, subscription_type || null]
        );
        res.status(201).json({ message: "Platform created successfully", platform: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ message: "Platform already exists" });
        console.error("CREATE PLATFORM ERROR:", error);
        res.status(500).json({ message: "Unable to create streaming platform" });
    }
};

exports.updatePlatform = async (req, res) => {
    const { id } = req.params;
    const { name, logo_url, country, url, subscription_type } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Platform name is required" });

    try {
        const result = await pool.query(
            `UPDATE streaming_platforms
             SET name = $1, logo_url = $2, country = $3, url = $4, subscription_type = $5
             WHERE platform_id = $6
             RETURNING *`,
            [name.trim(), logo_url || null, country || null, url || null, subscription_type || null, id]
        );
        if (!result.rows.length) return res.status(404).json({ message: "Platform not found" });
        res.status(200).json({ message: "Platform updated successfully", platform: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") return res.status(409).json({ message: "Platform already exists" });
        console.error("UPDATE PLATFORM ERROR:", error);
        res.status(500).json({ message: "Unable to update streaming platform" });
    }
};

exports.deletePlatform = async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM streaming_platforms WHERE platform_id = $1 RETURNING platform_id",
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ message: "Platform not found" });
        res.status(200).json({ message: "Platform deleted successfully" });
    } catch (error) {
        console.error("DELETE PLATFORM ERROR:", error);
        res.status(500).json({ message: "Unable to delete streaming platform" });
    }
};

exports.attachPlatformToMovie = async (req, res) => {
    const { movieId } = req.params;
    const { platform_id, url } = req.body;
    if (!platform_id) return res.status(400).json({ message: "platform_id is required" });

    try {
        const result = await pool.query(
            `INSERT INTO movie_streaming (movie_id, platform_id, url)
             VALUES ($1, $2, $3)
             ON CONFLICT (movie_id, platform_id) DO UPDATE SET url = EXCLUDED.url
             RETURNING *`,
            [movieId, platform_id, url || null]
        );
        res.status(201).json({ message: "Platform attached to movie", streaming: result.rows[0] });
    } catch (error) {
        if (error.code === "23503") return res.status(404).json({ message: "Movie or platform not found" });
        console.error("ATTACH PLATFORM ERROR:", error);
        res.status(500).json({ message: "Unable to attach streaming platform" });
    }
};

exports.removePlatformFromMovie = async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM movie_streaming WHERE movie_id = $1 AND platform_id = $2 RETURNING movie_streaming_id",
            [req.params.movieId, req.params.platformId]
        );
        if (!result.rows.length) return res.status(404).json({ message: "Movie platform link not found" });
        res.status(200).json({ message: "Platform removed from movie" });
    } catch (error) {
        console.error("REMOVE PLATFORM ERROR:", error);
        res.status(500).json({ message: "Unable to remove streaming platform" });
    }
};
