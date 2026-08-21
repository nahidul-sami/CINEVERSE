const express = require("express");
const router = express.Router();
const {
    getWatchHistory,
    addToWatchHistory,
    updateWatchProgress,
    deleteFromWatchHistory
} = require("../controllers/watchHistoryController");
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/", getWatchHistory);
router.post("/", addToWatchHistory);
router.put("/:id/progress", updateWatchProgress);
router.delete("/:id", deleteFromWatchHistory);

module.exports = router;