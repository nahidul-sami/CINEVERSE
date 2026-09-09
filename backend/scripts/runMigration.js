require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

async function runMigration() {
    const fileArg = process.argv[2];

    if (!fileArg) {
        console.error("Usage: node scripts/runMigration.js <path-to-migration-file>");
        console.error("Example: node scripts/runMigration.js database/migrations/003_extend_notifications.sql");
        process.exit(1);
    }

    try {
        // fileArg may be given relative to the backend/ folder (e.g. "database/migrations/x.sql")
        // or as an absolute path — resolve it against the current working directory either way.
        const migrationFile = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);
        const sql = fs.readFileSync(migrationFile, "utf-8");

        console.log(`Running migration: ${path.basename(migrationFile)}`);
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