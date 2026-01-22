# DATA STORE KNOWLEDGE BASE

**Directory**: `backend/internal/store/`

## OVERVIEW
Repository pattern data access layer using SQLC for type-safe CRUD and pgx/pool for complex queries.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Repository Interfaces | `store.go` | Central `Store` interface and entity repos |
| Postgres Implementation | `postgres.go` | SQLC-based CRUD for users, assessments, tokens |
| Admin/Dynamic Queries | `postgres_admin.go` | Raw SQL for admin filtering, pagination |
| Cohort Analytics | `postgres_cohort.go` | Cohort-specific stats and aggregations |
| Generated Queries | `sqlc/*.go` | SQLC outputs (DO NOT EDIT) |
| Raw SQL Queries | `queries/*.sql` | SQL sources for code generation |

## REPOSITORY PATTERN

```go
// Central Store interface
type Store interface {
    Users() UserRepository
    Assessments() AssessmentRepository
    // ... other repos
}

// Concrete implementation
type PostgresStore struct {
    db  *pgxpool.Pool
    q   *queries.Queries
}

// Entity repository
type pgUserRepo struct {
    q *queries.Queries
}

func (r *pgUserRepo) GetUserByID(ctx context.Context, id int32) (*models.User, error) {
    user, err := r.q.GetUserByID(ctx, id)
    // Map SQLC model to domain model
    return mapUserModel(user), err
}
```

## CONVENTIONS

### SQLC Integration
- **Query location**: All SQL in `queries/*.sql` with `-- name:` directives
- **Code generation**: Run `sqlc generate` after schema changes
- **Type safety**: Generated code prevents SQL injection at compile time
- **Mapping helpers**: Convert SQLC structs to domain models (e.g., `mapUserModel`)

### Null Handling (pgtype)
```go
// Check null before accessing
if user.FirstName.Valid {
    name = user.FirstName.String
}

// Set nullable values
pgUser.FirstName = pgtype.Text{String: name, Valid: true}
pgUser.DeletedAt = pgtype.Timestamptz{Valid: false}
```

### Direct pgxpool Usage
- **When to use**: Complex admin queries with dynamic filtering, sorting
- **Parameter numbering**: Use `itoa(argNum)` helper for `$1`, `$2` placeholders
- **Resource cleanup**: Always `defer rows.Close()`
- **Avoid for**: Standard CRUD operations (use SQLC instead)

### Type Conversions
```go
// Helper functions in postgres.go
intVal(ptr *pgtype.Int4) int
textVal(ptr *pgtype.Text) string
numericVal(ptr *pgtype.Numeric) float64
timestampVal(ptr *pgtype.Timestamptz) time.Time
```

### Repository Interfaces
Each entity has dedicated interface:
- `UserRepository` - User CRUD, profile, consent, trends
- `AssessmentRepository` - Assessment CRUD, latest assessment
- `TokenRepository` - Refresh token management
- `AuditRepository` - Audit event logging
- `ModelRunRepository` - ML model tracking

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Store | interface | store.go | handlers, router | Central repository contract |
| PostgresStore | struct | postgres.go | server | Concrete implementation |
| pgUserRepo | struct | postgres.go | handlers | User repository |
| pgAssessmentRepo | struct | postgres.go | handlers | Assessment repository |
| pgTokenRepo | struct | postgres.go | handlers | Token repository |
| pgAuditRepo | struct | postgres.go | handlers | Audit repository |
| pgModelRunRepo | struct | postgres.go | handlers | Model run repository |
| mapUserModel | func | postgres.go | handlers | SQLC→Domain mapping |
| mapAssessmentModel | func | postgres.go | handlers | SQLC→Domain mapping |
| NewStore | func | postgres.go | server | Store constructor |
| Users() | method | PostgresStore | handlers | User repo accessor |
| Assessments() | method | PostgresStore | handlers | Assessment repo accessor |
| Tokens() | method | PostgresStore | handlers | Token repo accessor |
| Audit() | method | PostgresStore | handlers | Audit repo accessor |
| ModelRuns() | method | PostgresStore | handlers | Model run repo accessor |
| itoa | func | postgres.go | postgres_admin | Int to string helper |
| intVal | func | postgres.go | postgres.go | pgtype conversion |
| textVal | func | postgres.go | postgres.go | pgtype conversion |
| numericVal | func | postgres.go | postgres.go | pgtype conversion |
| timestampVal | func | postgres.go | postgres.go | pgtype conversion |

## SQLC QUERY EXAMPLES

### User Queries
```sql
-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: UpdateUser :one
UPDATE users SET
  first_name = COALESCE($2, first_name),
  last_name = COALESCE($3, last_name),
  updated_at = NOW()
WHERE id = $1;

-- name: GetUserTrends :many
SELECT created_at, hba1c, fbs, cholesterol
FROM assessments
WHERE user_id = $1 AND created_at >= $2
ORDER BY created_at DESC;
```

### Assessment Queries
```sql
-- name: CreateAssessment :one
INSERT INTO assessments (
  user_id, fbs, hba1c, cholesterol, bmi,
  cluster, risk_score, model_version
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: GetLatestAssessmentByUser :one
SELECT * FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;
```

## ANTI-PATTERNS (THIS PROJECT)

### Critical Issues
- **No transaction support**: Multi-step operations lack atomicity
- **Silent audit errors**: `_ = a.store.Audit().LogEvent(...)` discards failures
- **interface{} usage**: Should use `any` (Go 1.18+)

### Technical Debt
- **itoa manual numbering**: Prone to off-by-one errors in dynamic queries
- **Raw SQL in admin.go**: Should migrate to SQLC where possible
- **Missing indexes**: Some queries lack proper indexing (check `EXPLAIN`)

### Refactoring Needed
- **Separate concerns**: Business logic in postgres.go should move to services
- **Add transactions**: Support `WithTx(ctx, fn)` for atomic operations
- **Error recovery**: Audit goroutines need panic recovery

## NOTES

### Schema Refactor Impact (v0011)
Migration 0011 changed `assessments` foreign key:
- **Before**: `patient_id` references `patients(id)`
- **After**: `user_id` references `users(id)`
- **Queries updated**: All assessment queries now use `user_id`

### Role Derivation
`User.Role` is NOT in database - derived from `is_admin`:
```go
// In postgres.go mapping
user.Role = "admin"
if !user.IsAdmin {
    user.Role = "user"
}
```

### Pagination Pattern
SQLC queries use `LIMIT` + `OFFSET`:
```sql
-- name: ListAssessments :many
SELECT * FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

For large datasets, consider cursor-based pagination (keyset) instead.

### Cohort Analytics
`postgres_cohort.go` provides aggregated statistics:
- Cluster distribution by age group
- Average biomarker values per cluster
- Risk score trends over time

Uses raw pgxpool for complex aggregations not easily expressed in SQLC.
