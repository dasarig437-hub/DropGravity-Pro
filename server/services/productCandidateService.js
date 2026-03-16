import { gradeProduct } from '../engine/gradingEngine.js';

/**
 * Category-based estimation defaults
 */
const categoryEstimates = {
    'Home Decor': { adComp: 45, cpc: 30, suppRel: 72, saturation: 50 },
    'Electronics': { adComp: 65, cpc: 50, suppRel: 68, saturation: 60 },
    'Beauty': { adComp: 55, cpc: 40, suppRel: 70, saturation: 55 },
    'Fashion': { adComp: 50, cpc: 35, suppRel: 65, saturation: 55 },
    'Kitchen': { adComp: 40, cpc: 30, suppRel: 75, saturation: 45 },
    'Fitness': { adComp: 50, cpc: 40, suppRel: 70, saturation: 50 },
    'Pet Supplies': { adComp: 40, cpc: 30, suppRel: 72, saturation: 40 },
    'Toys': { adComp: 45, cpc: 35, suppRel: 68, saturation: 50 },
    'Baby': { adComp: 42, cpc: 32, suppRel: 74, saturation: 45 },
    'Health': { adComp: 55, cpc: 45, suppRel: 70, saturation: 50 },
    'Garden': { adComp: 35, cpc: 28, suppRel: 72, saturation: 40 },
    'Accessories': { adComp: 48, cpc: 35, suppRel: 68, saturation: 52 },
    'Automotive': { adComp: 42, cpc: 38, suppRel: 70, saturation: 42 },
};

const defaultEstimates = { adComp: 45, cpc: 35, suppRel: 70, saturation: 48 };

const categoryEmojis = {
    'Home Decor': '🏠', 'Electronics': '📱', 'Beauty': '💄', 'Fashion': '👕',
    'Kitchen': '🍳', 'Fitness': '💪', 'Pet Supplies': '🐾', 'Toys': '🎲',
    'Baby': '👶', 'Health': '💊', 'Garden': '🌱', 'Accessories': '👜',
    'Automotive': '🚗',
};

const categoryPriceRanges = {
    'Home Decor': [12, 45], 'Electronics': [15, 80], 'Beauty': [8, 35],
    'Fashion': [15, 55], 'Kitchen': [10, 40], 'Fitness': [12, 50],
    'Pet Supplies': [8, 30], 'Toys': [10, 40], 'Baby': [12, 45],
    'Health': [10, 40], 'Garden': [15, 55], 'Accessories': [10, 45],
    'Automotive': [12, 50],
};

const defaultPriceRange = [10, 40];

function clamp(val) {
    return Math.max(5, Math.min(98, Math.round(val)));
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
function seededRandom(seed) {
    let t = seed | 0;
    return function () {
        t = (t + 0x6D2B79F5) | 0;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Convert raw Amazon products into frontend-ready product objects.
 *
 * Special handling for isExactMatch products:
 * - Gets above-average metrics (since the user explicitly searched for it)
 * - Uses a deterministic seed so results are consistent per keyword
 */
export function buildCandidateProducts(amazonProducts, keyword, category = 'Trending') {
    const est = categoryEstimates[category] || defaultEstimates;
    const emoji = categoryEmojis[category] || '🔥';

    return amazonProducts.map((ap, i) => {
        // Create a deterministic random generator seeded by product name + keyword + index
        const seed = hashCode(`${keyword}-${ap.name}-${i}`);
        const rand = seededRandom(seed);

        const priceRange = categoryPriceRanges[category] || defaultPriceRange;
        const sellPrice = ap.price ||
            parseFloat((priceRange[0] + rand() * (priceRange[1] - priceRange[0])).toFixed(2));
        const supplierRatio = 0.30 + rand() * 0.20;
        const supplierPrice = parseFloat((sellPrice * supplierRatio).toFixed(2));
        const profitMargin = clamp(((sellPrice - supplierPrice) / sellPrice) * 100);

        const estimatedOrders = ap.reviewCount
            ? Math.round(ap.reviewCount * (8 + rand() * 4))
            : Math.round(500 + rand() * 5000);

        const reviewSentiment = ap.rating
            ? clamp(ap.rating * 20)
            : clamp(55 + rand() * 25);

        // For exact match products: use better-than-average metrics
        // This represents "the user searched for this specifically, so it likely has demand"
        const isExact = ap.isExactMatch === true;
        const exactBoost = isExact ? 12 : 0;

        const saturationBoost = ap.reviewCount && ap.reviewCount > 5000 ? 15 : 0;
        const marketSaturation = clamp(est.saturation + saturationBoost - exactBoost + (rand() * 15 - 7));
        const adCompetition = clamp(est.adComp - exactBoost + (rand() * 20 - 10));
        const cpcForecast = clamp(est.cpc - exactBoost * 0.5 + (rand() * 15 - 7));
        const supplierReliability = clamp(est.suppRel + (rand() * 10 - 5));
        const trendVelocity = clamp(50 + exactBoost + rand() * 30);

        const metrics = {
            profitMargin, trendVelocity, adCompetition,
            cpcForecast, supplierReliability, reviewSentiment, marketSaturation,
        };
        const { score, grade } = gradeProduct(metrics);

        const trendRoll = rand();
        const trend = isExact
            ? 'rising'  // Exact match products show as rising (user searched = demand signal)
            : trendRoll > 0.5 ? 'rising' : trendRoll > 0.2 ? 'stable' : 'declining';

        return {
            id: Math.abs(hashCode(`${keyword}-${ap.name}-${i}`)) % 1000000,
            name: ap.name,
            image: ap.imageUrl || emoji,
            price: parseFloat(supplierPrice.toFixed(2)),
            sellPrice,
            grade,
            score,
            ...metrics,
            category,
            shippingDays: Math.round(7 + rand() * 10),
            orders: estimatedOrders,
            trend,
            dataSource: isExact ? 'searched' : 'amazon',
        };
    }).sort((a, b) => {
        // Keep exact match (searched product) always first, sort rest by score
        if (a.dataSource === 'searched') return -1;
        if (b.dataSource === 'searched') return 1;
        return b.score - a.score;
    });
}