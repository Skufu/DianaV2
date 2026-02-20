# DIANA V2 - Codebase Map

> Quick reference for navigating the codebase structure and locating key files.

---

## Project Structure Overview

```
DianaV2/
├── backend/          # Go REST API (Gin framework)
├── frontend/         # React SPA (Vite + Tailwind)
├── Ian_ML/             # Python ML server (Flask)
├── models/           # Trained ML artifacts
├── data/             # NHANES dataset files
├── scripts/          # Utilities & data processing
├── docs/             # Documentation
└── configs/          # Environment templates
```

---

## Backend (`backend/`)

### Entry Point
| File | Purpose |
|------|---------|
| `cmd/server/main.go` | Application entry, server initialization |
| `cmd/seed/main.go` | Database seeding utility |
| `cmd/migrate/main.go` | Migration runner |

### Core Packages (`internal/`)

#### HTTP Layer (`internal/http/`)

**Router**
| File | Purpose |
|------|---------|
| `router/router.go` | Route definitions, middleware chain |

**Handlers** (`handlers/`)
| File | Purpose |
|------|---------|
| `auth.go` | Login, register, token refresh |
| `users.go` | Profile, onboarding, consent, trends |
| `assessments.go` | Create/list assessments, ML calls |
| `insights.go` | Dashboard statistics |
| `cohort.go` | Cohort analysis |
| `export.go` | Data export (CSV/PDF) |
| `clinic_dashboard.go` | Clinic-level views |
| `admin_users.go` | User management (admin) |
| `admin_audit.go` | Audit log viewer (admin) |
| `admin_models.go` | Model run history (admin) |
| `admin_dashboard.go` | Admin statistics |
| `health.go` | Health check endpoint |

**Middleware** (`middleware/`)
| File | Purpose |
|------|---------|
| `auth.go` | JWT validation |
| `rbac.go` | Role-based access control |
| `audit.go` | Action logging |
| `logger.go` | Structured request logging |
| `ratelimit.go` | Rate limiting |
| `security.go` | Security headers (CORS, CSP) |

#### Data Layer (`internal/store/`)

| File | Purpose |
|------|---------|
| `postgres.go` | Database connection, store interface |
| `postgres_admin.go` | Admin-specific queries |
| `postgres_cohort.go` | Cohort analysis queries |
| `store.go` | Interface definitions |

**SQLC Generated** (`store/sqlc/`)
| File | Source Query |
|------|--------------|
| `users.sql.go` | `queries/users.sql` |
| `assessments.sql.go` | `queries/assessments.sql` |
| `admin_users.sql.go` | `queries/admin_users.sql` |
| `clinics.sql.go` | `queries/clinics.sql` |
| `cohort.sql.go` | `queries/cohort.sql` |
| `audit_events.sql.go` | `queries/audit_events.sql` |
| `model_runs.sql.go` | `queries/model_runs.sql` |

#### ML Integration (`internal/ml/`)
| File | Purpose |
|------|---------|
| `http_predictor.go` | HTTP client for ML server |
| `validation.go` | Biomarker input validation |
| `mock.go` | Mock predictor for testing |

#### Services (`internal/services/`)
| File | Purpose |
|------|---------|
| `validation_service.go` | Data validation logic |
| `pdf_export_service.go` | PDF report generation |
| `notification_service.go` | Email/notifications |

#### Other Packages
| Package | Purpose |
|---------|---------|
| `config/` | Environment configuration |
| `models/` | Domain types (User, Assessment) |
| `pdf/` | PDF generation utilities |

### Database Migrations (`migrations/`)
| Migration | Purpose |
|-----------|---------|
| `0001_init.sql` | Initial schema |
| `0002_*` | Family history, physical activity |
| `0003_*` | Timestamps, indexes |
| `0004_*` | Refresh tokens |
| `0005_*` | User-patient relationship |
| `0006_*` | Mock/demo data |
| `0007-0008_*` | Cluster name updates |
| `0009_*` | Clinics (multi-tenancy) |
| `0010_*` | Admin features, audit tables |
| `0011_*` | User schema refinements |

### Config Files
| File | Purpose |
|------|---------|
| `go.mod` | Go dependencies |
| `sqlc.yaml` | SQLC code generation |
| `.air.toml` | Hot-reload config |

---

## Frontend (`frontend/src/`)

### Application Core
| File | Purpose |
|------|---------|
| `main.jsx` | React DOM mount |
| `App.jsx` | Root component, routing, auth state |
| `api.js` | API client, token management |
| `index.css` | Global styles |

### Components

#### User-Facing (`components/user/`)
| Component | Purpose |
|-----------|---------|
| `Dashboard_user.jsx` | Main user dashboard |
| `UserProfile.jsx` | Profile & assessment entry |
| `Onboarding.jsx` | New user setup flow |
| `PersonalTrends.jsx` | Biomarker trend charts |

#### Authentication (`components/auth/`)
| Component | Purpose |
|-----------|---------|
| `Login.jsx` | Login/registration forms |

#### Insights (`components/insights/`)
| Component | Purpose |
|-----------|---------|
| `Insights.jsx` | ML visualizations, metrics |
| `CohortAnalysis.jsx` | Population comparisons |

#### Admin (`components/admin/`)
| Component | Purpose |
|-----------|---------|
| `AdminDashboard.jsx` | Admin overview |
| `UserManagement.jsx` | User CRUD |
| `AuditLogViewer.jsx` | Action history |
| `AuthEventLogViewer.jsx` | Auth events |
| `ModelTraceability.jsx` | Model runs |

#### Common (`components/common/`)
| Component | Purpose |
|-----------|---------|
| `BiomarkerInput.jsx` | Form input fields |
| `Button.jsx` | Reusable button |
| `ClusterRecommendations.jsx` | Cluster explanations |
| `ClusterTooltip.jsx` | Cluster info popover |
| `ErrorBoundary.jsx` | Error handling wrapper |
| `ErrorFallback.jsx` | Error UI |
| `PDFExport.jsx` | PDF generation |
| `RiskIndicator.jsx` | Risk visualization |
| `SHAPExplanation.jsx` | Model interpretability |
| `CustomCursor.jsx` | Custom cursor effect |

#### Layout (`components/layout/`)
| Component | Purpose |
|-----------|---------|
| `Sidebar.jsx` | Navigation sidebar |
| `BiologicalNetwork.jsx` | Background animation |
| `MouseGlow.jsx` | Cursor glow effect |

#### Other
| Directory | Purpose |
|-----------|---------|
| `dashboard/` | Dashboard variants |
| `education/` | Educational content |
| `export/` | Data export UI |

### Utilities (`utils/`)
| File | Purpose |
|------|---------|
| `deviceCapabilities.js` | Performance detection |
| `validation.js` | Form validation |

### Testing (`e2e/`)
| File | Purpose |
|------|---------|
| `auth.spec.js` | Authentication tests |
| `assessment.spec.js` | Assessment flow tests |
| `navigation.spec.js` | UI navigation tests |
| `fixtures/test-data.js` | Test data |

### Config Files
| File | Purpose |
|------|---------|
| `package.json` | Dependencies |
| `vite.config.js` | Vite bundler |
| `tailwind.config.js` | Tailwind CSS |
| `playwright.config.js` | E2E testing |
| `eslint.config.js` | Linting rules |

---

## ML Server (`Ian_ML/`)

### Core Files
| File | Purpose |
|------|---------|
| `server.py` | Flask API endpoints |
| `predict.py` | Predictor classes (Diana, Clinical) |
| `train.py` | Model training pipeline |
| `clustering.py` | K-Means clustering (K=4 subtypes) |

### Supporting Modules
| File | Purpose |
|------|---------|
| `data_processing.py` | Data transformation, scaling |
| `explainability.py` | SHAP explanations |
| `explainer.py` | Feature importance |
| `ab_testing.py` | A/B testing framework |
| `drift_detection.py` | Model drift monitoring |
| `mlflow_config.py` | Experiment tracking |

### Config
| File | Purpose |
|------|---------|
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Container build |

---

## ML Artifacts (`models/`)

### Root Models
| File | Purpose |
|------|---------|
| `best_model.joblib` | Primary prediction model |
| `kmeans_model.joblib` | Clustering model |
| `scaler.joblib` | Feature scaler |

### Clinical Models (`clinical/`)
| File | Purpose |
|------|---------|
| `best_model.joblib` | Main clinical model |
| `best_model_calibrated.joblib` | Calibrated model |
| `xgboost.joblib` | XGBoost variant |
| `catboost.joblib` | CatBoost variant |
| `lightgbm.joblib` | LightGBM variant |
| `random_forest.joblib` | Random Forest |
| `voting_ensemble.joblib` | Voting ensemble |
| `stacking_ensemble.joblib` | Stacking ensemble |

### Results (`results/`)
| File | Purpose |
|------|---------|
| `best_model_report.json` | Performance metrics |
| `cluster_analysis.json` | Clustering validation |
| `model_comparison.csv` | Model comparison |

---

## Scripts (`scripts/`)

### Development
| Script | Purpose |
|--------|---------|
| `setup.sh` | Project setup |
| `run-dev.sh` | Start all services |
| `start-all.sh` | Multi-service orchestration |

### Data Processing
| Script | Purpose |
|--------|---------|
| `process_nhanes_multi.py` | NHANES data processing |
| `download_nhanes_multi.py` | Dataset download |
| `feature_selection.py` | Feature analysis |

### Training
| Script | Purpose |
|--------|---------|
| `train.py` | Model training |
| `train_clusters.py` | Clustering |
| `train_enhanced.py` | Enhanced training |
| `retrain-all.sh` | Full retraining pipeline |

### Analysis
| Script | Purpose |
|--------|---------|
| `generate_thesis_outputs.py` | Thesis artifacts |
| `ablation_study.py` | Feature ablation |
| `calculate_metrics.py` | Performance metrics |
| `evaluate_clusters.py` | Cluster evaluation |

---

## API Routes Quick Reference

### Authentication
| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/v1/auth/login` | `auth.go` |
| POST | `/api/v1/auth/register` | `auth.go` |
| POST | `/api/v1/auth/refresh` | `auth.go` |

### User Self-Service
| Method | Path | Handler |
|--------|------|---------|
| GET/PUT | `/api/v1/users/me/profile` | `users.go` |
| POST | `/api/v1/users/me/onboarding` | `users.go` |
| GET/PUT | `/api/v1/users/me/consent` | `users.go` |
| GET | `/api/v1/users/me/trends` | `users.go` |
| POST/GET | `/api/v1/users/me/assessments` | `assessments.go` |
| GET | `/api/v1/users/me/export` | `export.go` |

### Insights
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/insights/summary` | `insights.go` |
| GET | `/api/v1/insights/cohort` | `cohort.go` |

### Admin
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/admin/dashboard` | `admin_dashboard.go` |
| GET/POST | `/api/v1/admin/users` | `admin_users.go` |
| GET | `/api/v1/admin/audit` | `admin_audit.go` |
| GET | `/api/v1/admin/models` | `admin_models.go` |

### ML Server
| Method | Path | Handler |
|--------|------|---------|
| GET | `/health` | `server.py` |
| POST | `/predict` | `server.py` |
| GET | `/insights/metrics` | `server.py` |

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts, profiles |
| `assessments` | Risk assessment records |
| `patients` | Biomarker data |
| `clinics` | Multi-tenant clinics |
| `audit_events` | Action logging |
| `model_runs` | ML prediction history |
| `refresh_tokens` | JWT token management |

---

## Environment Variables

### Backend (`.env`)
```
PORT=8080
ENV=dev
DB_DSN=postgres://...
JWT_SECRET=...
MODEL_URL=http://localhost:5001/predict
MODEL_VERSION=clinical_v2
MODEL_TIMEOUT_MS=2000
CORS_ORIGINS=http://localhost:4000
```

### Frontend (`frontend/.env.local`)
```
VITE_API_BASE=http://localhost:8080
VITE_ML_BASE=http://localhost:5001
VITE_ML_PORT=5001
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Backend | Go 1.24, Gin, SQLC, pgx |
| Frontend | React 18, Vite, Tailwind, Recharts |
| Database | PostgreSQL, Goose migrations |
| ML | Python 3.10+, Flask, scikit-learn, XGBoost |
| Auth | JWT (golang-jwt) |
| Testing | Go testing, Playwright |

---

## Common Tasks - File Locations

| Task | Primary Files |
|------|---------------|
| Add API endpoint | `router/router.go` → `handlers/*.go` |
| Add database query | `store/queries/*.sql` → run `make sqlc` |
| Add frontend page | `App.jsx` → `components/*/` |
| Modify ML prediction | `Ian_ML/service/predict.py` |
| Add migration | `migrations/*.sql` → run `make db_up` |
| Update auth logic | `middleware/auth.go`, `handlers/auth.go` |
| Add admin feature | `handlers/admin_*.go`, `components/admin/` |
