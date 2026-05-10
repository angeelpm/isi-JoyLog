/**
 * tests/price.test.ts
 *
 * Integration tests for GET /prices?title=<game>
 *
 * Design notes:
 *  - No MongoMemoryServer needed: the /prices endpoint is stateless (no DB).
 *  - global.fetch is mocked via jest.spyOn — the controller uses native Node 18+ fetch.
 *  - process.env.ITAD_API_KEY is managed per-test to keep tests independent.
 *
 * NOTE — response shape to verify against real API:
 *   The controller currently expects the ITAD /games/search/v1 response to be a
 *   bare array (ITADSearchResult[]). If the real endpoint wraps it in
 *   { results: [...] }, the .find() call will silently return undefined and
 *   every search will 404. These tests mock a bare array; verify with a live
 *   key before shipping to production.
 */

import request from 'supertest';
import app from '../src/app';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_GAME = {
    id: 'app/292030',
    slug: 'the-witcher-3-wild-hunt',
    title: 'The Witcher 3: Wild Hunt',
    type: 'game',
    mature: false,
};

const MOCK_DLC = {
    id: 'app/534085',
    slug: 'the-witcher-3-blood-and-wine',
    title: 'The Witcher 3: Wild Hunt – Blood and Wine',
    type: 'dlc',
    mature: false,
};

const MOCK_HISTORY_LOW = { amount: 4.99, amountInt: 499, currency: 'USD' };

function makeDeal(
    shopId: number,
    shopName: string,
    priceAmount: number,
    regularAmount: number,
    cut: number,
    url: string
) {
    return {
        shop: { id: shopId, name: shopName },
        price: { amount: priceAmount, amountInt: Math.round(priceAmount * 100), currency: 'USD' },
        regular: { amount: regularAmount, amountInt: Math.round(regularAmount * 100), currency: 'USD' },
        cut,
        voucher: null,
        storeLow: null,
        flag: null,
        drm: [{ id: 1, name: 'Steam' }],
        platforms: [{ id: 1, name: 'Windows' }, { id: 2, name: 'Linux' }],
        timestamp: '2024-01-15T10:00:00Z',
        expiry: null,
        url,
    };
}

const DEAL_GOG      = makeDeal(35, 'GOG',      5.99, 39.99, 85, 'https://www.gog.com/game/witcher3');
const DEAL_GREENMAN = makeDeal(41, 'GreenManGaming', 6.49, 39.99, 84, 'https://www.greenmangaming.com/witcher3');
const DEAL_STEAM    = makeDeal(61, 'Steam',    7.99, 39.99, 80, 'https://store.steampowered.com/app/292030');
const DEAL_HUMBLE   = makeDeal(37, 'Humble',   9.99, 39.99, 75, 'https://www.humblebundle.com/store/witcher3');

// ---------------------------------------------------------------------------
// Mock response helpers
// ---------------------------------------------------------------------------

function mockOkJson(body: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown as Response;
}

function mockErrorResponse(status: number, body = 'Error'): Response {
    return {
        ok: false,
        status,
        json: async () => ({ error: body }),
        text: async () => body,
    } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let fetchSpy: jest.SpyInstance;
const ORIGINAL_ITAD_KEY = process.env.ITAD_API_KEY;

beforeEach(() => {
    process.env.ITAD_API_KEY = 'test-key-abc123';
    fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
    fetchSpy.mockRestore();
    if (ORIGINAL_ITAD_KEY === undefined) {
        delete process.env.ITAD_API_KEY;
    } else {
        process.env.ITAD_API_KEY = ORIGINAL_ITAD_KEY;
    }
});

// ---------------------------------------------------------------------------
// Helper: wire up the two-call ITAD fetch sequence
// ---------------------------------------------------------------------------

function setupFetch(searchResp: Response, pricesResp?: Response) {
    if (pricesResp) {
        fetchSpy
            .mockResolvedValueOnce(searchResp)
            .mockResolvedValueOnce(pricesResp);
    } else {
        fetchSpy.mockResolvedValueOnce(searchResp);
    }
}

// ---------------------------------------------------------------------------
// 400 — Input Validation
// ---------------------------------------------------------------------------

describe('400 – Input Validation', () => {
    it('returns 400 and makes no fetch calls when title is missing', async () => {
        const res = await request(app).get('/prices');

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('title query parameter is required');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when title is an empty string', async () => {
        const res = await request(app).get('/prices?title=');

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('title query parameter is required');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when title contains only whitespace', async () => {
        const res = await request(app).get('/prices?title=%20%20%20');

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('title query parameter is required');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when title is passed as an array (?title=a&title=b)', async () => {
        const res = await request(app).get('/prices?title=Witcher&title=Portal');

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('title query parameter is required');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 500 — Server Configuration
// ---------------------------------------------------------------------------

describe('500 – Server Configuration', () => {
    it('returns 500 when ITAD_API_KEY is not set', async () => {
        delete process.env.ITAD_API_KEY;

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('ITAD API key not configured on server');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Step 1 failures — ITAD Game Search
// ---------------------------------------------------------------------------

describe('Step 1 – ITAD Game Search failures', () => {
    it('returns 502 when ITAD search API responds with 503', async () => {
        setupFetch(mockErrorResponse(503));

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(502);
        expect(res.body.message).toBe('Failed to reach ITAD API while searching for game');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns 502 when ITAD search API responds with 401 Unauthorized', async () => {
        setupFetch(mockErrorResponse(401, 'Unauthorized'));

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(502);
        expect(res.body.message).toBe('Failed to reach ITAD API while searching for game');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns 502 when fetch throws a network error during search', async () => {
        fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(502);
        expect(res.body.message).toBe('Failed to reach ITAD API');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns 502 when fetch throws an AbortError (timeout) during search', async () => {
        fetchSpy.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(502);
        expect(res.body.message).toBe('Failed to reach ITAD API');
    });

    it('returns 404 when ITAD search returns an empty array (no match)', async () => {
        setupFetch(mockOkJson([]));

        const res = await request(app).get('/prices?title=NonExistentGameXYZ999');

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Game not found on IsThereAnyDeal');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('404 message contains the trimmed title, not raw whitespace', async () => {
        setupFetch(mockOkJson([]));

        const res = await request(app).get('/prices?title=%20Witcher%20');

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('"Witcher"');
        expect(res.body.message).not.toMatch(/"\s+\w/); // no leading space in quoted title
    });

    it('search URL contains the encoded trimmed title and the API key', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        await request(app).get('/prices?title=The%20Witcher%203');

        const searchUrl = fetchSpy.mock.calls[0][0] as string;
        expect(searchUrl).toContain('/games/search/v1');
        expect(searchUrl).toContain('title=The%20Witcher%203');
        expect(searchUrl).toContain('key=test-key-abc123');
    });

    it('falls back to first result when all search results are non-game types (DLC only)', async () => {
        // The controller uses: find(g => g.type === 'game') ?? searchData[0]
        // So DLC-only results produce a valid game for the next step, not a 404.
        setupFetch(
            mockOkJson([MOCK_DLC]),
            mockOkJson([{ id: MOCK_DLC.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        const res = await request(app).get('/prices?title=Blood+and+Wine');

        expect(res.status).toBe(200);
        expect(res.body.game.id).toBe(MOCK_DLC.id);
    });

    it('prefers the first type="game" entry over a leading DLC entry', async () => {
        setupFetch(
            mockOkJson([MOCK_DLC, MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        expect(res.body.game.id).toBe(MOCK_GAME.id);
        expect(res.body.game.title).toBe(MOCK_GAME.title);
    });
});

// ---------------------------------------------------------------------------
// Step 2 failures — ITAD Price Fetch
// ---------------------------------------------------------------------------

describe('Step 2 – ITAD Price Fetch failures', () => {
    it('returns 502 when ITAD prices API responds with 500', async () => {
        setupFetch(mockOkJson([MOCK_GAME]), mockErrorResponse(500));

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(502);
        expect(res.body.message).toBe('Failed to reach ITAD API while fetching prices');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('returns 502 when fetch throws a network error during price fetch', async () => {
        fetchSpy
            .mockResolvedValueOnce(mockOkJson([MOCK_GAME]))
            .mockRejectedValueOnce(new Error('Connection reset'));

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(502);
        expect(res.body.message).toBe('Failed to reach ITAD API');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('returns 404 with game info when prices response array is empty', async () => {
        setupFetch(mockOkJson([MOCK_GAME]), mockOkJson([]));

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('No prices currently available');
        expect(res.body.game).toMatchObject({
            id: MOCK_GAME.id,
            title: MOCK_GAME.title,
            slug: MOCK_GAME.slug,
        });
    });

    it('returns 404 with game info when the game entry has an empty deals array', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [], historyLow: null }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('No prices currently available');
        expect(res.body.game.title).toBe(MOCK_GAME.title);
    });

    it('prices POST uses correct method, Content-Type header, body, and query params', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        await request(app).get('/prices?title=Witcher');

        const [pricesUrl, pricesInit] = fetchSpy.mock.calls[1] as [string, RequestInit];
        expect(pricesUrl).toContain('/games/prices/v3');
        expect(pricesUrl).toContain('key=test-key-abc123');
        expect(pricesUrl).toContain('country=US');
        expect(pricesInit.method).toBe('POST');
        expect((pricesInit.headers as Record<string, string>)['Content-Type']).toBe('application/json');
        expect(JSON.parse(pricesInit.body as string)).toEqual([{ id: MOCK_GAME.id }]);
    });
});

// ---------------------------------------------------------------------------
// 200 — Successful responses
// ---------------------------------------------------------------------------

describe('200 – Successful responses', () => {
    it('returns the full structured response on success', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM, DEAL_GOG], historyLow: MOCK_HISTORY_LOW }])
        );

        const res = await request(app).get('/prices?title=The+Witcher+3');

        expect(res.status).toBe(200);

        expect(res.body.game).toEqual({
            id: MOCK_GAME.id,
            title: MOCK_GAME.title,
            slug: MOCK_GAME.slug,
        });

        // GOG is cheaper ($5.99) than Steam ($7.99)
        expect(res.body.cheapest.shop).toBe('GOG');
        expect(res.body.cheapest.price.amount).toBe(5.99);
        expect(res.body.cheapest.price.currency).toBe('USD');
        expect(res.body.cheapest.regular.amount).toBe(39.99);
        expect(res.body.cheapest.cut).toBe(85);
        expect(res.body.cheapest.url).toBe(DEAL_GOG.url);

        expect(res.body.historyLow).toEqual({ amount: 4.99, currency: 'USD' });
        expect(res.body.allDeals).toHaveLength(2);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('sorts allDeals by price ascending even when ITAD returns them in descending order', async () => {
        // Provide deals most-expensive-first to prove sorting is applied
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{
                id: MOCK_GAME.id,
                deals: [DEAL_HUMBLE, DEAL_STEAM, DEAL_GREENMAN, DEAL_GOG],
                historyLow: null,
            }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        const prices = res.body.allDeals.map((d: { price: { amount: number } }) => d.price.amount);
        expect(prices).toEqual([5.99, 6.49, 7.99, 9.99]);
    });

    it('cheapest field always matches allDeals[0]', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{
                id: MOCK_GAME.id,
                deals: [DEAL_STEAM, DEAL_GOG, DEAL_HUMBLE, DEAL_GREENMAN],
                historyLow: null,
            }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        expect(res.body.cheapest.shop).toBe(res.body.allDeals[0].shop);
        expect(res.body.cheapest.price.amount).toBe(res.body.allDeals[0].price.amount);
    });

    it('returns historyLow as null when ITAD has no historical data', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        expect(res.body.historyLow).toBeNull();
    });

    it('works correctly when there is only a single deal available', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_GOG], historyLow: MOCK_HISTORY_LOW }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        expect(res.body.allDeals).toHaveLength(1);
        expect(res.body.cheapest.shop).toBe('GOG');
        expect(res.body.cheapest.price.amount).toBe(5.99);
    });

    it('maps DRM and platforms to arrays of strings, not objects', async () => {
        const richDeal = {
            ...DEAL_STEAM,
            drm: [{ id: 1, name: 'Steam' }, { id: 5, name: 'Denuvo' }],
            platforms: [{ id: 1, name: 'Windows' }, { id: 2, name: 'Linux' }, { id: 3, name: 'Mac' }],
        };

        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [richDeal], historyLow: null }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        expect(res.body.cheapest.drm).toEqual(['Steam', 'Denuvo']);
        expect(res.body.cheapest.platforms).toEqual(['Windows', 'Linux', 'Mac']);
        expect(res.body.allDeals[0].drm).toEqual(['Steam', 'Denuvo']);
        expect(res.body.allDeals[0].platforms).toEqual(['Windows', 'Linux', 'Mac']);
    });

    it('does not expose internal ITAD fields (voucher, storeLow, flag, timestamp) in response', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        expect(res.body.cheapest).not.toHaveProperty('voucher');
        expect(res.body.cheapest).not.toHaveProperty('storeLow');
        expect(res.body.cheapest).not.toHaveProperty('flag');
        expect(res.body.cheapest).not.toHaveProperty('timestamp');
        expect(res.body.allDeals[0]).not.toHaveProperty('voucher');
    });

    it('does not leak the API key in the response body', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        const res = await request(app).get('/prices?title=Witcher');

        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toContain('test-key-abc123');
    });

    it('makes exactly two fetch calls on a successful full request', async () => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{ id: MOCK_GAME.id, deals: [DEAL_STEAM], historyLow: null }])
        );

        await request(app).get('/prices?title=Witcher');

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});

// ---------------------------------------------------------------------------
// Response shape contract
// ---------------------------------------------------------------------------

describe('Response shape – allDeals and cheapest contract', () => {
    beforeEach(() => {
        setupFetch(
            mockOkJson([MOCK_GAME]),
            mockOkJson([{
                id: MOCK_GAME.id,
                deals: [DEAL_GOG, DEAL_STEAM],
                historyLow: MOCK_HISTORY_LOW,
            }])
        );
    });

    it('each allDeals entry has the expected fields with correct types', async () => {
        const res = await request(app).get('/prices?title=Witcher');

        for (const deal of res.body.allDeals) {
            expect(deal).toMatchObject({
                shop: expect.any(String),
                price: { amount: expect.any(Number), currency: expect.any(String) },
                regular: { amount: expect.any(Number), currency: expect.any(String) },
                cut: expect.any(Number),
                url: expect.any(String),
                drm: expect.any(Array),
                platforms: expect.any(Array),
            });
        }
    });

    it('cheapest has the expected shape', async () => {
        const res = await request(app).get('/prices?title=Witcher');

        expect(res.body.cheapest).toMatchObject({
            shop: expect.any(String),
            price: { amount: expect.any(Number), currency: expect.any(String) },
            regular: { amount: expect.any(Number), currency: expect.any(String) },
            cut: expect.any(Number),
            url: expect.any(String),
            drm: expect.any(Array),
            platforms: expect.any(Array),
        });
    });

    it('game field has id, title and slug', async () => {
        const res = await request(app).get('/prices?title=Witcher');

        expect(res.body.game).toEqual({
            id: expect.any(String),
            title: expect.any(String),
            slug: expect.any(String),
        });
    });
});
