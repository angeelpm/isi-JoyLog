// ====================================================
// JoyLog – Prototipo RAWG API
// Sprint 2 – Test de integración con RAWG API
// ====================================================
// Uso: node proto-rawg.js
// Documentación RAWG: https://rawg.io/apidocs
// ====================================================

const RAWG_API_KEY = 'TU_API_KEY_AQUI'; // Obtener en https://rawg.io/apidocs
const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * Buscar juegos por nombre
 * Endpoint: GET /api/games?search={query}&key={api_key}
 */
async function searchGames(query) {
  const url = `${RAWG_BASE_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=5`;

  console.log(`\n🔍 Buscando juegos: "${query}"`);
  console.log(`   URL: ${url}\n`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${data.detail || 'Unknown error'}`);
    }

    console.log(`✅ Encontrados ${data.count} resultados (mostrando ${data.results.length}):\n`);

    data.results.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.name}`);
      console.log(`      ID: ${game.id}`);
      console.log(`      Metacritic: ${game.metacritic || 'N/A'}`);
      console.log(`      Plataformas: ${game.platforms?.map(p => p.platform.name).join(', ') || 'N/A'}`);
      console.log(`      Géneros: ${game.genres?.map(g => g.name).join(', ') || 'N/A'}`);
      console.log(`      Fecha: ${game.released || 'N/A'}`);
      console.log(`      Imagen: ${game.background_image || 'N/A'}`);
      console.log('');
    });

    return data.results;
  } catch (error) {
    console.error(`❌ Error buscando juegos: ${error.message}`);
    return [];
  }
}

/**
 * Obtener ficha detallada de un juego
 * Endpoint: GET /api/games/{id}?key={api_key}
 */
async function getGameDetails(gameId) {
  const url = `${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`;

  console.log(`\n📋 Obteniendo ficha del juego ID: ${gameId}`);

  try {
    const response = await fetch(url);
    const game = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${game.detail || 'Unknown error'}`);
    }

    console.log(`\n✅ Ficha del juego:`);
    console.log(`   Título: ${game.name}`);
    console.log(`   Descripción: ${game.description_raw?.substring(0, 200)}...`);
    console.log(`   Metacritic: ${game.metacritic || 'N/A'}`);
    console.log(`   Fecha de lanzamiento: ${game.released}`);
    console.log(`   Rating: ${game.rating}/5 (${game.ratings_count} votos)`);
    console.log(`   Géneros: ${game.genres?.map(g => g.name).join(', ')}`);
    console.log(`   Plataformas: ${game.platforms?.map(p => p.platform.name).join(', ')}`);
    console.log(`   Desarrolladores: ${game.developers?.map(d => d.name).join(', ')}`);
    console.log(`   Publishers: ${game.publishers?.map(p => p.name).join(', ')}`);
    console.log(`   Web: ${game.website || 'N/A'}`);
    console.log(`   Imagen: ${game.background_image}`);
    console.log(`   ESRB: ${game.esrb_rating?.name || 'N/A'}`);

    return game;
  } catch (error) {
    console.error(`❌ Error obteniendo ficha: ${error.message}`);
    return null;
  }
}

/**
 * Obtener capturas de pantalla de un juego
 * Endpoint: GET /api/games/{id}/screenshots?key={api_key}
 */
async function getGameScreenshots(gameId) {
  const url = `${RAWG_BASE_URL}/games/${gameId}/screenshots?key=${RAWG_API_KEY}`;

  console.log(`\n📸 Obteniendo screenshots del juego ID: ${gameId}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${data.detail || 'Unknown error'}`);
    }

    console.log(`\n✅ ${data.count} screenshots encontradas:`);
    data.results.forEach((screenshot, index) => {
      console.log(`   ${index + 1}. ${screenshot.image}`);
    });

    return data.results;
  } catch (error) {
    console.error(`❌ Error obteniendo screenshots: ${error.message}`);
    return [];
  }
}

// -------------------- EJECUCIÓN --------------------

async function main() {
  console.log('='.repeat(60));
  console.log('   JoyLog – Prototipo RAWG API');
  console.log('='.repeat(60));

  // 1. Buscar juegos
  const results = await searchGames('The Witcher 3');

  // 2. Obtener ficha detallada del primer resultado
  if (results.length > 0) {
    const gameId = results[0].id;
    await getGameDetails(gameId);
    await getGameScreenshots(gameId);
  }

  // 3. Otra búsqueda de ejemplo
  await searchGames('Zelda Tears of the Kingdom');

  console.log('\n' + '='.repeat(60));
  console.log('   ✅ Prototipo RAWG API completado');
  console.log('='.repeat(60));
}

main().catch(console.error);
