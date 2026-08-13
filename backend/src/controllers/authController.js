const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const userExists = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "User already exists with this email" });
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
            { user_id: user.user_id, role: user.role },
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