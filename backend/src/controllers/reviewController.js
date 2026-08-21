const pool = require("../config/db");

exports.getMovieReviews = async (req, res) => {
    const { movieId } = req.params;

    try {
        const result = await pool.query(
            `SELECT r.review_id, r.movie_id, r.user_id, r.rating, r.review_text,
                    r.created_at, u.name AS user_name
             FROM reviews r
             JOIN users u ON u.user_id = r.user_id
             WHERE r.movie_id = $1
             ORDER BY r.created_at DESC`,
            [movieId]
        );

        res.status(200).json({ reviews: result.rows });
    } catch (error) {
        console.error("GET MOVIE REVIEWS ERROR:", error);
        res.status(500).json({ message: "Server error while fetching reviews", error: error.message });
    }
};

exports.createReview = async (req, res) => {
    const { movie_id, rating, review_text } = req.body;

    if (!movie_id || rating === undefined) {
        return res.status(400).json({ message: "Movie ID and rating are required" });
    }

    if (Number.isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 10) {
        return res.status(400).json({ message: "Rating must be between 0 and 10" });
    }

    try {
        const movie = await pool.query("SELECT movie_id FROM movies WHERE movie_id = $1", [movie_id]);
        if (movie.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        const result = await pool.query(
            `INSERT INTO reviews (movie_id, user_id, rating, review_text)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [movie_id, req.user.user_id, rating, review_text || null]
        );

        res.status(201).json({ message: "Review added successfully", review: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ message: "You have already reviewed this movie" });
        }

        console.error("CREATE REVIEW ERROR:", error);
        res.status(500).json({ message: "Server error while creating review", error: error.message });
    }
};

exports.updateReview = async (req, res) => {
    const { id } = req.params;
    const { rating, review_text } = req.body;

    if (rating === undefined) {
        return res.status(400).json({ message: "Rating is required" });
    }

    if (Number.isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 10) {
        return res.status(400).json({ message: "Rating must be between 0 and 10" });
    }

    try {
        const result = await pool.query(
            `UPDATE reviews
             SET rating = $1, review_text = $2
             WHERE review_id = $3 AND user_id = $4
             RETURNING *`,
            [rating, review_text || null, id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({ message: "Review updated successfully", review: result.rows[0] });
    } catch (error) {
        console.error("UPDATE REVIEW ERROR:", error);
        res.status(500).json({ message: "Server error while updating review", error: error.message });
    }
};

exports.deleteReview = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM reviews WHERE review_id = $1 AND user_id = $2 RETURNING review_id",
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        res.status(500).json({ message: "Server error while deleting review", error: error.message });
    }
};