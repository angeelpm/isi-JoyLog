// ====================================================
// JoyLog – Prototipo IsThereAnyDeal API
// Sprint 2 – Test de integración con IsThereAnyDeal
// ====================================================
// Uso: node proto-itad.js
// Documentación: https://docs.isthereanydeal.com/
// ====================================================

const ITAD_API_KEY = 'TU_API_KEY_AQUI'; // Obtener en https://isthereanydeal.com/dev/app/
const ITAD_BASE_URL = 'https://api.isthereanydeal.com';

/**
 * Buscar un juego en IsThereAnyDeal por título
 * Endpoint: GET /games/search/v1?title={title}&key={api_key}
 */
async function searchGame(title) {
  const url = `${ITAD_BASE_URL}/games/search/v1?title=${encodeURIComponent(title)}&key=${ITAD_API_KEY}`;

  console.log(`\n🔍 Buscando "${title}" en IsThereAnyDeal...`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${JSON.stringify(data)}`);
    }

    if (data.length === 0) {
      console.log('   No se encontraron resultados.');
      return null;
    }

    console.log(`\n✅ Resultados:`);
    data.slice(0, 5).forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.title} (ID: ${game.id})`);
    });

    return data[0]; // Devolver el primer resultado
  } catch (error) {
    console.error(`❌ Error buscando: ${error.message}`);
    return null;
  }
}

/**
 * Obtener precios actuales de un juego
 * Endpoint: GET /games/prices/v2?key={api_key}
 * Body: [gameId]
 */
async function getCurrentPrices(gameId, gameTitle) {
  const url = `${ITAD_BASE_URL}/games/prices/v2?key=${ITAD_API_KEY}&country=ES&capacity=5`;

  console.log(`\n💰 Obteniendo precios actuales de "${gameTitle}"...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([gameId]),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${JSON.stringify(data)}`);
    }

    const prices = data[0];
    if (!prices || !prices.deals || prices.deals.length === 0) {
      console.log('   No se encontraron precios.');
      return [];
    }

    console.log(`\n✅ Precios encontrados:`);
    prices.deals.forEach((deal, index) => {
      const discount = deal.regular.amount > 0
        ? Math.round((1 - deal.price.amount / deal.regular.amount) * 100)
        : 0;
      console.log(`   ${index + 1}. ${deal.shop.name}`);
      console.log(`      Precio: ${deal.price.amount}€ (Regular: ${deal.regular.amount}€)`);
      console.log(`      Descuento: ${discount}%`);
      console.log(`      URL: ${deal.url}`);
      console.log('');
    });

    return prices.deals;
  } catch (error) {
    console.error(`❌ Error obteniendo precios: ${error.message}`);
    return [];
  }
}

/**
 * Obtener histórico de precio más bajo
 * Endpoint: GET /games/historylow/v1?key={api_key}
 */
async function getHistoricalLow(gameId, gameTitle) {
  const url = `${ITAD_BASE_URL}/games/historylow/v1?key=${ITAD_API_KEY}&country=ES`;

  console.log(`\n📉 Obteniendo precio histórico mínimo de "${gameTitle}"...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([gameId]),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${JSON.stringify(data)}`);
    }

    const historyLow = data[0];
    if (!historyLow || !historyLow.low) {
      console.log('   No se encontró precio histórico.');
      return null;
    }

    console.log(`\n✅ Precio histórico mínimo:`);
    console.log(`   Precio: ${historyLow.low.price.amount}€`);
    console.log(`   Tienda: ${historyLow.low.shop.name}`);
    console.log(`   Fecha: ${historyLow.low.timestamp}`);

    return historyLow.low;
  } catch (error) {
    console.error(`❌ Error obteniendo histórico: ${error.message}`);
    return null;
  }
}

// -------------------- EJECUCIÓN --------------------

async function main() {
  console.log('='.repeat(60));
  console.log('   JoyLog – Prototipo IsThereAnyDeal API');
  console.log('='.repeat(60));

  // 1. Buscar juego
  const game = await searchGame('The Witcher 3');

  if (game) {
    // 2. Obtener precios actuales
    await getCurrentPrices(game.id, game.title);

    // 3. Obtener precio histórico más bajo
    await getHistoricalLow(game.id, game.title);
  }

  // 4. Otra búsqueda
  const game2 = await searchGame('Elden Ring');
  if (game2) {
    await getCurrentPrices(game2.id, game2.title);
  }

  console.log('\n' + '='.repeat(60));
  console.log('   ✅ Prototipo IsThereAnyDeal completado');
  console.log('='.repeat(60));
}

main().catch(console.error);
