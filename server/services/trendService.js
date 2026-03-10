import googleTrends from 'google-trends-api';

/**
 * Normalizes trend data out of 100 based on average and slope.
 */
function computeScore(timelineData) {
    if (!timelineData || timelineData.length === 0) throw new Error("Missing timeline data for trend calculation");

    let totalInterest = 0;
    const values = [];

    for (const point of timelineData) {
        const value = point.value[0];
        totalInterest += value;
        values.push(value);
    }

    const averageInterest = totalInterest / timelineData.length;

    // Calculate a basic "slope" comparing the first half to the second half
    const half = Math.floor(values.length / 2);
    let firstHalfSum = 0;
    for (let i = 0; i < half; i++) firstHalfSum += values[i];

    let secondHalfSum = 0;
    for (let i = half; i < values.length; i++) secondHalfSum += values[i];

    const firstHalfAvg = half > 0 ? firstHalfSum / half : averageInterest;
    const secondHalfAvg = (values.length - half) > 0 ? secondHalfSum / (values.length - half) : averageInterest;

    // Slope impact: if second half is much larger, positive slope.
    let slopeBoost = 0;
    if (secondHalfAvg > firstHalfAvg) {
        slopeBoost = Math.min(25, (secondHalfAvg - firstHalfAvg));
    } else if (secondHalfAvg < firstHalfAvg) {
        slopeBoost = Math.max(-25, (secondHalfAvg - firstHalfAvg));
    }

    let trendScore = Math.round(averageInterest + slopeBoost);

    // Clamp between 0 and 100
    trendScore = Math.max(0, Math.min(100, trendScore));

    return trendScore;
}

export const fetchTrendData = async (keyword, retries = 1) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const resultsStr = await googleTrends.interestOverTime({
            keyword: keyword,
            startTime: thirtyDaysAgo,
            endTime: today,
            geo: 'US' // Often used to get reliable general shopping trends
        });

        const results = JSON.parse(resultsStr);

        if (!results || !results.default || !results.default.timelineData || results.default.timelineData.length === 0) {
            throw new Error(`No trend data available for "${keyword}"`);
        }

        const timelineData = results.default.timelineData;

        // Compute the final customized trend score
        const trendScore = computeScore(timelineData);

        // Simplify raw data for safe caching without bloat
        const rawData = timelineData.map(pt => ({
            time: pt.time,
            formattedTime: pt.formattedTime,
            value: pt.value[0]
        }));

        return {
            trendScore,
            rawData,
            fetchedAt: new Date()
        };

    } catch (err) {
        if (retries > 0) {
            console.warn(`[TrendService] API failed for "${keyword}", retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 500));
            return fetchTrendData(keyword, retries - 1);
        }
        console.error(`[TrendService] Google Trends API fully failed for "${keyword}":`, err.message);
        return null;
    }
};
