# Diana V2

> **Predictive diabetes risk assessment application for menopausal women**

A full-stack health application designed for menopausal women to assess diabetes risk using machine learning predictions. Built with Go, React, Flask (Python), and PostgreSQL.

---

## - Directory Index

| Directory | Purpose | Key Files | README |
|-----------|---------|-----------|--------|
| `backend/` | Go/Gin REST API server | `cmd/server/main.go`, `internal/http/handlers/*.go` | [backend/README.md](./backend/README.md) |
| `frontend/` | React/Vite web client | `src/App.jsx`, `src/api.js`, `src/components/` | [frontend/README.md](./frontend/README.md) |
| `Ian_ML/` | Flask ML prediction server | `server.py`, `predict.py`, `train.py` | [Ian_ML/README.md](./Ian_ML/README.md) |
| `scripts/` | Dev utilities & data processing | `dev/setup.sh`, `dev/start-all.sh`, `data/process_nhanes_multi.py` | [scripts/README.md](./scripts/README.md) |
| `docs/` | Documentation | `01-architecture/detailed-architecture.md`, `02-guides/backend.md`, `02-guides/ml-system.md` | [docs/README.md](./docs/README.md) |
| `data/` | NHANES dataset files | `nhanes/*.XPT` | [data/README.md](./data/README.md) |
| `models/` | Trained ML artifacts | `best_model.joblib`, `scaler.joblib` | [models/README.md](./models/README.md) |

---

## File Search Index

### Backend (Go)
| File | Absolute Path | Purpose |
|------|---------------|---------|
| API Routes | `backend/internal/http/router/router.go` | Route definitions |
| Auth Handler | `backend/internal/http/handlers/auth.go` | Login, register, JWT |
| Users Handler | `backend/internal/http/handlers/users.go` | User profile, onboarding, consent, trends |
| Assessment Handler | `backend/internal/http/handlers/assessments.go` | Create assessments, call ML |
| Analytics Handler | `backend/internal/http/handlers/analytics.go` | Dashboard statistics |
| Insights Handler | `backend/internal/http/handlers/insights.go` | ML metrics, cluster distribution |
| Auth Events Handler | `backend/internal/http/handlers/auth_events.go` | SSE auth event streaming |
| Clinic Dashboard | `backend/internal/http/handlers/clinic_dashboard.go` | Clinic member dashboard |
| Cohort Handler | `backend/internal/http/handlers/cohort.go` | Cohort analysis endpoints |
| Export Handler | `backend/internal/http/handlers/export.go` | CSV export functionality |
| Health Handler | `backend/internal/http/handlers/health.go` | Health check endpoints |
| Admin Users | `backend/internal/http/handlers/admin_users.go` | User CRUD operations |
| Admin Audit | `backend/internal/http/handlers/admin_audit.go` | Audit log viewing |
| Admin Models | `backend/internal/http/handlers/admin_models.go` | ML model tracking |
| Admin Dashboard | `backend/internal/http/handlers/admin_dashboard.go` | Admin system stats |
| Utils | `backend/internal/http/handlers/utils.go` | Handler utilities |
| RBAC Middleware | `backend/internal/http/middleware/rbac.go` | Role-based access control |
| ML Predictor | `backend/internal/ml/http_predictor.go` | HTTP client for ML server |
| PDF Generator | `backend/internal/pdf/generator.go` | PDF report generation |
| SSE Broker | `backend/internal/http/sse/broker.go` | Server-Sent Events broker |
| Redis Cache | `backend/internal/cache/redis_cache.go` | Caching layer |
| Validation Service | `backend/internal/services/validation_service.go` | Biomarker validation |
| PDF Export Service | `backend/internal/services/pdf_export_service.go` | PDF export service |
| DB Queries | `backend/internal/store/sqlc/*.sql.go` | SQLC generated query code |
| Config | `backend/internal/config/config.go` | Environment loading |

### Frontend (React)
| File | Absolute Path | Purpose |
|------|---------------|---------|
| Main App | `frontend/src/App.jsx` | Routing, auth state |
| API Layer | `frontend/src/api.js` | Fetch wrapper, token refresh |
| Main Dashboard | `frontend/src/components/user/Dashboard_user.jsx` | Main dashboard overview |
| User Dashboard | `frontend/src/components/user/Dashboard_user.jsx` | User overview, assessments |
| User Profile | `frontend/src/components/user/UserProfile.jsx` | Profile management |
| Onboarding | `frontend/src/components/user/Onboarding.jsx` | Multi-step onboarding |
| Personal Trends | `frontend/src/components/user/PersonalTrends.jsx` | Assessment trend charts |
| Assessment Form | `frontend/src/components/user/AssessmentForm.jsx` | Biomarker input form |
| Admin Dashboard | `frontend/src/components/admin/AdminDashboard.jsx` | Admin system stats |
| User Management | `frontend/src/components/admin/UserManagement.jsx` | User CRUD operations |
| Audit Log Viewer | `frontend/src/components/admin/AuditLogViewer.jsx` | Audit log viewing |
| Auth Event Log Viewer | `frontend/src/components/admin/AuthEventLogViewer.jsx` | Auth event streaming |
| Model Traceability | `frontend/src/components/admin/ModelTraceability.jsx` | ML model tracking |
| Admin Sidebar | `frontend/src/components/layout/AdminSidebar.jsx` | Admin navigation |
| Main Sidebar | `frontend/src/components/layout/Sidebar.jsx` | Main navigation |
| Biological Network | `frontend/src/components/layout/BiologicalNetwork.jsx` | Animated background |
| Mouse Glow | `frontend/src/components/layout/MouseGlow.jsx` | Visual effect |
| Login | `frontend/src/components/auth/Login.jsx` | Authentication forms |
| Signup | `frontend/src/components/auth/Signup.jsx` | Registration form |
| Insights Main | `frontend/src/components/insights/Insights.jsx` | ML visualizations, analytics |
| Insights Header | `frontend/src/components/insights/InsightsHeader.jsx` | Insights navigation |
| Insights Summary | `frontend/src/components/insights/InsightsSummary.jsx` | Overview cards |
| Biomarker Trends | `frontend/src/components/insights/BiomarkerTrends.jsx` | Trend charts |
| BMI Glucose Correlation | `frontend/src/components/insights/BMIGlucoseCorrelation.jsx` | Correlation analysis |
| Cluster Comparison | `frontend/src/components/insights/ClusterComparison.jsx` | Cluster comparison |
| Cohort Analysis | `frontend/src/components/insights/CohortAnalysis.jsx` | Cohort comparison analysis |
| Model Performance | `frontend/src/components/insights/ModelPerformance.jsx` | ML metrics |
| Risk Distribution | `frontend/src/components/insights/RiskDistribution.jsx` | Risk visualization |
| Risk Factor Chart | `frontend/src/components/insights/RiskFactorChart.jsx` | Feature importance |
| Subgroup Distribution | `frontend/src/components/insights/SubgroupDistribution.jsx` | Cluster distribution |
| Visualization Card | `frontend/src/components/insights/VisualizationCard.jsx` | Card component |
| Export | `frontend/src/components/export/Export.jsx` | PDF export functionality |
| Education | `frontend/src/components/education/Education.jsx` | Educational content |
| Biomarker Input | `frontend/src/components/common/BiomarkerInput.jsx` | Biomarker input component |
| Button | `frontend/src/components/common/Button.jsx` | Button component |
| Cluster Recommendations | `frontend/src/components/common/ClusterRecommendations.jsx` | Recommendations display |
| Cluster Tooltip | `frontend/src/components/common/ClusterTooltip.jsx` | Tooltip component |
| Risk Indicator | `frontend/src/components/common/RiskIndicator.jsx` | Risk status display |
| SHAP Explanation | `frontend/src/components/common/SHAPExplanation.jsx` | Feature contributions |
| PDF Export | `frontend/src/components/common/PDFExport.jsx` | PDF export button |
| Error Boundary | `frontend/src/components/common/ErrorBoundary.jsx` | Error handling |
| Custom Cursor | `frontend/src/components/common/CustomCursor.jsx` | Custom cursor effect |

### ML (Python)
| File | Absolute Path | Purpose |
|------|---------------|---------|
| Flask Server | `Ian_ML/service/server.py` | API endpoints |
| Predictors | `Ian_ML/service/predict.py` | DianaPredictor, ClinicalPredictor |
| Training | `Ian_ML/training/train_v2.py` | Clinical model training (defensible) |
| Training Legacy | `Ian_ML/training/train_legacy.py` | Archived v1 training (non-defensible) |
| Clustering | `Ian_ML/training/clustering.py` | K-Means (K=4 Ahlqvist subtypes) |
| Data Processing | `Ian_ML/training/data_processing.py` | NHANES data pipeline |
| Explainability | `Ian_ML/service/explainability.py` | SHAP explanations |
| Explainer | `Ian_ML/service/explainer.py` | Explainer utilities |
| A/B Testing | `Ian_ML/service/ab_testing.py` | A/B testing infrastructure |
| Drift Detection | `Ian_ML/service/drift_detection.py` | Model drift monitoring |
| MLflow Config | `Ian_ML/service/mlflow_config.py` | MLflow experiment tracking |
| Data Pipeline Script | `scripts/data/process_nhanes_multi.py` | NHANES download and processing |
| Feature Selection | `scripts/data/feature_selection.py` | Mutual Information + IG analysis |
| Cluster Training | `scripts/train/train_clusters.py` | K-Means, CatBoost |
| Thesis Outputs | `scripts/thesis/generate_thesis_outputs.py` | All-in-one thesis artifact generator |
| ML Rationale | `docs/03-ml/rationale.md` | Defense-ready methodology justification |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.21+, Gin, SQLC |
| Frontend | React 18, Vite, Tailwind CSS |
| Database | PostgreSQL (Goose migrations) |
| ML | Python 3.10+, Flask, scikit-learn, XGBoost |

---

## Quick Start

### Prerequisites (Auto-Install Enabled!)
The setup script **WILL ATTEMPT TO AUTO-INSTALL** missing tools. If you don't have them, the script will try to install them for you.

**If auto-install fails, you'll get exact manual installation commands.**

### Automated Setup (One Command - Does EVERYTHING)

#### macOS / Linux
```bash
git clone <repository-url>
cd DianaV2
bash scripts/dev/setup.sh    # Sets up EVERYTHING (deps, DB, env)
bash scripts/dev/start-all.sh # Starts all services
```

#### Windows (PowerShell / Git Bash)
```powershell
git clone <repository-url>
cd DianaV2
# Option 1: PowerShell
powershell -ExecutionPolicy Bypass -File scripts/dev/setup.ps1
# Option 2: Git Bash
bash scripts/dev/setup.sh

# Then start the application
bash scripts/dev/start-all.sh
```

**What the setup script does (literally everything):**

**🔧 Tool Installation (with auto-attempt):**
1. ✅ **ATTEMPTS AUTO-INSTALL** of missing Go, Node.js, Python
2. ✅ Auto-installs Goose (database migration tool)
3. ✅ Checks for Docker (optional, for PostgreSQL)

**⚙️ Environment Setup:**
4. ✅ Creates `.env` files with secure JWT secrets
5. ✅ Copies environment config to backend/
6. ✅ Creates frontend environment config

**🗄️ Database Setup:**
7. ✅ **AUTO-CREATES PostgreSQL database with Docker** (if available)
8. ✅ Runs database migrations automatically

**📦 Dependencies:**
9. ✅ Downloads Go dependencies (`go mod download`)
10. ✅ Installs frontend npm packages (`npm install`)
11. ✅ Creates Python virtual environment
12. ✅ Installs ML server dependencies

**✅ Verification:**
13. ✅ Creates `.setup-verification.txt` with full setup log
14. ✅ Checks for ML models and warns if missing

### Auto-Install Feature

The setup script **aggressively tries to install missing tools** before giving up:

**macOS/Linux:**
- Tries `brew install` for macOS
- Tries `apt-get`, `yum`, or `pacman` for Linux

**Windows:**
- Tries `winget install` (Windows Package Manager)
- Tries `choco install` (Chocolatey)

**If auto-install fails:**
- The script will show **EXACT installation commands** for your OS
- It creates `.setup-verification.txt` showing what was attempted
- You can copy the commands and run them manually
- Then just re-run the setup script

**Example output when auto-install fails:**
```
╭────────────────────────────────────────────────────────────╮
│  MISSING REQUIRED TOOLS - MANUAL INSTALLATION REQUIRED     │
╰────────────────────────────────────────────────────────────╯

The script attempted to auto-install but failed for:
  ✗ Go
  ✗ Node.js

Manual Installation Instructions:
  Go:
    macOS:   brew install go
    Linux:   sudo apt-get install golang-go
    Windows: https://go.dev/doc/install

After installing, re-run: bash scripts/dev/setup.sh
```

### Setup Verification
After setup completes, verify everything worked:
```bash
# Check the verification file
cat .setup-verification.txt

# Should show:
# - All tools installed ✓
# - PostgreSQL running ✓
# - Dependencies installed ✓
# - Database migrated ✓
```

### Common Issues

**"PostgreSQL not running" warning**
- Install Docker Desktop and re-run setup
- Or install PostgreSQL manually

**"ML models not found"**
- Train models: `bash scripts/dev/retrain-clinical.sh`
- Or copy from teammate who has them

**Permission denied on PowerShell**
- Run PowerShell as Administrator
- Or use: `powershell -ExecutionPolicy Bypass -File scripts/dev/setup.ps1`

### Access Points
| Service | URL |
|---------|-----|
| Frontend | http://localhost:4000 |
| Backend | http://localhost:8080/api/v1/healthz |
| ML Server | http://localhost:5001/health |

---

## API Endpoints Summary

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/healthz` | Health check |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/register` | Create account |

### Protected (JWT Required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me/profile` | Get current user profile |
| PUT | `/api/v1/users/me/profile` | Update user profile |
| POST | `/api/v1/users/me/onboarding` | Complete onboarding flow |
| GET | `/api/v1/users/me/consent` | Get consent settings |
| PUT | `/api/v1/users/me/consent` | Update consent settings |
| GET | `/api/v1/users/me/trends` | Get assessment trends |
| DELETE | `/api/v1/users/me/account` | Delete user account |
| GET | `/api/v1/users/me/assessments` | List user assessments |
| POST | `/api/v1/users/me/assessments` | Create assessment (calls ML) |
| GET | `/api/v1/users/me/assessments/:id` | Get single assessment |
| PUT | `/api/v1/users/me/assessments/:id` | Update assessment |
| DELETE | `/api/v1/users/me/assessments/:id` | Delete assessment |
| GET | `/api/v1/analytics/summary` | Dashboard stats |

### Admin (JWT + Admin Role Required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/users` | List users (paginated) |
| POST | `/api/v1/admin/users` | Create user |
| PUT | `/api/v1/admin/users/:id` | Update user |
| DELETE | `/api/v1/admin/users/:id` | Deactivate user |
| GET | `/api/v1/admin/audit` | Audit logs |
| GET | `/api/v1/admin/models` | Model run history |

### ML Server
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | ML health check |
| POST | `/predict` | Single prediction |
| GET | `/insights/metrics` | Model performance |

---

## Available Commands

```bash
# Development
bash scripts/dev/setup.sh      # Initial project setup
bash scripts/dev/start-all.sh  # Start backend + frontend + ML
make dev        # Start backend only

# Database
make db_up      # Apply migrations
make db_down    # Rollback migration
make db_status  # Migration status
make seed       # Create demo users
make sqlc       # Regenerate queries

# Testing
make test       # Run backend tests
make lint       # Run linter
make build      # Build backend
```

---

## Environment Variables

### Backend (.env)
```bash
PORT=8080
ENV=dev
DB_DSN=postgres://user:pass@localhost:5432/diana?sslmode=disable
JWT_SECRET=your-secure-random-secret-min-32-chars  # REQUIRED for ALL environments
CORS_ORIGINS=http://localhost:4000
MODEL_URL=http://localhost:5001/predict
ML_PORT=5001
MODEL_VERSION=binary_v2_no_bp  # Options: binary_v2_no_bp (default) or clinical_3class
MODEL_DATASET_HASH=nhanes_postmenopausal_2011_2020
MODEL_TIMEOUT_MS=2000
ML_API_KEY=your-secure-ml-api-key  # Optional for dev, required for production
```

**Important**: `JWT_SECRET` is **required** for ALL environments (development, staging, production). The application will fail to start with a fatal error if `JWT_SECRET` is missing. Use a secure random string of at least 32 characters.

**ML API Key**: `ML_API_KEY` is **required** for production ML service authentication. In local development, it can be omitted to allow unauthenticated ML calls; the ML server will return 401 Unauthorized when a key is configured but missing in requests. The frontend should set `VITE_ML_API_KEY` to match when auth is enabled.

### Frontend (frontend/.env.local)
```bash
VITE_API_BASE=http://localhost:8080
VITE_ML_BASE=http://localhost:5001
VITE_ML_API_KEY=your-secure-ml-api-key  # Must match ML_API_KEY
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Demo (User) | demo@diana.app | demopassword123 |
| Admin | admin@diana.app | admin123 |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check credentials, run `make seed` |
| DB connection error | Verify PostgreSQL running, check DB_DSN |
| CORS errors | Add frontend URL to CORS_ORIGINS |
| ML timeout | Check ML server running at MODEL_URL |
| Port 5000 error | Change ML_PORT to 5001 or disable AirPlay Receiver in macOS System Settings |
| ML API 401 errors | Verify ML_API_KEY in backend/.env and VITE_ML_API_KEY in frontend/.env.local match |

---

## Documentation

| Topic | Document |
|-------|----------|
| System Overview | [docs/01-architecture/overview.md](./docs/01-architecture/overview.md) |
| Architecture Details | [docs/01-architecture/detailed-architecture.md](./docs/01-architecture/detailed-architecture.md) |
| Backend Guide | [docs/02-guides/backend.md](./docs/02-guides/backend.md) |
| Frontend Guide | [docs/02-guides/frontend.md](./docs/02-guides/frontend.md) |
| ML System | [docs/02-guides/ml-system.md](./docs/02-guides/ml-system.md) |
| Database | [docs/02-guides/database.md](./docs/02-guides/database.md) |
| Admin Dashboard | [docs/02-guides/admin.md](./docs/02-guides/admin.md) |
| ML API Contract | [docs/03-ml/api-contract.md](./docs/03-ml/api-contract.md) |
| ML Methodology | [docs/03-ml/methodology.md](./docs/03-ml/methodology.md) |
| Local Setup | [docs/04-development/local-setup.md](./docs/04-development/local-setup.md) |
| Deployment | [docs/06-operations/deployment.md](./docs/06-operations/deployment.md) |
| Documentation Hub | [docs/README.md](./docs/README.md) |

---

## Search Keywords

`diabetes` `prediction` `menopausal women` `biomarkers` `HbA1c` `machine learning` `Go` `Gin` `React` `Vite` `PostgreSQL` `Flask` `XGBoost` `Random Forest` `K-Means` `clustering` `NHANES` `ADA criteria` `SIRD` `SIDD` `MOD` `MARD` `JWT` `authentication` `REST API` `SQLC`
