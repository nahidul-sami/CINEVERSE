const express = require("express");
const router = express.Router();
const { getAllMovies, searchMovies, getRecommendations, getMovieById, createMovie, createMovieWithCredits, updateMovie, addMovieImage, deleteMovieImage, deleteMovie } = require("../controllers/movieController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", getAllMovies);
router.get("/search", searchMovies);
router.get("/recommendations", verifyToken, getRecommendations);
router.get("/:id", getMovieById);
router.post("/", verifyToken, verifyAdmin, createMovie);
router.post("/with-credits", verifyToken, verifyAdmin, createMovieWithCredits);
router.put("/:id", verifyToken, verifyAdmin, updateMovie);
router.post("/:id/images", verifyToken, verifyAdmin, addMovieImage);
router.delete("/:id/images/:imageId", verifyToken, verifyAdmin, deleteMovieImage);
router.delete("/:id", verifyToken, verifyAdmin, deleteMovie);

module.exports = router;