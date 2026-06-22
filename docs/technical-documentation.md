# JoyLog — Technical Documentation

Technical reference for developers working on JoyLog: architecture, services, data
models, the HTTP API, local development, testing, CI/CD, and deployment.

> For end-user instructions see [`user-manual.en.md`](./user-manual.en.md) /
> [`user-manual.es.md`](./user-manual.es.md). For deployment specifics see
> [`deployment-plan.md`](./deployment-plan.md).

---

## 1. Overview & tech stack

JoyLog is a game diary / tracker (Letterboxd for video games). Users track their library
by status, write dated review logs, check live prices, follow other players, and build
collaborative lists.

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Router, Axios, lucide-react |
| Backend | Node.js, Express 4, TypeScript (`ts-node-dev`) |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (Bearer tokens), bcryptjs password hashing |
| External APIs | RAWG (game metadata), IsThereAnyDeal / ITAD (prices), Google Gemini (AI recommendations) |
| Tests | Jest + Supertest + `mongodb-memory-server` (backend), Vitest + Testing Library (frontend) |
| Orchestration | Docker Compose (dev + prod), nginx (prod static serving), Cloudflare Tunnel (prod ingress) |
| CI/CD | GitHub Actions |

The repository is an **npm workspaces monorepo**: all services and the frontend share a
single root `node_modules`. Shared TypeScript types live in
`shared/types/interfaces.ts` and are the single source of truth across frontend and
backend.

---

## 2. Architecture

```
                       ┌─────────────┐
   Browser  ───────▶   │  frontend   │  React SPA (dev: Vite :5173 / prod: nginx :80)
                       └──────┬──────┘
                              │  /api/*
                       ┌──────▼──────────┐
                       │   api-gateway   │  :3000  reverse proxy
                       └──┬───┬───┬───┬──┘
        /api/auth ────────┘   │   │   └──────── /api/games  ──▶  RAWG (external, key injected)
                              │   │
        /api/library ─────────┘   └──── /api/ai
                 │                        │
        ┌────────▼───────┐       ┌────────▼───────┐       ┌────────────────┐
        │  auth-service  │       │ library-service│       │   ai-service   │
        │     :3001      │       │     :3002      │       │     :3003      │
        └───────┬────────┘       └───────┬────────┘       └───────┬────────┘
                │                         │                       │
                └─────────┬───────────────┘                 Google Gemini
                          ▼                                    (external)
                    ┌───────────┐
                    │  MongoDB  │  (auth + library share one DB: `joylog`)
                    └───────────┘
```

### Request flow

1. The frontend sends all requests to the API gateway (`VITE_API_URL`, default
   `http://localhost:3000`).
2. The gateway routes by path prefix and **strips the prefix** before forwarding:
   - `/api/auth/*`   → `auth-service:3001` (prefix removed)
   - `/api/library/*` → `library-service:3002` (prefix removed)
   - `/api/ai/*`     → `ai-service:3003` (prefix removed)
   - `/api/games/*`  → `https://api.rawg.io/api` (prefix removed, `key` query param injected)
3. Services validate the JWT (`Authorization: Bearer <token>`) on protected routes.

> ⚠️ **Gateway gotcha:** in `services/api-gateway/index.ts`, the `createProxyMiddleware`
> calls must appear **before** any `express.json()`. Parsing the body first consumes the
> request stream and breaks proxied POST/PUT requests. The gateway intentionally does not
> use `express.json()`.

### Authentication flow

- On register/login, `auth-service` returns `{ message, token, user }`. The frontend
  stores the JWT in `localStorage`.
- `AuthContext` (`frontend/src/context/AuthContext.tsx`) reads the token on mount and
  validates it against `GET /api/auth/me`.
- The Axios instance (`frontend/src/services/api.ts`) attaches the token via a request
  interceptor on every call.
- Backend middleware: `authMiddleware` (rejects without a valid token) and
  `optionalAuthMiddleware` (attaches the user if a token is present, but allows anonymous
  access — used for public-but-personalized endpoints like community reviews).

---

## 3. Services

### api-gateway (`:3000`)
Reverse proxy and single public entry point. No database. Injects the RAWG API key into
`/api/games/*` requests. CORS is restricted to the frontend origins. Exposes
`GET /health`.
- **Env:** `PORT` (3000), `RAWG_API_KEY`
- **Entry:** `services/api-gateway/index.ts`

### auth-service (`:3001`)
User registration/login, JWT issuance, profiles, and the **social graph** (follow /
followers / following, user search, public profiles).
- **Env:** `PORT` (3001), `MONGODB_URI`, `JWT_SECRET`
- **Models:** `User`

### library-service (`:3002`)
The core domain service: game library CRUD, dated review logs, stats, ITAD price lookups,
plus social interactions on reviews (likes, comments), the activity feed, "games in
common", and collaborative lists.
- **Env:** `PORT` (3002), `MONGODB_URI`, `JWT_SECRET`, `ITAD_API_KEY`
- **Models:** `GameEntry`, `GameList`, `Comment`, `Like`
- **Controllers:** `libraryController`, `listController`, `priceController`

### ai-service (`:3003`)
Stateless service that proxies to Google Gemini (`gemini-2.5-flash`) to generate game
recommendations. Rate-limited to **5 requests/minute** per client. No database.
- **Env:** `PORT` (3003), `GEMINI_API_KEY`
- **Entry:** `services/ai-service/src/routes/aiRoutes.ts`

---

## 4. Data models

All models use Mongoose with `timestamps: true` unless noted (`Comment` and `Like` set
`createdAt` manually).

### User (auth-service)
| Field | Type | Notes |
|---|---|---|
| `username` | String | required, **unique** |
| `email` | String | required, **unique** |
| `passwordHash` | String | required (bcrypt) |
| `avatarUrl` | String | default `''` |
| `bio` | String | default `''` |
| `favoriteGames` | `[{ rawgGameId, title, coverImage }]` | embedded |
| `followers` | `[ObjectId → User]` | default `[]` |
| `following` | `[ObjectId → User]` | default `[]` |

### GameEntry (library-service)
One library item per user per game.
| Field | Type | Notes |
|---|---|---|
| `userId` | String | required, indexed |
| `username` | String | optional (denormalized for feed/reviews) |
| `rawgGameId` | Number | required |
| `title` | String | required |
| `coverImage` | String | default `''` |
| `status` | enum | `playing` \| `completed` \| `backlog` \| `dropped` \| `wishlist` (default `wishlist`) |
| `rating` | Number | 1–10 |
| `review` | String | legacy single review (default `''`) |
| `reviewLogs` | `[{ text, rating?, hoursPlayed?, createdAt }]` | dated review entries |
| `hoursPlayed` | Number | default 0, min 0 |
| `platforms` | `[String]` | |
| `genres` | `[String]` | |
| `startedAt` / `completedAt` | Date | optional |

**Constraint:** compound unique index on `{ userId: 1, rawgGameId: 1 }` — a user cannot add
the same RAWG game twice (duplicate insert throws a Mongo E11000 error).

### GameList (library-service)
| Field | Type | Notes |
|---|---|---|
| `ownerId` | String | required |
| `ownerUsername` | String | optional |
| `title` | String | required |
| `description` | String | optional |
| `isPublic` | Boolean | default `false` |
| `collaborators` | `[{ userId, username }]` | users who can edit |
| `games` | `[{ rawgGameId, title, coverImage }]` | |

### Comment (library-service)
| Field | Type | Notes |
|---|---|---|
| `commenterId` | String | required |
| `username` | String | required |
| `gameEntryId` | String | required |
| `reviewLogId` | String | required |
| `text` | String | required |
| `createdAt` | Date | default now |

Index on `reviewLogId`.

### Like (library-service)
| Field | Type | Notes |
|---|---|---|
| `likerId` | String | required |
| `gameEntryId` | String | required |
| `reviewLogId` | String | required |
| `createdAt` | Date | default now |

Indexes: unique `{ likerId, reviewLogId }` (one like per user per review log) and
`{ reviewLogId }`.

---

## 5. API reference

All paths are **public-facing** (through the gateway). The gateway strips the
`/api/<service>` prefix before forwarding. **Auth** column: 🔒 requires a valid JWT,
🔓 public, ◐ optional (personalizes response if a token is present).

### 5.1 Auth & profile — `auth-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| POST | `/api/auth/register` | 🔓 | Create account |
| POST | `/api/auth/login` | 🔓 | Log in |
| GET | `/api/auth/me` | 🔒 | Current user's profile |
| PUT | `/api/auth/me` | 🔒 | Update own profile (bio, favoriteGames, …) |

**POST `/api/auth/register`** — body `{ username, email, password }` → `201`
`{ message, token, user }`.

**POST `/api/auth/login`** — body `{ email, password }` → `200` `{ message, token, user }`.

**PUT `/api/auth/me`** — body any subset of `{ bio, favoriteGames, avatarUrl }` → updated
`{ user }`.

### 5.2 Social graph — `auth-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| GET | `/api/auth/users/search?q=<term>` | ◐ | Search users by username → `{ users: [{ _id, username, avatarUrl? }] }` |
| GET | `/api/auth/users/:username` | ◐ | Public profile → `{ _id, username, bio, followersCount, followingCount, isFollowing, favoriteGames }` |
| POST | `/api/auth/users/:userId/follow` | 🔒 | Follow a user |
| DELETE | `/api/auth/users/:userId/follow` | 🔒 | Unfollow a user |
| GET | `/api/auth/users/:userId/followers` | 🔒 | List followers |
| GET | `/api/auth/users/:userId/following` | 🔒 | List following → `[{ _id, username }]` |

> Route order matters: `/users/search` is declared before `/users/:username` so the literal
> path isn't captured as a username param.

### 5.3 Library & stats — `library-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| GET | `/api/library?status=<all\|status>` | 🔒 | List the user's entries → `{ entries }` |
| POST | `/api/library` | 🔒 | Add a game entry → created entry |
| PUT | `/api/library/:id` | 🔒 | Update an entry (status/rating/hours/reviewLogs) |
| DELETE | `/api/library/:id` | 🔒 | Remove an entry |
| GET | `/api/library/stats` | 🔒 | Own aggregate stats → `{ stats }` |
| GET | `/api/library/stats/public/:userId` | 🔓 | Another user's stats → `{ stats }` |

**Stats shape** (`ILibraryStats`): `{ total, playing, completed, backlog, dropped,
wishlist, totalHoursPlayed, avgRating? }`.

**POST `/api/library`** — body (`IGameEntryInput`):
`{ rawgGameId, title, coverImage, status, rating?, hoursPlayed?, platforms?, genres? }`.
Adding a duplicate game returns a duplicate-key error.

### 5.4 Reviews, likes & comments — `library-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| GET | `/api/library/reviews/:rawgGameId` | ◐ | Community reviews for a game → `{ reviews }` (each: `ICommunityReview` with `isCurrentUser`, `likeCount`, `isLikedByMe`, `commentCount`) |
| POST | `/api/library/likes` | 🔒 | Like a review log — body `{ gameEntryId, reviewLogId }` |
| DELETE | `/api/library/likes/:reviewLogId` | 🔒 | Unlike a review log |
| GET | `/api/library/comments/:reviewLogId` | 🔓 | Comments for a review log → `{ comments }` |
| POST | `/api/library/comments` | 🔒 | Add a comment — body `{ gameEntryId, reviewLogId, text }` → `{ comment }` |
| DELETE | `/api/library/comments/:commentId` | 🔒 | Delete own comment |

### 5.5 Feed & discovery — `library-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| GET | `/api/library/feed?userIds=<csv>&page=<n>` | 🔒 | Activity feed of the given users → `{ items, page, hasMore }` |
| GET | `/api/library/common/:otherUserId` | 🔒 | Games in common with another user → `{ commonGames }` |

**Feed item** (`FeedItem`): `{ username, rawgGameId, title, coverImage?, type:
'review'|'completed', text?, rating?, createdAt, gameEntryId, reviewLogId? }`.

### 5.6 Collaborative lists — `library-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| GET | `/api/library/lists/mine` | 🔒 | Lists owned by or shared with the user |
| GET | `/api/library/lists/user/:userId` | 🔓 | A user's public lists |
| GET | `/api/library/lists/:listId` | ◐ | One list (403 if private & not a member) |
| POST | `/api/library/lists` | 🔒 | Create — body `{ title, description?, isPublic }` |
| PUT | `/api/library/lists/:listId` | 🔒 | Update list metadata |
| DELETE | `/api/library/lists/:listId` | 🔒 | Delete (owner only) |
| POST | `/api/library/lists/:listId/games` | 🔒 | Add game — body `{ rawgGameId, title, coverImage? }` |
| DELETE | `/api/library/lists/:listId/games/:rawgGameId` | 🔒 | Remove game |
| POST | `/api/library/lists/:listId/collaborators` | 🔒 | Add collaborator — body `{ userId, username }` |
| DELETE | `/api/library/lists/:listId/collaborators/:userId` | 🔒 | Remove collaborator |

All list mutations return `{ list }`. Adding/removing games is allowed for the owner and
collaborators; managing collaborators and deletion are owner-only.

### 5.7 Prices — `library-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| GET | `/api/library/prices?title=<game title>` | 🔓 | Best current price via ITAD |

This is the **only** library route that does not require authentication.

### 5.8 AI recommendations — `ai-service`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| POST | `/api/ai/recommendations` | 🔓 | Gemini-generated recommendations (rate-limited 5/min) |

**Body:** `{ mode: 'theme' | 'library', theme?, userStats?: { topGenres?, recentGames?,
totalCompleted? } }`. **Response:** a JSON array of exactly 5 objects
`{ title, genre, reason, price }`. Errors: `400` invalid body, `500` missing
`GEMINI_API_KEY` / parse failure, `502` upstream Gemini error.

### 5.9 RAWG proxy — `api-gateway`

| Method | Path | Auth | Purpose |
|---|---|:--:|---|
| GET | `/api/games/games?search=&genres=&page=` | 🔓 | Search games (RAWG passthrough, key injected) |
| GET | `/api/games/games/:id` | 🔓 | Game details |

The gateway forwards anything under `/api/games` to `https://api.rawg.io/api`, so the
double `games` segment is expected (`/api/games` → RAWG base, then `/games` is RAWG's
endpoint).

---

## 6. Shared types

`shared/types/interfaces.ts` is the **single source of truth** for cross-cutting types:
`GameStatus`, `IUser`, `IGameEntry`, `IGameEntryInput`, `IGame` (RAWG shape),
`IAuthResponse`, `ILibraryStats`, `ICommunityReview`, `ILike`, `IPublicProfile`,
`IFollowEntry`. Both frontend and backend import from here — update it rather than
redefining types locally.

---

## 7. Local development & testing

### Run everything (Docker)
```bash
docker compose up           # dev stack: all services + mongo, hot-reload via bind mounts
docker compose up --build   # rebuild after Dockerfile/dependency changes
```
Dev ports: gateway `3000`, auth `3001`, library `3002`, ai `3003`, frontend `5173`,
mongo `27018→27017`.

A `Makefile` wraps the common flows: `make dev-up`, `make dev-down`, `make prod-up`,
`make prod-down`, `make help` (see `Makefile`).

### Install packages (always target a workspace)
```bash
npm install <pkg> --workspace=auth-service
npm install <pkg> --workspace=library-service
npm install <pkg> --workspace=api-gateway
npm install <pkg> --workspace=joylog-frontend
```

### Tests
Each backend service auto-discovers tests under its own `tests/` folder (Jest +
Supertest + `mongodb-memory-server` — no real Mongo needed). The frontend uses Vitest +
Testing Library (jsdom; setup in `frontend/vitest.setup.ts`; mock with `vi.mocked()`).
```bash
npm test --workspace=auth-service
npm test --workspace=library-service
npm run test --workspace=joylog-frontend           # watch
npm run test:coverage --workspace=joylog-frontend  # coverage
npx vitest run frontend/tests/LoginPage.spec.tsx    # single file
```

---

## 8. CI/CD

Single workflow: `.github/workflows/ci.yml`, triggered on every push and PR to `main` or
`develop`.

**`test` job:** root `npm install` → `npm test` for auth-service, library-service, and
joylog-frontend → `npm run lint --workspace=joylog-frontend` → `npm run build
--workspace=joylog-frontend`.

**`docker` job** (runs only if `test` passes): writes a placeholder `.env` (never real
secrets) and runs `docker compose build` to verify all four images compile.

Branch protection on `main`/`develop`: PR-only, ≥1 approval, green CI required.

---

## 9. Deployment

Production runs on a home server, exposed publicly via a Cloudflare Tunnel. See
[`deployment-plan.md`](./deployment-plan.md) for full setup. In brief:

- `docker-compose.prod.yml` — source baked into images (no bind mounts), `restart:
  unless-stopped`, no host ports published; the frontend is served by **nginx**
  (`nginx/nginx.conf`) which reverse-proxies `/api/` to the gateway and serves the built
  SPA. `cloudflared` provides public ingress.
- `cloudflare/config.yml` routes the public hostname → `frontend:80`; `credentials.json`
  is gitignored and must be readable by the container (`chmod 644`).
- Deploy: `make prod-up` (or `docker compose -f docker-compose.prod.yml up --build -d`).

The dev (`docker-compose.yml`) and prod (`docker-compose.prod.yml`) stacks are separate;
CI only builds the dev images.

---

## 10. Environment variables

Root `.env` (gitignored), consumed by Docker Compose:

| Variable | Used by | Purpose |
|---|---|---|
| `RAWG_API_KEY` | api-gateway | Injected into all `/api/games/*` requests |
| `ITAD_API_KEY` | library-service | IsThereAnyDeal price lookups |
| `GEMINI_API_KEY` | ai-service | Google Gemini recommendations |
| `JWT_SECRET` | auth-service, library-service | Signs/verifies JWTs (must match across both) |
| `VITE_API_URL` | frontend (build arg) | Base URL of the gateway, baked into the JS bundle |
| `MONGODB_URI` | auth-service, library-service | Mongo connection string (set in compose) |

> `JWT_SECRET` must be identical in auth-service and library-service or tokens issued by
> auth won't validate in library. In production it is set via `.env`; the dev compose uses
> a hardcoded value.
