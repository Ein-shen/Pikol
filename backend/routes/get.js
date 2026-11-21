import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

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
// GET ALL TOURNAMENTS (with total count)
// GET /api/tournaments
// =====================================================
router.get("/tournaments", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT *, COUNT(*) OVER() AS total_count FROM tournaments ORDER BY id DESC"
        );

        res.json({
            total: rows.length ? Number(rows[0].total_count) : 0,
            tournaments: rows,
        });
    } catch (err) {
        console.error("GET TOURNAMENTS ERROR:", err);
        res.status(500).json({ message: "Could not load tournaments." });
    }
});


// =====================================================
// GET the 6 most recent tournaments (for the sidebar)
// GET /api/tournaments/recent
// =====================================================
router.get("/tournaments/recent", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, name, type, created_at
             FROM tournaments
             ORDER BY created_at DESC
             LIMIT 5`
        );
        res.json(rows);
    } catch (err) {
        console.error("GET RECENT TOURNAMENTS ERROR:", err);
        res.status(500).json({ message: "Could not load recent tournaments." });
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
// GET HERO/profile (/me)
// =====================================================
router.get("/me", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, username, email, full_name AS fullname, COALESCE(photo_url, '') AS photo_url 
             FROM users WHERE id = $1`,
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


// =====================================================
// GET USERS (Fixed to support Navbar.jsx api.get('/users'))
// =====================================================
router.get("/users", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, username, email, COALESCE(photo_url, '') AS "photoUrl" FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("GET USERS ERROR:", err);
        // Fallback if photo_url column doesn't exist yet in the database schema
        try {
            const { rows } = await pool.query(
                "SELECT id, username, email FROM users WHERE id = $1",
                [req.user.id]
            );
            if (rows.length > 0) {
                return res.json({ ...rows[0], photoUrl: "" });
            }
        } catch (fallbackErr) {}
        res.status(500).json({ message: "Could not load user profile." });
    }
});


// =====================================================
// TOP2: list top2 tournaments
// GET /api/top2
// =====================================================
router.get("/top2", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT t.id, t.name, t.type, t.created_at,
                    (SELECT COUNT(*) FROM tournament_pairs tp
                     WHERE tp.tournament_id = t.id)::int AS "teamCount"
             FROM tournaments t
             WHERE t.type = 'top2'
             ORDER BY t.id DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error("LIST TOP2 ERROR:", err);
        res.status(500).json({ message: "Could not load tournaments." });
    }
});


// =====================================================
// TOP2: load one (teams + group scores + knockout scores)
// GET /api/top2/:id
// =====================================================
router.get("/top2/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const t = await pool.query(
            "SELECT id, name, type FROM tournaments WHERE id = $1 AND type = 'top2'",
            [id]
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
            [id]
        );

        const groupMatches = await pool.query(
            `SELECT group_name AS "group", pair1_id AS "pair1Id",
                    pair2_id AS "pair2Id", score1, score2
             FROM group_matches WHERE tournament_id = $1`,
            [id]
        );

        const matches = await pool.query(
            `SELECT round, match_number AS "matchNumber",
                    pair1_id AS "pair1Id", pair2_id AS "pair2Id",
                    score1, score2
             FROM matches WHERE tournament_id = $1`,
            [id]
        );

        res.json({
            ...t.rows[0],
            teams: teams.rows,
            groupMatches: groupMatches.rows,
            matches: matches.rows,
        });
    } catch (err) {
        console.error("LOAD TOP2 ERROR:", err);
        res.status(500).json({ message: "Could not load the tournament." });
    }
});


// =====================================================
// SINGLE: list single elimination tournaments
// GET /api/single
// =====================================================
router.get("/single", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT t.id, t.name, t.type, t.created_at,
                    (SELECT COUNT(*) FROM tournament_pairs tp
                     WHERE tp.tournament_id = t.id)::int AS "teamCount"
             FROM tournaments t
             WHERE t.type = 'single'
             ORDER BY t.id DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error("LIST SINGLE ERROR:", err);
        res.status(500).json({ message: "Could not load tournaments." });
    }
});

// =====================================================
// SINGLE: load one (teams + saved matches)
// GET /api/single/:id
// =====================================================
router.get("/single/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const t = await pool.query(
            "SELECT id, name, type FROM tournaments WHERE id = $1 AND type = 'single'",
            [id]
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
            [id]
        );

        const matches = await pool.query(
            `SELECT round, match_number AS "matchNumber", score1, score2
             FROM matches WHERE tournament_id = $1`,
            [id]
        );

        res.json({ ...t.rows[0], teams: teams.rows, matches: matches.rows });
    } catch (err) {
        console.error("LOAD SINGLE ERROR:", err);
        res.status(500).json({ message: "Could not load the tournament." });
    }
});




// =====================================================
// Top3: list top3 tournaments
// GET /api/top3
// ===================================================== 

router.get("/top3", requireAuth, async (req, res ) => {
    try {
        const { rows } = await pool.query(
           ` SELECT id, name, type, created_at FROM tournaments WHERE type = 'top3' 
             ORDER BY id DESC`
        );
        res.json(rows);

    } catch (err) {
        console.error("LIST TOP# ERROR:", err);
        res.status(500).json({message: "could not load tournament. "});
    }
});


// ==============================================================   
// TOP3: load one (teams + group scores + knockout scores)
// GET /api/top3/:id
// ============================================================== 
router.get("/top3/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const t = await pool.query(
            "SELECT  id, name, type FROM tournaments WHERE id = $1 AND type = 'top3'",
             [id]

        );
        if (t.rows.length === 0 ) {
            return res.status(404).json({message: "Tournament not found. " });

        }

        const teams = await pool.query(`
            SELECT p.id, p.id AS "pairId", p.name, p.player1, p.player2
            FROM tournament_pairs tp
            JOIN pairs p ON p.id = tp.pair_id
            WHERE tp.tournament_id = $1
            ORDER BY tp.position
        `, [id]);

        const groupMatches = await pool.query(`
            SELECT group_name AS "group", pair1_id AS "pair1Id",
            pair2_id AS "pair2Id", score1, score2 FROM group_matches
            WHERE tournament_id = $1

            `, [id]);

        const matches = await pool.query(`
            SELECT round, match_number AS "matchNumber",
                pair1_id AS "pair1Id", pair2_id AS "pair2Id",
                score1, score2
            FROM matches WHERE tournament_id = $1
        `, [id]);
            

        res.json({
            ...t.rows[0],
            teams: teams.rows,
            groupMatches: groupMatches.rows,
            matches: matches.rows,

        });

    } catch (err) {
        console.error("LOAD TOP3 ERROR:", err);
        res.status(500).json({
            message: "Could not load the tournament."
        });
    } 

})



export default router;

