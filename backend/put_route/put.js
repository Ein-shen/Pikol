import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();


// =====================================================
// HELPER: delete every match this one feeds into
// (used when a winner changes or a score is cleared)
// =====================================================

export async function clearDownstream(client, tournamentId, round, matchNumber) {
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
// SAVE A FINISHED MATCH (insert or update)
// PUT /api/tournaments/:id/matches
// =====================================================

router.put("/tournaments/:id/matches", requireAuth, async (req, res) => {
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


export default router;