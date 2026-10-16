import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();


// =====================================================
// LEADERBOARD
// GET /api/leaderboard
// =====================================================

router.get("/leaderboard", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM leaderboard");
        res.json(rows);
    } catch (err) {
        console.error("LEADERBOARD ERROR:", err);
        res.status(500).json({ message: "Could not load the leaderboard." });
    }
});

// =====================================================
// GET TOURNAMENTS MATCHES AND WHAT GAMETYPE
// =====================================================

router.get("/tournaments", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM tournaments ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("GET TOURNAMENTS ERROR:", err);
        res.status(500).json({ message: "Could not load tournaments." });
    }
});


// =====================================================
// GET HERO/profile
// =====================================================
router.get("/me", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, username, email FROM users WHERE id = $1",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("GET ME ERROR:", err);
        res.status(500).json({ message: "Could not load user." });
    }
});


export default router;