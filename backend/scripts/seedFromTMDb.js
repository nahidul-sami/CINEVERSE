/**
 * seedFromTMDb.js
 *
 * One-time / re-runnable script that pulls real movie data (title, description,
 * poster, trailer, cast, crew, genres) from The Movie Database (TMDb) free API
 * and inserts it into the CINEVERSE database using the exact schema in
 * database/schema.sql — raw parameterized SQL only, no ORM.
 *
 * SETUP:
 *   1. Add TMDB_API_KEY=<your_v3_api_key> to backend/.env
 *   2. Run:  node scripts/seedFromTMDb.js
 *      (optionally: node scripts/seedFromTMDb.js 100   -> fetch 100 movies instead of the default 40)
 *
 * Requires Node 18+ (for built-in fetch). If your Node version is older,
 * run:  npm install node-fetch --save-dev   and uncomment the require below.
 */

// const fetch = require("node-fetch"); // uncomment if Node < 18
require("dotenv").config();
const pool = require("../src/config/db");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const TARGET_MOVIE_COUNT = Number(process.argv[2]) || 40;

if (!TMDB_API_KEY) {
    console.error("Missing TMDB_API_KEY in backend/.env — get a free key at https://www.themoviedb.org/settings/api");
    process.exit(1);
}

async function tmdbGet(path, params = {}) {
    const url = new URL(TMDB_BASE + path);
    url.searchParams.set("api_key", TMDB_API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDb request failed (${res.status}): ${path}`);
    return res.json();
}

// --- Genres: fetch TMDb's genre list, insert any missing ones into our `genres` table ---
async function syncGenres() {
    const { genres } = await tmdbGet("/genre/movie/list");
    const nameToOurId = {};

    for (const g of genres) {
        const existing = await pool.query("SELECT genre_id FROM genres WHERE name = $1", [g.name]);
        if (existing.rows.length > 0) {
            nameToOurId[g.id] = existing.rows[0].genre_id;
        } else {
            const inserted = await pool.query(
                "INSERT INTO genres (name) VALUES ($1) RETURNING genre_id",
                [g.name]
            );
            nameToOurId[g.id] = inserted.rows[0].genre_id;
        }
    }
    return nameToOurId; // maps TMDb genre_id -> our genres.genre_id
}

// --- Person: find-or-create by name (person table has no unique constraint, so we check first) ---
async function findOrCreatePerson(name, profileUrl, personType, birthDate = null, biography = null) {
    const existing = await pool.query("SELECT person_id FROM person WHERE name = $1", [name]);
    if (existing.rows.length > 0) return existing.rows[0].person_id;

    const inserted = await pool.query(
        `INSERT INTO person (name, birth_date, biography, profile_url, person_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING person_id`,
        [name, birthDate, biography, profileUrl, personType]
    );
    return inserted.rows[0].person_id;
}

async function seedMovie(tmdbMovie, genreMap) {
    // Skip if a movie with this exact title already exists (keeps the script safely re-runnable)
    const existing = await pool.query("SELECT movie_id FROM movies WHERE title = $1", [tmdbMovie.title]);
    if (existing.rows.length > 0) {
        console.log(`  Skipping "${tmdbMovie.title}" — already in database`);
        return;
    }

    // append_to_response pulls videos + credits in the SAME request (saves API calls)
    const detail = await tmdbGet(`/movie/${tmdbMovie.id}`, { append_to_response: "videos,credits" });

    const trailer = (detail.videos?.results || []).find(
        (v) => v.site === "YouTube" && v.type === "Trailer"
    );
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    const posterUrl = detail.poster_path ? `${IMG_BASE}${detail.poster_path}` : null;
    const backdropUrl = detail.backdrop_path ? `${IMG_BASE}${detail.backdrop_path}` : null;
    const releaseYear = detail.release_date ? Number(detail.release_date.slice(0, 4)) : null;

    const movieResult = await pool.query(
        `INSERT INTO movies (title, release_year, rating, language, trailer_url, poster_url, backdrop_url, description, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING movie_id`,
        [
            detail.title,
            releaseYear,
            detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null,
            detail.original_language || null,
            trailerUrl,
            posterUrl,
            backdropUrl,
            detail.overview || null,
            detail.runtime || null,
        ]
    );
    const movieId = movieResult.rows[0].movie_id;
    console.log(`  Inserted "${detail.title}" (movie_id ${movieId})`);

    // Genres — link via movie_genres junction table
    for (const g of detail.genres || []) {
        const ourGenreId = genreMap[g.id];
        if (ourGenreId) {
            await pool.query(
                "INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [movieId, ourGenreId]
            );
        }
    }

    // Cast — top 6 billed actors
    const topCast = (detail.credits?.cast || []).slice(0, 6);
    for (const actor of topCast) {
        const profileUrl = actor.profile_path ? `${IMG_BASE}${actor.profile_path}` : null;
        const personId = await findOrCreatePerson(actor.name, profileUrl, "actor");
        await pool.query(
            `INSERT INTO movie_cast_crew (movie_id, person_id, credit_type, character_name)
             VALUES ($1, $2, 'actor', $3)
             ON CONFLICT DO NOTHING`,
            [movieId, personId, actor.character || null]
        );
    }

    // Crew — director(s) only
    const directors = (detail.credits?.crew || []).filter((c) => c.job === "Director");
    for (const director of directors) {
        const profileUrl = director.profile_path ? `${IMG_BASE}${director.profile_path}` : null;
        const personId = await findOrCreatePerson(director.name, profileUrl, "director");
        await pool.query(
            `INSERT INTO movie_cast_crew (movie_id, person_id, credit_type, character_name)
             VALUES ($1, $2, 'director', NULL)
             ON CONFLICT DO NOTHING`,
            [movieId, personId]
        );
    }

    // Gallery images — extra stills from TMDb
    try {
        const imagesData = await tmdbGet(`/movie/${tmdbMovie.id}/images`);
        const galleryShots = (imagesData.backdrops || []).slice(0, 6);
        for (const img of galleryShots) {
            await pool.query(
                `INSERT INTO movie_images (movie_id, image_url, image_type) VALUES ($1, $2, 'gallery')`,
                [movieId, `${IMG_BASE}${img.file_path}`]
            );
        }
    } catch (err) {
        console.log(`  Gallery images fetch failed for "${detail.title}": ${err.message}`);
    }

    // Streaming platforms — watch provider data for US region
    try {
        const providersData = await tmdbGet(`/movie/${tmdbMovie.id}/watch/providers`);
        const usProviders = providersData.results?.US?.flatrate || [];
        for (const provider of usProviders.slice(0, 5)) {
            const existingPlatform = await pool.query(
                "SELECT platform_id FROM streaming_platforms WHERE name = $1",
                [provider.provider_name]
            );
            let platformId;
            if (existingPlatform.rows.length > 0) {
                platformId = existingPlatform.rows[0].platform_id;
            } else {
                const inserted = await pool.query(
                    `INSERT INTO streaming_platforms (name, logo_url, country, subscription_type) VALUES ($1, $2, 'US', 'subscription') RETURNING platform_id`,
                    [provider.provider_name, provider.logo_path ? `${IMG_BASE}${provider.logo_path}` : null]
                );
                platformId = inserted.rows[0].platform_id;
            }
            await pool.query(
                `INSERT INTO movie_streaming (movie_id, platform_id) VALUES ($1, $2) ON CONFLICT (movie_id, platform_id) DO NOTHING`,
                [movieId, platformId]
            );
        }
    } catch (err) {
        console.log(`  Streaming platforms fetch failed for "${detail.title}": ${err.message}`);
    }
}

async function run() {
    console.log("Syncing genres from TMDb...");
    const genreMap = await syncGenres();
    console.log(`  ${Object.keys(genreMap).length} genres synced.`);

    console.log(`Fetching top-rated movies from TMDb (target: ${TARGET_MOVIE_COUNT})...`);
    let collected = [];
    let page = 1;
    while (collected.length < TARGET_MOVIE_COUNT) {
        const { results } = await tmdbGet("/movie/top_rated", { page });
        collected = collected.concat(results);
        page += 1;
        if (page > 20) break; // safety stop
    }
    collected = collected.slice(0, TARGET_MOVIE_COUNT);

    console.log(`Inserting ${collected.length} movies (with cast, crew, genres)...`);
    for (const movie of collected) {
        try {
            await seedMovie(movie, genreMap);
        } catch (err) {
            console.error(`  Failed on "${movie.title}":`, err.message);
        }
        // Be polite to the free-tier rate limit
        await new Promise((r) => setTimeout(r, 250));
    }

    console.log("Done.");
    await pool.end();
}

run().catch((err) => {
    console.error("SEED SCRIPT FAILED:", err);
    process.exit(1);
});