import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { clearDownstream, isQuadro } from "../put_route/put.js";

const router = express.Router();

// =====================================================
// QUADRO: Get all quadro tournaments
// GET /api/quadro
// =====================================================
router.get("/quadro", requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.id, t.name, t.type, 
             (SELECT json_agg(p.*) FROM pairs p 
              JOIN tournament_pairs tp ON p.id = tp.pair_id 
              WHERE tp.tournament_id = t.id) as teams
             FROM tournaments t 
             WHERE t.type = 'quadro' 
             ORDER BY t.id DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("GET QUADRO TOURNAMENTS ERROR:", err);
        res.status(500).json({ message: "Could not fetch quadro tournaments." });
    }
});

// =====================================================
// QUADRO: Get single quadro tournament details (teams, group matches, knockout matches)
// GET /api/quadro/:id
// =====================================================
router.get("/quadro/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await isQuadro(id))) {
            return res.status(404).json({ message: "Quadro tournament not found." });
        }

        const tournamentQuery = await pool.query(
            "SELECT id, name, type FROM tournaments WHERE id = $1",
            [id]
        );
        const tournament = tournamentQuery.rows[0];

        const teamsQuery = await pool.query(
            `SELECT p.id, p.name, p.player1, p.player2, tp.pair_id as "pairId"
             FROM pairs p
             JOIN tournament_pairs tp ON p.id = tp.pair_id
             WHERE tp.tournament_id = $1`,
            [id]
        );

        const groupMatchesQuery = await pool.query(
            `SELECT group_name as "group", pair1_id as "pair1Id", pair2_id as "pair2Id", 
             score1, score2, winner_pair_id as "winnerPairId"
             FROM group_matches WHERE tournament_id = $1`,
            [id]
        );

        const matchesQuery = await pool.query(
            `SELECT round, match_number as "matchNumber", pair1_id as "pair1Id", pair2_id as "pair2Id",
             score1, score2, winner_pair_id as "winnerPairId"
             FROM matches WHERE tournament_id = $1`,
            [id]
        );

        res.json({
            id: tournament.id,
            name: tournament.name,
            type: tournament.type,
            teams: teamsQuery.rows,
            groupMatches: groupMatchesQuery.rows,
            matches: matchesQuery.rows
        });
    } catch (err) {
        console.error("GET SINGLE QUADRO ERROR:", err);
        res.status(500).json({ message: "Could not fetch tournament data." });
    }
});

// =====================================================
// QUADRO: Rename tournament
// PUT /api/quadro/:id
// =====================================================
router.put("/quadro/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        if (!(await isQuadro(id))) {
            return res.status(404).json({ message: "Quadro tournament not found." });
        }
        await pool.query("UPDATE tournaments SET name = $1 WHERE id = $2", [name, id]);
        res.json({ ok: true });
    } catch (err) {
        console.error("RENAME QUADRO ERROR:", err);
        res.status(500).json({ message: "Could not rename tournament." });
    }
});

// =====================================================
// QUADRO: Save/Update group match score
// PUT /api/quadro/:id/group-matches
// =====================================================
router.put("/quadro/:id/group-matches", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { group, pair1Id, pair2Id, score1, score2, winnerPairId } = req.body;

    try {
        if (!(await isQuadro(id))) {
            return res.status(404).json({ message: "Quadro tournament not found." });
        }

        await pool.query(
            `INSERT INTO group_matches (tournament_id, group_name, pair1_id, pair2_id, score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (tournament_id, group_name, pair1_id, pair2_id) 
             DO UPDATE SET score1 = $5, score2 = $6, winner_pair_id = $7`,
            [id, group, pair1Id, pair2Id, score1, score2, winnerPairId]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error("SAVE GROUP MATCH ERROR:", err);
        res.status(500).json({ message: "Could not save group match score." });
    }
});

// =====================================================
// QUADRO: Save/Update knockout match score
// PUT /api/quadro/:id/matches
// =====================================================
router.put("/quadro/:id/matches", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { round, matchNumber, pair1Id, pair2Id, score1, score2, winnerPairId } = req.body;

    try {
        if (!(await isQuadro(id))) {
            return res.status(404).json({ message: "Quadro tournament not found." });
        }

        await pool.query(
            `INSERT INTO matches (tournament_id, round, match_number, pair1_id, pair2_id, score1, score2, winner_pair_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (tournament_id, round, match_number) 
             DO UPDATE SET pair1_id = $4, pair2_id = $5, score1 = $6, score2 = $7, winner_pair_id = $8`,
            [id, round, matchNumber, pair1Id, pair2Id, score1, score2, winnerPairId]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error("SAVE KNOCKOUT MATCH ERROR:", err);
        res.status(500).json({ message: "Could not save knockout match score." });
    }
});

// =====================================================
// SINGLE ELIMINATION: clear one match (+ everything it feeds into)
// DELETE /api/tournaments/:id/matches/:round/:matchNumber
// =====================================================
router.delete("/tournaments/:id/matches/:round/:matchNumber", requireAuth, async (req, res) => {
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
// QUADRO: clear one group score
// DELETE /api/quadro/:id/group-matches   (body: group, pair1Id, pair2Id)
// =====================================================
router.delete("/quadro/:id/group-matches", requireAuth, async (req, res) => {
    const { group, pair1Id, pair2Id } = req.body;

    try {
        if (!(await isQuadro(req.params.id))) {
            return res.status(404).json({ message: "Quadro tournament not found." });
        }

        await pool.query(
            `DELETE FROM group_matches
             WHERE tournament_id = $1 AND group_name = $2
               AND LEAST(pair1_id, pair2_id) = LEAST($3::int, $4::int)
               AND GREATEST(pair1_id, pair2_id) = GREATEST($3::int, $4::int)`,
            [req.params.id, group, pair1Id, pair2Id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error("DELETE GROUP MATCH ERROR:", err);
        res.status(500).json({ message: "Could not clear the group match." });
    }
});

// =====================================================
// QUADRO: clear ALL knockout matches (Unlock groups)
// DELETE /api/quadro/:id/matches
// =====================================================
router.delete("/quadro/:id/matches", requireAuth, async (req, res) => {
    try {
        if (!(await isQuadro(req.params.id))) {
            return res.status(404).json({ message: "Quadro tournament not found." });
        }

        await pool.query("DELETE FROM matches WHERE tournament_id = $1", [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error("CLEAR KNOCKOUT ERROR:", err);
        res.status(500).json({ message: "Could not clear the knockout matches." });
    }
});

// =====================================================
// QUADRO: clear one knockout match (+ everything it feeds into)
// DELETE /api/quadro/:id/matches/:round/:matchNumber
// =====================================================
router.delete("/quadro/:id/matches/:round/:matchNumber", requireAuth, async (req, res) => {
    const { id } = req.params;
    const round = Number(req.params.round);
    const matchNumber = Number(req.params.matchNumber);

    const client = await pool.connect();
    try {
        if (!(await isQuadro(id))) {
            return res.status(404).json({ message: "Quadro tournament not found." });
        }

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
        console.error("CLEAR QUADRO MATCH ERROR:", err);
        res.status(500).json({ message: "Could not clear the match." });
    } finally {
        client.release();
    }
});

// =====================================================
// QUADRO / SINGLE / DOUBLE: delete a whole tournament
// DELETE /api/quadro/:id  OR  DELETE /api/tournaments/:id
// =====================================================
router.delete("/quadro/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query("DELETE FROM group_matches WHERE tournament_id = $1", [id]);
        await client.query("DELETE FROM matches WHERE tournament_id = $1", [id]);
        
        const pairs = await client.query(
            "SELECT pair_id FROM tournament_pairs WHERE tournament_id = $1", [id]
        );
        const pairIds = pairs.rows.map((r) => r.pair_id);

        await client.query("DELETE FROM tournament_pairs WHERE tournament_id = $1", [id]);
        await client.query("DELETE FROM tournaments WHERE id = $1", [id]);
        
        if (pairIds.length > 0) {
            await client.query(
                `DELETE FROM pairs
                 WHERE id = ANY($1::int[])
                   AND id NOT IN (SELECT pair_id FROM tournament_pairs)`,
                [pairIds]
            );
        }

        await client.query("COMMIT");
        res.json({ ok: true });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DELETE QUADRO TOURNAMENT ERROR:", err);
        res.status(500).json({ message: "Could not delete the tournament." });
    } finally {
        client.release();
    }
});

router.delete("/tournaments/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const t = await client.query(
            "SELECT 1 FROM tournaments WHERE id = $1 AND type <> 'quadro'", [id]
        );
        if (t.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Tournament not found." });
        }

        const pairs = await client.query(
            "SELECT pair_id FROM tournament_pairs WHERE tournament_id = $1", [id]
        );
        const pairIds = pairs.rows.map((r) => r.pair_id);

        await client.query("DELETE FROM matches WHERE tournament_id = $1", [id]);
        await client.query("DELETE FROM tournament_pairs WHERE tournament_id = $1", [id]);
        await client.query("DELETE FROM tournaments WHERE id = $1", [id]);
        
        if (pairIds.length > 0) {
            await client.query(
                `DELETE FROM pairs
                 WHERE id = ANY($1::int[])
                   AND id NOT IN (SELECT pair_id FROM tournament_pairs)`,
                [pairIds]
            );
        }

        await client.query("COMMIT");
        res.json({ ok: true });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("DELETE TOURNAMENT ERROR:", err);
        res.status(500).json({ message: "Could not delete the tournament." });
    } finally {
        client.release();
    }
});

export default router;