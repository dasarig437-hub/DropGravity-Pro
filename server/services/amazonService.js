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
 * Global rate limiter — ensures minimum 2s gap between Amazon requests.
 * Prevents concurrent user searches from flooding Amazon with parallel requests.
 */
let lastAmazonRequest = 0;
const MIN_REQUEST_GAP_MS = 2000;

async function waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - lastAmazonRequest;
    if (elapsed < MIN_REQUEST_GAP_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_GAP_MS - elapsed));
    }
    lastAmazonRequest = Date.now();
}

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
    // Home Decor
    lamp: 'Home Decor', lamps: 'Home Decor', light: 'Home Decor', lights: 'Home Decor',
    home: 'Home Decor', decor: 'Home Decor', pillow: 'Home Decor', pillows: 'Home Decor',
    blanket: 'Home Decor', blankets: 'Home Decor', candle: 'Home Decor', candles: 'Home Decor',
    rug: 'Home Decor', rugs: 'Home Decor', curtain: 'Home Decor', curtains: 'Home Decor',
    projector: 'Home Decor', clock: 'Home Decor', vase: 'Home Decor', frames: 'Home Decor',

    // Electronics
    phone: 'Electronics', charger: 'Electronics', chargers: 'Electronics',
    speaker: 'Electronics', speakers: 'Electronics', earbud: 'Electronics', earbuds: 'Electronics',
    headphone: 'Electronics', headphones: 'Electronics', camera: 'Electronics', cameras: 'Electronics',
    watch: 'Electronics', watches: 'Electronics', cable: 'Electronics', cables: 'Electronics',
    tablet: 'Electronics', laptop: 'Electronics', keyboard: 'Electronics', mouse: 'Electronics',
    powerbank: 'Electronics', printer: 'Electronics', led: 'Electronics',

    // Beauty
    skincare: 'Beauty', skin: 'Beauty', cream: 'Beauty', creams: 'Beauty',
    serum: 'Beauty', serums: 'Beauty', makeup: 'Beauty', lipstick: 'Beauty',
    hair: 'Beauty', nail: 'Beauty', nails: 'Beauty', brush: 'Beauty', brushes: 'Beauty',
    perfume: 'Beauty', perfumes: 'Beauty', moisturizer: 'Beauty', foundation: 'Beauty',
    mascara: 'Beauty', eyeliner: 'Beauty', contour: 'Beauty', eyeshadow: 'Beauty',

    // Fashion
    shirt: 'Fashion', shirts: 'Fashion', dress: 'Fashion', dresses: 'Fashion',
    shoe: 'Fashion', shoes: 'Fashion', sneaker: 'Fashion', sneakers: 'Fashion',
    boot: 'Fashion', boots: 'Fashion', sandal: 'Fashion', sandals: 'Fashion',
    slipper: 'Fashion', slippers: 'Fashion', heel: 'Fashion', heels: 'Fashion',
    jacket: 'Fashion', jackets: 'Fashion', hoodie: 'Fashion', hoodies: 'Fashion',
    jeans: 'Fashion', pants: 'Fashion', skirt: 'Fashion', skirts: 'Fashion',
    sock: 'Fashion', socks: 'Fashion', sunglasses: 'Fashion', glasses: 'Fashion',
    earring: 'Fashion', earrings: 'Fashion', necklace: 'Fashion', bracelet: 'Fashion',
    clothing: 'Fashion', fashion: 'Fashion', apparel: 'Fashion',

    // Kitchen
    kitchen: 'Kitchen', bottle: 'Kitchen', bottles: 'Kitchen', pan: 'Kitchen', pans: 'Kitchen',
    knife: 'Kitchen', knives: 'Kitchen', cup: 'Kitchen', cups: 'Kitchen',
    blender: 'Kitchen', mug: 'Kitchen', mugs: 'Kitchen', kettle: 'Kitchen',
    cooking: 'Kitchen', pot: 'Kitchen', pots: 'Kitchen', spatula: 'Kitchen',
    grinder: 'Kitchen', juicer: 'Kitchen', toaster: 'Kitchen', airfryer: 'Kitchen',

    // Fitness
    yoga: 'Fitness', gym: 'Fitness', fitness: 'Fitness', band: 'Fitness',
    dumbbell: 'Fitness', dumbbells: 'Fitness', resistance: 'Fitness', exercise: 'Fitness',
    mat: 'Fitness', mats: 'Fitness', workout: 'Fitness', protein: 'Fitness',
    skipping: 'Fitness', pullup: 'Fitness', barbell: 'Fitness',

    // Pet Supplies
    dog: 'Pet Supplies', dogs: 'Pet Supplies', cat: 'Pet Supplies', cats: 'Pet Supplies',
    pet: 'Pet Supplies', pets: 'Pet Supplies', leash: 'Pet Supplies', leashes: 'Pet Supplies',
    collar: 'Pet Supplies', collars: 'Pet Supplies', feeder: 'Pet Supplies',

    // Toys
    toy: 'Toys', toys: 'Toys', game: 'Toys', games: 'Toys',
    puzzle: 'Toys', puzzles: 'Toys', fidget: 'Toys', lego: 'Toys',
    board: 'Toys', kids: 'Toys', children: 'Toys',

    // Baby
    baby: 'Baby', babies: 'Baby', stroller: 'Baby', strollers: 'Baby',
    diaper: 'Baby', diapers: 'Baby', pacifier: 'Baby', crib: 'Baby',

    // Garden
    garden: 'Garden', gardens: 'Garden', outdoor: 'Garden', tent: 'Garden', tents: 'Garden',
    grill: 'Garden', grills: 'Garden', plant: 'Garden', plants: 'Garden', seeds: 'Garden',

    // Automotive
    car: 'Automotive', cars: 'Automotive', dash: 'Automotive', dashcam: 'Automotive',
    tire: 'Automotive', tires: 'Automotive', vehicle: 'Automotive',

    // Accessories
    bag: 'Accessories', bags: 'Accessories', wallet: 'Accessories', wallets: 'Accessories',
    backpack: 'Accessories', backpacks: 'Accessories', hat: 'Accessories', hats: 'Accessories',
    cap: 'Accessories', caps: 'Accessories', luggage: 'Accessories', purse: 'Accessories',

    // Health
    health: 'Health', vitamin: 'Health', vitamins: 'Health',
    supplement: 'Health', supplements: 'Health', massager: 'Health', massagers: 'Health',
    bandage: 'Health', thermometer: 'Health', monitor: 'Health', posture: 'Health',
};

function detectAmazonCategory(keyword) {
    const words = keyword.toLowerCase().trim().split(/\s+/);
    for (const word of words) {
        // Exact match first (fastest)
        if (keywordCategoryMap[word]) return keywordCategoryMap[word];
        // Substring match: 'shoes' should match key 'shoe', 'earbuds' → 'earbud'
        for (const [key, cat] of Object.entries(keywordCategoryMap)) {
            if (word.startsWith(key) || key.startsWith(word)) return cat;
        }
    }
    return null;
}

/**
 * Fetch products from Amazon Best Sellers page and filter by keyword relevance.
 * @param {string} keyword - User search keyword
 * @returns {Array|null} - Array of raw Amazon products, or null on failure
 */
export async function fetchAmazonProducts(keyword, retries = 2) {
    try {
        const category = detectAmazonCategory(keyword);
        const usedDefaultPage = !category;
        const url = category ? (categoryPages[category] || defaultPage) : defaultPage;
        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

        console.log(`[Amazon] Fetching: ${url} for keyword "${keyword}"`);

        await waitForRateLimit();
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Ch-Ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            },
            timeout: 10000,
        });

        if (html.includes('api/captcha') || html.includes('Enter the characters you see below') || html.includes('Sorry, we just need to make sure you\'re not a robot')) {
            throw new Error('Amazon CAPTCHA block detected');
        }

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
            throw new Error('No products parsed from page structure');
        }

        // Filter by keyword relevance (require at least one keyword token in title)
        const kwWords = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const relevant = products.filter(p => {
            const nameLower = p.name.toLowerCase();
            return kwWords.some(w => nameLower.includes(w));
        });

        console.log(`[Amazon] Found ${products.length} products, ${relevant.length} relevant to "${keyword}"`);

        // If we're on a targeted category page, fall back to all products in that category
        // If we're on the general default page AND nothing is relevant, return null — don't pollute results
        let results;
        if (relevant.length >= 3) {
            results = relevant;
        } else if (!usedDefaultPage) {
            // Category page found but keyword filter strict — return the category's best sellers
            results = products;
            console.log(`[Amazon] Keyword filter strict for "${keyword}" but category matches — using category products`);
        } else {
            // General page + no exact keyword match — return trending products with a fallback flag
            // Don't return null (causes 502); let users see trending products instead
            results = products;
            console.log(`[Amazon] No exact match for "${keyword}" on general page — returning trending products as fallback`);
            // Mark each as a general fallback so server can include a note in the response
            results = results.map(p => ({ ...p, isGeneralFallback: true }));
        }

        // Clean up long Amazon titles — keep only the first clean phrase
        const cleaned = results.map(p => ({
            ...p,
            name: p.name.split(/[,|–—]/)[0].trim().slice(0, 80),
        }));

        return cleaned.slice(0, 8);

    } catch (err) {
        if (retries > 0) {
            console.warn(`[Amazon] Scrape failed (${err.message}), retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1500));
            return fetchAmazonProducts(keyword, retries - 1);
        }
        console.error(`[Amazon] Scrape fully failed:`, err.message);
        return null;
    }
}
