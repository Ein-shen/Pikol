import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import pool from "./db.js";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);


// =====================================================
// HELPER: delete every match this one feeds into
// (used when a winner changes or a score is cleared)
// =====================================================

async function clearDownstream(client, tournamentId, round, matchNumber) {
    let n = matchNumber;
    for (let r = round + 1; r <= 10; r++) {
        n = Math.ceil(n / 2);
        await client.query(
            `DELETE FROM matches
             WHERE tournament_id = $1 AND round = $2 AND match_number = $3`,
            [tournamentId, r, n]
        );
    }
}


// =====================================================
// CREATE TOURNAMENT + SAVE PAIRS
// POST /api/tournaments
// =====================================================

app.post("/api/tournaments", requireAuth, async (req, res) => {
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


// =====================================================
// SAVE A FINISHED MATCH (insert or update)
// PUT /api/tournaments/:id/matches
// =====================================================

app.put("/api/tournaments/:id/matches", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { round, matchNumber, pair1Id, pair2Id, score1, score2, winnerPairId } = req.body;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const old = await client.query(
            `SELECT winner_pair_id FROM matches
             WHERE tournament_id = $1 AND round = $2 AND match_number = $3`,
            [id, round, matchNumber]
        );

        await client.query(
            `INSERT INTO matches
                (tournament_id, round, match_number, pair1_id, pair2_id, score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tournament_id, round, match_number) DO UPDATE SET
                pair1_id = EXCLUDED.pair1_id,
                pair2_id = EXCLUDED.pair2_id,
                score1 = EXCLUDED.score1,
                score2 = EXCLUDED.score2,
                winner_pair_id = EXCLUDED.winner_pair_id`,
            [id, round, matchNumber, pair1Id, pair2Id, score1, score2, winnerPairId]
        );

        // winner changed -> later rounds are no longer valid
        if (old.rows[0]?.winner_pair_id !== winnerPairId) {
            await clearDownstream(client, id, round, matchNumber);
        }

        await client.query("COMMIT");
        res.json({ ok: true });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("SAVE MATCH ERROR:", err);
        res.status(500).json({ message: "Could not save the match." });
    } finally {
        client.release();
    }
});


// =====================================================
// CLEAR A MATCH RESULT (score removed or tied)
// DELETE /api/tournaments/:id/matches/:round/:matchNumber
// =====================================================

app.delete("/api/tournaments/:id/matches/:round/:matchNumber", requireAuth, async (req, res) => {
    const { id } = req.params;
    const round = Number(req.params.round);
    const matchNumber = Number(req.params.matchNumber);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `DELETE FROM matches
             WHERE tournament_id = $1 AND round = $2 AND match_number = $3`,
            [id, round, matchNumber]
        );
        await clearDownstream(client, id, round, matchNumber);

        await client.query("COMMIT");
        res.json({ ok: true });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("CLEAR MATCH ERROR:", err);
        res.status(500).json({ message: "Could not clear the match." });
    } finally {
        client.release();
    }
});


// =====================================================
// LEADERBOARD
// GET /api/leaderboard
// =====================================================

app.get("/api/leaderboard", requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM leaderboard");
        res.json(rows);
    } catch (err) {
        console.error("LEADERBOARD ERROR:", err);
        res.status(500).json({ message: "Could not load the leaderboard." });
    }
});


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