APP_NAME=diana
GO=go
SQLC=sqlc
GOOSE=goose
MIGRATIONS_DIR=./migrations

.PHONY: dev build lint test db_up db_down db_status sqlc tidy

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


