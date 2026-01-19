# Diana V2

> **Predictive diabetes risk assessment application for menopausal women**

A full-stack health application that helps clinicians assess diabetes risk using machine learning predictions. Built with Go, React, and PostgreSQL.

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
| Users Handler | `backend/internal/http/handlers/users.go` | User profile, onboarding |
| Assessment Handler | `backend/internal/http/handlers/assessments.go` | Create assessments, call ML |
| Admin Handlers | `backend/internal/http/handlers/admin_*.go` | User mgmt, audit, models |
| RBAC Middleware | `backend/internal/http/middleware/rbac.go` | Role-based access control |
| ML Predictor | `backend/internal/ml/predictor.go` | HTTP client for ML server |
| DB Queries | `backend/internal/store/sqlc/*.sql.go` | SQLC generated query code |
| Config | `backend/internal/config/config.go` | Environment loading |

### Frontend (React)
| File | Absolute Path | Purpose |
|------|---------------|---------|
| Main App | `frontend/src/App.jsx` | Routing, auth state |
| API Layer | `frontend/src/api.js` | Fetch wrapper, token refresh |
| User Dashboard | `frontend/src/components/user/Dashboard_user.jsx` | Overview stats |
| User Profile | `frontend/src/components/user/UserProfile.jsx` | Profile & assessments |
| Onboarding | `frontend/src/components/user/Onboarding.jsx` | New user onboarding |
| Personal Trends | `frontend/src/components/user/PersonalTrends.jsx` | Biomarker trends |
| Insights | `frontend/src/components/insights/Insights.jsx` | ML visualizations |
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
| POST | `/api/v1/auth/refresh` | Refresh token |

### User Self-Service (JWT Required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me/profile` | Get user profile |
| PUT | `/api/v1/users/me/profile` | Update profile |
| POST | `/api/v1/users/me/onboarding` | Complete onboarding |
| GET | `/api/v1/users/me/trends` | Get biomarker trends |
| POST | `/api/v1/users/me/assessments` | Create assessment (calls ML) |
| GET | `/api/v1/users/me/assessments` | List assessments |
| GET | `/api/v1/users/me/export` | Export user data |

### Insights (JWT Required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/insights/summary` | Dashboard stats |
| GET | `/api/v1/insights/cohort` | Cohort analysis |

### Admin (JWT + Admin Role Required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/dashboard` | Admin dashboard stats |
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
JWT_SECRET=your-secure-secret-min-32-chars
CORS_ORIGINS=http://localhost:4000
MODEL_URL=http://localhost:5000
```

### Frontend (frontend/.env.local)
```bash
VITE_API_BASE=http://localhost:8080
VITE_ML_BASE=http://localhost:5000
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| User | demo@diana.app | demo123 |
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
| **Known Issues** | [docs/KNOWN_ISSUES.md](./docs/KNOWN_ISSUES.md) |
| Code Review | [code-review-analysis.md](./code-review-analysis.md) |

---

## Search Keywords

`diabetes` `prediction` `menopausal women` `biomarkers` `HbA1c` `machine learning` `Go` `Gin` `React` `Vite` `PostgreSQL` `Flask` `XGBoost` `Random Forest` `K-Means` `clustering` `NHANES` `ADA criteria` `SIRD` `SIDD` `MOD` `MARD` `JWT` `authentication` `REST API` `SQLC`
