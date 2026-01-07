# Backend Guide (Go/Gin)

## Directory Structure

```
backend/
├── cmd/
│   ├── server/main.go     # Entry point
│   ├── migrate/main.go    # Database migrations
│   └── seed/              # Seed data
├── internal/
│   ├── config/            # Environment config
│   ├── http/
│   │   ├── router/        # Route definitions
│   │   ├── handlers/      # Request handlers
│   │   └── middleware/    # Auth, rate limiting
│   ├── ml/                # ML server client
│   ├── models/            # Domain models
│   └── store/             # Database layer
│       └── sqlc/          # Generated queries
├── migrations/            # SQL migration files
└── sqlc.yaml              # SQLC configuration
```

---

## Key Concepts

### 1. Router (`internal/http/router/router.go`)

All routes are defined here:

```go
api := r.Group("/api/v1")

// Public routes
handlers.RegisterHealth(api)
authHandler.Register(authGroup)  // /auth/login, /auth/register

// Protected routes (require JWT)
protected := api.Group("")
protected.Use(middleware.Auth(cfg.JWTSecret))

patientHandler.Register(protected.Group("/patients"))
assessmentHandler.Register(protected.Group("/patients"))
analyticsHandler.Register(protected.Group("/analytics"))
```

### 2. Handlers (`internal/http/handlers/`)

Each handler follows this pattern:

```go
type PatientsHandler struct {
    store store.Store
}

func (h *PatientsHandler) Register(g *gin.RouterGroup) {
    g.GET("", h.list)
    g.POST("", h.create)
    g.GET("/:id", h.get)
}

func (h *PatientsHandler) list(c *gin.Context) {
    userID := c.GetInt64("user_id")  // From JWT
    patients, err := h.store.ListPatients(c, userID)
    // ...
}
```

### 3. ML Integration (`internal/ml/predictor.go`)

Backend calls ML server via HTTP:

```go
type HTTPPredictor struct {
    baseURL string
    client  *http.Client
}

func (p *HTTPPredictor) Predict(input PredictionInput) (*PredictionResult, error) {
    // POST to http://localhost:5000/predict?model_type=clinical
    resp, err := p.client.Post(p.baseURL+"/predict?model_type=clinical", ...)
}
```

### 4. Database (SQLC)

Queries are defined in `backend/internal/store/sqlc/queries.sql`:

```sql
-- name: GetPatient :one
SELECT * FROM patients WHERE id = $1 AND user_id = $2;

-- name: CreateAssessment :one
INSERT INTO patient_assessments (...) VALUES (...) RETURNING *;
```

SQLC generates type-safe Go code automatically.

---

## API Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | /auth/register | authHandler | Create account |
| POST | /auth/login | authHandler | Get JWT token |
| POST | /auth/refresh | authHandler | Refresh token |
| GET | /patients | patientsHandler | List patients |
| POST | /patients | patientsHandler | Create patient |
| GET | /patients/:id | patientsHandler | Get patient |
| POST | /patients/:id/assessments | assessmentsHandler | Create assessment (calls ML) |
| GET | /analytics/summary | analyticsHandler | Dashboard stats |
| GET | /export/csv | exportHandler | Export data |

### Admin Endpoints (Admin Role Required)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | /admin/users | adminUsersHandler | List users |
| POST | /admin/users | adminUsersHandler | Create user |
| PUT | /admin/users/:id | adminUsersHandler | Update user |
| DELETE | /admin/users/:id | adminUsersHandler | Deactivate user |
| GET | /admin/audit | adminAuditHandler | Audit logs |
| GET | /admin/models | adminModelsHandler | ML model history |

Admin routes use `middleware.RoleRequired("admin")` for access control.

---

## Authentication Flow

1. **Login:** `POST /auth/login` → Returns `access_token` (15min) + `refresh_token` (7d)
2. **Use Token:** All protected routes require `Authorization: Bearer <token>`
3. **Refresh:** When access token expires, `POST /auth/refresh` with refresh token
4. **Middleware:** `middleware.Auth()` validates JWT and extracts `user_id`

---

## Running

```bash
cd backend

# Development
go run ./cmd/server

# Build
go build -o server ./cmd/server

# Run migrations
go run ./cmd/migrate up
```
