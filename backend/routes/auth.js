import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();


// =====================================================
// COOKIE OPTIONS
// =====================================================

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
};


// =====================================================
// GENERATE JWT
// =====================================================

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured in .env');
    }

    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        {
            expiresIn: '30d',
            algorithm: 'HS256',
        }
    );
};


// =====================================================
// SIGNUP
// POST /api/auth/signup
// =====================================================

router.post('/signup', async (req, res) => {
    try {
        const username = String(req.body?.username || '').trim();
        const email = String(req.body?.email || '').trim().toLowerCase();
        const password = String(req.body?.password || '');

        // ---------------------------------------------
        // Validate fields
        // ---------------------------------------------

        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Please provide username, email, and password',
            });
        }

        // ---------------------------------------------
        // Validate username
        // ---------------------------------------------

        if (username.length < 3 || username.length > 100) {
            return res.status(400).json({
                message: 'Username must be 3-100 characters',
            });
        }

        // ---------------------------------------------
        // Validate email
        // ---------------------------------------------

        if (!email.includes('@')) {
            return res.status(400).json({
                message: 'Please provide a valid email address',
            });
        }

        // ---------------------------------------------
        // Validate password
        // ---------------------------------------------

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                message: 'Password must be 8-72 characters',
            });
        }

        // ---------------------------------------------
        // Check if email already exists
        // ---------------------------------------------

        const userExists = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                message: 'Email is already registered',
            });
        }

        // ---------------------------------------------
        // Hash password
        // ---------------------------------------------

        const passwordHash = await bcrypt.hash(password, 10);

        // ---------------------------------------------
        // Create user
        // ---------------------------------------------

        const newUser = await pool.query(
            `INSERT INTO users (
                username,
                email,
                password_hash
            )
            VALUES ($1, $2, $3)
            RETURNING id, username, email, created_at`,
            [
                username,
                email,
                passwordHash,
            ]
        );

        if (newUser.rows.length === 0) {
            throw new Error('User was not created');
        }

        const user = newUser.rows[0];

        // ---------------------------------------------
        // Generate JWT
        // ---------------------------------------------

        const token = generateToken(user.id);

        // ---------------------------------------------
        // Set authentication cookie
        // ---------------------------------------------

        res.cookie(
            'token',
            token,
            cookieOptions
        );

        // ---------------------------------------------
        // Response
        // ---------------------------------------------

        return res.status(201).json({
            message: 'Signup successful',
            user,
        });

    } catch (error) {
        console.error('SIGNUP ERROR:', error);

        // PostgreSQL duplicate key
        if (error.code === '23505') {
            return res.status(400).json({
                message: 'Username or email already exists',
            });
        }

        // Table does not exist
        if (error.code === '42P01') {
            return res.status(500).json({
                message: 'Database table "users" does not exist',
            });
        }

        // Column does not exist
        if (error.code === '42703') {
            return res.status(500).json({
                message: 'Database column is missing',
                detail: error.message,
            });
        }

        return res.status(500).json({
            message: 'Server error',
            error: error.message,
            code: error.code || null,
        });
    }
});


// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post('/login', async (req, res) => {
    try {
        const email = String(req.body?.email || '')
            .trim()
            .toLowerCase();

        const password = String(req.body?.password || '');

        // ---------------------------------------------
        // Validate fields
        // ---------------------------------------------

        if (!email || !password) {
            return res.status(400).json({
                message: 'Please provide email and password',
            });
        }

        // ---------------------------------------------
        // Find user
        // ---------------------------------------------

        const result = await pool.query(
            `SELECT
                id,
                username,
                email,
                password_hash
             FROM users
             WHERE email = $1`,
            [email]
        );

        // ---------------------------------------------
        // User does not exist
        // ---------------------------------------------

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: 'Invalid credentials',
            });
        }

        const user = result.rows[0];

        // ---------------------------------------------
        // Check password
        // ---------------------------------------------

        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid credentials',
            });
        }

        // ---------------------------------------------
        // Generate JWT
        // ---------------------------------------------

        const token = generateToken(user.id);

        // ---------------------------------------------
        // Set authentication cookie
        // ---------------------------------------------

        res.cookie(
            'token',
            token,
            cookieOptions
        );

        // ---------------------------------------------
        // Response
        // ---------------------------------------------

        return res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });

    } catch (error) {
        console.error('LOGIN ERROR:', error);

        return res.status(500).json({
            message: 'Server error',
            error: error.message,
            code: error.code || null,
        });
    }
});


// =====================================================
// GET CURRENT USER
// GET /api/auth/me
// =====================================================

router.get('/me', requireAuth, async (req, res) => {
    try {
        return res.status(200).json({
            user: req.user,
        });

    } catch (error) {
        console.error('ME ERROR:', error);

        return res.status(500).json({
            message: 'Server error',
            error: error.message,
        });
    }
});


// =====================================================
// LOGOUT
// POST /api/auth/logout
// =====================================================

router.post('/logout', (req, res) => {
    res.cookie('token', '', {
        ...cookieOptions,
        maxAge: 0,
    });

    return res.status(200).json({
        message: 'Logged out successfully',
    });
});


// =====================================================
// EXPORT ROUTER
// =====================================================

export default router;