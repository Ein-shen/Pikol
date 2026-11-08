import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import getRoutes from "./routes/get.js";
import postRoutes from "./routes/post.js";
import putRoutes from "./routes/put.js";
import deleteRoutes from "./routes/delete.js";
import pool from "./db.js";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());


app.use("/api/auth", authRoutes);
app.use("/api", getRoutes);
app.use("/api", postRoutes);
app.use("/api", putRoutes);
app.use("/api", deleteRoutes);


// =====================================================
// TEST ROUTES
// =====================================================

app.get("/", (req, res) => {
    res.send("Backend is working!");
});

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});