const express = require("express");
const router = express.Router();
const {
    getAllMovies,
    searchMovies,
    getRecommendations,
    getTopRatedMovies,
    getLandingMovies,
    getMovieById,
    createMovie,
    createMovieWithCredits,
    updateMovie,
    addMovieImage,
    deleteMovieImage,
    deleteMovie
} = require("../controllers/movieController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllMovies);
router.get("/search", verifyToken, searchMovies);
router.get("/recommendations", verifyToken, getRecommendations);
router.get("/top-rated", verifyToken, getTopRatedMovies);
router.get("/landing", getLandingMovies);
router.get("/:id", verifyToken, getMovieById);
router.post("/", verifyToken, verifyAdmin, createMovie);
router.post("/with-credits", verifyToken, verifyAdmin, createMovieWithCredits);
router.put("/:id", verifyToken, verifyAdmin, updateMovie);
router.post("/:id/images", verifyToken, verifyAdmin, addMovieImage);
router.delete("/:id/images/:imageId", verifyToken, verifyAdmin, deleteMovieImage);
router.delete("/:id", verifyToken, verifyAdmin, deleteMovie);

module.exports = router;