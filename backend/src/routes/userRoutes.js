const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
    getOwnProfile,
    updateOwnProfile,
    searchUsers,
    getPublicProfile,
    uploadProfilePicture,
    removeProfilePicture,
} = require("../controllers/userController");

const uploadDir = path.join(__dirname, "../../uploads/profile");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
            cb(null, safeName);
        },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
    },
});

router.get("/search", searchUsers);
router.get("/profile", verifyToken, getOwnProfile);
router.put("/profile", verifyToken, updateOwnProfile);
router.post("/profile-picture", verifyToken, upload.single("profile_image"), uploadProfilePicture);
router.delete("/profile-picture", verifyToken, removeProfilePicture);
router.get("/:userId", getPublicProfile);

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Profile picture must be smaller than 2MB" });
        }
    }

    if (error) {
        return res.status(400).json({ message: error.message || "Invalid file upload" });
    }

    next();
});

module.exports = router;
