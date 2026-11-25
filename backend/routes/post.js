
import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const router = express.Router();

// =====================================================
// SUPABASE SETUP (profile photos)
// =====================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET_NAME = "profile-photos";

const supabase =
    SUPABASE_URL && SUPABASE_SECRET_KEY
        ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
        : null;

// =====================================================
// MULTER SETUP (memory storage)
// =====================================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG, WEBP, GIF, and AVIF images are allowed."));
        }

        cb(null, true);
    },
});

// =====================================================
// HELPER: GET OLD SUPABASE PHOTO PATH
// =====================================================
function getSupabasePhotoPath(photoUrl) {
    if (!photoUrl || !SUPABASE_URL) return null;

    try {
        const photo = new URL(photoUrl);
        const project = new URL(SUPABASE_URL);

        if (photo.origin !== project.origin) return null;

        const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;

        if (!photo.pathname.includes(marker)) return null;

        return decodeURIComponent(
            photo.pathname.split(marker)[1]
        );
    } catch {
        return null;
    }
}


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

        if (!supabase) {
            return res.status(500).json({
                message: "Supabase environment variables are not configured.",
            });
        }

        const extensionByType = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "image/avif": "avif",
        };

        const extension = extensionByType[req.file.mimetype];

        const filePath = `user-${req.user.id}/${Date.now()}-${randomUUID()}.${extension}`;

        let uploaded = false;

        try {
            // =========================================
            // SUPABASE DEBUG INFORMATION
            // =========================================
            console.log("========== SUPABASE UPLOAD DEBUG ==========");
            console.log("SUPABASE URL:", SUPABASE_URL);
            console.log("SUPABASE BUCKET:", BUCKET_NAME);
            console.log("SUPABASE FILE PATH:", filePath);
            console.log(
                "STORAGE REQUEST URL:",
                `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${filePath}`
            );
            console.log("FILE MIME TYPE:", req.file.mimetype);
            console.log("FILE SIZE:", req.file.size);
            console.log("============================================");

            // Get previous profile photo
            const old = await pool.query(
                "SELECT photo_url FROM users WHERE id = $1",
                [req.user.id]
            );

            const oldUrl = old.rows[0]?.photo_url;

            // Upload new image to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false,
                });

            if (uploadError) {
                console.error("SUPABASE UPLOAD ERROR:", uploadError);
                console.error("ERROR STATUS:", uploadError.status);
                console.error("ERROR CODE:", uploadError.code);
                console.error("ERROR MESSAGE:", uploadError.message);

                return res.status(500).json({
                    message: "Could not upload profile photo.",
                });
            }

            uploaded = true;

            // Get permanent public HTTPS URL
            const { data: publicData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            const photoUrl = publicData.publicUrl;

            console.log("SUPABASE PUBLIC PHOTO URL:", photoUrl);

            // Save photo URL in NeonDB
            const result = await pool.query(
                `UPDATE users SET photo_url = $1 WHERE id = $2
                 RETURNING id, username, email, full_name AS fullname,
                           COALESCE(photo_url, '') AS photo_url`,
                [photoUrl, req.user.id]
            );

            if (result.rows.length === 0) {
                await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([filePath]);

                return res.status(404).json({
                    message: "User not found.",
                });
            }

            // Delete previous Supabase photo only after successful DB update
            const oldPath = getSupabasePhotoPath(oldUrl);

            if (oldPath && oldPath !== filePath) {
                const { error: deleteError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([oldPath]);

                if (deleteError) {
                    console.error("OLD PHOTO DELETE ERROR:", deleteError);
                }
            }

            console.log("PROFILE PHOTO UPLOAD SUCCESS");

            res.json({ user: result.rows[0] });

        } catch (uploadErr) {
            console.error("UPLOAD PHOTO ERROR:", uploadErr);

            // Remove the newly uploaded image if saving to the database failed
            if (uploaded) {
                const { error: cleanupError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([filePath]);

                if (cleanupError) {
                    console.error("PHOTO CLEANUP ERROR:", cleanupError);
                }
            }

            res.status(500).json({
                message: "Could not save profile photo.",
            });
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
