/**
 * Quota Utilities (Phase 3 — Ad-Based Monetization)
 *
 * getTodayDateString()        — returns UTC date as YYYY-MM-DD
 * resetDailyQuotaIfNeeded(u)  — resets daily counters when the day rolls over
 */

/**
 * Returns today's date in UTC as a YYYY-MM-DD string.
 */
export function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Resets a user's daily quota counters if `lastResetDate` doesn't match today.
 * Mutates the user document in-place and saves to DB.
 *
 * @param {import('mongoose').Document} user — Mongoose user document
 */
export async function resetDailyQuotaIfNeeded(user) {
    const today = getTodayDateString();

    if (user.lastResetDate !== today) {
        user.dailySearchCount = 0;
        user.dailyAdUnlockCount = 0;
        user.bonusSearchCredits = 0;
        user.lastResetDate = today;
        await user.save();
    }
}
