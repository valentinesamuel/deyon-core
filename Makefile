# Load .env if it exists (secrets available to all targets without CLI args)
-include .env
export

COMPOSE_DEV       := docker compose -f docker-compose.yml
COMPOSE_ANALYTICS := docker compose -f docker-compose.analytics.yml
COMPOSE_SECURITY  := docker compose -f docker-compose.security.yml

.PHONY: dev dev-up dev-down dev-logs dev-restart \
        analytics analytics-up analytics-down analytics-logs analytics-restart \
        security security-up security-down security-logs security-restart security-scan \
        security-trivy security-renovate \
        docker-build \
        full full-down help

# ── Dev (postgres, redis, mailpit) ────────────────────────────────────────────

dev: dev-up

dev-up:
	$(COMPOSE_DEV) up -d

dev-down:
	$(COMPOSE_DEV) down

dev-logs:
	$(COMPOSE_DEV) logs -f

dev-restart:
	$(COMPOSE_DEV) restart

# ── Analytics (metabase) ──────────────────────────────────────────────────────

analytics: analytics-up

analytics-up:
	$(COMPOSE_ANALYTICS) up -d

analytics-down:
	$(COMPOSE_ANALYTICS) down

analytics-logs:
	$(COMPOSE_ANALYTICS) logs -f

analytics-restart:
	$(COMPOSE_ANALYTICS) restart

# ── Security (sonarqube + trivy + renovate) ───────────────────────────────────

security: security-up

security-up:
	$(COMPOSE_SECURITY) up -d

security-down:
	$(COMPOSE_SECURITY) down

security-logs:
	$(COMPOSE_SECURITY) logs -f

security-restart:
	$(COMPOSE_SECURITY) restart

security-scan:
	sonar \
	  -Dsonar.host.url=http://localhost:9000 \
	  -Dsonar.token=$(SONAR_TOKEN) \
	  -Dsonar.projectKey=deyon-core

security-trivy:
	@echo "[Trivy] Scanning source code (vuln + misconfig)..."
	trivy fs --scanners vuln,misconfig --severity HIGH,CRITICAL --skip-dirs node_modules,dist --exit-code 1 .
	@echo "[Trivy] Scanning Dockerfile..."
	trivy config --severity HIGH,CRITICAL --exit-code 1 Dockerfile

security-renovate: security-trivy security-scan
	@chmod +x scripts/renovate-local.sh && ./scripts/renovate-local.sh

# ── Docker ────────────────────────────────────────────────────────────────────

docker-build:
	docker build \
	  --build-arg APP_PORT=$(APP_PORT) \
	  --build-arg NODE_ENV=$(NODE_ENV) \
	  -t deyon-be \
	  .

# ── Full (everything, ordered: dev → analytics → security) ───────────────────

full: dev-up analytics-up security-up

full-down: security-down analytics-down dev-down

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Dev  (postgres · redis · mailpit)"
	@echo "  dev               Start dev services"
	@echo "  dev-down          Stop dev services"
	@echo "  dev-logs          Tail dev logs"
	@echo "  dev-restart       Restart dev services"
	@echo ""
	@echo "Analytics  (metabase → http://localhost:3001)"
	@echo "  analytics         Start Metabase"
	@echo "  analytics-down    Stop Metabase"
	@echo "  analytics-logs    Tail Metabase logs"
	@echo "  analytics-restart Restart Metabase"
	@echo ""
	@echo "Security  (sonarqube → http://localhost:9000)"
	@echo "  security          Start SonarQube server"
	@echo "  security-down     Stop SonarQube"
	@echo "  security-logs     Tail SonarQube logs"
	@echo "  security-restart  Restart SonarQube"
	@echo "  security-scan     Run sonar-scanner against src/ (requires SONAR_TOKEN in .env)"
	@echo "  security-trivy    Run Trivy SAST + Dockerfile scan (HIGH/CRITICAL)"
	@echo "  security-renovate Full security scan (Trivy + SonarQube) then open Renovate PRs"
	@echo ""
	@echo "Docker"
	@echo "  docker-build      Build production image (APP_PORT + NODE_ENV from .env)"
	@echo ""
	@echo "Full"
	@echo "  full              Start everything (dev → analytics → security)"
	@echo "  full-down         Stop everything"
	@echo ""
