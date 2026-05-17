# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-05
**Updated:** 2026-05-17
**Commit:** current workspace
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
│   └── e2e/            # Archived Playwright E2E tests (not CI-maintained)
├── Ian_ML/                   # Python ML service (Flask)
│   ├── service/          # Flask inference server, predictors, SHAP, drift
│   └── training/         # Defensible training and clustering scripts
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
| `frontend/e2e/` | ✅ Archived | Playwright E2E tests retained for reference; not in CI and not thesis evidence |
| `Ian_ML/` | ✅ Complete | ML service: Flask server, dual predictor, API endpoints |
| `Ian_ML/training/` | ✅ Complete | ML training: defensible CV, K-Means clustering, features |
| `scripts/` | ✅ Complete | Data pipeline, ML training orchestration, thesis generation |
| `docs/` | ✅ Complete | Documentation hub, architecture guides, thesis defense |

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API endpoints | backend/internal/http/handlers/ | REST handlers, auth, assessments |
| DB queries | backend/internal/store/queries/*.sql | SQLC sources |
| Generated code | backend/internal/store/sqlc/*.go | DO NOT EDIT (run sqlc generate) |
| Domain models | backend/internal/models/types.go | Go structs for API |
| ML prediction | Ian_ML/service/predict.py | Dual predictor (ADA baseline vs clinical metabolic) |
| Validation | backend/internal/ml/validation.go | Biomarker range checks |
| Auth flow | backend/internal/http/handlers/auth.go | JWT + refresh tokens |
| PDF export | backend/internal/services/pdf_export_service.go | go-pdf/fpdf library |
| Data layer | backend/internal/store/postgres.go | Repository pattern with SQLC |
| Admin dashboard | frontend/src/components/admin/ | UserManagement, AuditLog, ModelTraceability |
| User flows | frontend/src/components/user/ | Onboarding, Dashboard, Trends, Profile |
| Charts | frontend/src/components/common/ | SHAPExplanation (Recharts integration) |
| API wrapper | frontend/src/api.js | apiFetch/mlFetchJson, React Query hooks, centralized endpoints |
| ML training | Ian_ML/training/train_binary_v2_no_bp.py, scripts/train/train_clusters.py | Defensible nested CV, K-Means |
| Data processing | scripts/data/*.py | NHANES download, merge, imputation |
| Thesis generation | scripts/thesis/*.py | Manuscript verification, vignettes, outputs |
| CI/CD | .github/workflows/ci.yml | Multi-language tests, docker builds |
| Thesis truth audit | docs/07-research/thesis-drafts/ch3+4-codebase-truth-audit.md | Final Chapter 3+4 codebase-truth checklist |

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Predictor | interface | backend/internal/ml/mock.go | HTTP, handlers, validation | ML abstraction with `Predict` and `PredictWithModelType` |
| ValidateBiomarkers | func | backend/internal/ml/validation.go | handlers, config thresholds | Clinical biomarker warnings |
| Store | interface | backend/internal/store/store.go | All repositories | Central contract |
| UserRepository | interface | backend/internal/store/store.go | handlers | User CRUD + trends |
| AssessmentRepository | interface | backend/internal/store/store.go | handlers | Risk assessment CRUD |
| predict(data, model_type) | func | Ian_ML/service/predict.py | Flask router | Inference dispatch helper |
| validate_input(data) | method | Ian_ML/service/predict.py | Flask router | Predictor input safety check |
| DianaPredictor | class | Ian_ML/service/predict.py | Flask router | ADA model wrapper |
| ClinicalPredictor | class | Ian_ML/service/predict.py | Flask router | Metabolic model wrapper |
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
- **Config**: `MODEL_URL` empty triggers mock mode for local dev (production should set the ML endpoint).
- **Headers**: HTTP requests must include `X-Model-Version` if `MODEL_VERSION` is set.
- **SHAP**: Use `ml.explainability` for SHAP values, waterfall plots.

### React Frontend
- **Components**: Organized by domain (admin, auth, user, insights, common, layout, education, export).
- **Lazy Loading**: `React.lazy()` + `Suspense` in App.jsx for feature-based routes.
- **State**: Local via `useState` in components. Auth/user data in `App.jsx` (localStorage).
- **API Calls**: NEVER raw fetch in components. Use exported helpers/hooks from `api.js`; ML calls go through `mlFetchJson()` and the backend `/api/v1/ml` proxy.
- **Performance**: `deviceCapabilities` detects tier (High/Med/Low). Apply CSS classes globally in App.jsx.

### Frontend Component Domains
| Domain | Location | Components | Purpose |
|--------|----------|------------|---------|
| Export | `components/export/` | Export | PDF health report download for the authenticated user |

### Database
- **Migrations**: Use Goose (`go run ./cmd/migrate`). Format: `-- +goose Up` / `-- +goose Down`.
- **Schema Evolution**: Patients table dropped (v0011). Users now own their health data.
- **SQLC Sync**: CI runs `sqlc generate` to check drift. Local: `bash scripts/dev/check-api-drift.sh`.

## ANTI-PATTERNS (THIS PROJECT)

### Critical Clinical Safety (FORBIDDEN)
- `scripts/thesis/generate_executive_summary.py`: "Do NOT use as standalone diagnostic" - ML is screening tool, not diagnosis.
- `scripts/thesis/generate_limitations.py`: "Do NOT replace clinical judgment" - Risk scores require clinician review.

### Data Leakage & ML Safety (FORBIDDEN)
- DO NOT use future biomarker values to predict past outcomes (temporal leakage)
- DO NOT include test data in feature selection or model training
- DO NOT use NHANES sampling weights improperly in CV splits
- NEVER use resampling (SMOTE) without post-hoc calibration
- NEVER trust probability outputs from models trained on resampled data
- DO NOT use `diana_dataset_imputed.csv` for defensible model training

### Technical Debt (AVOID)
HW|- Direct SQL in `postgres_admin.go` (`r.pool.QueryRow(ctx, sql, ...)`) - Use SQLC queries instead.
NX|- Manual `strconv.Atoi` for pagination - Use `ParsePagination()` from utils.
NH|- Legacy `interface{}` still appears in handwritten and test code - prefer explicit interfaces or `any` with documentation in new Go code.
SK|- Fire-and-forget goroutines in `audit.go` - errors are logged but don't block response (potential data loss if DB unavailable).
XZ|- Manual `gin.H{"error": ...}` in handlers - Use `ErrBadRequest()`, `ErrInternal()` from utils.go.

### CI/CD Notes
BV|- `cd.yml` now builds/pushes Docker images and deploys via SSH on version tags; verify required secrets before relying on it.
KM|- `make ml-train` currently calls `Ian_ML/training/train_binary_v2_no_bp.py`.

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
# Run unit/component tests (Vitest + React Testing Library)
cd frontend && npm test

# Run tests with coverage
cd frontend && npm run test:coverage

# Playwright E2E tests are ARCHIVED (not in CI, not maintained)
# See frontend/e2e/AGENTS.md for archival details
# To run locally (requires browser installation):
# npx playwright install && cd frontend && npx playwright test

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
- **Internal project**: `github.com/skufu/DianaV2/backend/internal/*`
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
- **Unit/contract framework**: Vitest + React Testing Library.
- **Coverage command**: `cd frontend && npm run test:coverage`.
- **E2E status**: Playwright tests in `frontend/e2e/` are archived, not in CI, and should not be used as thesis evidence unless restored.

### Python ML

#### Code Organization
- **Entry points**: `service/server.py` (Flask server), `service/predict.py` (predictor classes), `training/train_binary_v2_no_bp.py` (primary training)
- **Utility modules**: `service/explainability.py`, `service/ab_testing.py`, `service/drift_detection.py`, `service/mlflow_config.py`
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
- **Feature constants**: Never hardcode - use `common.feature_constants`

## NOTES

### Schema Refactor (v0011)
Migration 0011 dropped `patients` table entirely. Assessments now link directly to `users` via `user_id`. This was a B2B→B2C platform shift (clinicians→direct users).

### Data Loss Warning
Rollback of v0011 will re-create a blank `patients` table; it does NOT currently restore deleted patient data from transition.

### Role Field
`users.role` exists in the database and `is_admin` remains for compatibility. `backend/internal/store/user_repo.go` normalizes both through `normalizeRoleFields()` so admin role and legacy boolean state stay synchronized.

### Doctor Model Type Locking
Doctors are restricted to using only the `binary_v2_no_bp` model type for assessments. This constant is synchronized across frontend and backend:

**Backend constant** (`backend/internal/http/handlers/assessments.go`):
```go
doctorLockedModelType = "binary_v2_no_bp"
```

**Frontend constants**:
- `frontend/src/components/admin/ClinicalExplainability.jsx` - `DOCTOR_LOCKED_MODEL_TYPE = 'binary_v2_no_bp'`
- `frontend/src/components/admin/AdminDashboard.jsx` - `lockedModelType={userRole === 'doctor' ? 'binary_v2_no_bp' : null}`
- `frontend/src/components/user/AssessmentForm.jsx` - `DEFAULT_MODEL_TYPE = 'binary_v2_no_bp'`

**Verification**: All constants match exactly (case-sensitive). Do NOT modify without synchronizing all locations.

### Clinical Thresholds
HbA1c, FBS, BMI, blood pressure, and lipid thresholds are loaded through `backend/internal/config/config.go` defaults and consumed by `backend/internal/ml/validation.go`.

### Performance Tiering
Frontend detects hardware capabilities and adjusts animation load:
- Low tier: Disables BiologicalNetwork, reduces chart animations
- High tier: Full animations, complex visualizations

### ML Drift Detection
ML server tracks drift via `Ian_ML/service/drift_detection.py` and optional scheduler hooks. Go admin model routes expose drift status and alerts through `/api/v1/admin/models/drift` and `/api/v1/admin/models/drift/alerts`.

### Thesis Chapter 3+4
Use `docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md` as the clean thesis-ready Chapter 3+4 file. Treat `docs/07-research/thesis-drafts/ch3+4.md` as the detailed technical backup. Use APA-style author-date citations. Before submission, prioritize codebase truth using `docs/07-research/thesis-drafts/ch3+4-codebase-truth-audit.md` and `docs/07-research/thesis-drafts/thesis-readiness-audit.md`.

### API Contract
Frontend `api.js` exports typed async functions. Backend handlers use structured errors (`ErrBadRequest`, `ErrInternal`). No manual `c.JSON(400, {...})` in handlers.

### Git Hygiene (IMMEDIATE ACTION)
Run these to fix committed artifacts:
```bash
# Remove committed cache directories
git rm --cached -r venv/ __pycache__/ .pytest_cache/ mlruns/ catboost_info/
git rm --cached backend/server.exe

# Verify .gitignore has these patterns
echo "venv/" >> .gitignore
echo "__pycache__/" >> .gitignore
echo ".pytest_cache/" >> .gitignore
echo "mlruns/" >> .gitignore
echo "catboost_info/" >> .gitignore
echo "*.exe" >> .gitignore
```
