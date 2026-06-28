# Deployment Plan — JoyLog (Home Server + Cloudflare Tunnel)

## Goal

Deploy JoyLog on a home server and expose it publicly via a Cloudflare Tunnel, using the own domain. Demonstrate simultaneous access from 3 devices for the class submission.

---

## Zero-to-Working: Dev Setup Guide

Step-by-step instructions to run JoyLog locally for development.

### Prerequisites

- **Docker** and **Docker Compose** (v2) installed
- **Git** installed
- API keys for RAWG, ITAD, Gemini AI-Service

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/angeelpm/isi-JoyLog.git
cd isi-JoyLog
```

---

### Step 2 — Create the `.env` file

```env
RAWG_API_KEY=<your_rawg_api_key>
ITAD_API_KEY=<your_itad_api_key>
GEMINI_API_KEY=<your_gemini_api_key>
JWT_SECRET=any_random_string_for_local
VITE_API_URL=http://localhost:3000
```

> For dev, `VITE_API_URL` must point to `localhost:3000` (the API gateway on your machine).

---

### Step 3 — Start the dev stack

```bash
make dev-up
```

Builds all images and starts them in the background. First run takes ~2-3 minutes while Docker downloads base images and installs npm packages.

Services started:
| Container | Port | What it is |
|---|---|---|
| `joylog_frontend` | http://localhost:5173 | React app (Vite dev server, hot reload) |
| `joylog_api_gateway` | http://localhost:3000 | API gateway |
| `joylog_auth_service` | http://localhost:3001 | Auth service |
| `joylog_library_service` | http://localhost:3002 | Library service |
| `joylog_ai_service` | http://localhost:3003 | AI service |
| `joylog_mongo` | localhost:27018 | MongoDB |

---

### Step 4 — Verify everything is running

```bash
make dev-ps     # all containers should show "Up"
make dev-logs   # follow live logs from all services
```

Then open **http://localhost:5173** in a browser.

---

### Step 5 — Rebuild after code changes

Most code changes are picked up automatically by the Vite dev server (hot reload). If you change a backend service or add new npm packages, rebuild:

```bash
make dev-rebuild
# Equivalent to: make dev-down && make dev-up
```

---

### Stop the stack

```bash
make dev-down
```

---

### Troubleshooting (dev)

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend container exits immediately | Wrong Dockerfile stage (nginx instead of node) | Confirm `docker-compose.yml` frontend build has `target: builder` |
| API calls return 401 | JWT_SECRET missing or wrong | Check `.env` has `JWT_SECRET` set |
| Port 5173 already in use | Another process using the port | Stop it or change the port in `docker-compose.yml` |
| Changes not reflected after edit | Backend service needs rebuild | `make dev-rebuild` |
| MongoDB connection refused | Mongo container not ready yet | Wait a few seconds and retry; or check `make dev-logs` |

---

## Zero-to-Working: Production Setup Guide

Step-by-step instructions to go from a fresh clone to a publicly accessible JoyLog instance.

### Prerequisites

Before starting, make sure the server has:

- **Docker** and **Docker Compose** (v2) installed
- **Git** installed
- A **Cloudflare account** with a domain added (Zero Trust plan — free tier works)
- API keys for: RAWG, IsThereAnyDeal (ITAD), Gemini (AI service), and a strong random string for JWT_SECRET

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/angeelpm/isi-JoyLog.git
cd isi-JoyLog
```

---

### Step 2 — Create the `.env` file

Copy the template and fill in the real values:

```bash
cp .env.example .env   # or create it from scratch
```

`.env` must contain (at repo root):

```env
RAWG_API_KEY=<your_rawg_api_key>
ITAD_API_KEY=<your_itad_api_key>
GEMINI_API_KEY=<your_gemini_api_key>
JWT_SECRET=<long_random_string>
VITE_API_URL=https://joylog.deushicest.org
```

> `VITE_API_URL` is baked into the React bundle at build time — it must be the public URL of the site.

---

### Step 3 — Set up the Cloudflare Tunnel (one-time)

This step is only needed on a fresh machine. If `cloudflare/credentials.json` already exists, skip to Step 4.

**3a. Install `cloudflared`**

```bash
# Debian/Ubuntu
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared
```

**3b. Log in to Cloudflare**

```bash
cloudflared tunnel login
# Opens a browser. Authorize the domain joylog.deushicest.org.
```

**3c. The tunnel already exists** — just copy its credentials:

```bash
# Tunnel ID: 367a8cb0-247d-41db-b762-be931f221040
cp ~/.cloudflared/367a8cb0-247d-41db-b762-be931f221040.json cloudflare/credentials.json
```

> If you need to create a new tunnel from scratch: `cloudflared tunnel create joylog`
> Then update `cloudflare/config.yml` with the new tunnel UUID and add the CNAME in Cloudflare DNS.

**3d. Verify the credentials file is in place:**

```bash
make check
# Should print: OK: .env and cloudflare/credentials.json present.
```

---

### Step 4 — Build and start the production stack

```bash
make prod-up
```

This runs `docker compose -f docker-compose.prod.yml up --build -d` — builds all images and starts them in the background.

First build takes ~2-3 minutes. Subsequent builds use Docker cache and are much faster.

---

### Step 5 — Verify everything is running

```bash
make prod-ps       # all containers should show "Up"
make prod-logs     # follow live logs from all services
make tunnel-logs   # check the Cloudflare tunnel specifically
```

Expected output from `tunnel-logs` when healthy:
```
INF Connection ... registered connIndex=0 ...
INF Connection ... registered connIndex=1 ...
```

Then open **https://joylog.deushicest.org** in a browser. The app should load.

---

### Step 6 — Re-deploy after code changes

```bash
git pull
make prod-rebuild
# Equivalent to: make prod-down && make prod-up
```

---

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `make check` fails on credentials | `cloudflare/credentials.json` missing | Repeat Step 3c |
| `make check` fails on `.env` | `.env` not created | Repeat Step 2 |
| Tunnel logs show `failed to authenticate` | Wrong credentials file (wrong tunnel ID) | Re-run Step 3b–3c |
| App loads but API calls fail (404/502) | `VITE_API_URL` wrong or nginx misconfigured | Check `.env` has correct URL, then `make prod-rebuild` |
| Container exits immediately | Missing env variable | `make prod-logs` to find which service, check `.env` |
| Port 80 already in use | Another service on the host uses port 80 | Stop it, or change the port mapping in `docker-compose.prod.yml` |

---

## Architecture

```
Internet
    ↓
Cloudflare DNS  (joylog.yourdomain.com)
    ↓  HTTPS — certificate handled by Cloudflare
cloudflared container
    ↓  HTTP internal
frontend container — nginx :80
    ├── /v1/*  →  proxy_pass  api-gateway:3000
    └── /*      →  React SPA static files (built dist/)

Internal Docker network (not exposed externally):
  api-gateway:3000  →  auth-service:3001
                    →  library-service:3002
                    →  ai-service:3003
                    →  RAWG external API
  auth-service / library-service  →  mongodb:27017
```

---

## Branch strategy

```
main
 └── develop
      └── chore/production-deploy   ← all deployment work goes here
```

### Steps

```bash
git checkout develop
git pull
git checkout -b chore/production-deploy
# ... implement all files below ...
git push -u origin chore/production-deploy
# Open PR: chore/production-deploy → develop
# CI passes + 1 approval → merge to develop
# Open PR: develop → main for final delivery
```

---

## Files to create

### `.dockerignore` (repo root)

Prevents `node_modules`, `.env`, `.git`, and `frontend/dist` from being sent to the Docker build context.

### `nginx/nginx.conf`

nginx routing rules:
- `location /v1/` — reverse proxy to `http://api-gateway:3000`, forwarding real IP headers
- `location /` — serve React SPA from `/usr/share/nginx/html`, with `try_files` fallback to `index.html` for client-side routing

### `docker-compose.prod.yml`

Production compose file. Key differences from `docker-compose.yml`:

| Aspect | Dev | Prod |
|---|---|---|
| Source code | bind-mounted from host | baked into image via `COPY` |
| Commands | `npm run dev` (from compose) | `CMD` set in each Dockerfile |
| Frontend | Vite dev server | nginx serving built `dist/` |
| Ports exposed | all services on host | only `frontend:80` (via cloudflared) |
| Restart policy | none | `unless-stopped` on all services |
| MongoDB port | `27018:27017` | not exposed externally |
| Extra services | — | `cloudflared` |

Services in prod compose:
- `mongodb` — named volume for data persistence, no host port
- `auth-service` — env: `MONGODB_URI`, `JWT_SECRET`, `PORT=3001`
- `library-service` — env: `MONGODB_URI`, `JWT_SECRET`, `ITAD_API_KEY`, `PORT=3002`
- `ai-service` — env: `GEMINI_API_KEY`, `PORT=3003`
- `api-gateway` — env: `RAWG_API_KEY`, `PORT=3000`
- `frontend` — build arg: `VITE_API_URL` (baked into the JS bundle at build time)
- `cloudflared` — mounts `./cloudflare/` read-only, runs the tunnel

### `cloudflare/config.yml`

Tunnel configuration template:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: joylog.yourdomain.com
    service: http://frontend:80
  - service: http_status:404
```

### `cloudflare/.gitignore`

Ignores `credentials.json` — the secret file generated by Cloudflare, never committed.

---

## Files to modify

### `services/api-gateway/Dockerfile`

Add after `npm install`:
```
COPY services/api-gateway/ ./services/api-gateway/
COPY shared/ ./shared/
CMD ["npm", "run", "dev", "--workspace=api-gateway"]
```

### `services/auth-service/Dockerfile`

```
COPY services/auth-service/ ./services/auth-service/
COPY shared/ ./shared/
CMD ["npm", "run", "dev", "--workspace=auth-service"]
```

### `services/library-service/Dockerfile`

```
COPY services/library-service/ ./services/library-service/
COPY shared/ ./shared/
CMD ["npm", "run", "dev", "--workspace=library-service"]
```

### `services/ai-service/Dockerfile`

```
COPY services/ai-service/ ./services/ai-service/
COPY shared/ ./shared/
CMD ["npm", "run", "dev", "--workspace=ai-service"]
```

### `frontend/Dockerfile`

Replace the single-stage dev Dockerfile with a two-stage build:

**Stage 1 — builder (node:20-alpine)**
- Copy workspace manifests + `npm install`
- Copy all source (`COPY . .`)
- Accept `VITE_API_URL` as build arg and set as env var
- Run `npm run build --workspace=joylog-frontend` → outputs to `frontend/dist/`

**Stage 2 — serve (nginx:alpine)**
- Copy `frontend/dist/` from builder to `/usr/share/nginx/html`
- Copy `nginx/nginx.conf` to `/etc/nginx/conf.d/default.conf`
- Expose port 80

---

## One-time manual setup on the home server

These steps are done once before the first deploy, not automated:

1. Install `cloudflared`:
   ```bash
   # Debian/Ubuntu
   curl -L https://pkg.pkgr.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
   # or just download the binary from cloudflare.com/products/tunnel
   ```

2. Authenticate:
   ```bash
   cloudflared tunnel login
   ```

3. Create the tunnel (once):
   ```bash
   cloudflared tunnel create joylog
   # Outputs: Tunnel UUID and writes ~/.cloudflared/<UUID>.json
   ```

4. Copy the credentials file into the repo:
   ```bash
   cp ~/.cloudflared/<UUID>.json cloudflare/credentials.json
   ```

5. Edit `cloudflare/config.yml` — fill in the real tunnel UUID and your domain.

6. Add a CNAME record in Cloudflare DNS:
   - Name: `joylog` (or whatever subdomain)
   - Target: `<TUNNEL_UUID>.cfargotunnel.com`
   - Proxy status: Proxied (orange cloud)

7. Create `.env` at repo root with real values:
   ```
   RAWG_API_KEY=...
   ITAD_API_KEY=...
   GEMINI_API_KEY=...
   JWT_SECRET=...
   VITE_API_URL=https://joylog.yourdomain.com
   ```

---

## Deploy commands (on the home server)

```bash
# First deploy or after code changes
docker compose -f docker-compose.prod.yml up --build -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml down
```

---

## Monitoring (basic)

For the class demo, three lightweight options:

| Tool | What it monitors | Setup |
|---|---|---|
| `docker compose logs -f` | All service logs live | Already available |
| `docker ps` | Container health / uptime | Already available |
| UptimeRobot (free) | Public URL uptime, alerts by email | Register at uptimerobot.com, add `https://joylog.yourdomain.com` as HTTP monitor |

---

## CI impact

The existing CI workflow (`.github/workflows/ci.yml`) already runs `docker compose build` on every PR. No changes needed — the prod compose is separate and only used on the home server.
