const express = require("express");
const cors = require("cors");//fontend and backend different port

const app = express();
app.get("/", (req, res) => {
    res.send("Cineverse Backend is Running!");
});
app.use(cors());//cors enable 
app.use(express.json()); 

module.exports = app;