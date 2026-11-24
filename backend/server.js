import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import getRoutes from "./routes/get.js";
import postRoutes from "./routes/post.js";
import putRoutes from "./routes/put.js";
import deleteRoutes from "./routes/delete.js";
import pool from "./db.js";

// ES modules don't have __dirname, so recreate it
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Render sits behind a proxy: trust it so req.protocol is "https" (fixes Mixed Content)
app.set("trust proxy", 1);

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api", getRoutes);
app.use("/api", postRoutes);
app.use("/api", putRoutes);
app.use("/api", deleteRoutes);

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({
            success: true,
            time: result.rows[0].now,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// =====================================================
// SERVE THE BUILT REACT APP (production / Docker)
// =====================================================

const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));

// Fallback so React Router routes work on refresh.
// Written with app.use so it works on both Express 4 and 5.
app.use((req, res, next) => {
    if (
        req.method !== "GET" ||
        req.path.startsWith("/api") ||
        req.path.startsWith("/uploads")
    ) {
        return next();
    }
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
        if (err) next();
    });
});

// =====================================================
// START
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});