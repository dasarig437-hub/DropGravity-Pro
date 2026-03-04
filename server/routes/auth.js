import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const normalizedEmail = email.toLowerCase();

        // Check existing user
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = new User({
            email: normalizedEmail,
            passwordHash,
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        return res.status(201).json({
            message: 'Account created successfully.',
            token,
            user: {
                id: user._id,
                email: user.email,
                plan: user.plan,
            },
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        console.error('Register error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { userId: user._id, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        return res.json({
            message: 'Login successful.',
            token,
            user: {
                id: user._id,
                email: user.email,
                plan: user.plan,
            },
        });

    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * GET /api/auth/me — returns fresh user data from DB (used after plan upgrade)
 */
import verifyToken from '../middleware/verifyToken.js';

router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Issue a fresh token with current plan
        const token = jwt.sign(
            { userId: user._id, plan: user.plan },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                plan: user.plan,
            },
        });
    } catch (err) {
        console.error('Me error:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;