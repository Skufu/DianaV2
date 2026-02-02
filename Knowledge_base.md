# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-28
**Updated:** 2026-02-02
**Commit:** Current
**Branch:** main

## OVERVIEW
Multi-tier medical AI platform: diabetes risk prediction for menopausal women. Go backend (Gin), React frontend (Vite), Python ML (Flask), PostgreSQL with SQLC.

## STRUCTURE
```
.
├── backend/                 # Go API server (Gin + pgx + SQLC)
│   ├── cmd/             # Executables (server, migrate, seed)
│   ├── internal/
│   │   ├── http/        # Handlers, middleware, router
│   │   ├── ml/           # ML integration (HTTP predictor, validation)
│   │   ├── models/       # Domain types
│   │   ├── services/      # Business logic (PDF export, notifications)
│   │   └── store/        # Data layer (SQLC queries + repository impl)
│   └── migrations/      # SQL schema (Goose versioned)
├── frontend/              # React 18 (Vite)
│   ├── src/
│   │   ├── components/   # UI modules (admin, auth, user, insights, common, layout)
│   │   ├── api.js         # Centralized API layer
│   │   └── utils/         # Device capabilities, validation
│   └── e2e/            # Playwright E2E tests
├── Ian_ML/                   # Python ML service (Flask)
│   ├── predict.py         # Inference server
│   ├── train.py           # K-Means clustering
│   └── mlflow_config.py   # Experiment tracking
├── scripts/              # Data pipeline, ML training, dev orchestration
└── docs/                 # API drift prevention, thesis docs
```

## AGENTS.md FILES

Comprehensive knowledge base documentation for all major directories:

| Directory | AGENTS.md | Scope |
|-----------|-----------|-------|
| `backend/internal/http/handlers/` | ✅ Complete | HTTP handlers, error patterns, ML integration |
| `backend/internal/store/` | ✅ Complete | Repository pattern, SQLC, pgtype handling |
| `backend/internal/http/router/` | ✅ Complete | Route registration, middleware chain |
| `backend/internal/services/` | ✅ Complete | Business logic, PDF export, notifications, validation |
| `backend/internal/config/` | ✅ Complete | Environment variables, defaults, validation |
| `backend/internal/ml/` | ✅ Complete | ML predictor interface, validation, clinical ranges |
| `backend/internal/http/middleware/` | ✅ Complete | Auth, RBAC, rate limiting, audit, security |
| `backend/internal/http/` | ✅ Complete | Router configuration, route hierarchy |
| `backend/migrations/` | ✅ Complete | Goose migrations, schema evolution |
| `frontend/src/` | ✅ Complete | App architecture, routing, auth state, performance |
| `frontend/src/components/` | ✅ Complete | All UI components, patterns, conventions |
| `frontend/src/components/education/` | ✅ Complete | Education components for diabetes prevention education |
| `frontend/src/components/export/` | ✅ Complete | Export components for PDF download functionality |

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API endpoints | backend/internal/http/handlers/ | REST handlers, auth, assessments |
| DB queries | backend/internal/store/queries/*.sql | SQLC sources |
| Generated code | backend/internal/store/sqlc/*.go | DO NOT EDIT (run sqlc generate) |
| Domain models | backend/internal/models/types.go | Go structs for API |
| ML prediction | Ian_ML/predict.py | Dual predictor (ADA baseline vs clinical metabolic) |
| Validation | backend/internal/ml/validation.go | Biomarker range checks |
| Auth flow | backend/internal/http/handlers/auth.go | JWT + refresh tokens |
| PDF export | backend/internal/services/pdf_export_service.go | gopdf library |
| Data layer | backend/internal/store/postgres.go | Repository pattern with SQLC |
| Admin dashboard | frontend/src/components/admin/ | UserManagement, AuditLog, ModelTraceability |
| User flows | frontend/src/components/user/ | Onboarding, Dashboard, Trends, Profile |
| Charts | frontend/src/components/common/ | SHAPExplanation (Recharts integration) |
| API wrapper | frontend/src/api.js | apiFetch/mlFetch, centralized endpoints |
| ML training | Ian_ML/train.py, scripts/train/train_clusters.py | K-Means, CatBoost |
| Data processing | scripts/data/*.py | NHANES download, merge, imputation |
| Thesis generation | scripts/thesis/*.py | Manuscript verification, vignettes, outputs |
| CI/CD | .github/workflows/ci.yml | Multi-language tests, docker builds |

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Predict(ctx) | interface | backend/internal/ml/mock.go | HTTP, handlers, validation | ML abstraction |
| BiomarkerRanges | map[string]BiomarkerRange | backend/internal/ml/validation.go | validation | Clinical thresholds |
| Store | interface | backend/internal/store/store.go | All repositories | Central contract |
| UserRepository | interface | backend/internal/store/postgres.go | handlers | User CRUD + trends |
| AssessmentRepository | interface | backend/internal/store/postgres.go | handlers | Risk assessment CRUD |
| Predict(a) | func | Ian_ML/predict.py | handlers | Inference endpoint |
| ValidateInput(a) | func | Ian_ML/predict.py | internal/ml/validation.go | Safety check |
| DianaPredictor | class | Ian_ML/server.py | Flask router | ADA model wrapper |
| ClinicalPredictor | class | Ian_ML/server.py | Flask router | Metabolic model wrapper |
| apiFetch | func | frontend/src/api.js | All components | Backend API calls |
| mlFetch | func | frontend/src/api.js | All components | ML server calls |
| deviceCapabilities | func | frontend/src/utils/deviceCapabilities.js | App, Insights | Performance tiering |
| APIError | struct | backend/internal/http/handlers/utils.go | handlers | Standardized error responses |
| PaginatedResponse | struct | backend/internal/http/handlers/utils.go | handlers | List with pagination metadata |

## CONVENTIONS

### Go Backend
- **SQLC**: All DB queries in `backend/internal/store/queries/*.sql`. Run `sqlc generate` after migrations.
- **Repository Pattern**: Entities have repos in `backend/internal/store/postgres.go`. Use store interfaces, never bypass.
- **Error Handling**: Use `handlers/utils.go` helpers (ErrBadRequest, ErrInternal). Never manual JSON.
- **Pagination**: Use `ParsePagination()` + `NewPaginatedResponse()`. No manual strconv.
- **Context Keys**: `user` (UserClaims), `request_id` (string), `audit_body` (map).

### Python ML
- **Dual Predictor Pattern**: `DianaPredictor` (ADA baseline) + `ClinicalPredictor` (metabolic models).
- **Config**: `MODEL_URL` empty triggers mock mode for local dev.
- **Headers**: HTTP requests must include `X-Model-Version` if `MODEL_VERSION` is set.
- **SHAP**: Use `ml.explainability` for SHAP values, waterfall plots.

### React Frontend
- **Components**: Organized by domain (admin, auth, user, insights, common, layout, education, export).
- **Lazy Loading**: `React.lazy()` + `Suspense` in App.jsx for feature-based routes.
- **State**: Local via `useState` in components. Auth/user data in `App.jsx` (localStorage).
- **API Calls**: NEVER raw fetch. Use `apiFetch()` (auth) or `mlFetch()` (ML).
- **Performance**: `deviceCapabilities` detects tier (High/Med/Low). Apply CSS classes globally in App.jsx.

### Frontend Component Domains
| Domain | Location | Components | Purpose |
|--------|----------|------------|---------|
| Export | `components/export/` | Export | CSV data export with filtering (menopause status, risk level), patient demographics, assessment records, PDF insights reports |

### Database
- **Migrations**: Use Goose (`go run ./cmd/migrate`). Format: `-- +goose Up` / `-- +goose Down`.
- **Schema Evolution**: Patients table dropped (v0011). Users now own their health data.
- **SQLC Sync**: CI runs `sqlc generate` to check drift. Local: `bash scripts/check-api-drift.sh`.

## ANTI-PATTERNS (THIS PROJECT)

### Critical Clinical Safety (FORBIDDEN)
- `thesis/generate_executive_summary.py`: "Do NOT use as standalone diagnostic" - ML is screening tool, not diagnosis.
- `thesis/generate_limitations.py`: "Do NOT replace clinical judgment" - Risk scores require clinician review.

### Technical Debt (AVOID)
- Direct SQL in `postgres_admin.go` (`r.pool.QueryRow(ctx, sql, ...)`) - Use SQLC queries instead.
- Manual `strconv.Atoi` for pagination - Use `ParsePagination()` from utils.
- `interface{}` in Go 1.18+ - Use explicit interfaces or `any` with documentation.
- Silent failures in `audit.go` (`_ = a.store...`) - Log errors, don't discard.

### Legacy Patterns
- `scripts/legacy/*.sh`: Python scripts superseded by Python versions - do not use in active workflows.

## BUILD / LINT / TEST COMMANDS

### Backend (Go)
```bash
# Run all tests
make test

# Run specific test package
cd backend && go test -v ./internal/ml

# Run single test file
cd backend && go test -v ./internal/ml/mock_test.go -run TestMockPredictor_Predict

# Run specific test function
cd backend && go test -v ./internal/ml/mock_test.go -run TestMockPredictor_Predict/TestNewMockPredictor

# Run tests with coverage
cd backend && go test -race -coverprofile=coverage.out ./...

# Lint backend
make lint
```

### Frontend (React)
```bash
# Frontend has no 'test' command in package.json
# Use Playwright E2E tests instead:

cd frontend && npx playwright test

# Run specific E2E test
cd frontend && npx playwright test auth.spec.js

# Run with headed mode (debugging)
cd frontend && npx playwright test --headed

# Lint frontend
npm run lint

# Format frontend
npm run format
npm run format:check
```

### ML (Python)
```bash
# Run ML tests
make test-ml

# Run specific test file (via pytest)
cd Ian_ML && pytest predict.py -v

# Train models
make ml-train

# Run ML server
make ml
```

### Database
```bash
# Run all migrations
make migrate

# Run single migration
make db_up 0012
make db_down 0012

# Check migration status
make db_status

# Regenerate SQLC code after schema changes
make sqlc
```

## CODE STYLE GUIDELINES

### Go Backend

#### Import Organization
- **Standard library first**: `errors`, `net/http`, `strconv`, `context`, `time`, `testing`
- **Third-party after**: `github.com/gin-gonic/gin`, `github.com/jackc/pgx/v5/*`, `github.com/pressly/goose/v3`
- **Internal project**: `github.com/skufu/DianaV2/internal/*`
- **Blank line** after each import group for readability

#### Error Handling
- **Standardized errors**: Use `APIError` struct from `handlers/utils.go`:
  ```go
  return c.JSON(http.StatusBadRequest, APIError{
      Code:    "validation_error",
      Message: "Invalid biomarker value",
      Details: "HbA1c must be between4.0-15.0",
  })
  ```
- **Never manual JSON**: Avoid `c.JSON(http.Status..., gin.H{"error": ...})`
- **Context cancellation**: Use `c.AbortWithStatusJSON()` for validation errors

#### Type Safety
- **pgtype for nullable**: Use `pgtype.Text`, `pgtype.Int4`, `pgtype.Numeric` for DB nullable fields
- **Handle pgtype**: Use `.Valid` to check before accessing `.Time`, `.String`, etc.
- **Float comparisons**: Use `numericVal()` helper from `postgres.go` for database decimals

#### Naming Conventions
- **Interfaces**: `Store`, `UserRepository`, `AssessmentRepository` (PascalCase)
- **Implementations**: `PostgresStore`, `pgUserRepo`, `pgAssessmentRepo` (camelCase with `pg` prefix)
- **Test files**: `*_test.go` (suffix `_test.go`)
- **Mock files**: `fake*.go` for fake implementations

#### HTTP Handler Patterns
- **Handler struct**: Each handler has `New...Handler(store)` constructor
- **Register method**: `Register(rg *gin.RouterGroup)` for route registration
- **Dependency injection**: Pass store/interfaces via constructor, not globals
- **Context helpers**: `getUserID(c)`, `getUserClaims(c)` from `handlers/utils.go`

### React Frontend

#### Component Structure
- **Domain folders**: `admin/`, `auth/`, `user/`, `insights/`, `common/`, `layout/`
- **Index exports**: Each domain folder has `index.jsx` for cleaner imports
- **Lazy routes**: Use `React.lazy()` for feature-based code splitting in `App.jsx`

#### API Integration
- **Never raw fetch**: Always use `apiFetch()` (backend) or `mlFetch()` (ML)
- **No manual URLs**: Backend URLs defined in `api.js` as constants
- **Error handling**: All API wrappers return `response.ok` check and throw with `message`
- **Loading states**: Use generic loading state pattern in components

#### State Management
- **Local state**: `useState` for component-specific data
- **Global state**: Auth/user data in `App.jsx` via `localStorage`
- **No Redux/Zustand**: Avoid global state libraries for simple apps
- **Performance**: Use `useMemo` for expensive computations (chart data preparation)

#### Styling
- **Utility-first**: Tailwind CSS utility classes over custom CSS
- **Responsive**: Mobile-first, use `md:` prefix for breakpoints
- **Performance tiers**: Use `deviceCapabilities.js` to detect hardware and conditionally render

#### Testing
- **E2E framework**: Playwright in `e2e/` directory
- **Test naming**: `*.spec.js` files with `test.describe()` and `it()` patterns
- **Mocking**: Use `page.route()` to intercept API calls in E2E tests
- **Fixtures**: Shared test data and selectors in `e2e/fixtures/test-data.js`

### Python ML

#### Code Organization
- **Entry points**: `predict.py` (Flask server), `train.py` (training script)
- **Utility modules**: `ml.explainability`, `ml.ab_testing`, `ml.drift_detection`, `ml.mlflow_config`
- **Configuration**: Load from environment variables, not hardcoded paths

#### Error Handling
- **HTTP errors**: Return `{"error": "message"}` JSON with appropriate status codes
- **Validation**: Use `validate_input()` before calling predictor
- **Logging**: Use standard `logging` module, not `print()`

#### ML Best Practices
- **Model loading**: Lazy-load models via A/B testing framework
- **Experiment tracking**: Use MLflow for all hyperparameters and metrics
- **SHAP explanations**: Use `ml.explainability` module for feature impact
- **Deterministic mocks**: Mock predictor should use fixed rules for reproducible tests

## NOTES

### Schema Refactor (v0011)
Migration 0011 dropped `patients` table entirely. Assessments now link directly to `users` via `user_id`. This was a B2B→B2C platform shift (clinicians→direct users).

### Data Loss Warning
Rollback of v0011 will re-create a blank `patients` table; it does NOT currently restore deleted patient data from transition.

### Role Field
`models.User.Role` is DERIVED from `is_admin` (not in DB). Check `postgres.go` line 64-68 for derivation logic. Required for JWT compatibility with legacy auth.

### Clinical Thresholds
HbA1c, FBS, cholesterol ranges are hardcoded in `backend/internal/ml/validation.go`. These represent SIDD/AQR research methodology.

### Performance Tiering
Frontend detects hardware capabilities and adjusts animation load:
- Low tier: Disables BiologicalNetwork, reduces chart animations
- High tier: Full animations, complex visualizations

### ML Drift Detection
ML server tracks prediction drift via `ml.drift_detection` and logs to MLflow (`ml.mlflow_config.py`). Not yet integrated with Go backend monitoring.

### API Contract
Frontend `api.js` exports typed async functions. Backend handlers use structured errors (`ErrBadRequest`, `ErrInternal`). No manual `c.JSON(400, {...})` in handlers.
