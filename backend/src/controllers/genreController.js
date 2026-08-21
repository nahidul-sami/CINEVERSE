const pool = require("../config/db");

exports.getGenres = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM genres ORDER BY name");
        res.status(200).json({ genres: result.rows });
    } catch (error) {
        console.error("GET GENRES ERROR:", error);
        res.status(500).json({ message: "Server error while fetching genres", error: error.message });
    }
};

exports.getGenreById = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM genres WHERE genre_id = $1", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Genre not found" });
        }

        res.status(200).json({ genre: result.rows[0] });
    } catch (error) {
        console.error("GET GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while fetching genre", error: error.message });
    }
};

exports.createGenre = async (req, res) => {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Genre name is required" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO genres (name, description) VALUES ($1, $2) RETURNING *",
            [name.trim(), description || null]
        );
        res.status(201).json({ message: "Genre created successfully", genre: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Genre already exists" });
        }

        console.error("CREATE GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while creating genre", error: error.message });
    }
};

exports.updateGenre = async (req, res) => {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Genre name is required" });
    }

    try {
        const result = await pool.query(
            "UPDATE genres SET name = $1, description = $2 WHERE genre_id = $3 RETURNING *",
            [name.trim(), description || null, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Genre not found" });
        }

        res.status(200).json({ message: "Genre updated successfully", genre: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "Genre already exists" });
        }

        console.error("UPDATE GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while updating genre", error: error.message });
    }
};

exports.deleteGenre = async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM genres WHERE genre_id = $1 RETURNING genre_id", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Genre not found" });
        }

        res.status(200).json({ message: "Genre deleted successfully" });
    } catch (error) {
        console.error("DELETE GENRE ERROR:", error);
        res.status(500).json({ message: "Server error while deleting genre", error: error.message });
    }
};