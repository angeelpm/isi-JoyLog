# JoyLog — Docker orchestration
#
# Two stacks:
#   prod  -> docker-compose.prod.yml  (baked-in source, nginx, public via Cloudflare tunnel)
#   dev   -> docker-compose.yml       (local home/dev: bind-mounted source, ports exposed, npm run dev)

DC      := docker compose
PROD    := $(DC) -f docker-compose.prod.yml
DEV     := $(DC)

.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
.PHONY: help
help:
	@echo "JoyLog — make targets"
	@echo ""
	@echo "  Production (docker-compose.prod.yml, public via Cloudflare tunnel):"
	@echo "    make prod-up         Build + start the prod stack (detached)"
	@echo "    make prod-down       Stop and remove the prod stack"
	@echo "    make prod-rebuild    Tear down, then rebuild + start fresh"
	@echo "    make prod-logs       Follow all prod logs"
	@echo "    make prod-ps         Show prod container status"
	@echo "    make prod-restart    Restart the prod stack"
	@echo "    make tunnel-logs     Follow the cloudflared (tunnel) logs only"
	@echo ""
	@echo "  Local / dev (docker-compose.yml, ports exposed on host):"
	@echo "    make dev-up          Build + start the dev stack (detached)"
	@echo "    make dev-down        Stop and remove the dev stack"
	@echo "    make dev-rebuild     Tear down, then rebuild + start fresh"
	@echo "    make dev-logs        Follow all dev logs"
	@echo "    make dev-ps          Show dev container status"
	@echo ""
	@echo "  Helpers:"
	@echo "    make check           Verify .env and tunnel credentials exist (prereq for prod-up)"

# ---------------------------------------------------------------------------
# Pre-flight check (prod)
# ---------------------------------------------------------------------------
.PHONY: check
check:
	@test -f .env || { echo "ERROR: .env not found at repo root."; exit 1; }
	@test -f cloudflare/credentials.json || { echo "ERROR: cloudflare/credentials.json not found. Run the cloudflared tunnel setup first."; exit 1; }
	@echo "OK: .env and cloudflare/credentials.json present."

# ---------------------------------------------------------------------------
# Production stack
# ---------------------------------------------------------------------------
.PHONY: prod-up
prod-up: check
	$(PROD) up --build -d

.PHONY: prod-down
prod-down:
	$(PROD) down

.PHONY: prod-rebuild
prod-rebuild: prod-down prod-up

.PHONY: prod-logs
prod-logs:
	$(PROD) logs -f

.PHONY: prod-ps
prod-ps:
	$(PROD) ps

.PHONY: prod-restart
prod-restart:
	$(PROD) restart

.PHONY: tunnel-logs
tunnel-logs:
	$(PROD) logs -f cloudflared

# ---------------------------------------------------------------------------
# Local / dev stack
# ---------------------------------------------------------------------------
.PHONY: dev-up
dev-up:
	$(DEV) up --build -d

.PHONY: dev-down
dev-down:
	$(DEV) down

.PHONY: dev-rebuild
dev-rebuild: dev-down dev-up

.PHONY: dev-logs
dev-logs:
	$(DEV) logs -f

.PHONY: dev-ps
dev-ps:
	$(DEV) ps
