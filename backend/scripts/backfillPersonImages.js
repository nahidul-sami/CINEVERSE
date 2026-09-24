/**
 * backfillPersonImages.js
 *
 * Finds existing people without profile_url, matches them on TMDb, and stores
 * their profile image URL in person.profile_url.
 *
 * RUN:
 *   node scripts/backfillPersonImages.js
 *
 * The migration must be applied first:
 *   node scripts/runMigration.js ../database/migrations/012_ensure_person_profile_images.sql
 */

require("dotenv").config();
const pool = require("../src/config/db");
const { tmdbGet, tmdbImage } = require("../src/utils/tmdbClient");

async function findTmdbPerson(name) {
    const result = await tmdbGet("/search/person", {
        query: name,
        include_adult: "false",
        page: 1
    });
    const people = result.results || [];
    return people.find((person) => person.name.toLowerCase() === name.toLowerCase()) || people[0] || null;
}

async function backfillPerson(person) {
    const match = await findTmdbPerson(person.name);
    if (!match) {
        console.log(`  Could not find "${person.name}" on TMDb — skipping`);
        return;
    }

    const detail = await tmdbGet(`/person/${match.id}`);
    let profilePath = detail.profile_path || match.profile_path;

    if (!profilePath) {
        const images = await tmdbGet(`/person/${match.id}/images`);
        profilePath = images.profiles?.[0]?.file_path || null;
    }

    const profileUrl = tmdbImage(profilePath);
    if (!profileUrl) {
        console.log(`  No profile image found for "${person.name}" — skipping`);
        return;
    }

    await pool.withTransaction(async (client) => {
        const result = await client.query(
            `UPDATE person
             SET profile_url = $1
             WHERE person_id = $2
               AND (profile_url IS NULL OR profile_url = '')`,
            [profileUrl, person.person_id]
        );
        if (result.rowCount > 0) console.log(`  Profile image saved for "${person.name}"`);
    });
}

async function run() {
    const result = await pool.query(
        `SELECT person_id, name
         FROM person
         WHERE profile_url IS NULL OR profile_url = ''
         ORDER BY person_id`
    );

    console.log(`Checking ${result.rows.length} people without profile images...`);
    for (const person of result.rows) {
        try {
            await backfillPerson(person);
        } catch (error) {
            console.error(`  Failed enriching "${person.name}":`, error.message);
        }
    }

    console.log("Person image backfill complete.");
    await pool.end();
}

run().catch((error) => {
    console.error("PERSON IMAGE BACKFILL FAILED:", error);
    process.exit(1);
});
