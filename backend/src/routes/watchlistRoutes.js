const express = require("express");
const router = express.Router();
const {
    getWatchlists,
    getWatchlistById,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    addMovieToWatchlist,
    removeMovieFromWatchlist,
    shareWatchlist,
    getSharedWithMe,
    getSharedWatchlistById
} = require("../controllers/watchlistController");
const { verifyToken,verifyOwnership } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/", getWatchlists);
router.get("/shared-with-me", getSharedWithMe);
router.get("/shared/:id", getSharedWatchlistById);
router.get("/:id", getWatchlistById);
router.post("/", createWatchlist);
router.post("/:id/share", shareWatchlist);


router.put("/:id", verifyOwnership("watchlist", "watchlist_id"), updateWatchlist);
router.delete("/:id", verifyOwnership("watchlist", "watchlist_id"), deleteWatchlist);


router.post("/:id/movies", addMovieToWatchlist);
router.delete("/:id/movies/:movieId", removeMovieFromWatchlist);

module.exports = router;