import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isSingle, isTop2, isTop3 } from "./put.js";

const router = express.Router();

// =====================================================
// HELPER: delete a tournament's pairs if no longer used
// =====================================================
async function deleteUnusedPairs(client, pairIds) {
    if (!pairIds.length) return;

    await client.query(
        `DELETE FROM pairs
         WHERE id = ANY($1::int[])
         AND id NOT IN (
             SELECT pair_id FROM tournament_pairs
         )`,
        [pairIds]
    );
}

// =====================================================
// SINGLE / DOUBLE: delete a whole tournament
// DELETE /api/tournaments/:id
// =====================================================
router.delete("/tournaments/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const tournament = await client.query(
            `SELECT 1
             FROM tournaments
             WHERE id = $1
             AND type <> 'quadro'`,
            [id]
        );

        if (tournament.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Tournament not found."
            });
        }

        const pairs = await client.query(
            `SELECT pair_id
             FROM tournament_pairs
             WHERE tournament_id = $1`,
            [id]
        );

        const pairIds = pairs.rows.map((row) => row.pair_id);

        await client.query(
            "DELETE FROM group_matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournament_pairs WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournaments WHERE id = $1",
            [id]
        );

        await deleteUnusedPairs(client, pairIds);

        await client.query("COMMIT");

        return res.json({ ok: true });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DELETE TOURNAMENT ERROR:", err);

        return res.status(500).json({
            message: "Could not delete the tournament."
        });

    } finally {
        client.release();
    }
});

// =====================================================
// SINGLE: delete a whole tournament
// DELETE /api/single/:id
// =====================================================
router.delete("/single/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    let client;

    try {
        // Check that the tournament is actually type 'single'
        if (!(await isSingle(id))) {
            return res.status(404).json({
                message: "Single elimination tournament not found."
            });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const pairs = await client.query(
            `SELECT pair_id
             FROM tournament_pairs
             WHERE tournament_id = $1`,
            [id]
        );

        const pairIds = pairs.rows.map((row) => row.pair_id);

        await client.query(
            "DELETE FROM group_matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournament_pairs WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournaments WHERE id = $1 AND type = 'single'",
            [id]
        );

        await deleteUnusedPairs(client, pairIds);

        await client.query("COMMIT");

        return res.json({ ok: true });

    } catch (err) {
        if (client) {
            await client.query("ROLLBACK");
        }

        console.error("DELETE SINGLE ERROR:", err);

        return res.status(500).json({
            message: "Could not delete the tournament."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// =====================================================
// TOP2: clear one group score
// DELETE /api/top2/:id/group-matches
// =====================================================
router.delete("/top2/:id/group-matches", requireAuth, async (req, res) => {
    const { group, pair1Id, pair2Id } = req.body;

    try {
        if (!(await isTop2(req.params.id))) {
            return res.status(404).json({
                message: "Top2 tournament not found."
            });
        }

        await pool.query(
            `DELETE FROM group_matches
             WHERE tournament_id = $1
             AND group_name = $2
             AND LEAST(pair1_id, pair2_id) = LEAST($3::int, $4::int)
             AND GREATEST(pair1_id, pair2_id) = GREATEST($3::int, $4::int)`,
            [req.params.id, group, pair1Id, pair2Id]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("DELETE TOP2 GROUP MATCH ERROR:", err);

        return res.status(500).json({
            message: "Could not clear the group match."
        });
    }
});

// =====================================================
// TOP2: clear all playoff matches
// DELETE /api/top2/:id/matches
// =====================================================
router.delete("/top2/:id/matches", requireAuth, async (req, res) => {
    try {
        if (!(await isTop2(req.params.id))) {
            return res.status(404).json({
                message: "Top2 tournament not found."
            });
        }

        await pool.query(
            "DELETE FROM matches WHERE tournament_id = $1",
            [req.params.id]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("CLEAR TOP2 PLAYOFFS ERROR:", err);

        return res.status(500).json({
            message: "Could not clear the playoff matches."
        });
    }
});

// =====================================================
// TOP2: clear one playoff match
// DELETE /api/top2/:id/matches/:round/:matchNumber
// =====================================================
router.delete(
    "/top2/:id/matches/:round/:matchNumber",
    requireAuth,
    async (req, res) => {
        const { id } = req.params;
        const round = Number(req.params.round);
        const matchNumber = Number(req.params.matchNumber);

        try {
            if (!(await isTop2(id))) {
                return res.status(404).json({
                    message: "Top2 tournament not found."
                });
            }

            await pool.query(
                `DELETE FROM matches
                 WHERE tournament_id = $1
                 AND round = $2
                 AND match_number = $3`,
                [id, round, matchNumber]
            );

            return res.json({ ok: true });

        } catch (err) {
            console.error("DELETE TOP2 MATCH ERROR:", err);

            return res.status(500).json({
                message: "Could not clear the match."
            });
        }
    }
);

// =====================================================
// TOP2: delete a whole tournament
// DELETE /api/top2/:id
// =====================================================
router.delete("/top2/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    let client;

    try {
        if (!(await isTop2(id))) {
            return res.status(404).json({
                message: "Top2 tournament not found."
            });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const pairs = await client.query(
            "SELECT pair_id FROM tournament_pairs WHERE tournament_id = $1",
            [id]
        );

        const pairIds = pairs.rows.map((row) => row.pair_id);

        await client.query(
            "DELETE FROM group_matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournament_pairs WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournaments WHERE id = $1 AND type = 'top2'",
            [id]
        );

        await deleteUnusedPairs(client, pairIds);

        await client.query("COMMIT");

        return res.json({ ok: true });

    } catch (err) {
        if (client) {
            await client.query("ROLLBACK");
        }

        console.error("DELETE TOP2 ERROR:", err);

        return res.status(500).json({
            message: "Could not delete the tournament."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// =====================================================
// TOP3: clear one group score
// DELETE /api/top3/:id/group-matches
// =====================================================
router.delete("/top3/:id/group-matches", requireAuth, async (req, res) => {
    const { group, pair1Id, pair2Id } = req.body;

    try {
        if (!(await isTop3(req.params.id))) {
            return res.status(404).json({
                message: "Top3 tournament not found."
            });
        }

        await pool.query(
            `DELETE FROM group_matches
             WHERE tournament_id = $1
             AND group_name = $2
             AND LEAST(pair1_id, pair2_id) = LEAST($3::int, $4::int)
             AND GREATEST(pair1_id, pair2_id) = GREATEST($3::int, $4::int)`,
            [req.params.id, group, pair1Id, pair2Id]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("DELETE TOP3 GROUP MATCH ERROR:", err);

        return res.status(500).json({
            message: "Could not clear the group match."
        });
    }
});

// =====================================================
// TOP3: clear all playoff matches
// DELETE /api/top3/:id/matches
// =====================================================
router.delete("/top3/:id/matches", requireAuth, async (req, res) => {
    try {
        if (!(await isTop3(req.params.id))) {
            return res.status(404).json({
                message: "Top3 tournament not found."
            });
        }

        await pool.query(
            "DELETE FROM matches WHERE tournament_id = $1",
            [req.params.id]
        );

        return res.json({ ok: true });

    } catch (err) {
        console.error("CLEAR TOP3 PLAYOFFS ERROR:", err);

        return res.status(500).json({
            message: "Could not clear the playoff matches."
        });
    }
});

// =====================================================
// TOP3: clear one playoff match
// DELETE /api/top3/:id/matches/:round/:matchNumber
// =====================================================
router.delete(
    "/top3/:id/matches/:round/:matchNumber",
    requireAuth,
    async (req, res) => {
        const { id } = req.params;
        const round = Number(req.params.round);
        const matchNumber = Number(req.params.matchNumber);

        try {
            if (!(await isTop3(id))) {
                return res.status(404).json({
                    message: "Top3 tournament not found."
                });
            }

            await pool.query(
                `DELETE FROM matches
                 WHERE tournament_id = $1
                 AND round = $2
                 AND match_number = $3`,
                [id, round, matchNumber]
            );

            return res.json({ ok: true });

        } catch (err) {
            console.error("DELETE TOP3 MATCH ERROR:", err);

            return res.status(500).json({
                message: "Could not clear the match."
            });
        }
    }
);

// =====================================================
// TOP3: delete a whole tournament
// DELETE /api/top3/:id
// =====================================================
router.delete("/top3/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    let client;

    try {
        if (!(await isTop3(id))) {
            return res.status(404).json({
                message: "Top3 tournament not found."
            });
        }

        client = await pool.connect();
        await client.query("BEGIN");

        const pairs = await client.query(
            "SELECT pair_id FROM tournament_pairs WHERE tournament_id = $1",
            [id]
        );

        const pairIds = pairs.rows.map((row) => row.pair_id);

        await client.query(
            "DELETE FROM group_matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM matches WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournament_pairs WHERE tournament_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tournaments WHERE id = $1 AND type = 'top3'",
            [id]
        );

        await deleteUnusedPairs(client, pairIds);

        await client.query("COMMIT");

        return res.json({ ok: true });

    } catch (err) {
        if (client) {
            await client.query("ROLLBACK");
        }

        console.error("DELETE TOP3 ERROR:", err);

        return res.status(500).json({
            message: "Could not delete the tournament."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

export default router;