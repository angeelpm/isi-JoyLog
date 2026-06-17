/**
 * tests/ai.test.ts
 *
 * Integration tests for POST /recommendations
 *
 * Design notes:
 *  - express-rate-limit is mocked globally so the 5 req/min limit never fires.
 *    The mock is hoisted by Jest before `app` is imported, so the route module
 *    receives the passthrough middleware on first load.
 *  - global.fetch is spied on per-test — the handler uses native Node 18+ fetch.
 *  - process.env.GEMINI_API_KEY is managed per-test to keep tests independent.
 */

// Must appear before any import — Jest hoists this above the import block.
jest.mock('express-rate-limit', () =>
    jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
);

import request from 'supertest';
import app from '../src/app';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_RECOMMENDATIONS = [
    { title: 'Elden Ring',      genre: 'RPG',          reason: 'Epic open world',    price: '~€40-50' },
    { title: 'Hollow Knight',   genre: 'Metroidvania', reason: 'Tight combat',       price: '~€15'    },
    { title: 'Disco Elysium',   genre: 'RPG',          reason: 'Unique narrative',   price: '~€20'    },
    { title: 'Celeste',         genre: 'Platformer',   reason: 'Great feel',         price: '~€10'    },
    { title: 'Hades',           genre: 'Roguelike',    reason: 'Addictive loops',    price: '~€25'    },
];

function makeGeminiResponse(text: string) {
    return { candidates: [{ content: { parts: [{ text }] } }] };
}

const MOCK_GEMINI_OK = makeGeminiResponse(JSON.stringify(MOCK_RECOMMENDATIONS));

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockOkJson(body: unknown): Response {
    return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function mockErrorResponse(status: number): Response {
    return { ok: false, status, json: async () => ({ error: 'API error' }) } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let fetchSpy: jest.SpyInstance;
const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY;

beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
    fetchSpy.mockRestore();
    if (ORIGINAL_GEMINI_KEY === undefined) {
        delete process.env.GEMINI_API_KEY;
    } else {
        process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_KEY;
    }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe('GET /health', () => {
    it('returns 200 with the service status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('AI service is running');
    });
});

// ---------------------------------------------------------------------------
// 400 – Input validation
// ---------------------------------------------------------------------------

describe('POST /recommendations – 400 input validation', () => {
    it('returns 400 when mode is missing', async () => {
        const res = await request(app).post('/recommendations').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid request body.');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when mode is "theme" and theme is absent', async () => {
        const res = await request(app).post('/recommendations').send({ mode: 'theme' });
        expect(res.status).toBe(400);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when mode is "theme" and theme is an empty string', async () => {
        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: '' });
        expect(res.status).toBe(400);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns 400 when mode is "theme" and theme is only whitespace', async () => {
        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: '   ' });
        expect(res.status).toBe(400);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 500 – Server configuration
// ---------------------------------------------------------------------------

describe('POST /recommendations – 500 server configuration', () => {
    it('returns 500 and makes no fetch call when GEMINI_API_KEY is not set', async () => {
        delete process.env.GEMINI_API_KEY;

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('GEMINI_API_KEY not configured on server.');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Gemini API error handling
// ---------------------------------------------------------------------------

describe('POST /recommendations – Gemini API errors', () => {
    it('returns 502 when Gemini responds with a non-OK status', async () => {
        fetchSpy.mockResolvedValueOnce(mockErrorResponse(503));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/Gemini API error/);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when Gemini returns malformed JSON in the text part', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(makeGeminiResponse('not valid json at all')));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to get recommendations.');
    });

    it('returns 500 when fetch throws a network error', async () => {
        fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to get recommendations.');
    });

    it('returns 500 when Gemini response has no candidates', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson({ candidates: [] }));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to get recommendations.');
    });
});

// ---------------------------------------------------------------------------
// 200 – mode: theme
// ---------------------------------------------------------------------------

describe('POST /recommendations – mode: theme (200)', () => {
    it('returns 200 with an array of 5 recommendations', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'cyberpunk' });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(5);
    });

    it('each recommendation has title, genre, reason and price fields', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'cyberpunk' });

        for (const rec of res.body) {
            expect(rec).toMatchObject({
                title: expect.any(String),
                genre: expect.any(String),
                reason: expect.any(String),
                price: expect.any(String),
            });
        }
    });

    it('includes the theme text in the Gemini prompt', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({ mode: 'theme', theme: 'survival horror' });

        const sentBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
        const prompt: string = sentBody.contents[0].parts[0].text;
        expect(prompt).toContain('survival horror');
    });

    it('strips markdown code fences before parsing JSON', async () => {
        const fenced = `\`\`\`json\n${JSON.stringify(MOCK_RECOMMENDATIONS)}\n\`\`\``;
        fetchSpy.mockResolvedValueOnce(mockOkJson(makeGeminiResponse(fenced)));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(5);
    });

    it('skips thinking parts (text starting with "<") and parses the JSON part', async () => {
        const thinkingResponse = {
            candidates: [{
                content: {
                    parts: [
                        { text: '<thinking>Let me reason about this...</thinking>' },
                        { text: JSON.stringify(MOCK_RECOMMENDATIONS) },
                    ],
                },
            }],
        };
        fetchSpy.mockResolvedValueOnce(mockOkJson(thinkingResponse));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(5);
    });

    it('does not leak the API key in the response body', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        const res = await request(app).post('/recommendations').send({ mode: 'theme', theme: 'horror' });

        expect(JSON.stringify(res.body)).not.toContain('test-gemini-key');
    });
});

// ---------------------------------------------------------------------------
// 200 – mode: library
// ---------------------------------------------------------------------------

describe('POST /recommendations – mode: library (200)', () => {
    it('returns 200 with recommendations based on library stats', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        const res = await request(app).post('/recommendations').send({
            mode: 'library',
            userStats: { topGenres: ['RPG', 'Strategy'], recentGames: ["Baldur's Gate 3"], totalCompleted: 42 },
        });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('includes user stats in the Gemini prompt', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({
            mode: 'library',
            userStats: { topGenres: ['RPG', 'Strategy'], recentGames: ["Baldur's Gate 3"], totalCompleted: 42 },
        });

        const sentBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
        const prompt: string = sentBody.contents[0].parts[0].text;
        expect(prompt).toContain('42');
        expect(prompt).toContain('RPG');
        expect(prompt).toContain('Strategy');
        expect(prompt).toContain("Baldur's Gate 3");
    });

    it('falls back to default genres and recent games when userStats is absent', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({ mode: 'library' });

        const sentBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
        const prompt: string = sentBody.contents[0].parts[0].text;
        expect(prompt).toContain('action, adventure');
        expect(prompt).toContain('various games');
        expect(prompt).toContain('0');
    });

    it('falls back to default genres when topGenres is an empty array', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({ mode: 'library', userStats: { topGenres: [] } });

        const sentBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
        const prompt: string = sentBody.contents[0].parts[0].text;
        expect(prompt).toContain('action, adventure');
    });

    it('defaults totalCompleted to 0 when not provided in userStats', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({ mode: 'library', userStats: { topGenres: ['FPS'] } });

        const sentBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
        const prompt: string = sentBody.contents[0].parts[0].text;
        expect(prompt).toContain('0');
    });
});

// ---------------------------------------------------------------------------
// Gemini request shape
// ---------------------------------------------------------------------------

describe('POST /recommendations – Gemini request shape', () => {
    it('calls the Gemini generateContent endpoint with the API key', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({ mode: 'theme', theme: 'space' });

        const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('generativelanguage.googleapis.com');
        expect(url).toContain('generateContent');
        expect(url).toContain('key=test-gemini-key');
        expect(init.method).toBe('POST');
        expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('sends generationConfig with thinkingBudget 0', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({ mode: 'theme', theme: 'space' });

        const sentBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
        expect(sentBody.generationConfig).toMatchObject({
            temperature: expect.any(Number),
            maxOutputTokens: expect.any(Number),
            thinkingConfig: { thinkingBudget: 0 },
        });
    });

    it('makes exactly one fetch call per recommendation request', async () => {
        fetchSpy.mockResolvedValueOnce(mockOkJson(MOCK_GEMINI_OK));

        await request(app).post('/recommendations').send({ mode: 'theme', theme: 'space' });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
});
