const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ─── In-memory user store (persists while server is running) ─── */
/* For production, replace with a database like MongoDB / PostgreSQL */
const users = [];

const JWT_SECRET = process.env.JWT_SECRET || "codemind_ai_secret_key";
const JWT_EXPIRES = "7d"; // token valid for 7 days

/* ─── REGISTER ────────────────────────────────────────────── */

module.exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Check if email already exists
        const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save user
        const newUser = {
            id: Date.now().toString(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            plan: "Pro"
        };

        users.push(newUser);

        // Generate token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, name: newUser.name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(201).json({
            success: true,
            message: "Account created successfully!",
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                plan: newUser.plan,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
};

/* ─── LOGIN ───────────────────────────────────────────────── */

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        // Find user
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
};

/* ─── VERIFY TOKEN (get current user) ────────────────────── */

module.exports.verifyToken = (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "No token provided." });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Stateless: trust the JWT payload directly.
        // No database / in-memory lookup needed — the signature guarantees authenticity.
        return res.status(200).json({
            success: true,
            user: {
                id:    decoded.id,
                name:  decoded.name,
                email: decoded.email,
                plan:  decoded.plan || "Pro",
            }
        });

    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
};

