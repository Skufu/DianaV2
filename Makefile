APP_NAME  = diana
GO        = go
SQLC      = sqlc
GOOSE     = goose
ENV_FILE ?= .env

BACKEND_DIR = ./backend
MIGRATIONS_DIR = $(BACKEND_DIR)/migrations

# Load environment from .env (if present) so DB_DSN/JWT_SECRET/etc are available
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' $(ENV_FILE))
endif

.PHONY: dev seed build lint test db_up db_down db_status sqlc tidy setup run-dev test-db debug-neon

dev:
	cd $(BACKEND_DIR) && $(GO) run ./cmd/server

seed:
	cd $(BACKEND_DIR) && $(GO) run ./cmd/seed

build:
	cd $(BACKEND_DIR) && $(GO) build ./...

lint:
	cd $(BACKEND_DIR) && $(GO) vet ./...

test:
	cd $(BACKEND_DIR) && $(GO) test ./...

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
	./scripts/setup.sh

run-dev:
	./scripts/run-dev.sh

test-db:
	./scripts/test-db.sh

debug-neon:
	./scripts/debug-neon.sh
