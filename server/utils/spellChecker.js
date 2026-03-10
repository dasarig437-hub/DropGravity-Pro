import SpellCorrector from 'spelling-corrector';

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

/**
 * Corrects a search keyword, handling multiple words.
 * 
 * @param {string} keyword - The keyword to correct.
 * @returns {string} - The autocorrected keyword.
 */
export function correctKeyword(keyword) {
    if (!keyword) return '';

    // Split by spaces, clean up, correct each word, then rejoin
    const words = keyword.split(/\s+/);
    const correctedWords = words.map(word => {
        // Keep non-alphabet characters if any, but spelling corrector works best on letters
        // Let's just pass the raw word
        const cleanWord = word.trim();
        if (!cleanWord) return '';

        // Correct the word. spelling-corrector returns the original word if it's correct
        // or a suggested correction if not.
        const suggestion = spellCorrector.correct(cleanWord);
        return suggestion || cleanWord;
    });

    return correctedWords.filter(Boolean).join(' ');
}
