const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    getProfile,
    updateProfile
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public routes (Login/Register)
router.post("/register", registerUser);
router.post("/login", loginUser);
<<<<<<< HEAD
=======

// Protected routes (Profile)
>>>>>>> 6a6372512b31e2ceee21b9ee5c39b7459191dee8
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

module.exports = router;