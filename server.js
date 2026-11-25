
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const pool = require("./database");

const app = express();
const PORT = 3000;

// MIDDLEWARE
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: "edutrack.sid",
    secret: process.env.SESSION_SECRET || "change-this-secret-before-deployment",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: "Too many requests. Try again later." }
}));

app.use(express.static(path.join(__dirname, "public")));

// AUTHENTICATION MIDDLEWARE
function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: "Please login first." });
    }
    next();
}

function isAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required." });
    }
    next();
}

// REGISTER API
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (name.trim().length < 2 || name.length > 100) {
            return res.status(400).json({ message: "Enter a valid name." });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email address." });
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ message: "Enter a valid 10-digit phone number." });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                message: "Password must be 8 to 72 characters."
            });
        }

        const [existing] = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [email.toLowerCase().trim()]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Email already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await pool.execute(
            `INSERT INTO users (name, email, phone, password, role)
             VALUES (?, ?, ?, ?, 'student')`,
            [name.trim(), email.toLowerCase().trim(), phone, hashedPassword]
        );

        res.status(201).json({
            message: "Registration successful! Please login."
        });

    } catch (error) {
        console.error("Registration error:", error.message);
        res.status(500).json({ message: "Server error during registration." });
    }
});

// LOGIN API
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Enter email and password." });
        }

        const [rows] = await pool.execute(
            "SELECT * FROM users WHERE email = ?",
            [email.toLowerCase().trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = rows[0];

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Regenerate session after successful authentication
        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({ message: "Login failed." });
            }

            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };

            res.json({
                message: "Login successful!",
                user: req.session.user
            });
        });

    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Server error during login." });
    }
});

// CURRENT USER API
app.get("/api/me", isLoggedIn, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT id, name, email, phone, role FROM users WHERE id = ?",
            [req.session.user.id]
        );

        if (!rows.length) {
            return res.status(401).json({ message: "User not found." });
        }

        res.json({ user: rows[0] });

    } catch (error) {
        res.status(500).json({ message: "Unable to load profile." });
    }
});

// LOGOUT API
app.post("/api/logout", isLoggedIn, (req, res) => {
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({ message: "Logout failed." });
        }

        res.clearCookie("edutrack.sid");
        res.json({ message: "Logged out successfully." });
    });
});

// DASHBOARD API
app.get("/api/dashboard", isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const [[course]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM courses"
        );

        const [[assignment]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM assignments"
        );

        const [[attendance]] = await pool.execute(
            `SELECT SUM(present) AS present, SUM(total_classes) AS total
             FROM attendance WHERE user_id = ?`,
            [userId]
        );

        const percentage = attendance.total
            ? Math.round((attendance.present / attendance.total) * 100)
            : 0;

        res.json({
            courses: course.total,
            assignments: assignment.total,
            attendance: percentage
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Dashboard loading failed." });
    }
});

// GET COURSES
app.get("/api/courses", isLoggedIn, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM courses ORDER BY id DESC"
        );

        res.json({ data: rows });

    } catch (error) {
        res.status(500).json({ message: "Unable to load courses." });
    }
});

// ADD COURSE - ADMIN
app.post("/api/courses", isAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !description ||
            title.trim().length > 100 ||
            description.trim().length > 500) {
            return res.status(400).json({ message: "Enter valid course details." });
        }

        await pool.execute(
            "INSERT INTO courses (title, description) VALUES (?, ?)",
            [title.trim(), description.trim()]
        );

        res.status(201).json({ message: "Course added successfully." });

    } catch (error) {
        res.status(500).json({ message: "Unable to add course." });
    }
});

// GET ATTENDANCE
app.get("/api/attendance", isLoggedIn, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT subject, total_classes, present FROM attendance WHERE user_id = ?",
            [req.session.user.id]
        );

        res.json({ data: rows });

    } catch (error) {
        res.status(500).json({ message: "Unable to load attendance." });
    }
});

// GET ASSIGNMENTS
app.get("/api/assignments", isLoggedIn, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT title, subject, due_date FROM assignments ORDER BY due_date"
        );

        res.json({ data: rows });

    } catch (error) {
        res.status(500).json({ message: "Unable to load assignments." });
    }
});

// ADD ASSIGNMENT - ADMIN
app.post("/api/assignments", isAdmin, async (req, res) => {
    try {
        const { title, subject, due_date } = req.body;

        if (!title || !subject || !due_date ||
            title.trim().length > 150 || subject.trim().length > 100 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(due_date) ||
            !Number.isFinite(Date.parse(due_date))) {
            return res.status(400).json({ message: "Enter valid assignment details." });
        }

        await pool.execute(
            "INSERT INTO assignments (title, subject, due_date) VALUES (?, ?, ?)",
            [title.trim(), subject.trim(), due_date]
        );

        res.status(201).json({ message: "Assignment added successfully." });

    } catch (error) {
        res.status(500).json({ message: "Unable to add assignment." });
    }
});

// GET RESULTS
app.get("/api/results", isLoggedIn, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT subject, marks, grade FROM results WHERE user_id = ?",
            [req.session.user.id]
        );

        res.json({ data: rows });

    } catch (error) {
        res.status(500).json({ message: "Unable to load results." });
    }
});

// SERVER
app.listen(PORT, () => {
    console.log(`EduTrack server running at http://localhost:${PORT}`);
});
