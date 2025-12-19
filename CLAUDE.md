# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIANA V2 is a predictive diabetes risk assessment application for menopausal women. The system uses patient biomarker data and ML predictions to classify patients into risk clusters.

**Stack**: Go 1.21+ (backend) + React 18 (frontend) + PostgreSQL + sqlc for type-safe queries

## Essential Commands

### Backend Development

```bash
# Run development server (port 8080)
go run ./cmd/server

# Build all packages
go build ./...

# Run tests
go test ./...

# Lint code
go vet ./...

# Regenerate SQL code after modifying queries in internal/store/queries/
sqlc generate

# Tidy dependencies
go mod tidy
```

### Database Operations

```bash
# Apply migrations (requires DB_DSN environment variable)
make db_up

# Rollback migrations
make db_down

# Check migration status
make db_status

# Seed initial user (clinician@example.com / password123)
go run ./cmd/seed
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

## Architecture & Code Organization

### Backend Architecture

The backend follows a layered architecture with clear separation of concerns:

**Entry Point** (`cmd/server/main.go`)
- Loads config from environment variables
- Initializes PostgreSQL connection pool
- Creates store, ML predictor, and HTTP router
- Starts Gin server with graceful shutdown

**HTTP Layer** (`internal/http/`)
- `router/router.go`: Wires all handlers, applies global middleware (security headers, CORS, rate limiting)
- `handlers/`: One handler per resource (auth, patients, assessments, analytics, export)
- `middleware/`: Auth (JWT validation with user_id extraction), rate limiting, security headers

**Store Layer** (`internal/store/`)
- `store.go`: Repository interfaces (UserRepository, PatientRepository, AssessmentRepository, RefreshTokenRepository)
- `postgres.go`: PostgreSQL implementations using sqlc-generated queries
- `queries/`: SQL query files (.sql) that sqlc reads
- `sqlc/`: Auto-generated type-safe Go code (DO NOT EDIT MANUALLY)

**Models** (`internal/models/types.go`)
- Domain models: User, Patient, Assessment, RefreshToken, analytics DTOs
- These are the application's "lingua franca" - all layers use these types

**ML Layer** (`internal/ml/`)
- `predictor.go`: Interface for ML predictions
- `http.go`: HTTP client that calls external ML service
- `mock.go`: Deterministic mock predictor for development/testing

### Authentication & Authorization Flow

1. **Login**: POST `/api/v1/auth/login` with email/password
   - Returns `access_token` (15min, contains user_id) and `refresh_token` (7 days)
   - Frontend stores both in localStorage

2. **JWT Structure**: Access tokens include claims:
   - `sub`: user email
   - `user_id`: user ID (int64) - **CRITICAL for ownership validation**
   - `role`: user role
   - `exp`: expiration timestamp
   - `iat`: issued-at timestamp
   - `scope`: "diana"

3. **Auth Middleware** (`middleware/auth.go`):
   - Extracts JWT from `Authorization: Bearer <token>` header
   - Validates signature, claims, and expiration
   - Extracts `user_id` from claims (as float64, converts to int64)
   - Stores `UserClaims{UserID, Email, Role}` in Gin context

4. **Ownership Validation**:
   - **CRITICAL**: All patient/assessment operations MUST validate ownership
   - Handlers call `getUserID(c)` to extract authenticated user's ID
   - Patient queries filter by `user_id` (SQL WHERE clauses)
   - Assessment operations verify patient belongs to user before proceeding
   - **Pattern**: Get patient first to validate ownership, then proceed with assessment operation

### Database Schema & Migrations

**Migration System**: Uses goose for versioned migrations in `migrations/` directory.

**Key Tables**:
- `users`: id, email, password_hash, role, timestamps
- `patients`: id, **user_id (FK)**, name, age, menopause data, biomarkers, timestamps
- `assessments`: id, patient_id (FK), biomarkers, cluster, risk_score, model_version, dataset_hash, validation_status, timestamps
- `refresh_tokens`: id, user_id (FK), token_hash (SHA-256), expires_at, revoked, timestamps

**IMPORTANT**: The `user_id` column in `patients` table is the cornerstone of authorization. Every patient MUST belong to exactly one user.

### sqlc Workflow

**When modifying database queries**:

1. Edit SQL files in `internal/store/queries/` (e.g., `patients.sql`, `assessments.sql`)
2. Run `sqlc generate` to regenerate Go code
3. Update repository interfaces in `internal/store/store.go` if method signatures changed
4. Update repository implementations in `internal/store/postgres.go`
5. Update handler code in `internal/http/handlers/` to use new signatures

**sqlc generates different types** for different queries (e.g., `ListPatientsRow` vs `CreatePatientRow`). You'll need mapper functions like `mapPatientRows()`, `mapCreatePatientRow()` to convert sqlc types to domain models.

### Frontend Architecture

**Structure** (`frontend/src/`):
- `App.jsx`: Root component, handles auth state, patient data fetching, routing
- `api.js`: All API calls, uses `VITE_API_BASE` and Bearer token headers
- `components/`: UI components (Login, Dashboard, PatientHistory, Analytics, Export, Sidebar)

**Key Patterns**:
- JWT tokens managed in `App.jsx` state and localStorage
- API calls include `Authorization: Bearer ${token}` header
- `PatientHistory.jsx` is the most complex component - handles patient list, assessment forms, and edit/delete modals
- All mutations (create/update/delete) refresh data from server after success

### Security Implementation

**Rate Limiting** (`middleware/ratelimit.go`):
- Token bucket algorithm with per-user/IP tracking
- Auth endpoints limited to 5 requests/minute
- Automatic cleanup of stale visitor records

**Security Headers** (`middleware/security.go`):
- Applied globally to all responses
- Includes X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, CSP

**JWT Secret**:
- `config.go` **requires** JWT_SECRET in production (fails if missing)
- Shows warning in development if using default
- Never commit secrets to repository

## Critical Implementation Details

### Patient Ownership Validation Pattern

**ALWAYS follow this pattern** in handlers:

```go
func (h *Handler) somePatientOperation(c *gin.Context) {
    // 1. Extract authenticated user ID
    userID, err := getUserID(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
        return
    }

    // 2. Parse patient ID from URL
    patientID, err := parseIDParam(c, "patientID")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
        return
    }

    // 3. Verify patient exists AND belongs to user
    _, err = h.store.Patients().Get(c.Request.Context(), int32(patientID), userID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
        return
    }

    // 4. Now safe to proceed with operation
    // ...
}
```

### Type Conversion Gotchas

- **JWT claims**: `user_id` comes as `float64` from JWT MapClaims, convert to `int64`
- **URL params**: Parsed as strings, convert to `int32` for database IDs
- **sqlc types**: Use `int32` for database IDs, domain models use `int64`
- **Patient/Assessment IDs**: Domain models use `int64`, sqlc params use `int32`

### Frontend-Backend Contract

**Login Response**:
```json
{
  "access_token": "jwt-token-here",
  "refresh_token": "refresh-token-here",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Patient Create Payload** (matches backend exactly):
```json
{
  "name": "string",
  "age": int,
  "menopause_status": "string",
  "years_menopause": int,
  "bmi": float64,
  "bp_systolic": int,
  "bp_diastolic": int,
  "activity": "string",
  "phys_activity": bool,
  "smoking": "string",
  "hypertension": "string",
  "heart_disease": "string",
  "family_history": bool,
  "chol": int,
  "ldl": int,
  "hdl": int,
  "triglycerides": int
}
```

## Configuration

### Required Environment Variables

**Backend** (`.env`):
```bash
DB_DSN=postgres://user:pass@host:port/dbname
JWT_SECRET=your-strong-secret-here  # REQUIRED in production
PORT=8080                            # Optional, defaults to 8080
ENV=dev                              # Set to "production" in prod
CORS_ORIGINS=http://localhost:3000  # Comma-separated allowed origins
```

**Frontend** (`.env` or `.env.local`):
```bash
VITE_API_BASE=http://localhost:8080  # Backend API URL
```

### Optional ML Configuration

```bash
MODEL_URL=http://ml-service:5000/predict  # If using external ML service
MODEL_VERSION=v1.0                         # For traceability
MODEL_DATASET_HASH=abc123                  # Dataset version tracking
MODEL_TIMEOUT_MS=2000                      # HTTP timeout for ML calls
```

## Common Development Workflows

### Adding a New Database Field

1. Create migration: Add new `.sql` file in `migrations/` (e.g., `0006_add_new_field.sql`)
2. Update SQL queries in `internal/store/queries/` to include new field
3. Run `sqlc generate` to regenerate Go code
4. Update domain model in `internal/models/types.go`
5. Update mapper functions in `internal/store/postgres.go`
6. Update handlers to handle new field
7. Update frontend API payloads and UI
8. Run migrations: `make db_up`

### Adding a New Endpoint

1. Add handler method to appropriate handler struct (e.g., `PatientsHandler`)
2. Register route in handler's `Register()` method
3. **ALWAYS** validate user ownership if accessing user-specific resources
4. Add corresponding API function in `frontend/src/api.js`
5. Update frontend components to use new API function

### Debugging Auth Issues

- Check JWT_SECRET is consistent between runs
- Verify JWT includes `user_id` claim (check `auth.go` login/refresh methods)
- Ensure middleware extracts `user_id` correctly (check `middleware/auth.go`)
- Verify handlers call `getUserID(c)` and pass to store methods
- Check SQL queries include `user_id` in WHERE clauses

## Testing Notes

- Unit tests can be run with `go test ./...`
- Integration tests require `TEST_DB_DSN` environment variable pointing to a test database
- Migrations must be applied to test database before running integration tests
- Frontend has no automated tests currently (manual testing via browser)

## Deployment Checklist

1. Set `ENV=production` and strong `JWT_SECRET`
2. Apply all migrations to production database
3. Seed at least one user account
4. Set `CORS_ORIGINS` to production frontend domain
5. Set `VITE_API_BASE` to production API URL in frontend build
6. Build frontend: `npm run build` in `frontend/`
7. Build backend: `go build ./cmd/server`
8. Configure HTTPS/TLS at load balancer or reverse proxy level
