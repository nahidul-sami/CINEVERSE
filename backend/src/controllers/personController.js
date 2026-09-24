const pool = require("../config/db");
const { tmdbGet, tmdbImage } = require("../utils/tmdbClient");

const personTypeFromDepartment = (department) => ({
    Acting: "actor",
    Directing: "director",
    Production: "producer",
    Writing: "writer"
}[department] || (department ? department.toLowerCase() : "actor"));

const creditTypeFromCredit = (credit, isCast = false) => {
    if (isCast) return "actor";
    if (credit.job === "Director") return "director";
    if (credit.department === "Production") return "producer";
    if (credit.department === "Writing" || ["Writer", "Screenplay", "Story"].includes(credit.job)) return "writer";
    return credit.department ? credit.department.toLowerCase() : "crew";
};

const personDetailsQuery = `
    SELECT p.person_id, p.name, p.birth_date, p.biography, p.profile_url, p.person_type,
           m.movie_id, m.title, m.poster_url, m.release_year, mc.credit_type, mc.character_name
    FROM person p
    LEFT JOIN movie_cast_crew mc ON mc.person_id = p.person_id
    LEFT JOIN movies m ON m.movie_id = mc.movie_id
    WHERE p.person_id = $1
    ORDER BY m.release_year DESC NULLS LAST, m.title ASC`;

const readPersonWithMovies = async (client, personId) => {
    const result = await client.query(personDetailsQuery, [personId]);
    if (result.rows.length === 0) return null;

    const firstRow = result.rows[0];
    const person = {
        person_id: firstRow.person_id,
        name: firstRow.name,
        birth_date: firstRow.birth_date,
        biography: firstRow.biography,
        profile_url: firstRow.profile_url,
        person_type: firstRow.person_type
    };
    person.movies = result.rows.filter((row) => row.movie_id).map((row) => ({
        movie_id: row.movie_id,
        title: row.title,
        poster_url: row.poster_url,
        release_year: row.release_year,
        credit_type: row.credit_type,
        character_name: row.character_name
    }));
    return person;
};

const hydratePersonFromTmdb = async (tmdbId) => {
    const detail = await tmdbGet(`/person/${tmdbId}`, { append_to_response: "movie_credits,external_ids" });

    return pool.withTransaction(async (client) => {
        const existingPerson = await client.query(
            `SELECT person_id FROM person WHERE LOWER(name) = LOWER($1) ORDER BY person_id LIMIT 1`,
            [detail.name]
        );
        let personId = existingPerson.rows[0]?.person_id;

        if (!personId) {
            const insertedPerson = await client.query(
                `INSERT INTO person (name, birth_date, biography, profile_url, person_type)
                 VALUES ($1, $2, $3, $4, $5) RETURNING person_id`,
                [
                    detail.name,
                    detail.birthday || null,
                    detail.biography || null,
                    tmdbImage(detail.profile_path),
                    personTypeFromDepartment(detail.known_for_department)
                ]
            );
            personId = insertedPerson.rows[0].person_id;
        } else {
            await client.query(
                `UPDATE person
                 SET birth_date = COALESCE(birth_date, $1),
                     biography = COALESCE(biography, $2),
                     profile_url = COALESCE(profile_url, $3),
                     person_type = COALESCE(person_type, $4)
                 WHERE person_id = $5`,
                [
                    detail.birthday || null,
                    detail.biography || null,
                    tmdbImage(detail.profile_path),
                    personTypeFromDepartment(detail.known_for_department),
                    personId
                ]
            );
        }

        const credits = [
            ...(detail.movie_credits?.cast || []).map((credit) => ({ ...credit, isCast: true })),
            ...(detail.movie_credits?.crew || [])
        ];
        const uniqueCredits = new Map();

        for (const credit of credits) {
            if (!credit.id || !credit.title) continue;
            const creditType = creditTypeFromCredit(credit, credit.isCast);
            const key = `${credit.id}-${creditType}`;
            if (!uniqueCredits.has(key)) uniqueCredits.set(key, { credit, creditType });
        }

        for (const { credit, creditType } of uniqueCredits.values()) {
            let movieResult = await client.query("SELECT movie_id FROM movies WHERE title = $1 LIMIT 1", [credit.title]);
            let movieId = movieResult.rows[0]?.movie_id;

            if (!movieId) {
                const releaseYear = credit.release_date ? Number(credit.release_date.slice(0, 4)) : null;
                const insertedMovie = await client.query(
                    `INSERT INTO movies (title, release_year, rating, language, trailer_url, poster_url, backdrop_url, description, duration)
                     VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8) RETURNING movie_id`,
                    [
                        credit.title,
                        releaseYear,
                        credit.vote_average === undefined ? null : Number(Number(credit.vote_average).toFixed(1)),
                        credit.original_language || null,
                        tmdbImage(credit.poster_path),
                        tmdbImage(credit.backdrop_path, "w1280"),
                        credit.overview || null,
                        credit.runtime || null
                    ]
                );
                movieId = insertedMovie.rows[0].movie_id;
            }

            await client.query(
                `INSERT INTO movie_cast_crew (movie_id, person_id, credit_type, character_name)
                 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                [movieId, personId, creditType, credit.character || null]
            );
        }

        return readPersonWithMovies(client, personId);
    });
};

exports.searchPersons = async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 20);

    if (!query) {
        return res.status(200).json({ persons: [] });
    }

    try {
        const result = await pool.query(
            `SELECT person_id, name, biography, profile_url, person_type
             FROM person
             WHERE name ILIKE $1
                OR person_type ILIKE $1
             ORDER BY CASE WHEN LOWER(name) = LOWER($2) THEN 0 ELSE 1 END, name ASC
             LIMIT $3`,
            [`%${query}%`, query, limit]
        );

        if (result.rows.length > 0) return res.status(200).json({ persons: result.rows });

        const tmdbResult = await tmdbGet("/search/person", { query, include_adult: "false", page: 1 });
        return res.status(200).json({
            persons: (tmdbResult.results || []).slice(0, 10).map((person) => ({
                tmdb_id: person.id,
                name: person.name,
                profile_path: person.profile_path,
                profile_url: tmdbImage(person.profile_path),
                person_type: personTypeFromDepartment(person.known_for_department)
            }))
        });
    } catch (error) {
        console.error("SEARCH PERSONS ERROR:", error);
        res.status(500).json({ message: "Server error while searching people" });
    }
};

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
        const result = await pool.withTransaction((client) => client.query(
            `INSERT INTO person (name, birth_date, biography, profile_url, person_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING person_id, name, birth_date, biography, profile_url, person_type`,
            [name.trim(), birth_date || null, biography || null, profile_url || null, person_type || null]
        ));

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
        const result = await pool.withTransaction((client) => client.query(
            `UPDATE person
             SET name = $1, birth_date = $2, biography = $3, profile_url = $4, person_type = $5
             WHERE person_id = $6
             RETURNING person_id, name, birth_date, biography, profile_url, person_type`,
            [name.trim(), birth_date || null, biography || null, profile_url || null, person_type || null, id]
        ));

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
        const result = await pool.withTransaction((client) => client.query("DELETE FROM person WHERE person_id = $1 RETURNING person_id", [id]));

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
        const result = await pool.withTransaction((client) => client.query(
            `INSERT INTO movie_cast_crew (movie_id, person_id, credit_type, character_name)
             VALUES ($1, $2, $3, $4)
             RETURNING movie_id, person_id, credit_type, character_name`,
            [movieId, person_id, credit_type.trim(), character_name || null]
        ));

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
        const result = await pool.withTransaction((client) => client.query(
            `DELETE FROM movie_cast_crew
             WHERE movie_id = $1 AND person_id = $2 AND credit_type = $3
             RETURNING movie_id, person_id, credit_type`,
            [movieId, personId, creditType]
        ));

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Movie credit not found" });
        }

        res.status(200).json({ message: "Movie credit removed successfully" });
    } catch (error) {
        console.error("REMOVE MOVIE CREDIT ERROR:", error);
        res.status(500).json({ message: "Server error while removing movie credit", error: error.message });
    }
};

exports.getPersonDetail = async (req, res) => {
    const personId = Number(req.params.id);
    if (!Number.isInteger(personId) || personId < 1) return res.status(400).json({ message: "Valid person ID is required" });

    try {
        const person = await readPersonWithMovies(pool, personId);
        if (!person) return res.status(404).json({ message: "Person not found" });
        res.status(200).json({ person });
    } catch (error) {
        console.error("GET PERSON DETAIL ERROR:", error);
        res.status(500).json({ message: "Server error while fetching person details" });
    }
};

exports.getPersonFromTmdb = async (req, res) => {
    try {
        const person = await hydratePersonFromTmdb(req.params.tmdbId);
        res.status(200).json({ person, fetched_from_tmdb: true });
    } catch (error) {
        console.error("GET TMDB PERSON ERROR:", error);
        res.status(502).json({ message: "Unable to fetch person details from TMDb" });
    }
};

exports.getSimilarPersons = async (req, res) => {
    const personId = Number(req.params.id);
    if (!Number.isInteger(personId) || personId < 1) return res.status(400).json({ message: "Valid person ID is required" });

    try {
        const local = await pool.query(
            `SELECT person_id, name, profile_url, person_type
             FROM person
             WHERE person_type = (SELECT person_type FROM person WHERE person_id = $1)
               AND person_id <> $1
             ORDER BY person_id DESC LIMIT 8`,
            [personId]
        );
        const persons = local.rows.map((person) => ({ ...person, source: "local" }));
        if (persons.length < 8) {
            const popular = await tmdbGet("/person/popular", { page: 1 });
            const existingNames = new Set(persons.map((person) => person.name.toLowerCase()));
            persons.push(...(popular.results || [])
                .filter((person) => !existingNames.has(person.name.toLowerCase()))
                .slice(0, 8 - persons.length)
                .map((person) => ({
                    tmdb_id: person.id,
                    name: person.name,
                    profile_url: tmdbImage(person.profile_path),
                    profile_path: person.profile_path,
                    person_type: personTypeFromDepartment(person.known_for_department),
                    source: "tmdb"
                })));
        }
        res.status(200).json({ persons });
    } catch (error) {
        console.error("GET SIMILAR PERSONS ERROR:", error);
        res.status(500).json({ message: "Unable to load similar people" });
    }
};