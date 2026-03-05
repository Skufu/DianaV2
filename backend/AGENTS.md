# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-28
**Commit:** Current
**Branch:** main

## OVERVIEW
Go/Gin REST API for DIANA diabetes risk assessment. PostgreSQL with SQLC, JWT auth, ML prediction integration, SSE events, Redis caching, and PDF generation.

## STRUCTURE
```
./
├── cmd/              # Entrypoints: server, migrate, seed
├── internal/
│   ├── cache/         # Redis cache implementation
│   ├── config/        # Environment loading
│   ├── http/         # Gin handlers, middleware, router, sse
│   ├── ml/           # ML predictor client (HTTP + mock)
│   ├── models/        # Domain types (types.go)
│   ├── pdf/          # PDF report generator implementation
│   ├── services/      # Business logic (PDF, notifications, validation)
│   └── store/        # Data access (SQLC + postgres impl)
├── migrations/        # Goose SQL migrations
├── sqlc.yaml         # SQLC config
└── .golangci.yml     # Linting rules
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| API routes | `internal/http/router/router.go` | All routes + middleware wiring |
| Handlers | `internal/http/handlers/` | By resource (auth, users, assessments, admin) |
| Auth middleware | `internal/http/middleware/auth.go` | JWT parsing, user extraction |
| Rate limiting | `internal/http/middleware/ratelimit.go` | Token bucket |
| DB queries | `internal/store/sqlc/*.sql.go` | Generated SQLC code |
| DB raw SQL | `internal/store/postgres*.go` | Complex admin queries |
| ML integration | `internal/ml/http_predictor.go` | HTTP client for Python ML server |
| Config | `internal/config/config.go` | Env var loading |
| Migrations | `migrations/*.sql` | Goose SQL files |

## CONVENTIONS

**SQLC:**
- Queries defined in `internal/store/queries/*.sql`
- Run `sqlc generate` after editing
- Generated files in `internal/store/sqlc/*.sql.go` (DO NOT EDIT)

**Testing:**
- Table-driven tests for multiple input variations
- Manual fakes/mocks in `_test.go` files (no testify/mocks)
- Integration tests require `TEST_DB_DSN` env var
- `t.Skip()` when DB unavailable

**Handlers:**
- Gin context: `c *gin.Context`
- JSON responses: `c.JSON(http.StatusOK, resp)`
- Errors: `c.JSON(http.StatusBadRequest, gin.H{"error": "..."})`
- Use `middleware.Auth(cfg.JWTSecret)` for protected routes

**Database:**
- Use store repositories via `st.Users()`, `st.Patients()`, etc.
- Methods return `(model, error)` or `(model, bool, error)`
- Use `context.Background()` or `context.WithTimeout()`

**Audit Logging:**
- Fire-and-forget goroutines in `audit.go`
- **WARNING**: Silenced errors (`_ =`) - audit failures invisible
- TODO: Add retry/recovery for async audit writes

## ANTI-PATTERNS (THIS PROJECT)

**CRITICAL:**
- `_ = err` on audit event creation (middleware, handlers) - failures are logged but async
- Async audit goroutines without blocking - data loss possible if DB unavailable
- `interface{}` used instead of `any` (5 occurrences)

**TODO/DEPRECATED:**
- `notification_service.go`: Email sending not implemented
- `export.go`: CSV export deprecated (use PDF instead)
- No anonymized CSV generation (TODO)

**BUILD/CI:**
- `golangci-lint` in CI has `continue-on-error: true` - lint failures ignored
- Backend Dockerfile in `/build/` instead of `/backend/`
- Go 1.24 in CI, docs say 1.21+ (version drift)

**DATABASE:**
- `sslmode=require` in docker-compose (local dev will fail without SSL config)

## UNIQUE STYLES

**ML Integration:**
- `HTTPPredictor` calls Python/FastAPI ML server
- Falls back to `MockPredictor` if `MODEL_URL` empty
- Biomarker validation in `internal/ml/validation.go`

**PDF Reports:**
- PDF generation in `internal/services/pdf_export_service.go`
- Uses `gopdf` library
- Notified via queue (not implemented)

**Refactoring Complete:**
- Shifted from "Patient-centric" to "User-centric" model (B2B→B2C)
- `users.go` handler replaces deleted `patients.go`
- Assessments use `UserID` (legacy `PatientID` dropped)

**Admin Features:**
- Role-based access control (`admin` role for `/api/v1/admin/*`)
- Audit logs with filtering (`admin_audit.go`)
- User management (`admin_users.go`)

## COMMANDS
```bash
# Development
go run ./cmd/server

# Hot reload
air

# Database migrations
go run ./cmd/migrate up
go run ./cmd/migrate down

# Seed data
go run ./cmd/seed

# Generate SQLC
sqlc generate

# Tests
go test ./...
go test ./... -v
go test ./... -cover

# Build
go build -o server.exe ./cmd/server
```

## NOTES

**Gotchas:**
- JWT_SECRET required in prod (defaults to dev-secret locally)
- ML server optional (mock if MODEL_URL not set)
- Integration tests need `TEST_DB_DSN` env var
- Binaries (`*.exe`) in root should be gitignored
- `/tmp/` build artifacts should be gitignored

**Technical Debt:**
- Refactor `interface{}` → `any` (Go 1.18+)
- Fix silenced audit errors (add logging or panic)
- Implement notification queue/emailing
- Replace fire-and-forget goroutines with proper async workers
