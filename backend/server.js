const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const movieRoutes = require("./src/routes/movieRoutes");
const watchlistRoutes = require("./src/routes/watchlistRoutes");
const watchHistoryRoutes = require("./src/routes/watchHistoryRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const personRoutes = require("./src/routes/personRoutes");
const genreRoutes = require("./src/routes/genreRoutes");
const friendshipRoutes = require("./src/routes/friendshipRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const streamingPlatformRoutes = require("./src/routes/streamingPlatformRoutes");


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/db-test", async (req, res) => {
    try {
        const result = await require("./src/config/db").query("SELECT current_database() AS database_name");
        res.status(200).json({ database_name: result.rows[0].database_name });
    } catch (error) {
        console.error("DB TEST ERROR:", error);
        res.status(500).json({ message: "Database connection failed" });
    }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/persons", personRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/watch-history", watchHistoryRoutes);
app.use("/api/watchlists", watchlistRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/friendships", friendshipRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/streaming-platforms", streamingPlatformRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});