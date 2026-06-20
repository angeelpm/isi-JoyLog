// Prototype: can we search a game on IsThereAnyDeal and fetch its prices?
// Run: node prototypes/itad-api/test.mjs
import '../_env.mjs';

const key = process.env.ITAD_API_KEY;
if (!key) {
    console.error('FAIL: ITAD_API_KEY not set (check .env at repo root)');
    process.exit(1);
}

const searchUrl = `https://api.isthereanydeal.com/games/search/v1?key=${key}&title=${encodeURIComponent('The Witcher 3')}`;
const searchRes = await fetch(searchUrl);

if (!searchRes.ok) {
    console.error(`FAIL: ITAD search responded with HTTP ${searchRes.status}`);
    process.exit(1);
}

const searchData = await searchRes.json();
const game = searchData[0];

if (!game?.id) {
    console.error('FAIL: search returned no game to price-check');
    process.exit(1);
}

const pricesUrl = `https://api.isthereanydeal.com/games/prices/v3?key=${key}&country=US`;
const pricesRes = await fetch(pricesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([game.id]),
});

if (!pricesRes.ok) {
    console.error(`FAIL: ITAD prices responded with HTTP ${pricesRes.status}`);
    process.exit(1);
}

const pricesData = await pricesRes.json();
const deal = pricesData[0]?.deals?.[0];

console.log(`PASS: ITAD found "${game.title}" (id ${game.id}); cheapest deal: ${deal ? `${deal.shop.name} at ${deal.price.amount} ${deal.price.currency}` : 'no current deals'}`);
