const express = require("express");
const router = express.Router();
const { getAllMovies, getMovieById, createMovie } = require("../controllers/movieController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", getAllMovies);
router.get("/:id", getMovieById);
router.post("/", verifyToken, verifyAdmin, createMovie);

module.exports = router;