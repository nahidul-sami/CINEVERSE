const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const movieRoutes = require("./src/routes/movieRoutes");
const watchlistRoutes = require("./src/routes/watchlistRoutes");
const watchHistoryRoutes = require("./src/routes/watchHistoryRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const personRoutes = require("./src/routes/personRoutes");
const genreRoutes = require("./src/routes/genreRoutes");
const friendshipRoutes = require("./src/routes/friendshipRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/persons", personRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/watch-history", watchHistoryRoutes);
app.use("/api/watchlists", watchlistRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/friendships", friendshipRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});