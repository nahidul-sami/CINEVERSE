require("dotenv").config();
const pool = require("../src/config/db");

async function verifyImplementation() {
    try {
        console.log("=== Verifying Implementation ===\n");

        // Check if backdrop_url column exists
        console.log("1. Checking movies table for backdrop_url column:");
        const moviesCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'movies' AND column_name = 'backdrop_url'
        `);
        console.log(`   ✓ backdrop_url column exists: ${moviesCheck.rows.length > 0 ? 'YES' : 'NO'}`);

        // Check if movie_images table exists
        console.log("\n2. Checking for movie_images table:");
        const imagesTableCheck = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name = 'movie_images'
        `);
        console.log(`   ✓ movie_images table exists: ${imagesTableCheck.rows.length > 0 ? 'YES' : 'NO'}`);

        if (imagesTableCheck.rows.length > 0) {
            const imagesColumnsCheck = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'movie_images'
                ORDER BY ordinal_position
            `);
            console.log("   ✓ Columns:", imagesColumnsCheck.rows.map(r => r.column_name).join(", "));
        }

        // Check data in movies table
        console.log("\n3. Checking movies with backdrop_url:");
        const moviesWithBackdrop = await pool.query(`
            SELECT COUNT(*) as count FROM movies WHERE backdrop_url IS NOT NULL
        `);
        console.log(`   ✓ Movies with backdrop_url: ${moviesWithBackdrop.rows[0].count}`);

        // Check data in movie_images table
        console.log("\n4. Checking movie_images table data:");
        const imageCount = await pool.query("SELECT COUNT(*) as count FROM movie_images");
        console.log(`   ✓ Total images in gallery: ${imageCount.rows[0].count}`);

        if (imageCount.rows[0].count > 0) {
            const sampleImages = await pool.query(`
                SELECT mi.image_id, mi.movie_id, m.title, mi.image_type, COUNT(*) as count
                FROM movie_images mi
                JOIN movies m ON mi.movie_id = m.movie_id
                GROUP BY mi.movie_id, m.title, mi.image_type, mi.image_id
                LIMIT 5
            `);
            console.log("   Sample images:");
            sampleImages.rows.forEach(row => {
                console.log(`     - Movie: "${row.title}" (ID: ${row.movie_id}), Type: ${row.image_type}`);
            });
        }

        // Check streaming platforms
        console.log("\n5. Checking streaming platforms:");
        const platformCount = await pool.query("SELECT COUNT(*) as count FROM streaming_platforms");
        console.log(`   ✓ Total platforms: ${platformCount.rows[0].count}`);

        const movieStreamingCount = await pool.query("SELECT COUNT(*) as count FROM movie_streaming");
        console.log(`   ✓ Movie-platform associations: ${movieStreamingCount.rows[0].count}`);

        if (movieStreamingCount.rows[0].count > 0) {
            const samplePlatforms = await pool.query(`
                SELECT m.title, sp.name, sp.logo_url
                FROM movie_streaming ms
                JOIN movies m ON ms.movie_id = m.movie_id
                JOIN streaming_platforms sp ON ms.platform_id = sp.platform_id
                LIMIT 5
            `);
            console.log("   Sample platform data:");
            samplePlatforms.rows.forEach(row => {
                console.log(`     - "${row.title}": ${row.name} (logo: ${row.logo_url ? 'YES' : 'NO'})`);
            });
        }

        // Check cast with profile_url
        console.log("\n6. Checking cast with profile photos:");
        const castWithPhoto = await pool.query(`
            SELECT COUNT(*) as count FROM person WHERE profile_url IS NOT NULL
        `);
        console.log(`   ✓ People with profile photos: ${castWithPhoto.rows[0].count}`);

        const sampleCast = await pool.query(`
            SELECT p.name, p.profile_url FROM person 
            WHERE profile_url IS NOT NULL 
            LIMIT 3
        `);
        console.log("   Sample cast with photos:");
        sampleCast.rows.forEach(row => {
            console.log(`     - ${row.name}`);
        });

        console.log("\n=== Verification Complete ===");
    } catch (error) {
        console.error("Verification error:", error.message);
    } finally {
        await pool.end();
    }
}

verifyImplementation();
