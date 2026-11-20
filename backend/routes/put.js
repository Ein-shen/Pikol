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