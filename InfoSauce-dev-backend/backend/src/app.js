require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const allowedOrigins = new Set(
    (process.env.FRONTEND_ORIGIN || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
);

app.use(express.json({ limit: "8mb" }));
app.use(
    cors({
        origin(origin, callback) {
            // No Origin header means a server-to-server call, health check,
            // or local development tool rather than a browser CORS request.
            callback(null, !origin || allowedOrigins.has(origin));
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);

const verifyRouter = require(
    path.join(__dirname, "routes", "verify.js")
);

app.use("/api", verifyRouter);

app.get("/", (_req, res) => {
    res.json({ message: "Welcome to InfoSauce Backend" });
});

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
    console.error("Unhandled backend error:", error);
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected backend error occurred.",
        },
    });
});

module.exports = app;
