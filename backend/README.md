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
| Users | `internal/http/handlers/users.go` |
| Assessments | `internal/http/handlers/assessments.go` |
| ML Integration | `internal/ml/http_predictor.go` |
| Database Queries | `internal/store/sqlc/*.sql.go` |
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
│   │   │   ├── users.go          # User profile, onboarding, consent, trends
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
│   │   ├── http_predictor.go     # HTTPPredictor client
│   │   ├── mock.go               # Mock predictor for testing
│   │   └── validation.go         # Biomarker validation
│   │
│   ├── models/                   # Domain models
│   │   └── types.go              # User, Patient, Assessment structs
│   │
│   └── store/                    # Database layer
│       ├── store.go              # Store interface
│       └── sqlc/                 # Generated SQLC code
│           ├── models.go         # Generated Go structs
│           ├── db.go             # Database connection
│           ├── users.sql.go      # User queries
│           ├── patients.sql.go   # Patient queries
│           ├── assessments.sql.go # Assessment queries
│           └── *.sql.go          # Other generated queries
│
├── migrations/                   # Goose SQL migrations
│   ├── 0001_init.sql             # Users, patients, assessments, audit tables
│   ├── 0002_*.sql                # Family history, physical activity
│   ├── 0003_*.sql                # Updated_at, indexes
│   ├── 0004_*.sql                # Refresh tokens
│   ├── 0005_*.sql                # Patient user_id
│   ├── 0006_*.sql                # Mock data seeding
│   ├── 0007_*.sql                # Cluster name updates
│   ├── 0008_*.sql                # Cluster name corrections
│   ├── 0009_add_clinics.sql      # Clinic tables
│   └── 0010_admin_features.sql   # Admin user features
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
| GET | `/api/v1/users/me` | `users.go` | Get current user profile |
| PUT | `/api/v1/users/me/profile` | `users.go` | Update user profile |
| POST | `/api/v1/users/me/onboarding` | `users.go` | Complete onboarding flow |
| GET | `/api/v1/users/me/consent` | `users.go` | Get consent settings |
| PUT | `/api/v1/users/me/consent` | `users.go` | Update consent settings |
| GET | `/api/v1/users/me/assessments` | `users.go` | Get user assessments |
| GET | `/api/v1/users/me/trends` | `users.go` | Get assessment trends |
| GET | `/api/v1/users/me/account` | `users.go` | Get user account |
| DELETE | `/api/v1/users/me/account` | `users.go` | Delete user account |
| GET | `/api/v1/users/me/assessments` | `users.go` | Get user assessments |
| POST | `/api/v1/users/me/assessments` | `assessments.go` | Create assessment (calls ML) |
| GET | `/api/v1/users/me/assessments/:id` | `assessments.go` | Get single assessment |
| PUT | `/api/v1/users/me/assessments/:id` | `assessments.go` | Update assessment |
| DELETE | `/api/v1/users/me/assessments/:id` | `assessments.go` | Delete assessment |
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

### Users (`internal/http/handlers/users.go`)
- `CompleteOnboarding(c *gin.Context)` - Handle onboarding data submission, validate consent, update user profile
- `GetUserProfile(c *gin.Context)` - Get current user profile data
- `UpdateUserProfile(c *gin.Context)` - Update user profile fields
- `GetConsentSettings(c *gin.Context)` - Retrieve user consent preferences
- `UpdateConsentSettings(c *gin.Context)` - Update user consent settings
- `GetTrends(c *gin.Context)` - Get assessment trends over time
- `DeleteAccount(c *gin.Context)` - Soft delete user account

### Assessments (`internal/http/handlers/assessments.go`)
- `Create(c *gin.Context)` - Create assessment, call ML predictor
- `List(c *gin.Context)` - Get assessment history for patient

### ML Predictor (`internal/ml/http_predictor.go`)
- `Predict(input PredictionInput) (*PredictionResult, error)` - Call ML server

---

## Database Queries (SQLC)

Location: `internal/store/sqlc/*.sql.go` (generated from SQL in sqlc.yaml)

| Query Name | Type | Purpose |
|------------|------|---------|
| `GetUserByEmail` | `:one` | Find user by email (login) |
| `CreateUser` | `:one` | Insert new user |
| `UpdateUser` | `:exec` | Update user profile fields |
| `UpdateUserConsent` | `:exec` | Update consent settings |
| `UpdateUserOnboarding` | `:exec` | Mark onboarding completed |
| `GetUserByID` | `:one` | Get user by ID with profile |
| `CreateAssessment` | `:one` | Insert assessment with ML results |
| `ListAssessmentsByUser` | `:many` | Get assessments for user |

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

`authentication` `JWT` `login` `register` `users` `user profile` `onboarding` `consent` `patients` `assessments` `diabetes` `prediction` `ML` `machine learning` `PostgreSQL` `SQLC` `Gin` `REST API` `handlers` `middleware` `router` `biomarkers` `risk cluster` `analytics` `export` `CSV` `trends`
