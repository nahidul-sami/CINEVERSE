require("dotenv").config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

async function tmdbGet(path, params = {}) {
    if (!TMDB_API_KEY) {
        throw new Error("Missing TMDB_API_KEY in backend/.env");
    }

    const url = new URL(TMDB_BASE + path);
    url.searchParams.set("api_key", TMDB_API_KEY);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`TMDb request failed (${response.status}): ${path}`);
    }

    console.log(`TMDb request: ${path}`);
    return response.json();
}

const tmdbImage = (path, size = "w500") => path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

module.exports = { tmdbGet, tmdbImage };