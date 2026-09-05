const express = require("express");
const router = express.Router();
const {
    getAllGenres,
    getGenreById,
    createGenre,
    updateGenre,
    deleteGenre,
    addGenreToMovie,
    removeGenreFromMovie,
    getMoviesByGenre
} = require("../controllers/genreController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getAllGenres);
router.get("/:id", getGenreById);
router.get("/:genreId/movies", getMoviesByGenre); // নির্দিষ্ট ಜেনারের সব মুভি দেখার রাউট

// Admin restricted routes
router.post("/", verifyToken, verifyAdmin, createGenre);
router.put("/:id", verifyToken, verifyAdmin, updateGenre);
router.delete("/:id", verifyToken, verifyAdmin, deleteGenre);

// Movie & Genre Association routes (Admin only)
router.post("/movies/:movieId", verifyToken, verifyAdmin, addGenreToMovie);
router.delete("/movies/:movieId/:genreId", verifyToken, verifyAdmin, removeGenreFromMovie);
module.exports = router;