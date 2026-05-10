import { Request, Response } from 'express';

const ITAD_BASE_URL = 'https://api.isthereanydeal.com';

interface ITADSearchResult {
    id: string;
    slug: string;
    title: string;
    type: string;
    mature: boolean;
}

interface ITADPrice {
    amount: number;
    amountInt: number;
    currency: string;
}

interface ITADDeal {
    shop: { id: number; name: string };
    price: ITADPrice;
    regular: ITADPrice;
    cut: number;
    voucher: string | null;
    storeLow: ITADPrice | null;
    flag: string | null;
    drm: { id: number; name: string }[];
    platforms: { id: number; name: string }[];
    timestamp: string;
    expiry: string | null;
    url: string;
}

interface ITADHistoryLow {
    all: ITADPrice;
    y1: ITADPrice;
    m3: ITADPrice;
}

interface ITADPricesResponseItem {
    id: string;
    deals: ITADDeal[];
    historyLow: ITADHistoryLow | null;
}

// GET /prices?title=<game title>
export const getGamePrices = async (req: Request, res: Response): Promise<void> => {
    const { title, country = 'ES' } = req.query;

    // --- Validation ---
    if (!title || typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ message: 'title query parameter is required' });
        return;
    }

    const apiKey = process.env.ITAD_API_KEY;
    if (!apiKey) {
        res.status(500).json({ message: 'ITAD API key not configured on server' });
        return;
    }

    const trimmedTitle = title.trim();
    const targetCountry = typeof country === 'string' ? country.toUpperCase() : 'ES';

    // --- Step 1: Search for the game on ITAD by title ---
    let itadGame: ITADSearchResult | null = null;
    try {
        const searchUrl = `${ITAD_BASE_URL}/games/search/v1?title=${encodeURIComponent(trimmedTitle)}&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);

        if (!searchRes.ok) {
            // Log status only — never log the full URL to avoid leaking the API key
            console.error(`[PriceController] ITAD search failed (${searchRes.status})`);
            res.status(502).json({ message: 'Failed to reach ITAD API while searching for game' });
            return;
        }

        const searchData: ITADSearchResult[] = await searchRes.json();

        // Pick the first result that is a game (not dlc, bundle, etc.)
        itadGame = searchData.find((g) => g.type === 'game') ?? searchData[0] ?? null;

        if (!itadGame) {
            res.status(404).json({ message: `Game not found on IsThereAnyDeal: "${trimmedTitle}"` });
            return;
        }
    } catch (err) {
        console.error('[PriceController] Network error during ITAD search:', err);
        res.status(502).json({ message: 'Failed to reach ITAD API' });
        return;
    }

    // --- Step 2: Fetch current prices for the found game UUID ---
    let priceData: ITADPricesResponseItem | null = null;
    try {
        const pricesUrl = `${ITAD_BASE_URL}/games/prices/v3?key=${apiKey}&country=${targetCountry}`;
        const pricesRes = await fetch(pricesUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([itadGame.id]),
        });

        if (!pricesRes.ok) {
            console.error(`[PriceController] ITAD prices failed (${pricesRes.status})`);
            res.status(502).json({ message: 'Failed to reach ITAD API while fetching prices' });
            return;
        }

        const pricesData: ITADPricesResponseItem[] = await pricesRes.json();
        priceData = pricesData[0] ?? null;

        if (!priceData || !priceData.deals || priceData.deals.length === 0) {
            res.status(404).json({
                message: `No prices currently available for "${itadGame.title}"`,
                game: {
                    id: itadGame.id,
                    title: itadGame.title,
                    slug: itadGame.slug,
                },
            });
            return;
        }
    } catch (err) {
        console.error('[PriceController] Network error during ITAD price fetch:', err);
        res.status(502).json({ message: 'Failed to reach ITAD API' });
        return;
    }

    // --- Sort deals by price ascending ---
    const sortedDeals = [...priceData.deals].sort(
        (a, b) => a.price.amount - b.price.amount
    );
    const cheapest = sortedDeals[0];

    res.json({
        game: {
            id: itadGame.id,
            title: itadGame.title,
            slug: itadGame.slug,
        },
        cheapest: {
            shop: cheapest.shop.name,
            price: {
                amount: cheapest.price.amount,
                currency: cheapest.price.currency,
            },
            regular: {
                amount: cheapest.regular.amount,
                currency: cheapest.regular.currency,
            },
            cut: cheapest.cut,
            url: cheapest.url,
            drm: cheapest.drm.map((d) => d.name),
            platforms: cheapest.platforms.map((p) => p.name),
        },
        allDeals: sortedDeals.map((deal) => ({
            shop: deal.shop.name,
            price: {
                amount: deal.price.amount,
                currency: deal.price.currency,
            },
            regular: {
                amount: deal.regular.amount,
                currency: deal.regular.currency,
            },
            cut: deal.cut,
            url: deal.url,
            drm: deal.drm.map((d) => d.name),
            platforms: deal.platforms.map((p) => p.name),
        })),
        historyLow: priceData.historyLow?.all
            ? {
                amount: priceData.historyLow.all.amount,
                currency: priceData.historyLow.all.currency,
            }
            : null,
    });
};
