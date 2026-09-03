const express = require("express");
const router = express.Router();
const {
    sendFriendRequest,
    respondToFriendRequest,
    getFriends,
    getPendingRequests,
    getSentRequests,
    removeFriend,
    lookupUserByEmail
} = require("../controllers/friendshipController");
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.get("/", getFriends);
router.get("/pending", getPendingRequests);
router.get("/sent", getSentRequests);
router.get("/lookup", lookupUserByEmail);
router.post("/", sendFriendRequest);
router.put("/:id", respondToFriendRequest);
router.delete("/:id", removeFriend);

module.exports = router;