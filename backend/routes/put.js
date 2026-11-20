import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// =====================================================
// HELPER: delete every match this one feeds into
// =====================================================
export async function clearDownstream(client, tournamentId, round, matchNumber) {
    let n = matchNumber;

    for (let r = round + 1; r <= 10; r++) {
        n = Math.ceil(n / 2);

        await client.query(
            `DELETE FROM matches
             WHERE tournament_id = $1
             AND round = $2
             AND match_number = $3`,
            [tournamentId, r, n]
        );
    }
}

// =====================================================
// HELPER: tournament type checks
// =====================================================
export async function isQuadro(id) {
    const { rows } = await pool.query(
        "SELECT 1 FROM tournaments WHERE id = $1 AND type = 'quadro'",
        [id]
    );
    return rows.length > 0;
}

export async function isTop2(id) {
    const { rows } = await pool.query(
        "SELECT 1 FROM tournaments WHERE id = $1 AND type = 'top2'",
        [id]
    );
    return rows.length > 0;
}

export async function isTop3(id) {
    const { rows } = await pool.query(
        "SELECT 1 FROM tournaments WHERE id = $1 AND type = 'top3'",
        [id]
    );
    return rows.length > 0;
}

// FIX: this must check 'single', not 'top3'
export async function isSingle(id) {
    const { rows } = await pool.query(
        "SELECT 1 FROM tournaments WHERE id = $1 AND type = 'single'",
        [id]
    );
    return rows.length > 0;
}

// =====================================================
// SAVE A FINISHED MATCH
// PUT /api/tournaments/:id/matches
// =====================================================
router.put("/tournaments/:id/matches", requireAuth, async (req, res) => {
    const { id } = req.params;
    const {
        round,
        matchNumber,
        pair1Id,
        pair2Id,
        score1,
        score2,
        winnerPairId
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const old = await client.query(
            `SELECT winner_pair_id FROM matches
             WHERE tournament_id = $1
             AND round = $2
             AND match_number = $3`,
            [id, round, matchNumber]
        );

        await client.query(
            `INSERT INTO matches
                (tournament_id, round, match_number, pair1_id, pair2_id,
                 score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tournament_id, round, match_number)
             DO UPDATE SET
                pair1_id = EXCLUDED.pair1_id,
                pair2_id = EXCLUDED.pair2_id,
                score1 = EXCLUDED.score1,
                score2 = EXCLUDED.score2,
                winner_pair_id = EXCLUDED.winner_pair_id`,
            [id, round, matchNumber, pair1Id, pair2Id, score1, score2, winnerPairId]
        );

        if (old.rows[0]?.winner_pair_id !== winnerPairId) {
            await clearDownstream(client, id, round, matchNumber);
        }

        await client.query("COMMIT");
        return res.json({ ok: true });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("SAVE MATCH ERROR:", err);
        return res.status(500).json({ message: "Could not save the match." });

    } finally {
        client.release();
    }
});

// =====================================================
// SCORE VALIDATION
// =====================================================
const MAX_SCORE = 11;
const validScore = (n) =>
    Number.isInteger(n) && n >= 0 && n <= MAX_SCORE;

// =====================================================
// TOP2: save group-stage score
// PUT /api/top2/:id/group-matches
// =====================================================
router.put("/top2/:id/group-matches", requireAuth, async (req, res) => {
    const { group, pair1Id, pair2Id, score1, score2, winnerPairId } = req.body;

    if (!validScore(score1) || !validScore(score2) || score1 === score2) {
        return res.status(400).json({
            message: "Scores must be 0 to 11 and cannot tie."
        });
    }

    try {
        if (!(await isTop2(req.params.id))) {
            return res.status(404).json({ message: "Top2 tournament not found." });
        }

        await pool.query(
            `INSERT INTO group_matches
                (tournament_id, group_name, pair1_id, pair2_id,
                 score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (
                 tournament_id,
                 group_name,
                 LEAST(pair1_id, pair2_id),
                 GREATEST(pair1_id, pair2_id)
             )
             DO UPDATE SET
                pair1_id = EXCLUDED.pair1_id,
                pair2_id = EXCLUDED.pair2_id,
                score1 = EXCLUDED.score1,
                score2 = EXCLUDED.score2,
                winner_pair_id = EXCLUDED.winner_pair_id`,
            [req.params.id, group, pair1Id, pair2Id, score1, score2, winnerPairId]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("SAVE GROUP MATCH ERROR:", err);
        return res.status(500).json({
            message: "Could not save the group match."
        });
    }
});

// =====================================================
// EDIT TEAMS OF A TOP2 TOURNAMENT
// PUT /api/top2/:id/teams
// Page sends: the tournament name + the full list of teams.
//   pairId = number -> old team (already saved)
//   pairId = null   -> brand new team
// =====================================================
router.put("/top2/:id/teams", requireAuth, async (req, res) => {
    // Shows in the terminal when THIS version runs (if you don't see it, the old route is running)
    console.log("NEW ROSTER ROUTE");

    const id = Number(req.params.id);
    const name = String(req.body.name || "").trim();
    const incoming = Array.isArray(req.body.teams) ? req.body.teams : [];

    // Clean the data: trim names, make pairId a number or null
    const teams = incoming.map((t) => ({
        pairId: t.pairId == null ? null : Number(t.pairId),
        player1: String(t.player1 || "").trim(),
        player2: String(t.player2 || "").trim(),
    }));

    // --- Check the data ---
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Invalid tournament id." });
    }
    if (!name) {
        return res.status(400).json({ message: "Name is required." });
    }
    if (teams.length < 2 || teams.some((t) => !t.player1 || !t.player2)) {
        return res.status(400).json({ message: "Every team needs two players." });
    }
    if (teams.some((t) => t.pairId !== null && !Number.isInteger(t.pairId))) {
        return res.status(400).json({ message: "Invalid team id." });
    }
    // A player can't be in two teams
    const players = teams.flatMap((t) => [t.player1.toLowerCase(), t.player2.toLowerCase()]);
    if (new Set(players).size !== players.length) {
        return res.status(400).json({ message: "Each player must belong to only one team." });
    }

    const client = await pool.connect();

    try {
        // Is this really a top2 tournament?
        const check = await client.query(
            "SELECT 1 FROM tournaments WHERE id = $1 AND type = 'top2'",
            [id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ message: "Top2 tournament not found." });
        }

        // One "box": either EVERYTHING is saved, or NOTHING is
        await client.query("BEGIN");

        // Step 1: who is in the tournament right now?
        const current = await client.query(
            `SELECT pair_id, "position" FROM tournament_pairs
             WHERE tournament_id = $1 ORDER BY "position"`,
            [id]
        );
        const currentIds = current.rows.map((r) => r.pair_id);
        // Positions may start at 0 or 1: copy what you already use
        const firstPosition = current.rows.length ? Number(current.rows[0].position) : 1;

        // Old teams the page still sent
        const keptIds = teams.filter((t) => t.pairId !== null).map((t) => t.pairId);

        // Safety: a team from ANOTHER tournament is not allowed
        if (keptIds.some((pid) => !currentIds.includes(pid))) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Unknown team in the list." });
        }

        const removedIds = currentIds.filter((pid) => !keptIds.includes(pid));
        // Was a team added or removed?
        const structureChanged = removedIds.length > 0 || teams.some((t) => t.pairId === null);

        // Step 2: save the new player names of the old teams
        for (const t of teams) {
            if (t.pairId === null) continue;
            await client.query(
                "UPDATE pairs SET player1 = $1, player2 = $2 WHERE id = $3",
                [t.player1, t.player2, t.pairId]
            );
        }

        // Step 3: only if a team was added or removed
        if (structureChanged) {
            // Groups change -> old scores are wrong -> delete them all
            await client.query("DELETE FROM matches WHERE tournament_id = $1", [id]);
            await client.query("DELETE FROM group_matches WHERE tournament_id = $1", [id]);

            // Write the team list again, in the new order
            await client.query("DELETE FROM tournament_pairs WHERE tournament_id = $1", [id]);

            for (let i = 0; i < teams.length; i++) {
                let pairId = teams[i].pairId;

                // New team? Create it first to get its id
                if (pairId === null) {
                    const ins = await client.query(
                        `INSERT INTO pairs (name, player1, player2)
                         VALUES ($1, $2, $3) RETURNING id`,
                        [`Team ${i + 1}`, teams[i].player1, teams[i].player2]
                    );
                    pairId = ins.rows[0].id;
                }

                await client.query(
                    `INSERT INTO tournament_pairs (tournament_id, pair_id, "position")
                     VALUES ($1, $2, $3)`,
                    [id, pairId, firstPosition + i]
                );
            }

            // Delete removed teams for good, unless another tournament uses them
            if (removedIds.length) {
                await client.query(
                    `DELETE FROM pairs
                     WHERE id = ANY($1::int[])
                       AND NOT EXISTS (
                           SELECT 1 FROM tournament_pairs tp WHERE tp.pair_id = pairs.id
                       )`,
                    [removedIds]
                );
            }
        }

        // Step 4: save the tournament name
        await client.query("UPDATE tournaments SET name = $1 WHERE id = $2", [name, id]);

        await client.query("COMMIT");
        return res.json({ ok: true, reset: structureChanged });

    } catch (err) {
        // Something broke -> undo everything
        try { await client.query("ROLLBACK"); } catch {}
        console.error("EDIT TOP2 ROSTER ERROR:", err.message);

        // TEMPORARY: shows the real database error in the browser.
        // When it works, change it back to: "Could not update the tournament."
        return res.status(500).json({ message: `Could not update: ${err.message}` });

    } finally {
        client.release();
    }
});

// =====================================================
// TOP2: save playoff score
// PUT /api/top2/:id/matches
// =====================================================
router.put("/top2/:id/matches", requireAuth, async (req, res) => {
    const {
        round,
        matchNumber,
        pair1Id,
        pair2Id,
        score1,
        score2,
        winnerPairId
    } = req.body;

    if (!validScore(score1) || !validScore(score2) || score1 === score2) {
        return res.status(400).json({
            message: "Scores must be 0 to 11 and cannot tie."
        });
    }

    try {
        if (!(await isTop2(req.params.id))) {
            return res.status(404).json({ message: "Top2 tournament not found." });
        }

        await pool.query(
            `INSERT INTO matches
                (tournament_id, round, match_number, pair1_id, pair2_id,
                 score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tournament_id, round, match_number)
             DO UPDATE SET
                pair1_id = EXCLUDED.pair1_id,
                pair2_id = EXCLUDED.pair2_id,
                score1 = EXCLUDED.score1,
                score2 = EXCLUDED.score2,
                winner_pair_id = EXCLUDED.winner_pair_id`,
            [req.params.id, round, matchNumber, pair1Id, pair2Id, score1, score2, winnerPairId]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("SAVE TOP2 MATCH ERROR:", err);
        return res.status(500).json({ message: "Could not save the match." });
    }
});

// =====================================================
// TOP2: rename
// PUT /api/top2/:id
// =====================================================
router.put("/top2/:id", requireAuth, async (req, res) => {
    const name = String(req.body.name || "").trim();

    if (!name) {
        return res.status(400).json({ message: "Name is required." });
    }

    try {
        const { rowCount } = await pool.query(
            "UPDATE tournaments SET name = $1 WHERE id = $2 AND type = 'top2'",
            [name, req.params.id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ message: "Top2 tournament not found." });
        }

        return res.json({ ok: true });

    } catch (err) {
        console.error("RENAME TOP2 ERROR:", err);
        return res.status(500).json({
            message: "Could not rename the tournament."
        });
    }
});

// =====================================================
// SINGLE: rename
// PUT /api/single/:id
// =====================================================
router.put("/single/:id", requireAuth, async (req, res) => {
    const name = String(req.body.name || "").trim();

    if (!name) {
        return res.status(400).json({ message: "Name is required." });
    }

    try {
        const { rowCount } = await pool.query(
            "UPDATE tournaments SET name = $1 WHERE id = $2 AND type = 'single'",
            [name, req.params.id]
        );

        if (rowCount === 0) {
            return res.status(404).json({
                message: "Single tournament can't be found."
            });
        }

        return res.json({ ok: true });

    } catch (err) {
        console.error("RENAME SINGLE ERROR:", err);
        return res.status(500).json({
            message: "Couldn't rename the tournament."
        });
    }
});

// =====================================================
// TOP3: save group-stage score
// PUT /api/top3/:id/group-matches
// =====================================================
router.put("/top3/:id/group-matches", requireAuth, async (req, res) => {
    const { group, pair1Id, pair2Id, score1, score2, winnerPairId } = req.body;

    if (!validScore(score1) || !validScore(score2) || score1 === score2) {
        return res.status(400).json({
            message: "Scores must be 0 to 11 and cannot tie."
        });
    }

    try {
        if (!(await isTop3(req.params.id))) {
            return res.status(404).json({ message: "Top3 tournament not found." });
        }

        await pool.query(
            `INSERT INTO group_matches
                (tournament_id, group_name, pair1_id, pair2_id,
                 score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (
                 tournament_id,
                 group_name,
                 LEAST(pair1_id, pair2_id),
                 GREATEST(pair1_id, pair2_id)
             )
             DO UPDATE SET
                pair1_id = EXCLUDED.pair1_id,
                pair2_id = EXCLUDED.pair2_id,
                score1 = EXCLUDED.score1,
                score2 = EXCLUDED.score2,
                winner_pair_id = EXCLUDED.winner_pair_id`,
            [req.params.id, group, pair1Id, pair2Id, score1, score2, winnerPairId]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("SAVE TOP3 GROUP MATCH ERROR:", err);
        return res.status(500).json({
            message: "Could not save the group match."
        });
    }
});

// =====================================================
// TOP3: save playoff score
// PUT /api/top3/:id/matches
// =====================================================
router.put("/top3/:id/matches", requireAuth, async (req, res) => {
    const {
        round,
        matchNumber,
        pair1Id,
        pair2Id,
        score1,
        score2,
        winnerPairId
    } = req.body;

    if (!validScore(score1) || !validScore(score2) || score1 === score2) {
        return res.status(400).json({
            message: "Scores must be 0 to 11 and cannot tie."
        });
    }

    try {
        if (!(await isTop3(req.params.id))) {
            return res.status(404).json({ message: "Top3 tournament not found." });
        }

        await pool.query(
            `INSERT INTO matches
                (tournament_id, round, match_number, pair1_id, pair2_id,
                 score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tournament_id, round, match_number)
             DO UPDATE SET
                pair1_id = EXCLUDED.pair1_id,
                pair2_id = EXCLUDED.pair2_id,
                score1 = EXCLUDED.score1,
                score2 = EXCLUDED.score2,
                winner_pair_id = EXCLUDED.winner_pair_id`,
            [req.params.id, round, matchNumber, pair1Id, pair2Id, score1, score2, winnerPairId]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("SAVE TOP3 MATCH ERROR:", err);
        return res.status(500).json({ message: "Could not save the match." });
    }
});

// =====================================================
// TOP3: rename
// PUT /api/top3/:id
// =====================================================
router.put("/top3/:id", requireAuth, async (req, res) => {
    const name = String(req.body.name || "").trim();

    if (!name) {
        return res.status(400).json({ message: "Name is required." });
    }

    try {
        const { rowCount } = await pool.query(
            "UPDATE tournaments SET name = $1 WHERE id = $2 AND type = 'top3'",
            [name, req.params.id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ message: "Top3 tournament not found." });
        }

        return res.json({ ok: true });

    } catch (err) {
        console.error("RENAME TOP3 ERROR:", err);
        return res.status(500).json({
            message: "Could not rename the tournament."
        });
    }
});

// =====================================================
// UPDATE PROFILE
// PUT /api/me
// =====================================================
router.put("/me", requireAuth, async (req, res) => {
    const fullname = req.body?.fullname?.trim();
    const username = req.body?.username?.trim();

    if (!fullname && !username) {
        return res.status(400).json({
            message: "No profile data provided to update."
        });
    }

    try {
        const result = await pool.query(
            `UPDATE users
             SET full_name = COALESCE($1, full_name),
                 username = COALESCE($2, username)
             WHERE id = $3
             RETURNING id, username, email, full_name AS fullname,
                       COALESCE(photo_url, '') AS photo_url`,
            [fullname || null, username || null, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        return res.json({ user: result.rows[0] });

    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                message: "That username is already taken."
            });
        }

        console.error("UPDATE PROFILE ERROR:", err);
        return res.status(500).json({ message: "Could not update profile." });
    }
});

export default router;