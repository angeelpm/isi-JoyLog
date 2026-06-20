# Prototipos de tecnología (Sprint 2)

Antes de integrar cada tecnología en el flujo completo de JoyLog, se validó
de forma aislada. Cada carpeta es un script independiente, sin tocar el
código de los servicios reales — solo prueba que la tecnología funciona.

| Carpeta | Qué prueba | Cómo correrlo |
|---|---|---|
| `rawg-api/` | Conexión y parseo de resultados de RAWG | `node prototypes/rawg-api/test.mjs` |
| `itad-api/` | Búsqueda de juego + precios en IsThereAnyDeal | `node prototypes/itad-api/test.mjs` |
| `gemini-api/` | Llamada a Gemini y parseo de la respuesta | `node prototypes/gemini-api/test.mjs` |
| `jwt-bcrypt/` | Hash/verificación de contraseña y firma/verificación de JWT | `cd prototypes/jwt-bcrypt && npm install && node test.mjs` |
| `docker-compose/` | Arranque conjunto de varios contenedores en red interna compartida + mapeo de puertos | `node prototypes/docker-compose/test.mjs` |

Esta rama no contiene código de la app — son prototipos aislados, previos
al desarrollo de los servicios reales. `docker-compose/` usa su propio
`docker-compose.yml` con dos contenedores de prueba (`nginx`), no el de
JoyLog.

## Requisitos

- Node.js 18+ (usa `fetch` nativo).
- Un `.env` en la raíz de este checkout con `RAWG_API_KEY`, `ITAD_API_KEY` y
  `GEMINI_API_KEY` (los scripts de `rawg-api`, `itad-api` y `gemini-api` lo
  leen automáticamente; puedes copiar las claves del `.env` del repo
  principal de JoyLog).
- Docker + Docker Compose para `docker-compose/test.mjs`.

Cada script imprime `PASS`/`FAIL` por cada comprobación y termina con código
de salida 0 (todo OK) o 1 (algo falló).
