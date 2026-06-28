# AGENTS.md

Onboarding guide for any AI agent or new contributor working on **JoyLog**. Read this first: it explains what the project is, how it's wired together, how to run and test it, and the conventions you must follow when making changes.

---

## 1. What is JoyLog

JoyLog is a game diary/tracker — think *Letterboxd for video games*. Users track their game library by status (`playing`, `completed`, `dropped`, `wishlist`), write reviews, follow other users, build shared game lists, and check live prices. It uses the **RAWG API** for game metadata and the **IsThereAnyDeal (ITAD) API** for price tracking, plus an optional **Gemini**-powered recommendations feature.

---

## 2. Architecture

NPM Workspaces monorepo with a microservices backend and a React frontend. All services share a single `node_modules` at the repo root.

```
api-gateway     (port 3000) — reverse proxy; routes to internal services + RAWG proxy
auth-service    (port 3001) — JWT auth, registration/login, profiles, social follow, MongoDB
library-service (port 3002) — game library CRUD, reviews, likes, comments, lists, feed, ITAD prices
ai-service      (port 3003) — Gemini-based recommendations (optional feature)
frontend        (port 5173) — React 19 + Vite + TypeScript SPA
mongodb         (port 27018) — persists users and game entries
```

**All frontend traffic goes through the API gateway**, which strips the version/service prefix before forwarding:

- `GET/POST /v1/auth/*`    → auth-service (prefix stripped)
- `GET/POST /v1/library/*` → library-service (prefix stripped)
- `POST /v1/ai/*`          → ai-service (prefix stripped)
- `/v1/games/*`            → RAWG external API (gateway injects the API key)

> The API is versioned under `/v1`. There is no unversioned `/api` route — all client calls use the `/v1` prefix.

**Shared TypeScript types** live in `shared/types/interfaces.ts` — this is the single source of truth for types used across the frontend and backend services. Change types there, not in copies.

---

## 3. Repo structure

```
services/
  api-gateway/        # Express; proxies to auth-service, library-service, ai-service, and RAWG
  auth-service/       # Express + MongoDB — register, login, profile, JWT, social
    src/  tests/
  library-service/    # Express + MongoDB — library CRUD, reviews, prices (ITAD), lists, feed
    src/  tests/
  ai-service/         # Express — Gemini recommendations
shared/
  types/interfaces.ts # Shared types (single source of truth)
frontend/             # React + Vite + TypeScript SPA
  src/  tests/
nginx/nginx.conf      # Reverse-proxies /v1/ to the gateway, serves the built SPA
docs/                 # Technical documentation and deployment plan
docker-compose.yml         # Dev orchestration (mongo + services + frontend)
docker-compose.prod.yml    # Production build
.github/workflows/ci.yml   # CI pipeline
```

Each backend service is its own npm workspace; a root `npm install` installs them all via npm workspaces.

---

## 4. Running and developing locally

### With Docker (recommended)
```bash
docker compose up           # start all services
docker compose up --build   # rebuild after Dockerfile/dependency changes
docker compose down         # stop everything
```

### Installing packages (always use the workspace flag)
```bash
npm install <pkg> --workspace=auth-service
npm install <pkg> --workspace=library-service
npm install <pkg> --workspace=api-gateway
npm install <pkg> --workspace=joylog-frontend
```

### Frontend dev commands
```bash
npm run dev   --workspace=joylog-frontend
npm run build --workspace=joylog-frontend
npm run lint  --workspace=joylog-frontend
```

---

## 5. Key implementation details (read before editing these areas)

- **API gateway proxy order matters.** In `services/api-gateway/index.ts`, the `createProxyMiddleware` calls MUST appear before any `express.json()`. Adding `express.json()` first consumes the request body stream and breaks proxied POST requests.

- **Auth flow.** The frontend stores the JWT in `localStorage`. `AuthContext` (`frontend/src/context/AuthContext.tsx`) reads it on mount, validates it against `/v1/auth/me`, and exposes `{ user, login, logout }` to the component tree. The axios instance in `frontend/src/services/api.ts` attaches the token via a request interceptor on every request.

- **One entry per game per user.** `GameEntry` has a compound unique index on `(userId, rawgGameId)`. Adding the same RAWG game twice for the same user throws a MongoDB duplicate-key error.

- **Price lookups are public.** The `/v1/library/prices` route does NOT require authentication. All other library routes do.

- **RAWG passthrough double `games`.** The gateway forwards `/v1/games/*` to `https://api.rawg.io/api`, so the URL has a double `games` segment (`/v1/games/games` → RAWG's `/games`). This is expected.

---

## 6. Tests

There is no global test folder: **each service has its own `tests/` folder**, auto-discovered by its runner.

- Backend (`auth-service`, `library-service`): **Jest + Supertest + `mongodb-memory-server`** — no real MongoDB or Docker needed.
- Frontend: **Vitest + Testing Library + jsdom**. Setup file `frontend/vitest.setup.ts` imports `@testing-library/jest-dom/vitest`. Use `vi.mocked()` (not `jest.mocked()`).

Run them:
```bash
npm test --workspace=auth-service
npm test --workspace=library-service
npm test --workspace=joylog-frontend          # watch mode
npm run test:coverage --workspace=joylog-frontend
```

Single frontend test file:
```bash
npx vitest run frontend/tests/LoginPage.spec.tsx
```

Backend test pattern (Jest + Supertest + in-memory Mongo):
```ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});
```

No registration needed — drop a `*.test.ts` into the service's `tests/` folder and Jest picks it up.

> Note: `mongodb-memory-server` downloads/runs a `mongod` binary, which needs a glibc-based environment. If you run tests inside a container, use a Debian-based Node image (e.g. `node:20-bookworm`), not Alpine.

---

## 7. Workflow & branching conventions

- `main` — production / final delivery. **Protected.**
- `develop` — integration branch. **Protected.** New work merges here first.
- `feature/<name>` — one branch per feature, created from `develop` (e.g. `feature/social-follow`).
- `fix/<name>` or `chore/<name>` — for targeted fixes or maintenance (e.g. `chore/api-versioning`).

**Protection rules on `main` and `develop`:**
- No direct pushes — everything enters via Pull Request.
- At least **1 approval** from another collaborator before merging.
- **CI status checks must be green** before merging.

Typical flow:
```bash
git checkout develop
git pull
git checkout -b feature/whatever
# ...changes, commits...
git push -u origin feature/whatever
# open PR: feature/whatever → develop, wait for review + green CI, then merge
```

If two people work on the same feature in different areas (e.g. frontend vs backend), prefer **separate branches** (`feature/x-frontend`, `feature/x-backend`) merging to `develop` independently, rather than sharing one branch.

**Agent conventions:** present a short plan and get approval before writing/editing files; keep PR bodies short, no emojis, no auto-generated footer.

---

## 8. CI/CD — GitHub Actions

Single workflow: `.github/workflows/ci.yml`, triggered on every `push` and `pull_request` against `main` or `develop`.

**Job `test`:**
1. `npm install` (root, installs all workspaces)
2. `npm test --workspace=ai-service`
3. `npm test --workspace=auth-service`
4. `npm test --workspace=library-service`
5. `npm test --workspace=joylog-frontend` (Vitest)
6. `npm run lint --workspace=joylog-frontend` (ESLint)
7. `npm run build --workspace=joylog-frontend` (TypeScript + Vite build)

**Job `docker`** (runs after `test`, only if it passes):
- Creates a `.env` with placeholder values (`ci_placeholder`) — never uses real secrets in CI.
- `docker compose build` — verifies all images compile.

If any step fails, the PR stays blocked by branch protection until it's fixed and re-pushed.

---

## 9. Environment variables

Required in `.env` at the repo root (gitignored, **never committed**) for `docker compose up --build`:

```
RAWG_API_KEY=...   # injected by the gateway into all /v1/games/* requests
ITAD_API_KEY=...   # used by library-service for price lookups
JWT_SECRET=...     # auth-service token signing
GEMINI_API_KEY=... # only if working on the AI feature
VITE_API_URL=...   # frontend axios base URL (defaults to http://localhost:3000)
```

Ask the project owner for real keys privately — they are never shared in commits or PRs.

---

## 10. Requirements & features checklist

Complete checklist of project requirements and features with their implementation status. `true` = implemented and present in the codebase; `false` = not implemented. Derived from the actual service routes, controllers and frontend pages on `develop`.

### Authentication & users
| Feature | Status |
|---|---|
| User registration | `true` |
| Login with JWT | `true` |
| Get own profile (`/v1/auth/me`) | `true` |
| Update own profile (bio, favorite games, avatar) | `true` |
| Search users by username | `true` |
| Public user profiles | `true` |
| Follow / unfollow users | `true` |
| Followers & following lists | `true` |
| Password reset / forgot password | `false` |
| Email verification | `false` |

### Game library
| Feature | Status |
|---|---|
| Add a game to the library | `true` |
| List library filtered by status (playing / completed / dropped / wishlist) | `true` |
| Update an entry (status, rating, hours, review logs) | `true` |
| Delete an entry | `true` |
| One entry per game per user (unique `(userId, rawgGameId)` index) | `true` |
| Look up an entry by RAWG id | `true` |
| Personal aggregate stats | `true` |
| Another user's public stats | `true` |

### Reviews & social interaction
| Feature | Status |
|---|---|
| Write reviews (review logs) | `true` |
| Community reviews per game | `true` |
| Like / unlike reviews | `true` |
| Comments on reviews | `true` |
| Activity feed of followed users | `true` |
| Games in common with another user | `true` |
| Real-time notifications | `false` |

### Game lists
| Feature | Status |
|---|---|
| Create / update / delete lists | `true` |
| Public & private lists | `true` |
| Add / remove games in a list | `true` |
| Collaborative lists (add / remove collaborators) | `true` |

### External integrations
| Feature | Status |
|---|---|
| RAWG game search & details (gateway proxy, key injected) | `true` |
| ITAD live price lookup (public, no auth) | `true` |
| AI game recommendations (Gemini via `ai-service`) | `true` |

### Platform & infrastructure
| Feature | Status |
|---|---|
| API gateway reverse proxy | `true` |
| API versioning under `/v1` | `true` |
| JWT auth middleware (+ optional auth for public-with-context routes) | `true` |
| Docker Compose orchestration (dev & prod) | `true` |
| nginx reverse proxy + SPA serving | `true` |
| Cloudflare tunnel deployment | `true` |
| CI pipeline (tests + lint + build + docker build) | `true` |
