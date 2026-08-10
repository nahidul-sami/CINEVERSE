const express = require("express");
const cors = require("cors");

const app = express();
app.get("/", (req, res) => {
    res.send("Cineverse Backend is Running!");
});
app.use(cors());
app.use(express.json());

module.exports = app;