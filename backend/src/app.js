const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const watchHistoryRoutes = require("./routes/watchHistoryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/watchlists", watchlistRoutes);
app.use("/api/watch-history", watchHistoryRoutes);
app.use("/api/reviews", reviewRoutes);

app.get("/", (req, res) => {
    res.send("Cineverse Backend is Running!");
});

app.get("/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT current_database() AS database");
        res.status(200).json({
            message: "Database connected successfully!",
            database: result.rows[0].database
        });
    } catch (error) {
        console.error("DATABASE ERROR:", error);
        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

module.exports = app;