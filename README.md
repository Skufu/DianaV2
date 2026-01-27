# Diana V2

> **Predictive diabetes risk assessment application for menopausal women**

A full-stack health application designed for menopausal women to assess diabetes risk using machine learning predictions. Built with Go, React, Flask (Python), and PostgreSQL.

---

## - Directory Index

| Directory | Purpose | Key Files | README |
|-----------|---------|-----------|--------|
| `backend/` | Go/Gin REST API server | `cmd/server/main.go`, `internal/http/handlers/*.go` | [backend/README.md](./backend/README.md) |
| `frontend/` | React/Vite web client | `src/App.jsx`, `src/api.js`, `src/components/` | [frontend/README.md](./frontend/README.md) |
| `ml/` | Flask ML prediction server | `server.py`, `predict.py`, `train.py` | [ml/README.md](./ml/README.md) |
| `scripts/` | Dev utilities & data processing | `setup.sh`, `run-dev.sh`, `process_nhanes_multi.py` | [scripts/README.md](./scripts/README.md) |
| `docs/` | Documentation | `ARCHITECTURE.md`, `BACKEND.md`, `ML_SYSTEM.md` | [docs/README.md](./docs/README.md) |
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
| Auth Events Handler | `backend/internal/http/handlers/auth_events.go` | SSE auth event streaming |
| Analytics Handler | `backend/internal/http/handlers/analytics.go` | Dashboard statistics |
| Insights Handler | `backend/internal/http/handlers/insights.go` | ML metrics, cluster distribution |
| Clinic Dashboard | `backend/internal/http/handlers/clinic_dashboard.go` | Clinic member dashboard |
| Cohort Handler | `backend/internal/http/handlers/cohort.go` | Cohort analysis endpoints |
| Admin Handlers | `backend/internal/http/handlers/admin_*.go` | User mgmt, audit, models |
| RBAC Middleware | `backend/internal/http/middleware/rbac.go` | Role-based access control |
| ML Predictor | `backend/internal/ml/http_predictor.go` | HTTP client for ML server |
| DB Queries | `backend/internal/store/sqlc/*.sql.go` | SQLC generated query code |
| Config | `backend/internal/config/config.go` | Environment loading |

### Frontend (React)
| File | Absolute Path | Purpose |
|------|---------------|---------|
| Main App | `frontend/src/App.jsx` | Routing, auth state |
| API Layer | `frontend/src/api.js` | Fetch wrapper, token refresh |
| User Dashboard | `frontend/src/components/user/Dashboard_user.jsx` | User overview, assessments |
| Admin Dashboard | `frontend/src/components/admin/AdminDashboard.jsx` | Admin system stats |
| Profile | `frontend/src/components/user/UserProfile.jsx` | Profile management |
| Onboarding | `frontend/src/components/user/Onboarding.jsx` | Multi-step onboarding |
| Insights | `frontend/src/components/insights/Insights.jsx` | ML visualizations, analytics |
| Export | `frontend/src/components/export/Export.jsx` | PDF export functionality |
| Login | `frontend/src/components/auth/Login.jsx` | Authentication forms |

### ML (Python)
| File | Absolute Path | Purpose |
|------|---------------|---------|
| Flask Server | `ml/server.py` | API endpoints |
| Predictors | `ml/predict.py` | DianaPredictor, ClinicalPredictor |
| Training | `ml/train.py` | Clinical model training (non-circular) |
| Clustering | `ml/clustering.py` | K-Means (K=4 Ahlqvist subtypes) |
| Data Processing | `scripts/process_nhanes_multi.py` | NHANES data pipeline |
| Feature Selection | `scripts/feature_selection.py` | Mutual Information + IG analysis |
| Thesis Outputs | `scripts/generate_thesis_outputs.py` | All-in-one thesis artifact generator |
| ML Rationale | `docs/ml-rationale.md` | Defense-ready methodology justification |

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

### Automated Setup (Recommended)
```bash
git clone <repository-url>
cd DianaV2
make setup     # or: bash scripts/setup.sh
make run-dev   # or: bash scripts/run-dev.sh
```

### Manual Setup
```bash
# 1. Environment
cp env.example .env
# Edit .env with DB_DSN and JWT_SECRET

# 2. Dependencies
go mod download
cd frontend && npm install && cd ..
# ML Setup (creates venv and installs requirements)
bash scripts/setup.sh

# 3. Database
make db_up

# 4. Start
make run-dev
```

### Access Points
| Service | URL |
|---------|-----|
| Frontend | http://localhost:4000 |
| Backend | http://localhost:8080/api/v1/healthz |
| ML Server | http://localhost:5000/health |

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
make setup      # Initial project setup
make run-dev    # Start backend + frontend
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
JWT_SECRET=your-secure-secret-min-32-chars  # REQUIRED for production/staging
CORS_ORIGINS=http://localhost:4000
MODEL_URL=http://localhost:5000
ML_PORT=5001
ML_API_KEY=your-secure-ml-api-key  # REQUIRED for all environments
```

**Important**: `JWT_SECRET` is **required** for all non-local environments (production, staging). The application will fail to start with a fatal error if `JWT_SECRET` is missing in production. For local development with `ENV=local`, a fallback secret is used if not provided.

**ML API Key**: `ML_API_KEY` is **required** for all environments (development, staging, production). The ML server will return 401 Unauthorized for requests without a valid `X-API-Key` header. The frontend must be configured with `VITE_ML_API_KEY` to authenticate with the ML service.

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
| Demo (User) | demo@diana.app | demo123 |
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
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Backend Guide | [docs/BACKEND.md](./docs/BACKEND.md) |
| Frontend Guide | [docs/FRONTEND.md](./docs/FRONTEND.md) |
| **Admin Dashboard** | [docs/ADMIN.md](./docs/ADMIN.md) |
| ML System | [docs/ML_SYSTEM.md](./docs/ML_SYSTEM.md) |
| Database | [docs/DATABASE.md](./docs/DATABASE.md) |
| API Contract | [docs/ml-api-contract.md](./docs/ml-api-contract.md) |

---

## Search Keywords

`diabetes` `prediction` `menopausal women` `biomarkers` `HbA1c` `machine learning` `Go` `Gin` `React` `Vite` `PostgreSQL` `Flask` `XGBoost` `Random Forest` `K-Means` `clustering` `NHANES` `ADA criteria` `SIRD` `SIDD` `MOD` `MARD` `JWT` `authentication` `REST API` `SQLC`
