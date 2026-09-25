const express = require("express");
const router = express.Router();
const {
    getAllPersons,
    searchPersons,
    getPersonById,
    getPersonDetail,
    getPersonFromTmdb,
    getSimilarPersons,
    createPerson,
    updatePerson,
    deletePerson,
    addMovieCredit,
    removeMovieCredit
} = require("../controllers/personController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/search", verifyToken, searchPersons);
router.get("/detail/:id", verifyToken, getPersonDetail);
router.get("/tmdb/:tmdbId", verifyToken, getPersonFromTmdb);
router.get("/:id/similar", verifyToken, getSimilarPersons);
router.get("/", verifyToken, getAllPersons);
router.get("/:id", verifyToken, getPersonById);
router.post("/", verifyToken, verifyAdmin, createPerson);
router.put("/:id", verifyToken, verifyAdmin, updatePerson);
router.delete("/:id", verifyToken, verifyAdmin, deletePerson);
router.post("/movies/:movieId/credits", verifyToken, verifyAdmin, addMovieCredit);
router.delete("/movies/:movieId/credits/:personId/:creditType", verifyToken, verifyAdmin, removeMovieCredit);

module.exports = router;