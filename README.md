# JoyLog

JoyLog es un **diario y tracker de videojuegos** — la idea de *Letterboxd, pero para videojuegos*. Permite a cada usuario:

- Llevar su biblioteca de juegos clasificada por estado: *jugando*, *completado*, *abandonado* o *lista de deseos*.
- Escribir reseñas y puntuar los juegos que ha jugado.
- Seguir a otros usuarios, ver su actividad, dar "me gusta" y comentar reseñas.
- Crear listas de juegos (públicas, privadas o colaborativas).
- Consultar el **precio actual** de un juego en distintas tiendas.
- Recibir **recomendaciones generadas por IA**.

Los datos de los juegos vienen de la **API de RAWG**, los precios de la **API de IsThereAnyDeal (ITAD)**, y las recomendaciones usan **Gemini**.

---

## Cómo ejecutarlo desde cero

No necesitas saber nada de Node, npm ni de la base de datos. **Todo el proyecto se levanta dentro de contenedores Docker**, así que el único software que tienes que instalar en un ordenador "vacío" es **Docker** y **Git**.

### 1. Instalar los dos únicos prerrequisitos

| Herramienta | Para qué | Cómo instalarla |
|---|---|---|
| **Git** | Descargar el código del repositorio | [git-scm.com/downloads](https://git-scm.com/downloads) |
| **Docker Desktop** (incluye Docker + Docker Compose) | Ejecutar todos los servicios | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |

> En Windows y macOS, Docker Desktop ya trae todo lo necesario. En Linux instala `docker` y el plugin `docker compose`. No hace falta instalar Node, MongoDB ni ninguna otra dependencia: viven dentro de los contenedores.

### 2. Clonar el repositorio

```bash
git clone https://github.com/angeelpm/isi-JoyLog.git
cd isi-JoyLog
```

### 3. Crear el archivo `.env`

En la raíz del proyecto, crea un archivo llamado `.env` con estas claves (pídele las reales al responsable del proyecto):

```env
RAWG_API_KEY=...     # metadatos de juegos (RAWG)
ITAD_API_KEY=...     # precios (IsThereAnyDeal)
JWT_SECRET=...       # firma de los tokens de sesión
GEMINI_API_KEY=...   # solo si vas a usar las recomendaciones por IA
VITE_API_URL=http://localhost:3000
```

> El `.env` está en `.gitignore` y **nunca se sube al repositorio**.

### 4. Levantar todo

```bash
docker compose up --build
```

O, si tienes `make` disponible, el atajo equivalente:

```bash
make dev-up
```

La primera vez tardará unos minutos en construir las imágenes. Cuando termine, abre el navegador en:

- **Frontend (la app):** http://localhost:5173

Para parar todo: `docker compose down` (o `make dev-down`).

### Puertos que usa

| Servicio | Puerto | Descripción |
|---|---|---|
| frontend | 5173 | La SPA de React (lo que abre el usuario) |
| api-gateway | 3000 | Punto de entrada único de la API |
| auth-service | 3001 | Autenticación, perfiles y social |
| library-service | 3002 | Biblioteca, reseñas, listas, precios |
| ai-service | 3003 | Recomendaciones con IA |
| mongodb | 27018 | Base de datos |

---

## Arquitectura en una frase

Monorepo con **npm workspaces**: un backend de **microservicios** (Node + Express + MongoDB) detrás de un **API gateway**, y un frontend **React + Vite + TypeScript**. Todo el tráfico del frontend pasa por el gateway bajo el prefijo versionado `/v1` (`/v1/auth`, `/v1/library`, `/v1/ai`, `/v1/games`). Para el detalle completo, consulta `docs/technical-documentation.md`.

---

## Qué hay en cada documento del repositorio

| Documento | Qué encontrarás dentro |
|---|---|
| **`README.md`** | Este archivo: qué es el proyecto, cómo ejecutarlo desde cero y guía de los demás documentos. |
| **`Agent.md`** | Guía de onboarding para cualquier IA o nuevo colaborador: arquitectura, estructura, cómo correr y testear, convenciones, y un **checklist de requisitos y funcionalidades** con estado `true`/`false`. |
| **`docs/technical-documentation.md`** | Documentación técnica completa: stack, arquitectura, todos los endpoints de la API, modelos de datos y detalles de implementación. |
| **`docs/deployment-plan.md`** | Plan de despliegue (servidor casero + Cloudflare Tunnel) y guía de puesta en marcha del entorno de desarrollo. |
| **`docs/user-manual.es.md`** / **`docs/user-manual.en.md`** | Manual de usuario final (en español e inglés): cómo usar la aplicación paso a paso. |
| **`docs/viabilidad.md`** | Análisis de viabilidad del proyecto: descripción, análisis de mercado y técnico. |
| **`docs/skills.md`** | Documento de capacidades y hoja de ruta (Sprint 2+). |
| **`Makefile`** | Atajos de comandos (`make help` los lista todos: `dev-up`, `dev-down`, `prod-up`, logs, etc.). |

---

## Cómo se ha trabajado con las ramas

El proyecto sigue un flujo basado en ramas con dos ramas protegidas:

- **`main`** — producción / entrega final. **Protegida.**
- **`develop`** — rama de integración. **Protegida.** Todo el trabajo nuevo se mergea aquí primero.
- **`feature/<nombre>`** — una rama por funcionalidad, creada desde `develop` (ej. `feature/social-follow`, `feature/ai-recommendations`).
- **`fix/<nombre>`** o **`chore/<nombre>`** — arreglos puntuales o tareas de mantenimiento (ej. `chore/api-versioning`).

**Reglas de protección en `main` y `develop`:**

- No se puede hacer push directo — todo entra mediante **Pull Request**.
- Cada PR necesita al menos **1 aprobación** de otro colaborador (revisión cruzada).
- Los **checks de CI deben estar en verde** antes de poder mergear.

Flujo típico:

```bash
git checkout develop
git pull
git checkout -b feature/lo-que-sea
# ...cambios y commits...
git push -u origin feature/lo-que-sea
# Abrir PR: feature/lo-que-sea → develop, esperar review + CI verde, y mergear.
```

Cuando dos personas trabajan en la misma funcionalidad pero en partes distintas (p. ej. frontend y backend), se usan **ramas separadas** que mergean a `develop` de forma independiente, para que cada PR se revise por su cuenta y no haya conflictos cruzados.

---

## CI/CD con GitHub Actions

Hay un único workflow en **`.github/workflows/ci.yml`** que se dispara en cada `push` y cada `pull_request` contra `main` o `develop`. Si algo falla, la regla de protección de rama **bloquea el merge** hasta que se arregle.

**Job `test`** — instala todos los workspaces y ejecuta:

1. `npm test --workspace=ai-service`
2. `npm test --workspace=auth-service`
3. `npm test --workspace=library-service`
4. `npm test --workspace=joylog-frontend` (Vitest)
5. `npm run lint --workspace=joylog-frontend` (ESLint)
6. `npm run build --workspace=joylog-frontend` (TypeScript + build de Vite)

Los tests de backend usan `mongodb-memory-server`, así que **no hace falta una MongoDB real** en CI.

**Job `docker`** (se ejecuta después de `test`, solo si pasa):

- Crea un `.env` con valores placeholder (`ci_placeholder`) — **nunca usa secretos reales** en CI.
- Ejecuta `docker compose build` para verificar que todas las imágenes compilan sin errores.
