const pool = require("../config/db");

exports.getAllPersons = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT person_id, name, birth_date, biography, profile_url, person_type
             FROM person
             ORDER BY name ASC, person_id ASC`
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("GET PERSONS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching persons", error: error.message });
    }
};

exports.getPersonById = async (req, res) => {
    const { id } = req.params;

    try {
        const personResult = await pool.query(
            `SELECT person_id, name, birth_date, biography, profile_url, person_type
             FROM person
             WHERE person_id = $1`,
            [id]
        );

        if (personResult.rows.length === 0) {
            return res.status(404).json({ message: "Person not found" });
        }

        const moviesResult = await pool.query(
            `SELECT m.movie_id, m.title, m.poster_url, mc.credit_type, mc.character_name
             FROM movies m
             JOIN movie_cast_crew mc ON mc.movie_id = m.movie_id
             WHERE mc.person_id = $1
             ORDER BY m.release_year DESC NULLS LAST, m.title ASC`,
            [id]
        );

        res.status(200).json({ person: personResult.rows[0], movies: moviesResult.rows });
    } catch (error) {
        console.error("GET PERSON ERROR:", error);
        res.status(500).json({ message: "Server error while fetching person", error: error.message });
    }
};

exports.createPerson = async (req, res) => {
    const { name, birth_date, biography, profile_url, person_type } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO person (name, birth_date, biography, profile_url, person_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING person_id, name, birth_date, biography, profile_url, person_type`,
            [name.trim(), birth_date || null, biography || null, profile_url || null, person_type || null]
        );

        res.status(201).json({ message: "Person added successfully", person: result.rows[0] });
    } catch (error) {
        console.error("ADD PERSON ERROR:", error);
        res.status(500).json({ message: "Server error while adding person", error: error.message });
    }
};

exports.updatePerson = async (req, res) => {
    const { id } = req.params;
    const { name, birth_date, biography, profile_url, person_type } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    try {
        const result = await pool.query(
            `UPDATE person
             SET name = $1, birth_date = $2, biography = $3, profile_url = $4, person_type = $5
             WHERE person_id = $6
             RETURNING person_id, name, birth_date, biography, profile_url, person_type`,
            [name.trim(), birth_date || null, biography || null, profile_url || null, person_type || null, id]
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
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM person WHERE person_id = $1 RETURNING person_id", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Person not found" });
        }

        res.status(200).json({ message: "Person deleted successfully" });
    } catch (error) {
        console.error("DELETE PERSON ERROR:", error);
        res.status(500).json({ message: "Server error while deleting person", error: error.message });
    }
};

exports.addMovieCredit = async (req, res) => {
    const { movieId } = req.params;
    const { person_id, credit_type, character_name } = req.body;

    if (!person_id || !credit_type) {
        return res.status(400).json({ message: "person_id and credit_type are required" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO movie_cast_crew (movie_id, person_id, credit_type, character_name)
             VALUES ($1, $2, $3, $4)
             RETURNING movie_id, person_id, credit_type, character_name`,
            [movieId, person_id, credit_type.trim(), character_name || null]
        );

        res.status(201).json({ message: "Movie credit added successfully", credit: result.rows[0] });
    } catch (error) {
        console.error("ADD MOVIE CREDIT ERROR:", error);
        if (error.code === "23505") {
            return res.status(409).json({ message: "This person already has this credit on the movie" });
        }
        res.status(500).json({ message: "Server error while adding movie credit", error: error.message });
    }
};

exports.removeMovieCredit = async (req, res) => {
    const { movieId, personId, creditType } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM movie_cast_crew
             WHERE movie_id = $1 AND person_id = $2 AND credit_type = $3
             RETURNING movie_id, person_id, credit_type`,
            [movieId, personId, creditType]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Movie credit not found" });
        }

        res.status(200).json({ message: "Movie credit removed successfully" });
    } catch (error) {
        console.error("REMOVE MOVIE CREDIT ERROR:", error);
        res.status(500).json({ message: "Server error while removing movie credit", error: error.message });
    }
};