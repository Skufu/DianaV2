APP_NAME  = diana
GO        = go
SQLC      = sqlc
GOOSE     = goose
ENV_FILE ?= .env

MIGRATIONS_DIR = ./migrations

# Load environment from .env (if present) so DB_DSN/JWT_SECRET/etc are available
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' $(ENV_FILE))
endif

.PHONY: dev seed build lint test db_up db_down db_status sqlc tidy dev-setup run-dev test-db debug-neon

dev:
	$(GO) run ./cmd/server

seed:
	$(GO) run ./cmd/seed

build:
	$(GO) build ./...

lint:
	$(GO) vet ./...

test:
	$(GO) test ./...

db_up:
	$(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$$DB_DSN" up

db_down:
	$(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$$DB_DSN" down

db_status:
	$(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$$DB_DSN" status

sqlc:
	$(SQLC) generate

tidy:
	$(GO) mod tidy

# Convenience targets for helper scripts

dev-setup:
	./scripts/dev-setup.sh

run-dev:
	./run-dev.sh

test-db:
	./scripts/test-db.sh

debug-neon:
	./scripts/debug-neon.sh

