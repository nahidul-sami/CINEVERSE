const express = require("express");
const router = express.Router();
const {
    registerUser,
    loginUser,
    logoutUser,
    getProfile,
    updateProfile
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public routes (Login/Register)
// new login route post api   

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyToken, logoutUser);
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

module.exports = router;