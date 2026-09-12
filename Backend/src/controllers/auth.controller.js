const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET || "codemind_ai_secret_key";
const JWT_EXPIRES = "7d"; // token valid for 7 days

function getUsersFilePaths() {
    return [
        path.join(__dirname, "../../../users.json"), // Workspace root
        path.join(__dirname, "../../users.json")     // Backend root
    ];
}

function loadUsers() {
    const paths = getUsersFilePaths();
    for (const filePath of paths) {
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, "utf8").trim();
                if (content) {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        return parsed; // Return even if empty array
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to read users from ${filePath}:`, e);
        }
    }
    // No valid file found — start with empty list
    saveUsers([]);
    return [];
}

function saveUsers(usersList) {
    const paths = getUsersFilePaths();
    const data = JSON.stringify(usersList, null, 2);
    for (const p of paths) {
        try {
            fs.writeFileSync(p, data, "utf8");
        } catch (e) {
            console.error(`Failed to write users database to ${p}:`, e);
        }
    }
}

/* ─── REGISTER ────────────────────────────────────────────── */

module.exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Full Name is required."
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email address is required."
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanEmail = email.toLowerCase().trim();
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        const users = loadUsers();

        // Check if user already exists
        const existing = users.find(u => u.email.toLowerCase().trim() === cleanEmail);
        if (existing) {
            const isMatch = await bcrypt.compare(password, existing.password);
            if (isMatch) {
                const token = jwt.sign(
                    { id: existing.id, email: existing.email, name: existing.name, plan: existing.plan || "Pro" },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRES }
                );
                return res.status(200).json({
                    success: true,
                    message: "Account already exists — Logged in successfully!",
                    token,
                    user: {
                        id: existing.id,
                        name: existing.name,
                        email: existing.email,
                        plan: existing.plan || "Pro",
                        createdAt: existing.createdAt
                    }
                });
            }
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists. Please switch to Sign In."
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: Date.now().toString(),
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            plan: "Pro"
        };

        users.push(newUser);
        saveUsers(users);

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, name: newUser.name, plan: newUser.plan },
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
            message: "Something went wrong during registration. Please try again."
        });
    }
};

/* ─── LOGIN ───────────────────────────────────────────────── */

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const users = loadUsers();

        // Find user by email
        const user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Account not found with this email. Please register first."
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password. Please check and try again."
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, plan: user.plan || "Pro" },
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
                plan: user.plan || "Pro",
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong during login. Please try again."
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
