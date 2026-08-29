const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: "Invalid or expired token." });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Access denied. Admins only." });
    }
};

// Verify that the user is the owner of a specific resource
const verifyOwnership = (tableName, idColumn) => {
    return async (req, res, next) => {
        const resourceId = req.params.id;
        const userId = req.user.user_id;

        try {
            const query = `SELECT user_id FROM ${tableName} WHERE ${idColumn} = $1`;
            const result = await pool.query(query, [resourceId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Resource not found" });
            }

            
            if (result.rows[0].user_id !== userId && req.user.role !== "admin") {
                return res.status(403).json({ message: "Access denied. You do not own this resource." });
            }

            next();
        } catch (error) {
            console.error("OWNERSHIP VERIFICATION ERROR:", error);
            res.status(500).json({ message: "Authorization check failed", error: error.message });
        }
    };
};

module.exports = { verifyToken, verifyAdmin, verifyOwnership };