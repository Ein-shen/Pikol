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
        const tournamentId = t.rows[0].id;

        // local team id -> database pair id
        const pairs = {};

        for (let index = 0; index < teams.length; index++) {
            const team = teams[index];

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

            // NEW: link this pair to the tournament, in entry order
            await client.query(
                `INSERT INTO tournament_pairs (tournament_id, pair_id, position)
                 VALUES ($1, $2, $3)`,
                [tournamentId, pairs[team.id], index]
            );
        }

        await client.query("COMMIT");
        res.status(201).json({ tournamentId, pairs });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("CREATE TOURNAMENT ERROR:", err);
        res.status(500).json({ message: "Could not save the tournament." });
    } finally {
        client.release();
    }
});


//=======================================================
//
// POST /api/me: update the logged-in user's full name
//
//=======================================================
router.post("/me", requireAuth, async (req, res) => { // requireAuth runs first and sets req.user
    const fullname = String(req.body?.fullname || "").trim(); // read name, force text, trim spaces

    if (!fullname) { // empty name: nothing to save
        return res.status(400).json({ message: "Missing profile data." }); // 400 = bad request, return stops here
    }

    try { // catch database errors so the server doesn't crash
        const result = await pool.query( // wait for the database to answer
            `UPDATE users                           -- change existing rows
             SET full_name = $1                     -- new name, no comma (last item)
             WHERE id = $2                          -- only this user's row
             RETURNING id, username, email,
             full_name AS fullname`, // return the updated row, renamed to fullname
            [fullname, req.user.id] // $1 = fullname, $2 = logged-in user's id
        );

        return res.status(200).json({ user: result.rows[0] }); // 200 = OK, send updated user
    } catch (err) { // runs if anything above threw
        console.error("UPDATE PROFILE ERROR:", err); // full error shows in your terminal only
        return res.status(500).json({ message: "Could not update profile." }); // 500 = server error, safe message
    }
});


export default router;