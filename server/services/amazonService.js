import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Amazon Best Sellers category URLs.
 * These are public, stable pages that rarely get blocked.
 */
const categoryPages = {
    'Home Decor': 'https://www.amazon.com/Best-Sellers-Home-Kitchen/zgbs/home-garden',
    'Electronics': 'https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics',
    'Beauty': 'https://www.amazon.com/Best-Sellers-Beauty/zgbs/beauty',
    'Fashion': 'https://www.amazon.com/Best-Sellers-Clothing/zgbs/fashion',
    'Kitchen': 'https://www.amazon.com/Best-Sellers-Kitchen-Dining/zgbs/kitchen',
    'Fitness': 'https://www.amazon.com/Best-Sellers-Sports-Outdoors/zgbs/sporting-goods',
    'Pet Supplies': 'https://www.amazon.com/Best-Sellers-Pet-Supplies/zgbs/pet-supplies',
    'Toys': 'https://www.amazon.com/Best-Sellers-Toys-Games/zgbs/toys-and-games',
    'Baby': 'https://www.amazon.com/Best-Sellers-Baby/zgbs/baby-products',
    'Health': 'https://www.amazon.com/Best-Sellers-Health/zgbs/hpc',
    'Garden': 'https://www.amazon.com/Best-Sellers-Garden-Outdoor/zgbs/lawn-garden',
    'Accessories': 'https://www.amazon.com/Best-Sellers-Clothing/zgbs/fashion',
    'Automotive': 'https://www.amazon.com/Best-Sellers-Automotive/zgbs/automotive',
};

const defaultPage = 'https://www.amazon.com/Best-Sellers/zgbs';

/**
 * Rotating User-Agent strings to reduce block risk.
 */
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Simple keyword → category mapper (reuses logic from productGenerator).
 */
const keywordCategoryMap = {
    lamp: 'Home Decor', light: 'Home Decor', home: 'Home Decor', decor: 'Home Decor',
    pillow: 'Home Decor', blanket: 'Home Decor', candle: 'Home Decor', rug: 'Home Decor',
    phone: 'Electronics', charger: 'Electronics', speaker: 'Electronics', earbud: 'Electronics',
    headphone: 'Electronics', camera: 'Electronics', watch: 'Electronics', cable: 'Electronics',
    skin: 'Beauty', cream: 'Beauty', serum: 'Beauty', makeup: 'Beauty', lipstick: 'Beauty',
    hair: 'Beauty', nail: 'Beauty', brush: 'Beauty', perfume: 'Beauty',
    shirt: 'Fashion', dress: 'Fashion', shoe: 'Fashion', jacket: 'Fashion', hoodie: 'Fashion',
    kitchen: 'Kitchen', bottle: 'Kitchen', pan: 'Kitchen', knife: 'Kitchen', cup: 'Kitchen',
    blender: 'Kitchen', mug: 'Kitchen', kettle: 'Kitchen',
    yoga: 'Fitness', gym: 'Fitness', fitness: 'Fitness', band: 'Fitness', dumbbell: 'Fitness',
    resistance: 'Fitness', exercise: 'Fitness', mat: 'Fitness',
    dog: 'Pet Supplies', cat: 'Pet Supplies', pet: 'Pet Supplies', leash: 'Pet Supplies',
    toy: 'Toys', game: 'Toys', puzzle: 'Toys', fidget: 'Toys',
    baby: 'Baby', stroller: 'Baby', diaper: 'Baby',
    garden: 'Garden', outdoor: 'Garden', tent: 'Garden', grill: 'Garden',
    car: 'Automotive', dash: 'Automotive',
    bag: 'Accessories', wallet: 'Accessories', backpack: 'Accessories', hat: 'Accessories',
    health: 'Health', vitamin: 'Health', supplement: 'Health', massager: 'Health',
};

function detectAmazonCategory(keyword) {
    const words = keyword.toLowerCase().trim().split(/\s+/);
    for (const word of words) {
        if (keywordCategoryMap[word]) return keywordCategoryMap[word];
    }
    return null;
}

/**
 * Fetch products from Amazon Best Sellers page and filter by keyword relevance.
 * @param {string} keyword - User search keyword
 * @returns {Array|null} - Array of raw Amazon products, or null on failure
 */
export async function fetchAmazonProducts(keyword) {
    try {
        const category = detectAmazonCategory(keyword);
        const url = category ? (categoryPages[category] || defaultPage) : defaultPage;
        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

        console.log(`[Amazon] Fetching: ${url} for keyword "${keyword}"`);

        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
            },
            timeout: 10000,
        });

        const $ = cheerio.load(html);
        const products = [];

        // Amazon Best Sellers uses div.zg-grid-general-faceout or similar containers
        // Try multiple selectors for resilience
        const selectors = [
            'div.zg-grid-general-faceout',
            'div.a-section.a-spacing-none.aok-relative',
            'div[data-asin]',
            'li.zg-item-immersion',
        ];

        let items = $([]);
        for (const sel of selectors) {
            items = $(sel);
            if (items.length > 0) break;
        }

        items.each((i, el) => {
            if (products.length >= 20) return false; // Collect up to 20, filter later

            const $el = $(el);

            // Product name from various possible locations
            const name = (
                $el.find('a.a-link-normal span div').first().text().trim() ||
                $el.find('a.a-link-normal span').first().text().trim() ||
                $el.find('.p13n-sc-truncate-desktop-type2').text().trim() ||
                $el.find('.p13n-sc-truncated').text().trim() ||
                $el.find('._cDEzb_p13n-sc-css-line-clamp-3_g3dy1').text().trim() ||
                $el.find('a[title]').attr('title') ||
                ''
            );

            if (!name || name.length < 5) return;

            // Price — use .a-offscreen first (contains clean "$XX.XX" text)
            let price = null;
            const offscreen = $el.find('.a-price .a-offscreen').first().text().trim();
            if (offscreen) {
                const match = offscreen.match(/\$[\d,]+\.?\d*/);
                if (match) price = parseFloat(match[0].replace(/[$,]/g, ''));
            }
            if (!price) {
                const priceText = $el.find('.p13n-sc-price, ._cDEzb_p13n-sc-price_3mJ9Z').first().text().trim();
                const match = priceText.match(/\$[\d,]+\.?\d*/);
                if (match) price = parseFloat(match[0].replace(/[$,]/g, ''));
            }
            // Sanity check — reject unlikely prices for consumer products
            if (price && price > 999) price = null;

            // Rating
            const ratingText = $el.find('.a-icon-alt, i.a-icon-star-small span').first().text().trim();
            const rating = parseFloat(ratingText) || null;

            // Review count
            const reviewText = $el.find('.a-size-small a.a-link-normal').text().trim();
            const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, ''), 10) || null;

            // Image
            const imageUrl = $el.find('img').first().attr('src') || null;

            // ASIN
            const asin = $el.closest('[data-asin]').attr('data-asin') || null;

            products.push({ name, price, rating, reviewCount, imageUrl, asin });
        });

        if (products.length === 0) {
            console.warn('[Amazon] No products parsed from page');
            return null;
        }

        // Filter by keyword relevance (require at least one keyword token in title)
        const kwWords = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const relevant = products.filter(p => {
            const nameLower = p.name.toLowerCase();
            return kwWords.some(w => nameLower.includes(w));
        });

        // If keyword filter is too strict, return unfiltered (category is already relevant)
        const results = relevant.length >= 3 ? relevant : products;

        // Clean up long Amazon titles — keep only the first clean phrase
        const cleaned = results.map(p => ({
            ...p,
            name: p.name.split(/[,|–—]/)[0].trim().slice(0, 80),
        }));

        console.log(`[Amazon] Found ${products.length} products, ${relevant.length} relevant to "${keyword}"`);
        return cleaned.slice(0, 8);

    } catch (err) {
        console.error(`[Amazon] Scrape failed:`, err.message);
        return null;
    }
}
