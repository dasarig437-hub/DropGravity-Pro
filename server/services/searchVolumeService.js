import axios from 'axios';

// Note: Replace these or rely on env variables
// Set these in .env: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD
const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_metrics/live';

/**
 * Normalizes raw search volume to a 0-100 score.
 * Example scale: 
 *   > 100k -> 100
 *   ~10k -> 75
 *   ~1k -> 40
 *   < 100 -> 10
 */
function normalizeVolume(rawVolume) {
    if (!rawVolume || rawVolume <= 0) return 10;

    // Logarithmic scaling for better distribution
    const maxVol = 100000;
    let score = Math.min(100, Math.max(10, (Math.log10(rawVolume) / Math.log10(maxVol)) * 100));
    return Math.round(score);
}

/**
 * Maps DataForSEO competition index (0.00 to 1.00) to 0-100 score.
 */
function normalizeCompetition(rawCompetition) {
    if (rawCompetition == null) return 50; // Default if missing
    return Math.round(rawCompetition * 100);
}

export const fetchSearchVolume = async (keyword) => {
    try {
        const login = process.env.DATAFORSEO_LOGIN;
        const password = process.env.DATAFORSEO_PASSWORD;

        if (!login || !password) {
            console.warn(`[VolumeService] DataForSEO credentials missing. Falling back.`);
            return null;
        }

        const auth = Buffer.from(`${login}:${password}`).toString('base64');

        const postData = [{
            "keywords": [keyword],
            "location_name": "United States", // Standard market targeting
            "language_name": "English"
        }];

        const response = await axios({
            method: 'post',
            url: DATAFORSEO_API_URL,
            data: postData,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        const resultData = response.data;

        let rawVolume = 0;
        let rawCompetition = 0.5;

        // Extracting from DataForSEO standard format
        if (resultData && resultData.tasks && resultData.tasks.length > 0) {
            const task = resultData.tasks[0];
            if (task.result && task.result.length > 0) {
                const item = task.result[0].items[0];
                if (item && item.keyword_info) {
                    rawVolume = item.keyword_info.search_volume || 0;
                    rawCompetition = item.keyword_info.competition_level || 0.5;
                }
            }
        }

        const volumeScore = normalizeVolume(rawVolume);
        const competitionScore = normalizeCompetition(rawCompetition);

        return {
            volumeScore,
            competitionScore,
            rawVolume,
            fetchedAt: new Date()
        };

    } catch (err) {
        console.error(`[VolumeService] DataForSEO API failed for "${keyword}":`, err.message);
        return null; // Force graceful fallback
    }
};
