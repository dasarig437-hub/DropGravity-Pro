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
        profitMargin: clamp(metrics.profitMargin || 0, 0, 100),
        trendVelocity: clamp(metrics.trendVelocity || 0, 0, 100),
        adCompetition: clamp(100 - (metrics.adCompetition || 0), 0, 100), // Lower competition = better
        cpcForecast: clamp(100 - (metrics.cpcForecast || 0), 0, 100), // Lower CPC = better
        supplierReliability: clamp(metrics.supplierReliability || 0, 0, 100),
        reviewSentiment: clamp(metrics.reviewSentiment || 0, 0, 100),
        marketSaturation: clamp(100 - (metrics.marketSaturation || 0), 0, 100), // Lower saturation = better
    };

    let score = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
        score += normalized[key] * weight;
    }

    return Math.round(score * 10) / 10;
}

/**
 * Convert numeric score to letter grade
 */
export function getLetterGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

/**
 * Get grade color class
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
    if (metrics.profitMargin < 30) riskScore += 30;
    if (metrics.adCompetition > 70) riskScore += 25;
    if (metrics.marketSaturation > 60) riskScore += 20;
    if (metrics.supplierReliability < 50) riskScore += 15;
    if (metrics.trendVelocity < 30) riskScore += 10;

    if (riskScore >= 60) return { level: 'High', score: riskScore, color: '#ef4444' };
    if (riskScore >= 30) return { level: 'Medium', score: riskScore, color: '#f59e0b' };
    return { level: 'Low', score: riskScore, color: '#10b981' };
}

/**
 * Flag metrics scoring below threshold
 */
function flagWeakMetrics(metrics) {
    const weak = [];
    if (metrics.profitMargin < 40) weak.push({ name: 'Profit Margin', value: metrics.profitMargin, threshold: 40 });
    if (metrics.trendVelocity < 40) weak.push({ name: 'Trend Velocity', value: metrics.trendVelocity, threshold: 40 });
    if (metrics.adCompetition > 70) weak.push({ name: 'Ad Competition', value: metrics.adCompetition, threshold: 70, inverse: true });
    if (metrics.cpcForecast > 60) weak.push({ name: 'CPC Cost', value: metrics.cpcForecast, threshold: 60, inverse: true });
    if (metrics.supplierReliability < 50) weak.push({ name: 'Supplier Reliability', value: metrics.supplierReliability, threshold: 50 });
    if (metrics.reviewSentiment < 50) weak.push({ name: 'Review Sentiment', value: metrics.reviewSentiment, threshold: 50 });
    if (metrics.marketSaturation > 60) weak.push({ name: 'Market Saturation', value: metrics.marketSaturation, threshold: 60, inverse: true });
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
                suggestions.push('Market is getting crowded. Differentiate with bundling or unique angle.');
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
    const margin = metrics.profitMargin / 100;
    const cpcFactor = (100 - metrics.cpcForecast) / 100;
    const conversionBase = 0.025; // 2.5% base conversion

    const best = {
        label: 'Best Case',
        revenue: Math.round(baseRevenue * 1.3),
        profit: Math.round(baseRevenue * 1.3 * margin * 1.1),
        roi: Math.round((margin * 1.1 * cpcFactor * 1.2) * 300),
    };

    const likely = {
        label: 'Likely Case',
        revenue: Math.round(baseRevenue),
        profit: Math.round(baseRevenue * margin),
        roi: Math.round((margin * cpcFactor) * 250),
    };

    const worst = {
        label: 'Worst Case',
        revenue: Math.round(baseRevenue * 0.6),
        profit: Math.round(baseRevenue * 0.6 * margin * 0.7),
        roi: Math.round((margin * 0.7 * cpcFactor * 0.6) * 150),
    };

    return { best, likely, worst };
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
