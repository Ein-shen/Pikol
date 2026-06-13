require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const pool = require("./db");

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is missing in .env");

// ---------- JWT ----------

// Checks the token on protected routes
const requireAuth = (req, res, next) => {
  try {
    req.user = jwt.verify(req.cookies.pikol_token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    next();
  } catch {
    res.sendStatus(401);
  }
};

// Gives the user a token
app.post("/api/token", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 30);
  if (!name) return res.status(400).json({ error: "Name is required" });

  const token = jwt.sign({ name, role: "player" }, JWT_SECRET, {
    expiresIn: "6h",
  });

  res.cookie("pikol_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 6 * 60 * 60 * 1000,
  });
  res.json({ ok: true, name });
});

// Example protected route
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ name: req.user.name, role: req.user.role });
});

// Removes the token
app.post("/api/logout", (req, res) => {
  res.clearCookie("pikol_token");
  res.json({ ok: true });
});

// ---------- your existing routes ----------

app.get("/", (req, res) => {
  res.send("Backend is working!");
});

// Test route to confirm DB connection
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});