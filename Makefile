APP_NAME  = diana
GO        = go
SQLC      = sqlc
GOOSE     = goose
ENV_FILE ?= .env

# Detect Python version
PYTHON ?= $(shell \
	if [ -d "venv" ]; then echo "venv/bin/python"; \
	elif command -v python3 >/dev/null 2>&1; then echo "python3"; \
	else echo "python"; fi)

BACKEND_DIR = ./backend
MIGRATIONS_DIR = $(BACKEND_DIR)/migrations

# Load environment from .env (if present) so DB_DSN/JWT_SECRET/etc are available
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' $(ENV_FILE))
endif

.PHONY: dev air seed build lint test db_up db_down db_status sqlc tidy setup setup-admin run-dev test-db debug-neon

dev:
	cd $(BACKEND_DIR) && $(GO) run ./cmd/server

air:
	cd $(BACKEND_DIR) && air

seed:
	cd $(BACKEND_DIR) && $(GO) run ./cmd/seed

build:
	cd $(BACKEND_DIR) && $(GO) build ./...

lint:
	cd $(BACKEND_DIR) && $(GO) vet ./...
	@if command -v golangci-lint >/dev/null 2>&1; then \
		cd $(BACKEND_DIR) && golangci-lint run ./... --timeout=5m; \
	fi

test:
	cd $(BACKEND_DIR) && $(GO) test ./...

test-contract:
	cd $(BACKEND_DIR) && $(GO) test -v -run "TestContract_" ./internal/http/handlers/

db_up:
	$(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$$DB_DSN" up

db_down:
	$(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$$DB_DSN" down

db_status:
	$(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$$DB_DSN" status

sqlc:
	cd $(BACKEND_DIR) && $(SQLC) generate

tidy:
	cd $(BACKEND_DIR) && $(GO) mod tidy

# Convenience targets for helper scripts

setup:
	./scripts/dev/setup.sh

setup-admin:
	./scripts/dev/setup-admin.sh

run-dev:
	./scripts/run-dev.sh

test-db:
	./scripts/test-db.sh

debug-neon:
	./scripts/debug-neon.sh

# ML targets
ml:
	$(PYTHON) Ian_ML/service/server.py

ml-train:
	$(PYTHON) Ian_ML/training/train_binary_v2_no_bp.py

# Start all services (ML + Backend + Frontend)
start-all:
	bash scripts/dev/start-all.sh

# Load testing targets
load-test-assessment:
	k6 run backend/load_tests/assessment_load_test.js

load-test-assessment-quick:
	k6 run --vus 10 --duration 30s backend/load_tests/assessment_load_test.js

load-test-assessment-stress:
	k6 run --vus 200 --duration 5m backend/load_tests/assessment_load_test.js

# Backup targets (VAL-DP-002: Database Backups Automated)
backup:
	./scripts/backup.sh

backup-list:
	./scripts/backup.sh --list

backup-status:
	./scripts/backup.sh --status

backup-test:
	./scripts/backup.sh --test

backup-restore:
	./scripts/backup.sh --restore $(BACKUP_FILE)

# TLS/SSL targets (VAL-DP-003: TLS/SSL Enabled)
ssl-setup:
	./scripts/setup-ssl.sh --domain $(DOMAIN) --email $(SSL_EMAIL)

ssl-setup-staging:
	./scripts/setup-ssl.sh --domain $(DOMAIN) --email $(SSL_EMAIL) --staging

ssl-verify:
	./scripts/verify-tls.sh --domain $(DOMAIN)

ssl-verify-verbose:
	./scripts/verify-tls.sh --domain $(DOMAIN) --verbose

# Production deployment with TLS
deploy-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

deploy-prod-down:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

deploy-prod-logs:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f nginx-proxy
