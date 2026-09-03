const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        if (!name || !email || !password || !name.trim() || !email.trim() || !password.trim()) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const userExists = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: "User already exists with this email" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRole = role || "user";
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role, created_at",
            [name, email, hashedPassword, userRole]
        );

        res.status(201).json({
            message: "User registered successfully!",
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ message: "Server error during registration", error: error.message });
    }
};


exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, jti: crypto.randomUUID() },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: "Server error during login", error: error.message });
    }
};

exports.logoutUser = async (req, res) => {
    try {
        await pool.query(
            "INSERT INTO revoked_tokens (token_jti, expires_at) VALUES ($1, TO_TIMESTAMP($2)) ON CONFLICT DO NOTHING",
            [req.user.jti, req.user.exp]
        );

        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error("LOGOUT ERROR:", error);
        res.status(500).json({ message: "Server error during logout", error: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const userResult = await pool.query(
            "SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1",
            [req.user.user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user: userResult.rows[0] });
    } catch (error) {
        console.error("GET PROFILE ERROR:", error);
        res.status(500).json({ message: "Server error while fetching profile", error: error.message });
    }
};

const updateProfile = async (req, res) => {
    const { name } = req.body;
    try {
        const updatedUser = await pool.query(
            "UPDATE users SET name = $1 WHERE user_id = $2 RETURNING user_id, name, email, role, created_at",
            [name, req.user.user_id]
        );
        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "Profile updated successfully", user: updatedUser.rows[0] });
    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        res.status(500).json({ message: "Server error while updating profile", error: error.message });
    }
};

module.exports = {
    registerUser: exports.registerUser,
    loginUser: exports.loginUser,
    logoutUser: exports.logoutUser,
    getProfile,
    updateProfile
};