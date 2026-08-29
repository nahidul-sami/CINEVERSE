const express = require("express");
const router = express.Router();
const {
    getWatchHistory,
    addToWatchHistory,
    updateWatchProgress,
    deleteFromWatchHistory
} = require("../controllers/watchHistoryController");
const { verifyToken,verifyOwnership} = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/", getWatchHistory);
router.post("/", addToWatchHistory);
router.put("/:id/progress", verifyOwnership("watch_history", "history_id"), updateWatchProgress);
router.delete("/:id", verifyOwnership("watch_history", "history_id"), deleteFromWatchHistory);

module.exports = router;