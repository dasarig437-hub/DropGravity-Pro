/**
 * DropGravity Pro — Server-Side Grading Engine
 * Shared module for product scoring and grading
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

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function calculateScore(metrics) {
    const normalized = {
        profitMargin: clamp(metrics.profitMargin || 0, 0, 100),
        trendVelocity: clamp(metrics.trendVelocity || 0, 0, 100),
        adCompetition: clamp(100 - (metrics.adCompetition || 0), 0, 100),
        cpcForecast: clamp(100 - (metrics.cpcForecast || 0), 0, 100),
        supplierReliability: clamp(metrics.supplierReliability || 0, 0, 100),
        reviewSentiment: clamp(metrics.reviewSentiment || 0, 0, 100),
        marketSaturation: clamp(100 - (metrics.marketSaturation || 0), 0, 100),
    };

    let score = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
        score += normalized[key] * weight;
    }

    return Math.round(score * 10) / 10;
}

export function getLetterGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

export function gradeProduct(metrics) {
    const score = calculateScore(metrics);
    const grade = getLetterGrade(score);
    return { score, grade };
}
