const express = require("express");
const router = express.Router();
const {
    getAllPersons,
    getPersonById,
    createPerson,
    updatePerson,
    deletePerson,
    addMovieCredit,
    removeMovieCredit
} = require("../controllers/personController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", getAllPersons);
router.get("/:id", getPersonById);
router.post("/", verifyToken, verifyAdmin, createPerson);
router.put("/:id", verifyToken, verifyAdmin, updatePerson);
router.delete("/:id", verifyToken, verifyAdmin, deletePerson);
router.post("/movies/:movieId/credits", verifyToken, verifyAdmin, addMovieCredit);
router.delete("/movies/:movieId/credits/:personId/:creditType", verifyToken, verifyAdmin, removeMovieCredit);

module.exports = router;