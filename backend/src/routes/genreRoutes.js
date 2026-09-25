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

router.get("/", verifyToken, getAllGenres);
router.get("/:genreId/movies", verifyToken, getMoviesByGenre);
router.get("/:id", verifyToken, getGenreById);

router.post("/", verifyToken, verifyAdmin, createGenre);
router.put("/:id", verifyToken, verifyAdmin, updateGenre);
router.delete("/:id", verifyToken, verifyAdmin, deleteGenre);

router.post("/movies/:movieId", verifyToken, verifyAdmin, addGenreToMovie);
router.delete("/movies/:movieId/:genreId", verifyToken, verifyAdmin, removeGenreFromMovie);
module.exports = router;