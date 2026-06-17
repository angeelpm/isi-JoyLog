import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many requests, please wait a moment.' },
});

interface Recommendation {
    title: string;
    genre: string;
    reason: string;
    price: string;
}

interface RecommendationRequestBody {
    mode: 'theme' | 'library';
    theme?: string;
    userStats?: {
        topGenres?: string[];
        recentGames?: string[];
        totalCompleted?: number;
    };
}

function buildPrompt(body: RecommendationRequestBody): string {
    if (body.mode === 'theme') {
        return `Recommend video games based on this theme or mood: "${body.theme}". Consider price value too.`;
    }
    const genres = body.userStats?.topGenres?.join(', ') || 'action, adventure';
    const recent = body.userStats?.recentGames?.join(', ') || 'various games';
    const completed = body.userStats?.totalCompleted ?? 0;
    return `The user has completed ${completed} games. Their favorite genres are: ${genres}. Recently played: ${recent}. Recommend 5 games they would love, considering price value.`;
}

router.post('/recommendations', aiLimiter, async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
        return;
    }

    const body = req.body as RecommendationRequestBody;
    if (!body.mode || (body.mode === 'theme' && !body.theme?.trim())) {
        res.status(400).json({ error: 'Invalid request body.' });
        return;
    }

    const userPrompt = buildPrompt(body);
    const systemPrompt = `You are a video game recommendation AI. ${userPrompt}
Return ONLY a valid JSON array (no markdown, no explanation) of exactly 5 game recommendations with this exact structure:
[{"title":"...","genre":"...","reason":"...","price":"~€X-Y"}]`;

    try {
        const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2048,
                    thinkingConfig: { thinkingBudget: 0 },
                },
            }),
        });

        if (!geminiRes.ok) {
            res.status(502).json({ error: `Gemini API error: ${geminiRes.status}` });
            return;
        }

        const data = await geminiRes.json() as {
            candidates?: { content?: { parts?: { text?: string }[] } }[]
        };
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const raw =
            parts.find((p) => p.text && !p.text.startsWith('<'))?.text ??
            parts[parts.length - 1]?.text ??
            '';
        const clean = raw.replace(/```json|```/g, '').trim();
        const recommendations = JSON.parse(clean) as Recommendation[];
        res.json(recommendations);
    } catch {
        res.status(500).json({ error: 'Failed to get recommendations.' });
    }
});

export default router;
