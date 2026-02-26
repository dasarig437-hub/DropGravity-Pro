import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import verifyToken from './middleware/verifyToken.js';
import Product from './models/Product.js';
import User from './models/User.js';
import { gradeProduct } from './engine/gradingEngine.js';
import { generateProducts, getSignalStrength } from './engine/productGenerator.js';
import { resetDailyQuotaIfNeeded } from './utils/quotaUtils.js';

const app = express();
app.use(cors());
app.use(express.json());

// ---- Rate Limiting ----
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: { error: 'Too many auth attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ---- MongoDB Connection ----
const MONGO_URI = process.env.MONGO_URI;

await mongoose.connect(MONGO_URI);
console.log('✅ MongoDB connected');

// ---- Fallback Trending Products (for /api/products/trending when no dynamic data) ----
const fallbackProducts = [
    { id: 1, name: 'LED Sunset Projection Lamp', image: '🌅', price: 12.99, sellPrice: 34.99, category: 'Home Decor', profitMargin: 73, trendVelocity: 88, adCompetition: 25, cpcForecast: 18, supplierReliability: 85, reviewSentiment: 91, marketSaturation: 20, shippingDays: 8, orders: 15420, trend: 'rising' },
    { id: 2, name: 'Portable Neck Fan 3.0', image: '🌀', price: 5.50, sellPrice: 24.99, category: 'Electronics', profitMargin: 78, trendVelocity: 82, adCompetition: 35, cpcForecast: 22, supplierReliability: 88, reviewSentiment: 85, marketSaturation: 30, shippingDays: 10, orders: 28300, trend: 'rising' },
    { id: 3, name: 'Smart Posture Corrector', image: '🧍', price: 8.20, sellPrice: 29.99, category: 'Health', profitMargin: 72, trendVelocity: 76, adCompetition: 42, cpcForecast: 28, supplierReliability: 80, reviewSentiment: 78, marketSaturation: 35, shippingDays: 12, orders: 9800, trend: 'stable' },
    { id: 4, name: 'Mini Thermal Printer', image: '🖨️', price: 15.00, sellPrice: 44.99, category: 'Electronics', profitMargin: 67, trendVelocity: 70, adCompetition: 50, cpcForecast: 35, supplierReliability: 82, reviewSentiment: 80, marketSaturation: 40, shippingDays: 14, orders: 6200, trend: 'rising' },
    { id: 5, name: 'Magnetic Phone Mount', image: '📱', price: 2.80, sellPrice: 19.99, category: 'Accessories', profitMargin: 86, trendVelocity: 45, adCompetition: 75, cpcForecast: 55, supplierReliability: 90, reviewSentiment: 70, marketSaturation: 72, shippingDays: 7, orders: 42100, trend: 'declining' },
    { id: 6, name: 'Galaxy Star Projector', image: '🌌', price: 11.00, sellPrice: 39.99, category: 'Home Decor', profitMargin: 72, trendVelocity: 80, adCompetition: 38, cpcForecast: 25, supplierReliability: 78, reviewSentiment: 88, marketSaturation: 33, shippingDays: 10, orders: 18700, trend: 'rising' },
    { id: 7, name: 'Electric Scalp Massager', image: '💆', price: 6.50, sellPrice: 27.99, category: 'Health', profitMargin: 77, trendVelocity: 55, adCompetition: 60, cpcForecast: 42, supplierReliability: 75, reviewSentiment: 72, marketSaturation: 55, shippingDays: 11, orders: 11400, trend: 'stable' },
    { id: 8, name: 'Resin Fidget Cube Pro', image: '🎲', price: 3.20, sellPrice: 18.99, category: 'Toys', profitMargin: 83, trendVelocity: 30, adCompetition: 80, cpcForecast: 65, supplierReliability: 70, reviewSentiment: 55, marketSaturation: 78, shippingDays: 9, orders: 51200, trend: 'declining' },
];

// ---- Auth Routes ----
app.use('/api/auth', authRoutes);

// ---- Public Routes ----

// Dynamic trending: rotates daily using date-seeded keywords
const trendingKeywords = [
    'LED lamp', 'wireless earbuds', 'yoga mat', 'phone case', 'skincare',
    'kitchen gadget', 'pet toy', 'fitness tracker', 'home decor', 'portable fan',
    'smart watch', 'hair tool', 'backpack', 'water bottle', 'resistance band',
];

app.get('/api/products/trending', (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const dayHash = fnv1aSimple(today);
        // Pick 2 keywords seeded by today's date
        const kw1 = trendingKeywords[dayHash % trendingKeywords.length];
        const kw2 = trendingKeywords[(dayHash + 7) % trendingKeywords.length];
        // Use date-suffixed seed for variety, but clean keyword for display names
        const batch1 = generateProducts(kw1 + '-' + today, 4).map(p => ({
            ...p,
            name: p.name.replace(/-\d{4}-\d{2}-\d{2}/g, '').trim(),
        }));
        const batch2 = generateProducts(kw2 + '-' + today, 4).map(p => ({
            ...p,
            name: p.name.replace(/-\d{4}-\d{2}-\d{2}/g, '').trim(),
        }));
        const products = [...batch1, ...batch2];
        // Deduplicate by id and take top 8
        const seen = new Set();
        const unique = products.filter(p => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        }).slice(0, 8);
        res.json(unique);
    } catch (err) {
        console.error('Trending error, using fallback:', err.message);
        const enriched = fallbackProducts.map(p => ({ ...p, ...gradeProduct(p) }));
        res.json(enriched);
    }
});

// Simple FNV-1a for date hashing (server-side helper)
function fnv1aSimple(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

app.get('/api/products/search', (req, res) => {
    const { q, niche, minMargin } = req.query;
    let results = [...fallbackProducts];
    if (q) results = results.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    if (niche && niche !== 'All Niches') results = results.filter(p => p.category === niche);
    if (minMargin) results = results.filter(p => p.profitMargin >= Number(minMargin));
    const enriched = results.map(p => ({ ...p, ...gradeProduct(p) }));
    res.json(enriched);
});

app.get('/api/grade/daily', (req, res) => {
    const best = fallbackProducts.reduce((a, b) => (gradeProduct(a).score > gradeProduct(b).score ? a : b));
    res.json({ ...best, ...gradeProduct(best) });
});

app.get('/api/trends', (req, res) => {
    res.json([
        { day: 'Jan 1', interest: 30, competition: 10 },
        { day: 'Jan 5', interest: 35, competition: 12 },
        { day: 'Jan 10', interest: 42, competition: 15 },
        { day: 'Jan 15', interest: 55, competition: 18 },
        { day: 'Jan 20', interest: 68, competition: 22 },
        { day: 'Jan 25', interest: 72, competition: 28 },
        { day: 'Feb 1', interest: 80, competition: 30 },
        { day: 'Feb 5', interest: 85, competition: 32 },
        { day: 'Feb 10', interest: 78, competition: 35 },
        { day: 'Feb 15', interest: 82, competition: 33 },
        { day: 'Feb 20', interest: 90, competition: 36 },
        { day: 'Feb 23', interest: 88, competition: 38 },
    ]);
});

// ---- Dynamic Product Analysis (AI-Simulated) ----
app.post('/api/products/analyze', verifyToken, async (req, res) => {
    try {
        const { keyword } = req.body;

        if (!keyword || !keyword.trim()) {
            return res.status(400).json({ error: 'Keyword is required.' });
        }

        const kw = keyword.trim();

        if (kw.length > 200) {
            return res.status(400).json({ error: 'Keyword must be under 200 characters.' });
        }

        // ---- Quota enforcement (Phase 3) ----
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await resetDailyQuotaIfNeeded(user);

        const FREE_BASE_LIMIT = 3;
        const MAX_DAILY_ADS = 2;

        // Pro users bypass all quota checks
        if (user.plan !== 'pro') {
            const remainingBase = Math.max(0, FREE_BASE_LIMIT - user.dailySearchCount);
            const available = remainingBase + user.bonusSearchCredits;

            if (available <= 0) {
                return res.status(403).json({
                    error: 'Daily search limit reached. Watch an ad to unlock more searches.',
                    remainingBase: 0,
                    bonusCredits: user.bonusSearchCredits,
                    dailySearchCount: user.dailySearchCount,
                    adAvailable: user.dailyAdUnlockCount < MAX_DAILY_ADS,
                });
            }
        }

        // ---- Generate products (deterministic engine unchanged) ----
        const signal = getSignalStrength(kw);
        const products = generateProducts(kw, 6);

        // ---- Deduct quota (Phase 3) ----
        if (user.plan !== 'pro') {
            const remainingBase = Math.max(0, FREE_BASE_LIMIT - user.dailySearchCount);

            if (remainingBase > 0) {
                user.dailySearchCount += 1;
            } else {
                user.bonusSearchCredits -= 1;
            }

            await user.save();
        }

        // Include quota metadata for frontend usage indicator
        const quota = user.plan === 'pro'
            ? { plan: 'pro' }
            : {
                plan: user.plan,
                dailySearchCount: user.dailySearchCount,
                bonusSearchCredits: user.bonusSearchCredits,
                dailyAdUnlockCount: user.dailyAdUnlockCount,
                baseLimit: FREE_BASE_LIMIT,
            };

        res.json({ products, signal, quota });
    } catch (err) {
        console.error('Analyze error:', err.message);
        return res.status(500).json({ error: 'Failed to analyze products.' });
    }
});

// ---- Protected Routes ----
app.post('/api/grade', verifyToken, async (req, res) => {
    try {
        const { productName, ...metrics } = req.body;
        const result = gradeProduct(metrics);
        // Sanitize product name: trim, strip control chars, cap at 500 chars
        let name = (productName || 'Unnamed Product').trim().replace(/[\x00-\x1F\x7F]/g, '');
        if (name.length > 500) name = name.slice(0, 500);

        // Find the latest version for this user + product combo
        const latest = await Product.findOne({
            userId: req.userId,
            productName: name,
        }).sort({ version: -1 });

        const nextVersion = latest ? latest.version + 1 : 1;

        const product = new Product({
            userId: req.userId,
            productName: name,
            metrics,
            score: result.score,
            grade: result.grade,
            version: nextVersion,
        });

        await product.save();

        return res.json(product);
    } catch (err) {
        console.error('Grade error:', err.message);
        return res.status(500).json({ error: 'Failed to grade product.' });
    }
});

app.get('/api/products/my', verifyToken, async (req, res) => {
    try {
        const products = await Product.find({ userId: req.userId })
            .sort({ createdAt: -1 });

        return res.json(products);
    } catch (err) {
        console.error('Fetch history error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch product history.' });
    }
});

// ---- Ad-Complete Endpoint (Phase 3 — Quota Unlock) ----
app.post('/api/ad-complete', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await resetDailyQuotaIfNeeded(user);

        // Pro users don't need ads
        if (user.plan === 'pro') {
            return res.status(400).json({ error: 'Pro users have unlimited searches.' });
        }

        const MAX_DAILY_ADS = 2;

        if (user.dailyAdUnlockCount >= MAX_DAILY_ADS) {
            return res.status(403).json({
                error: 'Ad limit reached. You can watch up to 2 ads per day.',
                dailyAdUnlockCount: user.dailyAdUnlockCount,
            });
        }

        const CREDITS_PER_AD = 2;

        user.dailyAdUnlockCount += 1;
        user.bonusSearchCredits += CREDITS_PER_AD;
        await user.save();

        return res.json({
            message: `Ad completed! You earned ${CREDITS_PER_AD} bonus searches.`,
            bonusSearchCredits: user.bonusSearchCredits,
            dailyAdUnlockCount: user.dailyAdUnlockCount,
        });
    } catch (err) {
        console.error('Ad-complete error:', err.message);
        return res.status(500).json({ error: 'Failed to process ad completion.' });
    }
});

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 DropGravity Pro API running on port ${PORT}`);
});
