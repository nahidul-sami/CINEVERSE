const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getProfile, updateProfile } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// পাবলিক রাউট (Login/Register)
router.post("/register", registerUser);
router.post("/login", loginUser);

// প্রটেক্টেড রাউট (Profile)
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

module.exports = router;