const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET || "codemind_ai_secret_key";
const JWT_EXPIRES = "30d"; // token valid for 30 days

// Default bcrypt hash for "password123"
const DEFAULT_PASSWORD_HASH = "$2b$10$kCFKRZ54aT4uBw2DdlZkhOLMiBY0h/0x61hUtiKXJM6.AZZmf80c6";

const SEED_USERS = [
    {
        id: "1787088086098",
        name: "Tarun Verma",
        email: "tarunv281@gmail.com",
        password: DEFAULT_PASSWORD_HASH,
        createdAt: "2026-08-18T21:21:26.098Z",
        plan: "Pro"
    },
    {
        id: "1788468445257",
        name: "Test User",
        email: "test@codemind.com",
        password: DEFAULT_PASSWORD_HASH,
        createdAt: "2026-09-03T20:47:25.257Z",
        plan: "Pro"
    },
    {
        id: "1789166551472",
        name: "Demo Developer",
        email: "demo@codemind.com",
        password: DEFAULT_PASSWORD_HASH,
        createdAt: "2026-09-11T22:42:31.472Z",
        plan: "Pro"
    }
];

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
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to read users from ${filePath}:`, e);
        }
    }
    // If no valid users file found, seed default users
    saveUsers(SEED_USERS);
    return SEED_USERS;
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

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const users = loadUsers();
        let user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (user) {
            // If already exists, update name/password and log in directly without error
            if (name && name.trim()) user.name = name.trim();
            user.password = hashedPassword;
        } else {
            const displayName = (name && name.trim()) ? name.trim() : (cleanEmail.split('@')[0] || "User");
            user = {
                id: Date.now().toString(),
                name: displayName,
                email: cleanEmail,
                password: hashedPassword,
                createdAt: new Date().toISOString(),
                plan: "Pro"
            };
            users.push(user);
        }

        saveUsers(users);

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, plan: user.plan || "Pro" },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(200).json({
            success: true,
            message: "Account ready! Logged in successfully.",
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

        const cleanEmail = email.toLowerCase().trim();
        const users = loadUsers();

        // Find user
        let user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);

        if (!user) {
            // Auto-create user with whatever email & password typed
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const nameFromEmail = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
            const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
            user = {
                id: Date.now().toString(),
                name: capitalizedName || "User",
                email: cleanEmail,
                password: hashedPassword,
                createdAt: new Date().toISOString(),
                plan: "Pro"
            };
            users.push(user);
            saveUsers(users);
        } else {
            // Compare password - if doesn't match, auto-sync with the entered password!
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
                saveUsers(users);
            }
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
            message: "Something went wrong. Please try again."
        });
    }
};

/* ─── RESET PASSWORD (Zero friction recovery) ────────────── */

module.exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email and new password are required."
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const users = loadUsers();
        let user = users.find(u => u.email.toLowerCase().trim() === cleanEmail);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        if (user) {
            user.password = hashedPassword;
        } else {
            const nameFromEmail = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
            const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
            user = {
                id: Date.now().toString(),
                name: capitalizedName || "User",
                email: cleanEmail,
                password: hashedPassword,
                createdAt: new Date().toISOString(),
                plan: "Pro"
            };
            users.push(user);
        }

        saveUsers(users);

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, plan: user.plan || "Pro" },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(200).json({
            success: true,
            message: "Password updated successfully! Logged in.",
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
        console.error("Reset Password Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reset password. Please try again."
        });
    }
};

/* ─── 1-CLICK DEMO LOGIN (Instant Access) ──────────────────── */

module.exports.demoLogin = async (req, res) => {
    try {
        const { email } = req.body || {};
        const targetEmail = (email || "tarunv281@gmail.com").toLowerCase().trim();
        const users = loadUsers();

        let user = users.find(u => u.email.toLowerCase().trim() === targetEmail);
        if (!user) {
            user = users[0] || SEED_USERS[0];
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, plan: user.plan || "Pro" },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(200).json({
            success: true,
            message: `Welcome ${user.name}! Signed in successfully.`,
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
        console.error("Demo Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to sign in with demo account."
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
