const pool = require("../config/db");

exports.getPeople = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM person ORDER BY name");
        res.status(200).json({ people: result.rows });
    } catch (error) {
        console.error("GET PEOPLE ERROR:", error);
        res.status(500).json({ message: "Server error while fetching people", error: error.message });
    }
};

exports.getPersonById = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM person WHERE person_id = $1", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Person not found" });
        }

        res.status(200).json({ person: result.rows[0] });
    } catch (error) {
        console.error("GET PERSON ERROR:", error);
        res.status(500).json({ message: "Server error while fetching person", error: error.message });
    }
};

exports.createPerson = async (req, res) => {
    const { name, birth_date, biography, profile_url, person_type } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Person name is required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO person (name, birth_date, biography, profile_url, person_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name.trim(), birth_date || null, biography || null, profile_url || null, person_type || null]
        );

        res.status(201).json({ message: "Person created successfully", person: result.rows[0] });
    } catch (error) {
        console.error("CREATE PERSON ERROR:", error);
        res.status(500).json({ message: "Server error while creating person", error: error.message });
    }
};

exports.updatePerson = async (req, res) => {
    const { name, birth_date, biography, profile_url, person_type } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Person name is required" });
    }

    try {
        const result = await pool.query(
            `UPDATE person
             SET name = $1, birth_date = $2, biography = $3, profile_url = $4, person_type = $5
             WHERE person_id = $6
             RETURNING *`,
            [name.trim(), birth_date || null, biography || null, profile_url || null, person_type || null, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Person not found" });
        }

        res.status(200).json({ message: "Person updated successfully", person: result.rows[0] });
    } catch (error) {
        console.error("UPDATE PERSON ERROR:", error);
        res.status(500).json({ message: "Server error while updating person", error: error.message });
    }
};

exports.deletePerson = async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM person WHERE person_id = $1 RETURNING person_id", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Person not found" });
        }

        res.status(200).json({ message: "Person deleted successfully" });
    } catch (error) {
        console.error("DELETE PERSON ERROR:", error);
        res.status(500).json({ message: "Server error while deleting person", error: error.message });
    }
};