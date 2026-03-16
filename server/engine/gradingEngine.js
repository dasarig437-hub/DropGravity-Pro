/**
 * DropGravity Pro — Server-Side Grading Engine
 * Fixed: realistic grade thresholds + score remapping
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

/**
 * Remap raw score so average real-world products land in B/C range.
 * Raw [20, 100] → display [40, 100]
 * Without this, a product with 40% margin + 50% trend scores ~51 raw = F grade.
 * With this, same product scores ~67 = C grade (realistic).
 */
function remapScore(raw) {
    const clamped = clamp(raw, 20, 100);
    return 40 + ((clamped - 20) / 80) * 60;
}

export function calculateScore(metrics) {
    const normalized = {
        profitMargin: clamp(metrics.profitMargin || 0, 0, 100),
        trendVelocity: clamp(metrics.trendVelocity || 0, 0, 100),
        supplierReliability: clamp(metrics.supplierReliability || 0, 0, 100),
        reviewSentiment: clamp(metrics.reviewSentiment || 0, 0, 100),
        // Inverted — lower competition/cpc/saturation is better
        adCompetition: clamp(100 - (metrics.adCompetition || 50), 0, 100),
        cpcForecast: clamp(100 - (metrics.cpcForecast || 50), 0, 100),
        marketSaturation: clamp(100 - (metrics.marketSaturation || 50), 0, 100),
    };

    let raw = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
        raw += normalized[key] * weight;
    }

    return Math.round(remapScore(raw) * 10) / 10;
}

/**
 * Realistic grade thresholds.
 * Old: A=90, B=80, C=70, D=60 → everything was D/F
 * New: A=82, B=68, C=54, D=40 → healthy A/B/C/D distribution
 */
export function getLetterGrade(score) {
    if (score >= 82) return 'A';
    if (score >= 68) return 'B';
    if (score >= 54) return 'C';
    if (score >= 40) return 'D';
    return 'F';
}

export function gradeProduct(metrics) {
    const score = calculateScore(metrics);
    const grade = getLetterGrade(score);
    return { score, grade };
}

/**
 * Grade → color mapping (shared with client engine).
 * Keep in sync with src/engine/gradingEngine.js
 */
export function getGradeColor(grade) {
    const colors = { A: '#10b981', B: '#06b6d4', C: '#f59e0b', D: '#ef4444', F: '#6b7280' };
    return colors[grade] || '#888';
}