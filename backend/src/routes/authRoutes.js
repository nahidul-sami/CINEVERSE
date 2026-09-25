const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    logoutUser,
    getProfile,
    updateProfile,
    getEngagementScore
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyToken, logoutUser);
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.get("/engagement-score", verifyToken, getEngagementScore);

module.exports = router;