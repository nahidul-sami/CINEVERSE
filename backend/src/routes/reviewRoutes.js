const express = require("express");
const router = express.Router();
const {
    getMovieReviews,
    createReview,
    updateReview,
    deleteReview
} = require("../controllers/reviewController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/movie/:movieId", getMovieReviews);
router.post("/", verifyToken, createReview);
router.put("/:id", verifyToken, updateReview);
router.delete("/:id", verifyToken, deleteReview);

module.exports = router;