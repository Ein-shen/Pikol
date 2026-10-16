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
// GET tournament by id (teams in entry order + saved matches)
// =====================================================
router.get("/tournaments/:id", requireAuth, async (req, res) => {
    try {
        const t = await pool.query(
            "SELECT id, name FROM tournaments WHERE id = $1",
            [req.params.id]
        );
        if (t.rows.length === 0) {
            return res.status(404).json({ message: "Tournament not found." });
        }

        const teams = await pool.query(
            `SELECT p.id, p.id AS "pairId", p.name, p.player1, p.player2
             FROM tournament_pairs tp
             JOIN pairs p ON p.id = tp.pair_id
             WHERE tp.tournament_id = $1
             ORDER BY tp.position`,
            [req.params.id]
        );

        const matches = await pool.query(
            `SELECT round, match_number AS "matchNumber", score1, score2
             FROM matches WHERE tournament_id = $1`,
            [req.params.id]
        );

        res.json({ ...t.rows[0], teams: teams.rows, matches: matches.rows });
    } catch (err) {
        console.error("GET TOURNAMENT ERROR:", err);
        res.status(500).json({ message: "Could not load the tournament." });
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