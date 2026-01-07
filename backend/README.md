# Backend - Go/Gin REST API Server

> **Purpose**: REST API server for DIANA diabetes risk assessment application  
> **Language**: Go 1.21+ | **Framework**: Gin | **Database**: PostgreSQL + SQLC  
> **Port**: 8080

---

## Quick Search Index

| Topic | File Location |
|-------|---------------|
| API Routes | `internal/http/router/router.go` |
| Authentication | `internal/http/handlers/auth.go` |
| JWT Middleware | `internal/http/middleware/auth.go` |
| Patient CRUD | `internal/http/handlers/patients.go` |
| Assessments | `internal/http/handlers/assessments.go` |
| ML Integration | `internal/ml/predictor.go` |
| Database Queries | `internal/store/sqlc/queries.sql` |
| Config | `internal/config/config.go` |

---

## Directory Structure

```
backend/
├── cmd/                          # Application entrypoints
│   ├── server/main.go            # API server entrypoint
│   ├── migrate/main.go           # Database migration runner
│   └── seed/main.go              # Demo data seeder
│
├── internal/                     # Private application code
│   ├── config/                   # Environment configuration
│   │   └── config.go             # Load env vars, validate config
│   │
│   ├── http/                     # HTTP layer
│   │   ├── router/
│   │   │   └── router.go         # All route definitions
│   │   ├── handlers/             # Request handlers
│   │   │   ├── auth.go           # Login, register, refresh token
│   │   │   ├── patients.go       # Patient CRUD operations
│   │   │   ├── assessments.go    # Create/list assessments
│   │   │   ├── analytics.go      # Dashboard analytics
│   │   │   ├── export.go         # CSV export functionality
│   │   │   └── health.go         # Health check endpoints
│   │   └── middleware/           # HTTP middleware
│   │       ├── auth.go           # JWT validation, user extraction
│   │       ├── cors.go           # CORS handling
│   │       └── ratelimit.go      # Rate limiting
│   │
│   ├── ml/                       # ML server integration
│   │   ├── predictor.go          # HTTPPredictor client
│   │   ├── mock.go               # Mock predictor for testing
│   │   └── types.go              # PredictionInput, PredictionResult
│   │
│   ├── models/                   # Domain models
│   │   └── models.go             # User, Patient, Assessment structs
│   │
│   └── store/                    # Database layer
│       ├── store.go              # Store interface
│       └── sqlc/                 # Generated SQLC code
│           ├── queries.sql       # SQL query definitions
│           ├── models.go         # Generated Go structs
│           ├── db.go             # Database connection
│           └── queries.sql.go    # Generated query methods
│
├── migrations/                   # Goose SQL migrations
│   ├── 0001_init.sql             # Users table
│   ├── 0002_*.sql                # Family history, physical activity
│   ├── 0003_*.sql                # Updated_at, indexes
│   ├── 0004_*.sql                # Refresh tokens
│   ├── 0005_*.sql                # Patient user_id
│   ├── 0006_*.sql                # Mock data seeding
│   ├── 0007_*.sql                # Cluster name updates
│   └── 0008_*.sql                # Cluster name corrections
│
├── go.mod                        # Go module definition
├── go.sum                        # Dependency checksums
└── sqlc.yaml                     # SQLC configuration
```

---

## API Endpoints Reference

### Public (No Auth)
| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/v1/healthz` | `health.go` | Health check |
| GET | `/api/v1/livez` | `health.go` | Liveness probe |
| POST | `/api/v1/auth/login` | `auth.go` | User login → JWT |
| POST | `/api/v1/auth/register` | `auth.go` | Create account |
| POST | `/api/v1/auth/refresh` | `auth.go` | Refresh JWT token |

### Protected (JWT Required)
| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/v1/patients` | `patients.go` | List all patients |
| POST | `/api/v1/patients` | `patients.go` | Create patient |
| GET | `/api/v1/patients/:id` | `patients.go` | Get patient by ID |
| PUT | `/api/v1/patients/:id` | `patients.go` | Update patient |
| DELETE | `/api/v1/patients/:id` | `patients.go` | Delete patient |
| GET | `/api/v1/patients/:id/assessments` | `assessments.go` | List assessments |
| POST | `/api/v1/patients/:id/assessments` | `assessments.go` | Create assessment (calls ML) |
| GET | `/api/v1/analytics/summary` | `analytics.go` | Dashboard statistics |
| GET | `/api/v1/analytics/cluster-distribution` | `analytics.go` | Risk cluster data |
| GET | `/api/v1/export/patients.csv` | `export.go` | Export patients CSV |
| GET | `/api/v1/export/assessments.csv` | `export.go` | Export assessments CSV |

---

## Key Functions

### Authentication (`internal/http/handlers/auth.go`)
- `Login(c *gin.Context)` - Validate credentials, return JWT
- `Register(c *gin.Context)` - Create user, hash password
- `RefreshToken(c *gin.Context)` - Issue new access token

### Patients (`internal/http/handlers/patients.go`)
- `List(c *gin.Context)` - Get all patients for user
- `Create(c *gin.Context)` - Add new patient record
- `Get(c *gin.Context)` - Fetch single patient by ID
- `Update(c *gin.Context)` - Modify patient record
- `Delete(c *gin.Context)` - Remove patient

### Assessments (`internal/http/handlers/assessments.go`)
- `Create(c *gin.Context)` - Create assessment, call ML predictor
- `List(c *gin.Context)` - Get assessment history for patient

### ML Predictor (`internal/ml/predictor.go`)
- `Predict(input PredictionInput) (*PredictionResult, error)` - Call ML server

---

## Database Queries (SQLC)

Location: `internal/store/sqlc/queries.sql`

| Query Name | Type | Purpose |
|------------|------|---------|
| `GetUserByEmail` | `:one` | Find user by email (login) |
| `CreateUser` | `:one` | Insert new user |
| `ListPatients` | `:many` | Get all patients for user |
| `GetPatient` | `:one` | Get patient by ID |
| `CreatePatient` | `:one` | Insert new patient |
| `UpdatePatient` | `:exec` | Modify patient |
| `DeletePatient` | `:exec` | Remove patient |
| `CreateAssessment` | `:one` | Insert assessment with ML results |
| `ListAssessmentsByPatient` | `:many` | Get assessments for patient |

---

## Running

```bash
# Development
cd backend
go run ./cmd/server

# Build
go build -o server ./cmd/server

# Run migrations
go run ./cmd/migrate up

# Seed demo data
go run ./cmd/seed

# Regenerate SQLC
sqlc generate
```

---

## Testing

```bash
# Run all tests
go test ./...

# Run with verbose output
go test ./... -v

# Run with coverage report
go test ./... -cover -coverprofile=coverage.out

# View coverage in browser
go tool cover -html=coverage.out
```

### Test Coverage

| Package | Test File | What's Tested |
|---------|-----------|---------------|
| `internal/config/` | `config_test.go` | Env loading, defaults, validation |
| `internal/ml/` | `mock_test.go` | MockPredictor cluster assignments |
| `internal/ml/` | `validation_test.go` | Biomarker range validation |
| `internal/http/middleware/` | `auth_test.go` | JWT parsing, claims validation |
| `internal/http/middleware/` | `ratelimit_test.go` | Token bucket, concurrency |
| `internal/http/middleware/` | `rbac_test.go` | Role-based access control |
| `internal/http/middleware/` | `security_test.go` | Security headers |
| `internal/http/handlers/` | `assessments_test.go` | Handler validation |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing key (32+ chars) |
| `PORT` | No | Server port (default: 8080) |
| `MODEL_URL` | No | ML server URL (default: mock) |
| `CORS_ORIGINS` | No | Allowed origins |

---

## Search Keywords

`authentication` `JWT` `login` `register` `patients` `assessments` `diabetes` `prediction` `ML` `machine learning` `PostgreSQL` `SQLC` `Gin` `REST API` `handlers` `middleware` `router` `biomarkers` `risk cluster` `analytics` `export` `CSV`
