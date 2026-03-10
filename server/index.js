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
import { resetDailyQuotaIfNeeded } from './utils/quotaUtils.js';
import TrendCache from './models/TrendCache.js';
import AmazonCache from './models/AmazonCache.js';
import { fetchTrendData } from './services/trendService.js';
import { fetchAmazonProducts } from './services/amazonService.js';
import { buildCandidateProducts } from './services/productCandidateService.js';
import { correctKeyword } from './utils/spellChecker.js';
import Stripe from 'stripe';

// Conditionally initialize Stripe — don't crash if key is missing
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized (test mode)');
} else {
    console.warn('⚠️  STRIPE_SECRET_KEY not set — payment routes will be disabled');
}

const app = express();
app.use(cors());

// ---- Stripe Webhook (MUST be before express.json() for raw body signature verification) ----
app.post(
    '/api/payment/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error(`Webhook signature verification failed:`, err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            if (userId) {
                try {
                    await User.findByIdAndUpdate(userId, {
                        plan: 'pro',
                        stripeCustomerId: customerId,
                        stripeSubscriptionId: subscriptionId
                    });
                    console.log(`✅ User ${userId} upgraded to PRO via Stripe!`);
                } catch (err) {
                    console.error('Failed to update user plan on webhook:', err);
                }
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const customerId = subscription.customer;

            try {
                await User.findOneAndUpdate(
                    { stripeCustomerId: customerId },
                    { plan: 'free' } // Downgrade gracefully
                );
                console.log(`ℹ️ Subscription ended. User downgraded to free.`);
            } catch (err) {
                console.error('Failed to downgrade user on webhook:', err);
            }
        }

        res.status(200).end();
    }
);

// JSON body parsing (after webhook route so raw body is preserved for Stripe)
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

// Fallbacks removed per strict real-data requirement.

// ---- Auth Routes ----
app.use('/api/auth', authRoutes);

// ---- Public Routes ----

// Dynamic trending: rotates daily using date-seeded keywords
const trendingKeywords = [
    'LED lamp', 'wireless earbuds', 'yoga mat', 'phone case', 'skincare',
    'kitchen gadget', 'pet toy', 'fitness tracker', 'home decor', 'portable fan',
    'smart watch', 'hair tool', 'backpack', 'water bottle', 'resistance band',
];

app.get('/api/products/trending', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const dayHash = fnv1aSimple(today);
        const kw1 = trendingKeywords[dayHash % trendingKeywords.length];
        const kw2 = trendingKeywords[(dayHash + 7) % trendingKeywords.length];

        // Try getting cached or fresh amazon results
        let products = [];
        const fetchAmazon = async (kw) => {
            const cached = await AmazonCache.findOne({ keyword: kw.toLowerCase() });
            if (cached && cached.products.length >= 3) return cached.products;
            const fresh = await fetchAmazonProducts(kw);
            if (fresh && fresh.length >= 3) {
                const built = buildCandidateProducts(fresh, kw, 'Trending');
                await AmazonCache.findOneAndUpdate({ keyword: kw.toLowerCase() }, { keyword: kw.toLowerCase(), products: built, fetchedAt: new Date() }, { upsert: true });
                return built;
            }
            return null;
        };

        const fetchTrend = async (kw) => {
            const normalized = kw.toLowerCase();
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            const cached = await TrendCache.findOne({ keyword: normalized });
            if (cached && cached.fetchedAt > sixHoursAgo) return cached;
            const fresh = await fetchTrendData(normalized);
            if (fresh) {
                await TrendCache.findOneAndUpdate({ keyword: normalized }, { keyword: normalized, trendScore: fresh.trendScore, rawData: fresh.rawData, fetchedAt: fresh.fetchedAt }, { upsert: true, new: true });
                return fresh;
            }
            return null;
        };

        const [p1, p2, t1, t2] = await Promise.all([
            fetchAmazon(kw1),
            fetchAmazon(kw2),
            fetchTrend(kw1),
            fetchTrend(kw2)
        ]);

        if (p1) products.push(...p1);
        if (p2) products.push(...p2);

        if (products.length === 0) {
            return res.status(502).json({ error: 'Failed to fetch trending market data at this time.' });
        }

        const seen = new Set();
        const unique = products.filter(p => {
            if (seen.has(p.name)) return false;
            seen.add(p.name);
            return true;
        }).map(p => {
            // Re-grade with real trend data
            const trendScore = p.name.toLowerCase().includes(kw1.toLowerCase()) ? (t1?.trendScore || 50) : (t2?.trendScore || 50);
            p.trendVelocity = trendScore;
            const newGrade = gradeProduct(p);
            return { ...p, score: newGrade.score, grade: newGrade.grade };
        }).slice(0, 8);

        res.json(unique);
    } catch (err) {
        console.error('Trending error:', err.message);
        res.status(502).json({ error: 'Failed to load trending products.' });
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

app.get('/api/products/search', async (req, res) => {
    res.json([]); // Obsolete endpoint, returning empty array to fail gracefully
});

app.get('/api/grade/daily', async (req, res) => {
    res.status(404).json({ error: 'Daily grade no longer supported synthetically' });
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

        let kw = keyword.trim();
        const correctedKeyword = correctKeyword(kw);

        // Use corrected word if spelling changed
        if (correctedKeyword && correctedKeyword !== kw) {
            kw = correctedKeyword;
        }

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

        // ---- Product Pipeline: Amazon (real) ----
        let products;
        let usedAmazon = false;

        try {
            // Check 6-hour cache first
            const normalizedKw = kw.trim().toLowerCase();
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            const cached = await AmazonCache.findOne({ keyword: normalizedKw });

            if (cached && cached.fetchedAt > sixHoursAgo && cached.products.length >= 3) {
                console.log(`[Amazon] Cache hit for "${normalizedKw}"`);
                products = cached.products;
                usedAmazon = true;
            } else {
                // Fetch fresh from Amazon Best Sellers
                const amazonResults = await fetchAmazonProducts(kw);
                if (amazonResults && amazonResults.length >= 3) {
                    const isGF = amazonResults.some(r => r.isGeneralFallback);
                    const category = isGF ? 'Trending' : (amazonResults[0]?.category || 'Trending');
                    products = buildCandidateProducts(amazonResults, kw, category);
                    // Preserve the fallback flag on the built products
                    if (isGF) products = products.map(p => ({ ...p, isGeneralFallback: true }));
                    usedAmazon = true;

                    // Cache the results
                    await AmazonCache.findOneAndUpdate(
                        { keyword: normalizedKw },
                        { keyword: normalizedKw, products, fetchedAt: new Date() },
                        { upsert: true, new: true }
                    );
                    console.log(`[Amazon] Cached ${products.length} products for "${normalizedKw}"`);
                }
            }
        } catch (err) {
            console.warn('[Amazon] Pipeline failed, using fallback:', err.message);
        }

        if (!products || products.length < 3) {
            // Amazon is down or blocked — return a clear message instead of crashing
            return res.status(503).json({ error: 'Amazon data is temporarily unavailable. Please try again in a few minutes or try a more specific keyword (e.g. "wireless earbuds" instead of "tech").' });
        }

        // Detect if results are general trending (no specific match for keyword)
        const isGeneralFallback = products.some(p => p.isGeneralFallback);

        // ---- Google Trends Integration (Phase 6) ----
        try {
            const normalizedKeyword = kw.trim().toLowerCase();
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

            // 1. Check cache first (fast path)
            let cachedTrend = await TrendCache.findOne({ keyword: normalizedKeyword });
            let trendScore = null;

            if (cachedTrend && cachedTrend.fetchedAt > sixHoursAgo) {
                trendScore = cachedTrend.trendScore;
                console.log(`[Trends] Cache hit for "${normalizedKeyword}" → score ${trendScore}`);
            } else {
                // 2. Try fresh fetch — may fail if Google is blocking
                const freshTrend = await fetchTrendData(normalizedKeyword);
                if (freshTrend) {
                    trendScore = freshTrend.trendScore;
                    await TrendCache.findOneAndUpdate(
                        { keyword: normalizedKeyword },
                        {
                            keyword: normalizedKeyword,
                            trendScore: freshTrend.trendScore,
                            rawData: freshTrend.rawData,
                            fetchedAt: freshTrend.fetchedAt
                        },
                        { upsert: true, new: true }
                    );
                }
            }

            // 3. If we got a trend score, inject it; otherwise keep existing trendVelocity from Amazon data
            if (trendScore !== null) {
                products = products.map(p => {
                    p.trendVelocity = trendScore;
                    const newGrade = gradeProduct({
                        profitMargin: p.profitMargin,
                        trendVelocity: p.trendVelocity,
                        adCompetition: p.adCompetition,
                        cpcForecast: p.cpcForecast,
                        supplierReliability: p.supplierReliability,
                        reviewSentiment: p.reviewSentiment,
                        marketSaturation: p.marketSaturation
                    });
                    return { ...p, score: newGrade.score, grade: newGrade.grade };
                });
                products.sort((a, b) => b.score - a.score);
            } else {
                // Google Trends unavailable — continue with existing scores (graceful degradation)
                console.warn(`[Trends] Unavailable for "${normalizedKeyword}" — using product-derived scores`);
            }
        } catch (trendErr) {
            // Trends threw an unexpected error — don't block the user, just log and continue
            console.warn(`[Trends API] Unexpected error for "${kw}":`, trendErr.message);
        }

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

        const returnedCorrection = (correctedKeyword && correctedKeyword !== keyword.trim()) ? kw : null;
        res.json({
            products,
            signal: 'high',
            quota,
            correctedKeyword: returnedCorrection,
            isGeneralFallback,
        });
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

        // ---- Enforce Storage Limits (Phase 4.5) ----
        const user = await User.findById(req.userId);
        if (user) {
            const limit = user.plan === 'pro' ? 20 : 5;

            // Group all by productName to find the top newest unique products
            // An aggregate pipeline is most efficient here to get unique names sorted by max createdAt
            const uniqueProducts = await Product.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
                { $group: { _id: "$productName", latestSaved: { $max: "$createdAt" } } },
                { $sort: { latestSaved: -1 } }
            ]);

            // If we have more unique products than allowed
            if (uniqueProducts.length > limit) {
                // Get the names of the products that are older than the limit
                const productsToDelete = uniqueProducts.slice(limit).map(p => p._id);

                // Delete all versions of those oldest products
                await Product.deleteMany({
                    userId: req.userId,
                    productName: { $in: productsToDelete }
                });
            }
        }

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

// ---- Stripe Payment Routes (Phase 7) ----
app.post('/api/payment/create-checkout-session', verifyToken, async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env' });
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.plan === 'pro') return res.status(400).json({ error: 'Already subscribed to Pro' });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: user.email,
            client_reference_id: user._id.toString(),
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID, // Ensure this is set in .env
                    quantity: 1,
                },
            ],
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?upgrade=success`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?upgrade=cancelled`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Checkout session error:', err);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// (Webhook route moved above express.json() — see top of file)

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 DropGravity Pro API running on port ${PORT}`);
});
