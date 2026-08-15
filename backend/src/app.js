const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);

app.get("/", (req, res) => {
    res.send("Cineverse Backend is Running!");
});
app.use(cors());
app.use(express.json());

module.exports = app;