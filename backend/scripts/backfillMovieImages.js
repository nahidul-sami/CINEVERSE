/**
 * backfillMovieImages.js
 *
 * For movies that already exist in the database (inserted before the
 * backdrop_url / movie_images / streaming-platform features existed, or by
 * an earlier run of seedFromTMDb.js), this script:
 *   1. Finds movies missing backdrop_url, gallery images, or streaming data
 *   2. Searches TMDb by title to find the matching movie
 *   3. Fills in whatever is missing — does NOT touch movies that already
 *      have complete data, and does NOT insert duplicate movie rows.
 *
 * SETUP: same as seedFromTMDb.js — TMDB_API_KEY must be in backend/.env
 * RUN:   node scripts/backfillMovieImages.js
 */

require("dotenv").config();
const pool = require("../src/config/db");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

if (!TMDB_API_KEY) {
    console.error("Missing TMDB_API_KEY in backend/.env");
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

async function findTmdbIdByTitle(title, releaseYear) {
    const { results } = await tmdbGet("/search/movie", { query: title });
    if (!results || results.length === 0) return null;
    // Prefer a result whose release year matches, to avoid remakes/mismatches
    const yearMatch = releaseYear
        ? results.find((r) => r.release_date && r.release_date.startsWith(String(releaseYear)))
        : null;
    return (yearMatch || results[0]).id;
}

async function backfillOneMovie(movie) {
    const needsBackdrop = !movie.backdrop_url;
    const galleryCount = Number(movie.gallery_count);
    const streamingCount = Number(movie.streaming_count);
    const needsGallery = galleryCount === 0;
    const needsStreaming = streamingCount === 0;

    if (!needsBackdrop && !needsGallery && !needsStreaming) {
        console.log(`  Skipping "${movie.title}" — already complete`);
        return;
    }

    const tmdbId = await findTmdbIdByTitle(movie.title, movie.release_year);
    if (!tmdbId) {
        console.log(`  Could not find "${movie.title}" on TMDb — skipping`);
        return;
    }

    try {
        if (needsBackdrop) {
            const detail = await tmdbGet(`/movie/${tmdbId}`);
            if (detail.backdrop_path) {
                await pool.query("UPDATE movies SET backdrop_url = $1 WHERE movie_id = $2", [
                    `${IMG_BASE}${detail.backdrop_path}`,
                    movie.movie_id,
                ]);
                console.log(`  Backdrop added for "${movie.title}"`);
            }
        }

        if (needsGallery) {
            const imagesData = await tmdbGet(`/movie/${tmdbId}/images`);
            const shots = (imagesData.backdrops || []).slice(0, 6);
            for (const img of shots) {
                await pool.query(
                    "INSERT INTO movie_images (movie_id, image_url, image_type) VALUES ($1, $2, 'gallery')",
                    [movie.movie_id, `${IMG_BASE}${img.file_path}`]
                );
            }
            if (shots.length > 0) console.log(`  ${shots.length} gallery images added for "${movie.title}"`);
        }

        if (needsStreaming) {
            const providersData = await tmdbGet(`/movie/${tmdbId}/watch/providers`);
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
                        "INSERT INTO streaming_platforms (name, logo_url, country, subscription_type) VALUES ($1, $2, 'US', 'subscription') RETURNING platform_id",
                        [provider.provider_name, provider.logo_path ? `${IMG_BASE}${provider.logo_path}` : null]
                    );
                    platformId = inserted.rows[0].platform_id;
                }
                await pool.query(
                    "INSERT INTO movie_streaming (movie_id, platform_id) VALUES ($1, $2) ON CONFLICT (movie_id, platform_id) DO NOTHING",
                    [movie.movie_id, platformId]
                );
            }
            if (usProviders.length > 0) console.log(`  Streaming platforms added for "${movie.title}"`);
        }
    } catch (err) {
        console.error(`  Failed enriching "${movie.title}":`, err.message);
    }
}

async function run() {
    const result = await pool.query(`
        SELECT m.movie_id, m.title, m.release_year, m.backdrop_url,
               (SELECT COUNT(*) FROM movie_images mi WHERE mi.movie_id = m.movie_id) AS gallery_count,
               (SELECT COUNT(*) FROM movie_streaming ms WHERE ms.movie_id = m.movie_id) AS streaming_count
        FROM movies m
        ORDER BY m.movie_id
    `);

    console.log(`Checking ${result.rows.length} existing movies for missing backdrop/gallery/streaming data...`);

    for (const movie of result.rows) {
        await backfillOneMovie(movie);
        await new Promise((r) => setTimeout(r, 250)); // stay polite to TMDb's rate limit
    }

    console.log("Backfill complete.");
    await pool.end();
}

run().catch((err) => {
    console.error("BACKFILL SCRIPT FAILED:", err);
    process.exit(1);
});