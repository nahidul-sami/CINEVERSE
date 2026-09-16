const express = require("express");
const router = express.Router();
const controller = require("../controllers/streamingPlatformController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", controller.getPlatforms);
router.post("/", verifyToken, verifyAdmin, controller.createPlatform);
router.put("/:id", verifyToken, verifyAdmin, controller.updatePlatform);
router.delete("/:id", verifyToken, verifyAdmin, controller.deletePlatform);
router.post("/movies/:movieId", verifyToken, verifyAdmin, controller.attachPlatformToMovie);
router.delete("/movies/:movieId/:platformId", verifyToken, verifyAdmin, controller.removePlatformFromMovie);

module.exports = router;
