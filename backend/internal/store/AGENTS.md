# PROJECT KNOWLEDGE BASE: internal/store

**Generated:** 2026-01-14
**Scope:** Data access layer, SQLC integration, pgxpool usage

## OVERVIEW
SQLC-powered data access layer with pgxpool for complex/dynamic admin queries and analytics.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Repository Interfaces | `internal/store/store.go` | Central `Store` interface and entity repos |
| Postgres Implementation | `internal/store/postgres.go` | SQLC-based CRUD for users, patients, assessments |
| Admin/Dynamic Queries | `internal/store/postgres_admin.go` | Raw SQL + `itoa` helper for filtering/pagination |
| Cohort Analytics | `internal/store/postgres_cohort.go` | Cohort-specific stats and aggregations |
| Generated Queries | `internal/store/sqlc/*.sql.go` | SQLC outputs (DO NOT EDIT) |
| Raw SQL Queries | `internal/store/queries/*.sql` | SQL sources for code generation |

## CONVENTIONS

**SQLC & Mapping:**
- Define queries in `internal/store/queries/*.sql`
- Map SQLC structs to domain `models` using helper functions (e.g., `mapPatientRows`)
- Helpers ensure consistent handling of database rows across different repository methods

**Direct pgxpool Usage:**
- Use `r.pool` directly for dynamic SQL (admin lists) or complex joins not supported by SQLC
- Dynamic query parameters use manual numbering with the `itoa(argNum)` helper
- Always `defer rows.Close()` when using direct pool queries

**Type Safety (pgtype):**
- Use `pgtype` package for nullable or Postgres-specific fields (Int4, Text, Numeric, Timestamptz)
- Handle conversions using established helpers: `intVal`, `textVal`, `floatToNumeric`, `timestampVal`
- Avoid direct floating-point comparisons; use `numericVal` for database-stored decimals

**Repository Pattern:**
- `PostgresStore` holds both `*pgxpool.Pool` and `*sqlcgen.Queries`
- Entity repositories (e.g., `pgUserRepo`) are initialized with the minimal dependencies needed
- Methods return `(model, error)` or `(model, bool, error)` for find/exists operations

## ANTI-PATTERNS

**Dynamic SQL Safety:**
- `itoa(argNum)` pattern is manual and error-prone; verify parameter counts in `postgres_admin.go`
- Avoid building SQL strings using `fmt.Sprintf` for user-provided data (use placeholders)

**Interface Maintenance:**
- Do not bypass repository interfaces in handlers; always use the `Store` methods
- Ensure new repositories are registered in the main `Store` interface in `store.go`

**Error Handling:**
- Defensive `if r.q == nil` checks are used but indicate misconfiguration; verify store initialization
- Avoid silent failures in mapping; log or return errors if `pgtype` scanning fails
