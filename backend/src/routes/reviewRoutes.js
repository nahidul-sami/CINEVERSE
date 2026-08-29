const express = require("express");
const router = express.Router();
const {
    getMovieReviews,
    createReview,
    updateReview,
    deleteReview
} = require("../controllers/reviewController");
const { verifyToken,verifyOwnership } = require("../middleware/authMiddleware");

router.get("/movie/:movieId", getMovieReviews);
router.post("/", verifyToken, createReview);
router.put("/:id", verifyToken, verifyOwnership("reviews", "review_id"), updateReview);
router.delete("/:id", verifyToken, verifyOwnership("reviews", "review_id"), deleteReview);

module.exports = router;