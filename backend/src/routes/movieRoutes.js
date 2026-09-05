const express = require("express");
const router = express.Router();
const { getAllMovies, getMovieById, createMovie, addMovieImage } = require("../controllers/movieController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", getAllMovies);
router.get("/:id", getMovieById);
router.post("/", verifyToken, verifyAdmin, createMovie);
router.post("/:id/images", verifyToken, verifyAdmin, addMovieImage);

module.exports = router;