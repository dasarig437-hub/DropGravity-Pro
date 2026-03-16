/**
 * DropGravity Pro — Product Grading Engine
 * Weighted scoring model for product viability analysis
 */

const WEIGHTS = {
    profitMargin: 0.25,
    trendVelocity: 0.20,
    adCompetition: 0.15,
    cpcForecast: 0.15,
    supplierReliability: 0.10,
    reviewSentiment: 0.10,
    marketSaturation: 0.05,
};

/**
 * Calculate weighted composite score (0–100)
 */
export function calculateScore(metrics) {
    const normalized = {
        // Direct: higher = better
        profitMargin: clamp(metrics.profitMargin || 0, 0, 100),
        trendVelocity: clamp(metrics.trendVelocity || 0, 0, 100),
        supplierReliability: clamp(metrics.supplierReliability || 0, 0, 100),
        reviewSentiment: clamp(metrics.reviewSentiment || 0, 0, 100),

        // Inverse: lower = better
        adCompetition: clamp(100 - (metrics.adCompetition || 50), 0, 100),
        cpcForecast: clamp(100 - (metrics.cpcForecast || 50), 0, 100),
        marketSaturation: clamp(100 - (metrics.marketSaturation || 50), 0, 100),
    };

    let raw = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
        raw += normalized[key] * weight;
    }

    // Boost: raw score tends to cluster 40-65 for real products.
    // Remap 30-100 raw → 45-100 display so average products land in C/B range.
    const boosted = remapScore(raw);

    return Math.round(boosted * 10) / 10;
}

/**
 * Remap raw 0-100 score to a more useful display range.
 * Raw 30 → display 45  (weak products don't all pile at D/F)
 * Raw 60 → display 72  (average products become C/B)
 * Raw 80 → display 88  (strong products become A/B)
 * Raw 100 → display 100
 */
function remapScore(raw) {
    // Simple linear remap: raw [20, 100] → display [40, 100]
    const inMin = 20, inMax = 100;
    const outMin = 40, outMax = 100;
    const clamped = clamp(raw, inMin, inMax);
    return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Convert numeric score to letter grade
 * Realistic thresholds — average products should get B/C not D/F
 */
export function getLetterGrade(score) {
    if (score >= 82) return 'A';  // Top tier — genuinely excellent
    if (score >= 68) return 'B';  // Good opportunity
    if (score >= 54) return 'C';  // Moderate / proceed with caution
    if (score >= 40) return 'D';  // Weak — significant issues
    return 'F';                   // Avoid
}

/**
 * Get grade color
 */
export function getGradeColor(grade) {
    const colors = {
        A: '#10b981',
        B: '#06b6d4',
        C: '#f59e0b',
        D: '#f97316',
        F: '#ef4444',
    };
    return colors[grade] || colors.F;
}

/**
 * Full grade analysis
 */
export function gradeProduct(metrics) {
    const score = calculateScore(metrics);
    const grade = getLetterGrade(score);
    const risk = assessRisk(metrics);
    const weakMetrics = flagWeakMetrics(metrics);
    const suggestions = generateSuggestions(grade, weakMetrics);
    const profitScenarios = simulateProfit(metrics);

    return {
        score,
        grade,
        risk,
        weakMetrics,
        suggestions,
        profitScenarios,
        metrics,
    };
}

/**
 * Assess overall risk level
 */
function assessRisk(metrics) {
    let riskScore = 0;
    if ((metrics.profitMargin || 0) < 30) riskScore += 30;
    if ((metrics.adCompetition || 0) > 70) riskScore += 25;
    if ((metrics.marketSaturation || 0) > 60) riskScore += 20;
    if ((metrics.supplierReliability || 0) < 50) riskScore += 15;
    if ((metrics.trendVelocity || 0) < 30) riskScore += 10;

    if (riskScore >= 60) return { level: 'High', score: riskScore, color: '#ef4444' };
    if (riskScore >= 30) return { level: 'Medium', score: riskScore, color: '#f59e0b' };
    return { level: 'Low', score: riskScore, color: '#10b981' };
}

/**
 * Flag metrics scoring below threshold
 */
function flagWeakMetrics(metrics) {
    const weak = [];
    if ((metrics.profitMargin || 0) < 40) weak.push({ name: 'Profit Margin', value: metrics.profitMargin, threshold: 40 });
    if ((metrics.trendVelocity || 0) < 40) weak.push({ name: 'Trend Velocity', value: metrics.trendVelocity, threshold: 40 });
    if ((metrics.adCompetition || 0) > 70) weak.push({ name: 'Ad Competition', value: metrics.adCompetition, threshold: 70, inverse: true });
    if ((metrics.cpcForecast || 0) > 60) weak.push({ name: 'CPC Cost', value: metrics.cpcForecast, threshold: 60, inverse: true });
    if ((metrics.supplierReliability || 0) < 50) weak.push({ name: 'Supplier Reliability', value: metrics.supplierReliability, threshold: 50 });
    if ((metrics.reviewSentiment || 0) < 50) weak.push({ name: 'Review Sentiment', value: metrics.reviewSentiment, threshold: 50 });
    if ((metrics.marketSaturation || 0) > 60) weak.push({ name: 'Market Saturation', value: metrics.marketSaturation, threshold: 60, inverse: true });
    return weak;
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(grade, weakMetrics) {
    const suggestions = [];
    for (const wm of weakMetrics) {
        switch (wm.name) {
            case 'Profit Margin':
                suggestions.push('Negotiate lower supplier pricing or increase selling price to improve margins.');
                break;
            case 'Trend Velocity':
                suggestions.push('This product shows slowing demand — consider riding emerging micro-trends instead.');
                break;
            case 'Ad Competition':
                suggestions.push('High ad density detected. Try alternative traffic sources like influencer marketing.');
                break;
            case 'CPC Cost':
                suggestions.push('CPC is elevated. Test different ad creatives and audiences to lower acquisition cost.');
                break;
            case 'Supplier Reliability':
                suggestions.push('Supplier has inconsistent ratings. Source a backup supplier to reduce fulfillment risk.');
                break;
            case 'Review Sentiment':
                suggestions.push('Mixed reviews detected. Verify product quality before scaling ad spend.');
                break;
            case 'Market Saturation':
                suggestions.push('Market is getting crowded. Differentiate with bundling or a unique angle.');
                break;
        }
    }
    if (grade === 'A') suggestions.unshift('🚀 Strong product — consider scaling aggressively.');
    if (grade === 'B') suggestions.unshift('✅ Solid product — address weak areas before scaling.');
    return suggestions;
}

/**
 * Simulate profit scenarios
 */
function simulateProfit(metrics) {
    const baseRevenue = 100;
    const margin = (metrics.profitMargin || 30) / 100;
    const cpcFactor = (100 - (metrics.cpcForecast || 50)) / 100;

    return {
        best: {
            label: 'Best Case',
            revenue: Math.round(baseRevenue * 1.3),
            profit: Math.round(baseRevenue * 1.3 * margin * 1.1),
            roi: Math.round(margin * 1.1 * cpcFactor * 1.2 * 300),
        },
        likely: {
            label: 'Likely Case',
            revenue: Math.round(baseRevenue),
            profit: Math.round(baseRevenue * margin),
            roi: Math.round(margin * cpcFactor * 250),
        },
        worst: {
            label: 'Worst Case',
            revenue: Math.round(baseRevenue * 0.6),
            profit: Math.round(baseRevenue * 0.6 * margin * 0.7),
            roi: Math.round(margin * 0.7 * cpcFactor * 0.6 * 150),
        },
    };
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}