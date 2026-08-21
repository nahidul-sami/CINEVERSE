const express = require("express");
const router = express.Router();
const {
    getWatchlists,
    getWatchlistById,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    addMovieToWatchlist,
    removeMovieFromWatchlist
} = require("../controllers/watchlistController");
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/", getWatchlists);
router.get("/:id", getWatchlistById);
router.post("/", createWatchlist);
router.put("/:id", updateWatchlist);
router.delete("/:id", deleteWatchlist);
router.post("/:id/movies", addMovieToWatchlist);
router.delete("/:id/movies/:movieId", removeMovieFromWatchlist);

module.exports = router;