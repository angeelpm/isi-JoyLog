// Prototype: can we call Gemini and get a usable text response?
// Run: node prototypes/gemini-api/test.mjs
import '../_env.mjs';

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error('FAIL: GEMINI_API_KEY not set (check .env at repo root)');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: 'Recommend one video game similar to Hollow Knight. Reply with just the title.' }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
    }),
});

if (!res.ok) {
    console.error(`FAIL: Gemini responded with HTTP ${res.status}`);
    process.exit(1);
}

const data = await res.json();
const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

if (!text) {
    console.error('FAIL: response had no text to parse');
    process.exit(1);
}

console.log(`PASS: Gemini responded: "${text.trim()}"`);
