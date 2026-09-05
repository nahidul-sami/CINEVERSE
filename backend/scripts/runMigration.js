require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

async function runMigration() {
    try {
        const migrationFile = path.join(__dirname, "../../database/migrations/002_add_movie_images.sql");
        const sql = fs.readFileSync(migrationFile, "utf-8");
        
        console.log("Running migration: 002_add_movie_images.sql");
        await pool.query(sql);
        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
