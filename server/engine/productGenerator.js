/**
 * DropGravity Pro — AI-Simulated Product Generator v2
 * Deterministic product generation with natural entropy.
 * Same keyword → same products. Different keywords → different distributions.
 */

import { gradeProduct } from './gradingEngine.js';

// ---- FNV-1a Hash (much better distribution than djb2) ----
function fnv1a(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function seededRandom(keyword) {
    return mulberry32(fnv1a(keyword.toLowerCase().trim()));
}

// ---- Product Name Templates ----
// Category-aware adjectives for richer naming
const categoryAdjectives = {
    'Home Decor': ['Cozy', 'Modern', 'Rustic', 'Ambient', 'Minimalist'],
    'Electronics': ['Smart', 'Turbo', 'Nano', 'Quantum', 'Hyper'],
    'Fashion': ['Chic', 'Urban', 'Classic', 'Sleek', 'Boho'],
    'Accessories': ['Essential', 'Signature', 'Luxe', 'Everyday', 'Travel'],
    'Beauty': ['Glow', 'Radiant', 'Pure', 'Silk', 'Velvet'],
    'Kitchen': ['Chef', 'Gourmet', 'Fresh', 'Quick', 'Artisan'],
    'Fitness': ['Power', 'Peak', 'Iron', 'Flex', 'Storm'],
    'Pet Supplies': ['Happy', 'Playful', 'Gentle', 'Loyal', 'Cozy'],
    'Toys': ['Fun', 'Magic', 'Wonder', 'Super', 'Happy'],
    'Health': ['Vital', 'Zen', 'Pure', 'Wellness', 'Calm'],
    'Automotive': ['Turbo', 'Drive', 'Road', 'Speed', 'Shield'],
    'Baby': ['Tiny', 'Soft', 'Gentle', 'Sweet', 'Little'],
    'Garden': ['Green', 'Bloom', 'Wild', 'Solar', 'Fresh'],
    'Trending': ['Hot', 'Viral', 'Next-Gen', 'Top', 'Rising'],
};

const prefixes = [
    'Premium', 'Ultra', 'Smart', 'Pro', 'Mini', 'Portable', 'LED',
    'Electric', 'Ergonomic', 'Wireless', 'Foldable', 'Waterproof',
    'Rechargeable', 'Adjustable', 'Silicone', 'Magnetic', 'Digital',
    'Automatic', 'Multi-Function', 'Compact', 'Luxury', 'Eco-Friendly',
    'Heavy-Duty', 'Lightweight', 'Noise-Cancelling', 'Solar-Powered',
    'Anti-Slip', 'Breathable', 'Insulated', 'Quick-Dry',
];

const suffixes = [
    'Pro', '2.0', '3.0', 'Plus', 'Max', 'Lite', 'X', 'V2',
    'Elite', 'Deluxe', 'Sport', 'SE', 'Ultra', 'Air',
];

// ---- Category Detection with Stemming + Multi-Word  ----
// Multi-word phrases checked first (most specific wins)
const phraseCategories = [
    ['phone case', 'Accessories'], ['phone mount', 'Accessories'], ['phone holder', 'Accessories'],
    ['phone stand', 'Accessories'], ['tablet case', 'Accessories'], ['laptop bag', 'Accessories'],
    ['hair dryer', 'Beauty'], ['hair clip', 'Beauty'], ['hair tie', 'Beauty'],
    ['nail art', 'Beauty'], ['face mask', 'Beauty'], ['skin care', 'Beauty'],
    ['home decor', 'Home Decor'], ['home office', 'Home Decor'], ['wall art', 'Home Decor'],
    ['led strip', 'Electronics'], ['led light', 'Home Decor'], ['led lamp', 'Home Decor'],
    ['dog toy', 'Pet Supplies'], ['cat toy', 'Pet Supplies'], ['pet bed', 'Pet Supplies'],
    ['baby monitor', 'Baby'], ['baby clothes', 'Baby'], ['baby bottle', 'Baby'],
    ['gym bag', 'Fitness'], ['yoga mat', 'Fitness'], ['jump rope', 'Fitness'],
    ['car mount', 'Automotive'], ['car charger', 'Electronics'], ['dash cam', 'Electronics'],
    ['water bottle', 'Kitchen'], ['coffee maker', 'Kitchen'], ['ice maker', 'Kitchen'],
    ['board game', 'Toys'], ['card game', 'Toys'], ['puzzle box', 'Toys'],
    ['resistance band', 'Fitness'], ['pull up bar', 'Fitness'], ['foam roller', 'Fitness'],
];

// Single word → category (with stemming support)
const wordCategories = {
    // Home Decor
    home: 'Home Decor', decor: 'Home Decor', lamp: 'Home Decor', light: 'Home Decor',
    candle: 'Home Decor', pillow: 'Home Decor', blanket: 'Home Decor', rug: 'Home Decor',
    curtain: 'Home Decor', vase: 'Home Decor', mirror: 'Home Decor', shelf: 'Home Decor',
    frame: 'Home Decor', plant: 'Home Decor', diffuser: 'Home Decor', projector: 'Home Decor',
    // Electronics
    phone: 'Electronics', charger: 'Electronics', cable: 'Electronics', speaker: 'Electronics',
    earbud: 'Electronics', headphone: 'Electronics', camera: 'Electronics', drone: 'Electronics',
    watch: 'Electronics', tablet: 'Electronics', keyboard: 'Electronics', mouse: 'Electronics',
    monitor: 'Electronics', printer: 'Electronics', battery: 'Electronics', hub: 'Electronics',
    // Fashion
    shirt: 'Fashion', dress: 'Fashion', jacket: 'Fashion', pant: 'Fashion', hoodie: 'Fashion',
    shoe: 'Fashion', sneaker: 'Fashion', boot: 'Fashion', sandal: 'Fashion', slipper: 'Fashion',
    sock: 'Fashion', jean: 'Fashion', skirt: 'Fashion', coat: 'Fashion', sweater: 'Fashion',
    vest: 'Fashion', legging: 'Fashion', short: 'Fashion',
    // Accessories
    bag: 'Accessories', wallet: 'Accessories', ring: 'Accessories', necklace: 'Accessories',
    sunglasses: 'Accessories', bracelet: 'Accessories', hat: 'Accessories', belt: 'Accessories',
    scarf: 'Accessories', glove: 'Accessories', backpack: 'Accessories', purse: 'Accessories',
    keychain: 'Accessories', umbrella: 'Accessories', case: 'Accessories',
    // Beauty
    skin: 'Beauty', cream: 'Beauty', serum: 'Beauty', mask: 'Beauty', lipstick: 'Beauty',
    makeup: 'Beauty', brush: 'Beauty', nail: 'Beauty', hair: 'Beauty', perfume: 'Beauty',
    moisturizer: 'Beauty', cleanser: 'Beauty', toner: 'Beauty', foundation: 'Beauty',
    shampoo: 'Beauty', conditioner: 'Beauty',
    // Kitchen
    kitchen: 'Kitchen', bottle: 'Kitchen', cup: 'Kitchen', pan: 'Kitchen', knife: 'Kitchen',
    blender: 'Kitchen', mug: 'Kitchen', plate: 'Kitchen', spoon: 'Kitchen', container: 'Kitchen',
    pot: 'Kitchen', kettle: 'Kitchen', grater: 'Kitchen', spatula: 'Kitchen', whisk: 'Kitchen',
    cutting: 'Kitchen', chopping: 'Kitchen',
    // Fitness
    yoga: 'Fitness', gym: 'Fitness', dumbbell: 'Fitness', band: 'Fitness', mat: 'Fitness',
    resistance: 'Fitness', roller: 'Fitness', jump: 'Fitness', exercise: 'Fitness',
    weight: 'Fitness', treadmill: 'Fitness', bench: 'Fitness', kettlebell: 'Fitness',
    // Pet Supplies
    dog: 'Pet Supplies', cat: 'Pet Supplies', pet: 'Pet Supplies', leash: 'Pet Supplies',
    bowl: 'Pet Supplies', collar: 'Pet Supplies', aquarium: 'Pet Supplies', fish: 'Pet Supplies',
    bird: 'Pet Supplies', hamster: 'Pet Supplies',
    // Toys
    toy: 'Toys', game: 'Toys', puzzle: 'Toys', fidget: 'Toys', lego: 'Toys',
    doll: 'Toys', action: 'Toys', rc: 'Toys', building: 'Toys', plush: 'Toys',
    // Health
    posture: 'Health', massager: 'Health', thermometer: 'Health', steam: 'Health',
    corrector: 'Health', supplement: 'Health', vitamin: 'Health', tracker: 'Health',
    sleep: 'Health', massage: 'Health', nebulizer: 'Health', bandage: 'Health',
    // Automotive
    car: 'Automotive', mount: 'Automotive', dash: 'Automotive', seat: 'Automotive',
    steering: 'Automotive', tire: 'Automotive', wiper: 'Automotive',
    // Baby
    baby: 'Baby', stroller: 'Baby', diaper: 'Baby', pacifier: 'Baby',
    crib: 'Baby', bib: 'Baby', teether: 'Baby',
    // Garden & Outdoor
    garden: 'Garden', outdoor: 'Garden', tent: 'Garden', grill: 'Garden',
    sprinkler: 'Garden', hammock: 'Garden', patio: 'Garden',
};

const categoryEmojis = {
    'Home Decor': ['🏠', '🌅', '🌌', '💡', '🕯️', '🪞'],
    'Electronics': ['📱', '🔌', '🎧', '💻', '⌚', '📷'],
    'Fashion': ['👕', '👗', '👟', '🧥', '👢', '🩴'],
    'Accessories': ['👜', '💍', '🕶️', '🧢', '⌚', '🎒'],
    'Beauty': ['💄', '🧴', '💅', '✨', '🪷', '🌸'],
    'Kitchen': ['🍳', '🥤', '🔪', '🧊', '☕', '🍽️'],
    'Fitness': ['💪', '🏋️', '🧘', '🏃', '🎯', '⚡'],
    'Pet Supplies': ['🐕', '🐈', '🦴', '🐾', '🎾', '🐟'],
    'Toys': ['🎲', '🧩', '🪀', '🎮', '🧸', '🎯'],
    'Health': ['💆', '🩺', '💊', '🧍', '🫀', '🌿'],
    'Automotive': ['🚗', '🔧', '🏎️', '⚙️', '🛞', '📡'],
    'Baby': ['👶', '🍼', '🧸', '🎀', '🪆', '🧷'],
    'Garden': ['🌱', '🌻', '🏕️', '☀️', '🌿', '🪴'],
};

const defaultCategory = 'Trending';
const defaultEmojis = ['🔥', '⚡', '🚀', '💎', '✨', '🌟'];

// Simple English stemmer (strips common suffixes)
function stem(word) {
    return word
        .replace(/ies$/i, 'y')
        .replace(/es$/i, '')
        .replace(/s$/i, '')
        .replace(/ing$/i, '')
        .replace(/ed$/i, '');
}

function detectCategory(keyword) {
    const lower = keyword.toLowerCase();

    // 1. Multi-word phrase match first (most specific)
    for (const [phrase, category] of phraseCategories) {
        if (lower.includes(phrase)) return category;
    }

    // 2. Exact word match
    const words = lower.split(/\s+/);
    for (const word of words) {
        if (wordCategories[word]) return wordCategories[word];
    }

    // 3. Stemmed match
    for (const word of words) {
        const stemmed = stem(word);
        if (wordCategories[stemmed]) return wordCategories[stemmed];
    }

    // 4. Partial match (substring)
    for (const word of words) {
        for (const [key, cat] of Object.entries(wordCategories)) {
            if (word.length > 3 && (word.includes(key) || key.includes(word))) return cat;
        }
    }

    return defaultCategory;
}

// ---- Signal Strength Detection ----
/**
 * Check if a keyword has enough semantic signal for realistic results.
 * Returns 'high' | 'medium' | 'low'
 */
export function getSignalStrength(keyword) {
    if (!keyword || !keyword.trim()) return 'low';
    const lower = keyword.toLowerCase().trim();
    const words = lower.split(/\s+/).filter(w => w.length > 1);

    // Check for phrase match
    for (const [phrase] of phraseCategories) {
        if (lower.includes(phrase)) return 'high';
    }

    // Check for word/stem match
    for (const word of words) {
        if (wordCategories[word]) return 'high';
        if (wordCategories[stem(word)]) return 'high';
    }

    // Partial match
    for (const word of words) {
        for (const key of Object.keys(wordCategories)) {
            if (word.length > 3 && (word.includes(key) || key.includes(word))) return 'medium';
        }
    }

    return 'low';
}

// ---- Generic product name templates for low-signal keywords ----
const genericProductNames = [
    'Smart Gadget', 'Daily Essentials Kit', 'Multi-Purpose Tool',
    'Premium Organizer Set', 'Portable Companion', 'All-in-One Solution',
    'Lifestyle Accessory', 'Comfort Series',
];

// ---- Product Generator ----
function generateProductName(keyword, rng, index, category) {
    const kw = keyword.trim();
    const kwTitle = kw.replace(/\b\w/g, c => c.toUpperCase());
    const signal = getSignalStrength(kw);

    const prefix = prefixes[Math.floor(rng() * prefixes.length)];
    const useSuffix = rng() > 0.45;
    const suffix = useSuffix ? ` ${suffixes[Math.floor(rng() * suffixes.length)]}` : '';
    const adjectives = categoryAdjectives[category] || categoryAdjectives['Trending'];
    const adj = adjectives[Math.floor(rng() * adjectives.length)];

    // For low-signal keywords, use category-aware generic names instead of literal keyword
    if (signal === 'low') {
        const generic = genericProductNames[index % genericProductNames.length];
        const patterns = [
            `${prefix} ${generic}${suffix}`,
            `${generic} ${prefix}${suffix}`,
            `${adj} ${generic} Set`,
            `Deluxe ${generic}${suffix}`,
            `The ${adj} ${generic}`,
            `${generic} — ${adj} Edition`,
        ];
        return patterns[index % patterns.length];
    }

    // 22 naming patterns for high/medium signal keywords
    const patterns = [
        `${prefix} ${kwTitle}${suffix}`,                    // 0: Smart Slippers Pro
        `${kwTitle} ${prefix}${suffix}`,                    // 1: Slippers Smart Plus
        `${prefix} ${kwTitle} Set${suffix}`,                // 2: Ultra Slippers Set
        `${kwTitle} — ${prefix} Edition`,                   // 3: Slippers — Eco-Friendly Edition
        `3-Pack ${prefix} ${kwTitle}`,                       // 4: 3-Pack Mini Slippers
        `Deluxe ${kwTitle}${suffix}`,                        // 5: Deluxe Slippers V2
        `${kwTitle} with ${prefix} Technology`,              // 6: Slippers with Wireless Technology
        `${prefix} ${kwTitle} Bundle`,                       // 7: Compact Slippers Bundle
        `${kwTitle} Collection${suffix}`,                    // 8: Slippers Collection Max
        `${prefix} ${kwTitle} Kit`,                          // 9: Digital Slippers Kit
        `Essential ${kwTitle}${suffix}`,                     // 10: Essential Slippers Elite
        `${kwTitle} by ${prefix}${suffix}`,                  // 11: Slippers by Lightweight Air
        `The ${adj} ${kwTitle}${suffix}`,                    // 12: The Cozy Slippers Pro
        `${kwTitle} ${adj} Series`,                          // 13: Slippers Modern Series
        `${adj} ${kwTitle} — Limited`,                       // 14: Chic Slippers — Limited
        `${kwTitle} Studio ${suffix || 'Collection'}`,       // 15: Slippers Studio Collection
        `${prefix} ${kwTitle} ${adj}`,                       // 16: Premium Slippers Cozy
        `Next-Gen ${kwTitle}${suffix}`,                      // 17: Next-Gen Slippers Plus
        `${kwTitle} ${adj} Edition`,                         // 18: Slippers Urban Edition
        `${adj} ${prefix} ${kwTitle}`,                       // 19: Modern Ultra Slippers
        `${kwTitle} — ${adj} Pick`,                          // 20: Slippers — Top Pick
        `All-New ${kwTitle}${suffix}`,                       // 21: All-New Slippers Max
    ];

    return patterns[index % patterns.length];
}

/**
 * Generate metrics with INDEPENDENT entropy per product.
 * Each product gets its own unique profile based on the per-product
 * hash offset — no shared "quality" variable constraining the distribution.
 *
 * Grade distribution achieved via weighted tierBoost (deterministic, seeded):
 *   Uses rng()-based tier roll + secondary nudge for smooth transitions.
 *   Same keyword → same tier → same grades always.
 */
function generateMetrics(rng, productIndex) {
    // Per-product quality tier: creates natural grade distribution
    // Uses weighted tierBoost, NOT fixed probability branching.
    // Secondary rng() nudge smooths transitions between tiers.
    const tierRoll = rng();
    const nudge = (rng() - 0.5) * 0.08; // ±0.04 nudge for smoother transitions
    const adjusted = tierRoll + nudge;
    const tier = adjusted > 0.92 ? 2     // ~8% excellent → targeting A
        : adjusted > 0.68 ? 1            // ~24% good → targeting B
            : adjusted > 0.32 ? 0            // ~36% average → targeting C
                : adjusted > 0.08 ? -1          // ~24% below average → targeting D
                    : -2;                           // ~8% poor → targeting F

    const tierBoost = tier * 15; // Narrower range: shifts center by ±15-30 points

    // Each metric still has independent noise via rng()
    // Positive metrics: higher base + tierBoost pushes up
    const profitMargin = clampMetric(Math.round(
        55 + tierBoost + rng() * 25 - rng() * 10
    ));
    const trendVelocity = clampMetric(Math.round(
        50 + tierBoost + rng() * 30 + (rng() > 0.7 ? 10 : 0)
    ));
    const supplierReliability = clampMetric(Math.round(
        60 + tierBoost * 0.8 + rng() * 25 + (rng() > 0.5 ? 8 : -3)
    ));
    const reviewSentiment = clampMetric(Math.round(
        55 + tierBoost + rng() * 25 - rng() * 8
    ));
    // Negative metrics (inverted in scoring): lower = better
    // tierBoost SUBTRACTS from these, so high-tier products have low competition
    const adCompetition = clampMetric(Math.round(
        45 - tierBoost * 0.7 + rng() * 30 - rng() * 8
    ));
    const cpcForecast = clampMetric(Math.round(
        35 - tierBoost * 0.6 + rng() * 30
    ));
    const marketSaturation = clampMetric(Math.round(
        35 - tierBoost * 0.6 + rng() * 35 - rng() * 8
    ));

    return {
        profitMargin,
        trendVelocity,
        adCompetition,
        cpcForecast,
        supplierReliability,
        reviewSentiment,
        marketSaturation,
    };
}

function clampMetric(val) {
    return Math.max(5, Math.min(98, val));
}

function generatePricing(rng, profitMargin) {
    const price = parseFloat((1.5 + rng() * 30).toFixed(2));
    const markup = 1 + (profitMargin / 100) + (rng() * 0.4);
    const sellPrice = parseFloat((price * markup).toFixed(2));
    return { price, sellPrice };
}

/**
 * Generate products from a keyword.
 * @param {string} keyword - Search keyword
 * @param {number} count - Number of products to generate (default: 6)
 * @returns {Array} Array of product objects with grades
 */
export function generateProducts(keyword, count = 6) {
    if (!keyword || !keyword.trim()) return [];

    const rng = seededRandom(keyword);
    const category = detectCategory(keyword);
    const emojis = categoryEmojis[category] || defaultEmojis;
    const trendOptions = ['rising', 'stable', 'declining'];

    const products = [];

    for (let i = 0; i < count; i++) {
        const name = generateProductName(keyword, rng, i, category);
        const metrics = generateMetrics(rng, i);
        const { price, sellPrice } = generatePricing(rng, metrics.profitMargin);
        const { score, grade } = gradeProduct(metrics);

        // Trend is independently random per product
        const trendRoll = rng();
        const trend = trendRoll > 0.55 ? 'rising' : trendRoll > 0.25 ? 'stable' : 'declining';

        products.push({
            id: fnv1a(`${keyword.toLowerCase().trim()}-${i}`) % 1000000,
            name,
            image: emojis[i % emojis.length],
            price,
            sellPrice,
            grade,
            score,
            ...metrics,
            category,
            shippingDays: Math.round(4 + rng() * 12 + rng() * 4),
            orders: Math.round(500 + rng() * 60000 + rng() * 20000),
            trend,
        });
    }

    // Sort by score descending (best products first)
    products.sort((a, b) => b.score - a.score);

    return products;
}
