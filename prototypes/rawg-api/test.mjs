// Prototype: can we reach the RAWG API and parse a search result?
// Run: node prototypes/rawg-api/test.mjs
import '../_env.mjs';

const key = process.env.RAWG_API_KEY;
if (!key) {
    console.error('FAIL: RAWG_API_KEY not set (check .env at repo root)');
    process.exit(1);
}

const url = `https://api.rawg.io/api/games?search=zelda&key=${key}`;
const res = await fetch(url);

if (!res.ok) {
    console.error(`FAIL: RAWG responded with HTTP ${res.status}`);
    process.exit(1);
}

const data = await res.json();
const first = data.results?.[0];

if (!first?.name) {
    console.error('FAIL: response had no results to parse');
    process.exit(1);
}

console.log(`PASS: RAWG returned "${first.name}" (id ${first.id}) for search "zelda"`);
