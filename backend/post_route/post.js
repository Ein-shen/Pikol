import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();


// =====================================================
// CREATE TOURNAMENT + SAVE PAIRS
// POST /api/tournaments
// =====================================================

router.post("/tournaments", requireAuth, async (req, res) => {
    const { name, type, teams } = req.body;

    if (!name || !type || !Array.isArray(teams) || teams.length === 0) {
        return res.status(400).json({ message: "Missing tournament data." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const t = await client.query(
            `INSERT INTO tournaments (name, type)
             VALUES ($1, $2)
             RETURNING id`,
            [name, type]
        );

        // local team id -> database pair id
        const pairs = {};

        for (const team of teams) {
            const found = await client.query(
                `SELECT id FROM pairs
                 WHERE LEAST(lower(player1), lower(player2)) = LEAST(lower($1), lower($2))
                   AND GREATEST(lower(player1), lower(player2)) = GREATEST(lower($1), lower($2))`,
                [team.player1, team.player2]
            );

            if (found.rows.length > 0) {
                pairs[team.id] = found.rows[0].id;
            } else {
                const ins = await client.query(
                    `INSERT INTO pairs (name, player1, player2)
                     VALUES ($1, $2, $3)
                     RETURNING id`,
                    [team.name, team.player1, team.player2]
                );
                pairs[team.id] = ins.rows[0].id;
            }
        }

        await client.query("COMMIT");
        res.status(201).json({ tournamentId: t.rows[0].id, pairs });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("CREATE TOURNAMENT ERROR:", err);
        res.status(500).json({ message: "Could not save the tournament." });
    } finally {
        client.release();
    }
});


export default router;