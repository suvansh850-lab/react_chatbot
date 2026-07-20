require("dotenv").config();

const express = require("express");
const cors = require("cors");

const db = require("./database/db");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

// Middleware
app.use(cors());
// Increase limits so share requests with long message histories don't fail with 413.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ============================
// Health Check
// ============================
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "🚀 Morepen Chatbot Backend is Running"
    });
});

// ============================
// Database Connection Test
// ============================
app.get("/api/test-db", async (req, res) => {
    try {
        const result = await db.query("SELECT NOW() AS current_time");
        res.status(200).json({
            success: true,
            message: "✅ Database Connected Successfully",
            databaseTime: result.rows[0].current_time
        });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({
            success: false,
            message: "Database Connection Failed",
            error: error.message
        });
    }
});

// ============================
// Chat APIs
// ============================
app.use("/api/chat", chatRoutes);
app.use("/api/share", require("./routes/shareRoutes"));

// ============================
// 404 Route
// ============================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found"
    });
});

// ============================
// Global Error Handler
// ============================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message
    });
});

// ============================
// Start Server
// ============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("=======================================");
    console.log("🚀 Morepen Chatbot Backend Started");
    console.log(`🌐 Server Running : http://localhost:${PORT}`);
    console.log("🔌 Connecting to DB Host:", process.env.DB_HOST);
    console.log("👤 DB User:", process.env.DB_USER);
    console.log("=======================================");
});