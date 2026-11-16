import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// =====================================================
// MULTER SETUP (profile photos)
// =====================================================
const uploadDir = path.join(process.cwd(), "uploads", "profile");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed."));
        }
        cb(null, true);
    },
});

// =====================================================
// POST /api/me/photo : upload profile photo
// =====================================================
router.post("/me/photo", requireAuth, (req, res) => {
    upload.single("photo")(req, res, async (err) => {
        if (err) {
            const message =
                err.code === "LIMIT_FILE_SIZE"
                    ? "Image must be smaller than 5 MB."
                    : err.message || "Upload failed.";
            return res.status(400).json({ message });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No photo uploaded." });
        }

        const photoUrl = `${req.protocol}://${req.get("host")}/uploads/profile/${req.file.filename}`;

        try {
            // Delete the previous photo file (if it was one of ours)
            const old = await pool.query(
                "SELECT photo_url FROM users WHERE id = $1",
                [req.user.id]
            );
            const oldUrl = old.rows[0]?.photo_url;
            if (oldUrl && oldUrl.includes("/uploads/profile/")) {
                fs.unlink(path.join(uploadDir, path.basename(oldUrl)), () => {});
            }

            const result = await pool.query(
                `UPDATE users SET photo_url = $1 WHERE id = $2
                 RETURNING id, username, email, full_name AS fullname,
                           COALESCE(photo_url, '') AS photo_url`,
                [photoUrl, req.user.id]
            );

            res.json({ user: result.rows[0] });
        } catch (dbErr) {
            console.error("UPLOAD PHOTO ERROR:", dbErr);
            res.status(500).json({ message: "Could not save profile photo." });
        }
    });
});

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

export default router;