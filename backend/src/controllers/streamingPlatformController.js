const pool = require("../config/db");

exports.getStreamingPlatforms = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM streaming_platforms ORDER BY name");
        res.status(200).json({ platforms: result.rows });
    } catch (error) {
        console.error("GET STREAMING PLATFORMS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching streaming platforms", error: error.message });
    }
};

exports.getStreamingPlatformById = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM streaming_platforms WHERE platform_id = $1", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Streaming platform not found" });
        }

        res.status(200).json({ platform: result.rows[0] });
    } catch (error) {
        console.error("GET STREAMING PLATFORM ERROR:", error);
        res.status(500).json({ message: "Server error while fetching streaming platform", error: error.message });
    }
};

exports.createStreamingPlatform = async (req, res) => {
    const { name, logo_url, country, url, subscription_type } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Platform name is required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO streaming_platforms (name, logo_url, country, url, subscription_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name.trim(), logo_url || null, country || null, url || null, subscription_type || null]
        );

        res.status(201).json({ message: "Streaming platform created successfully", platform: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Streaming platform already exists" });
        }

        console.error("CREATE STREAMING PLATFORM ERROR:", error);
        res.status(500).json({ message: "Server error while creating streaming platform", error: error.message });
    }
};

exports.updateStreamingPlatform = async (req, res) => {
    const { name, logo_url, country, url, subscription_type } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Platform name is required" });
    }

    try {
        const result = await pool.query(
            `UPDATE streaming_platforms
             SET name = $1, logo_url = $2, country = $3, url = $4, subscription_type = $5
             WHERE platform_id = $6
             RETURNING *`,
            [name.trim(), logo_url || null, country || null, url || null, subscription_type || null, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Streaming platform not found" });
        }

        res.status(200).json({ message: "Streaming platform updated successfully", platform: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Streaming platform already exists" });
        }

        console.error("UPDATE STREAMING PLATFORM ERROR:", error);
        res.status(500).json({ message: "Server error while updating streaming platform", error: error.message });
    }
};

exports.deleteStreamingPlatform = async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM streaming_platforms WHERE platform_id = $1 RETURNING platform_id",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Streaming platform not found" });
        }

        res.status(200).json({ message: "Streaming platform deleted successfully" });
    } catch (error) {
        console.error("DELETE STREAMING PLATFORM ERROR:", error);
        res.status(500).json({ message: "Server error while deleting streaming platform", error: error.message });
    }
};