require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
    console.error("SERVER ERROR:", error);
});