# Diana V2

> **Predictive diabetes risk assessment application for menopausal women**

A full-stack health application designed for menopausal women to assess diabetes risk using machine learning predictions. Built with Go, React, Flask (Python), and PostgreSQL.

[![CI](https://github.com/Skufu/DianaV2/actions/workflows/ci.yml/badge.svg)](https://github.com/Skufu/DianaV2/actions/workflows/ci.yml)
[![CD](https://github.com/Skufu/DianaV2/actions/workflows/cd.yml/badge.svg)](https://github.com/Skufu/DianaV2/actions/workflows/cd.yml)
[![Security](https://github.com/Skufu/DianaV2/actions/workflows/security.yml/badge.svg)](https://github.com/Skufu/DianaV2/actions/workflows/security.yml)

---

## Table of Contents

<details>
<summary>Navigation</summary>

- [Directory Index](#directory-index)
- [File Search Index](#file-search-index)
  - [Backend (Go)](#backend-go)
  - [Frontend (React)](#frontend-react)
  - [ML (Python)](#ml-python)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [System Architecture](#system-architecture)
  - [Architecture Diagram](#architecture-diagram)
  - [Key Design Decisions](#key-design-decisions)
- [Features](#features)
  - [Clinical Highlights](#clinical-highlights)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites-auto-install-enabled)
  - [Automated Setup](#automated-setup-one-command---does-everything)
  - [Setup Verification](#setup-verification)
  - [Common Issues](#common-issues)
- [API Endpoints Summary](#api-endpoints-summary)
- [Available Commands](#available-commands)
- [Environment Variables](#environment-variables)
- [Production Deployment](#production-deployment)
  - [Prerequisites Checklist](#prerequisites-checklist)
  - [Environment Variable Checklist](#environment-variable-checklist)
  - [Docker Compose Production Deployment](#docker-compose-production-deployment)
  - [SSL/TLS Setup](#ssltls-setup)
  - [Security Hardening](#security-hardening)
  - [Backup & Monitoring](#backup--monitoring)
- [Testing](#testing)
  - [Backend (Go)](#backend-go-1)
  - [Frontend (React)](#frontend-react-1)
  - [ML Service (Python)](#ml-service-python)
  - [Test Summary](#test-summary)
- [Demo Credentials](#demo-credentials)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Security](#security)
  - [Vulnerability Reporting](#vulnerability-reporting)
  - [Health Data Privacy](#health-data-privacy)
  - [Authentication Security](#authentication-security)
  - [ML Disclaimer](#ml-disclaimer)
- [License](#license)
- [References & Acknowledgments](#references--acknowledgments)
- [Search Keywords](#search-keywords)

</details>

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
| Training | `Ian_ML/training/train_binary_v2_no_bp.py` | Screening model training (defensible) |
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
| Cluster Training | `scripts/train/train_clusters.py` | K-Means (Ahlqvist K=4) |
| Thesis Outputs | `scripts/thesis/generate_thesis_outputs.py` | All-in-one thesis artifact generator |
| ML Rationale | `docs/03-ml/rationale.md` | Defense-ready methodology justification |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.21+, Gin, SQLC |
| Frontend | React 18, Vite, Tailwind CSS |
| Database | PostgreSQL (Goose migrations) |
| ML | Python 3.10+, Flask, scikit-learn (Logistic Regression, Random Forest) |

---

## Prerequisites

Before setting up DianaV2, ensure your system meets the following version requirements:

| Tool | Minimum Version | How to Check | Installation |
|------|-----------------|--------------|--------------|
| **Go** | 1.24+ | `go version` | [go.dev/doc/install](https://go.dev/doc/install) |
| **Node.js** | 18+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.10+ | `python3 --version` | [python.org](https://python.org/) |
| **PostgreSQL** | 16+ | `psql --version` | [postgresql.org](https://postgresql.org/download/) |
| **Docker** | Optional | `docker --version` | [docker.com](https://docker.com/) |

> **Note**: The setup script attempts to auto-install missing tools via Homebrew (macOS), apt-get/yum (Linux), or winget/choco (Windows). See [Quick Start](#quick-start) for automated setup details.

---

## System Architecture

DianaV2 is a multi-tier medical AI platform designed for diabetes risk assessment. The architecture follows a clear separation of concerns with four primary components:

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Frontend** | React 18 + Vite + Tailwind | User interface, assessment forms, dashboards, trends visualization |
| **Backend** | Go + Gin + SQLC | REST API, JWT authentication, business logic, data persistence |
| **ML Service** | Python + Flask + scikit-learn | Diabetes risk prediction, SHAP explainability, K-Means clustering |
| **Database** | PostgreSQL | User profiles, assessment records, audit logs, analytics data |

### Component Interactions

The request flow follows a clear pattern: **Frontend → Backend → ML Service → Database**

1. **User Authentication**: Frontend sends credentials → Backend validates via bcrypt, issues JWT → Token stored in localStorage
2. **Assessment Flow**: Frontend submits biomarkers → Backend validates input ranges → Calls ML predictor → Persists results → Returns risk score and cluster classification
3. **Data Retrieval**: Frontend requests trends/history → Backend queries PostgreSQL via SQLC → Returns paginated JSON
4. **Admin Operations**: Frontend requests user list/audit logs → Backend enforces RBAC middleware → Returns filtered data

### Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Web Browser"]
        React["React SPA<br/>(Vite + Tailwind)"]
    end
    
    subgraph API["API Layer"]
        Gin["Go/Gin Server<br/>(Port 8080)"]
        JWT["JWT Auth Middleware"]
        Handlers["REST Handlers<br/>(/api/v1/*)"]
        Validator["Biomarker<br/>Validation"]
    end
    
    subgraph ML["ML Layer"]
        Flask["Flask Server<br/>(Port 5001)"]
        DianaPred["DianaPredictor<br/>(ADA baseline)"]
        ClinicalPred["ClinicalPredictor<br/>(Metabolic)"]
        SHAP["SHAP Explainer"]
    end
    
    subgraph Data["Data Layer"]
        PG["PostgreSQL<br/>(Port 5432)"]
        Users["Users Table"]
        Assessments["Assessments Table"]
        Audit["Audit Logs"]
    end
    
    Browser --> React
    React -->|"JWT Token"| Gin
    Gin --> JWT
    JWT --> Handlers
    Handlers --> Validator
    
    Handlers -->|"POST /predict<br/>biomarker JSON"| Flask
    Flask --> DianaPred
    Flask --> ClinicalPred
    DianaPred --> SHAP
    ClinicalPred --> SHAP
    Flask -->|"risk_score, cluster"| Handlers
    
    Handlers -->|"SQLC Queries"| PG
    PG --> Users
    PG --> Assessments
    PG --> Audit
    
    React -->|"GET trends/history"| Handlers
    Handlers -->|"JSON Response"| React
    
    style Client fill:#e1f5fe
    style API fill:#fff3e0
    style ML fill:#f3e5f5
    style Data fill:#e8f5e9
```

### Key Design Decisions

- **SQLC for Type-Safe Queries**: Database queries are defined in SQL files, generating Go code for compile-time safety
- **Pluggable ML Predictor**: Backend uses HTTP predictor interface with deterministic mock fallback for local development
- **JWT-Based Authentication**: Tokens signed with `JWT_SECRET`, 24-hour expiration with refresh flow
- **Audit Trail**: All authentication events and assessment operations logged for clinical traceability
- **Mock Mode**: When `MODEL_URL` is empty, backend uses `MockPredictor` for stable dev/test (not for production)

---

## Features

DianaV2 provides a comprehensive suite of features for diabetes risk assessment and health management:

| Icon | Feature | Description |
|------|---------|-------------|
| 🔐 | **JWT Authentication** | Secure login with JWT tokens, refresh flow, and role-based access control (RBAC) |
| 🤖 | **ML Diabetes Risk Prediction** | Dual predictor system: ADA baseline model + clinical metabolic models (binary_v2_no_bp, clinical_3class) with AUC ~0.72 |
| 📊 | **Personal Health Trends** | Track biomarkers over time: HbA1c, fasting blood sugar, BMI, cholesterol with interactive charts |
| 📄 | **PDF Report Export** | Generate downloadable insights reports with risk scores, SHAP explanations, and clinical recommendations |
| 🔍 | **SHAP Explainability** | Feature contribution waterfall charts showing why predictions were made (top factors influencing risk) |
| 👨‍💼 | **Admin Dashboard** | User management, system statistics, ML model traceability, and authentication event logs |
| 📝 | **Audit Logs** | Complete action tracking: login events, assessment creation, profile updates, admin operations |
| 📤 | **CSV Data Export** | Filterable export by menopause status, risk level, patient demographics, and assessment records |
| 📈 | **Cohort Analysis** | Comparative group analysis: risk distribution by demographics, biomarker correlations |
| 🎯 | **K-Means Clustering** | Ahlqvist diabetes subtypes classification (SIRD, SIDD, MOD, MARD) with personalized recommendations |
| 📋 | **Multi-Step Onboarding** | Guided consent flow, health profile setup, and menopause status collection |
| 💻 | **Responsive Frontend** | React 18 with lazy loading, Tailwind CSS styling, and device performance tiering |

### Clinical Highlights

- **Screening-First Design**: ML models provide risk scores for clinical review, not standalone diagnoses
- **Evidence-Based Models**: Trained on NHANES 2011-2024 menopausal women dataset with defensible nested cross-validation
- **Biomarker Validation**: Input ranges checked against clinical thresholds (HbA1c 4.0-15.0, FBS 70-200 mg/dL)
- **Doctor Model Locking**: Clinician accounts use validated screening model (binary_v2_no_bp) for consistent assessments

---

## Screenshots

> **Visual Preview of DianaV2 Interface**

The following screenshots showcase the key user interfaces of DianaV2. Actual screenshots will be added as the project matures.

### User Dashboard

| Placeholder | Description |
|-------------|-------------|
| `![Dashboard screenshot placeholder]` | **User Dashboard**: Main overview showing assessment count, latest risk score with color-coded RiskIndicator (Low/Medium/High), quick action cards for logging assessments, viewing trends, and exporting reports. Displays the user's most recent biomarker values and cluster classification (SIRD, SIDD, MOD, MARD). |

### Assessment Form

| Placeholder | Description |
|-------------|-------------|
| `![Assessment Form screenshot placeholder]` | **Assessment Form**: Biomarker input form for diabetes risk prediction. Fields include HbA1c (%), Fasting Blood Sugar (mg/dL), BMI (kg/m²), Total Cholesterol (mg/dL), Age, and Menopause Status. Each field shows unit labels and validates against clinical ranges. Submit triggers ML prediction via backend API. |

### Insights Dashboard

| Placeholder | Description |
|-------------|-------------|
| `![Insights screenshot placeholder]` | **Insights Dashboard**: ML analytics visualization showing cluster distribution (Ahlqvist diabetes subtypes), risk score trends over time, and SHAP feature importance waterfall charts. Includes biomarker correlation analysis, cohort comparison tools, and model performance metrics (AUC ~0.72). |

### Admin Dashboard

| Placeholder | Description |
|-------------|-------------|
| `![Admin Dashboard screenshot placeholder]` | **Admin Dashboard**: System administration interface with user management table (CRUD operations), audit log viewer showing authentication events and admin actions, ML model traceability tracking model versions and dataset hashes, and system statistics overview. |

### Demo Video

A comprehensive demo video showcasing the full user flow is available:

| File | Location |
|------|----------|
| **Demo Video** | [demo-video/DianaV2_Demo_Final.mp4](./demo-video/DianaV2_Demo_Final.mp4) |

> **Note**: Screenshots will be captured and added in future releases. For immediate visual preview, watch the demo video or run the application locally following the [Quick Start](#quick-start) guide.

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

### Backend Environment Variables

| Variable | Required | Security Note | Default / Example |
|----------|----------|---------------|-------------------|
| `PORT` | ⚠️ Optional | None | `8080` |
| `ENV` | ⚠️ Optional | Set to `production` for prod | `dev` |
| `DB_DSN` | ✅ **Required** | **⚠️ Include `sslmode=require` for production** | `postgres://user:pass@host:5432/diana?sslmode=disable` |
| `JWT_SECRET` | ✅ **Required** | **⚠️ SECURITY WARNING: Min 32 characters, cryptographically random. Use `openssl rand -base64 32`. NEVER use simple passwords, dictionary words, or short strings.** | Generate with `openssl rand -base64 32` |
| `CORS_ORIGINS` | ✅ **Required** | Only trusted HTTPS domains in prod | `http://localhost:4000` (dev) |
| `MODEL_URL` | ⚠️ Optional | Empty triggers mock mode for dev | `http://localhost:5001/predict` |
| `ML_PORT` | ⚠️ Optional | Port for ML server | `5001` |
| `ML_API_KEY` | ⚠️ Optional (dev) / ✅ **Required** (prod) | **⚠️ SECURITY WARNING: Strong random key for ML authentication. Match in backend, ML server, and frontend. Use `openssl rand -base64 32`.** | Generate with `openssl rand -base64 32` |
| `MODEL_VERSION` | ⚠️ Optional | Choose validated model | `binary_v2_no_bp` |
| `MODEL_DATASET_HASH` | ⚠️ Optional | Training dataset reference | `nhanes_postmenopausal_2011_2024` |
| `MODEL_TIMEOUT_MS` | ⚠️ Optional | ML request timeout | `2000` |

> **Critical Security Notes:**
> - `JWT_SECRET` is **required** for ALL environments (dev, staging, prod). The application fails to start if missing.
> - `ML_API_KEY` is **required for production**. Omit for local dev to allow unauthenticated ML calls.
> - When `MODEL_URL` is empty, backend uses `MockPredictor` for stable dev/test (not for production).

### ML Service Environment Variables

| Variable | Required | Security Note | Default / Example |
|----------|----------|---------------|-------------------|
| `ML_PORT` | ⚠️ Optional | Port for Flask server | `5000` |
| `ML_API_KEY` | ⚠️ Optional (dev) / ✅ **Required** (prod) | **⚠️ Must match backend `ML_API_KEY`** | Same as backend |
| `PYTHONUNBUFFERED` | ⚠️ Optional | Recommended for logs | `1` |
| `ENV` | ⚠️ Optional | Set to `production` for prod | `production` |
| `CORS_ORIGINS` | ⚠️ Optional | Trusted backend origins | `http://localhost:8080` |

### Frontend Environment Variables

| Variable | Required | Security Note | Default / Example |
|----------|----------|---------------|-------------------|
| `VITE_API_BASE` | ⚠️ Optional | Backend API URL | `http://localhost:8080` |
| `VITE_ML_BASE` | ⚠️ Optional | ML server URL | `http://localhost:5001` |
| `VITE_ML_API_KEY` | ⚠️ Optional (dev) / ✅ **Required** (prod) | **⚠️ Must match `ML_API_KEY` in backend/ML** | Same as backend |

### Database Environment Variables (docker-compose.yml)

| Variable | Required | Security Note | Default |
|----------|----------|---------------|---------|
| `POSTGRES_USER` | ⚠️ Optional | None | `diana` |
| `POSTGRES_PASSWORD` | ✅ **Required** | **⚠️ Strong password, never reuse. Required by docker-compose.** | Required - no default |
| `POSTGRES_DB` | ⚠️ Optional | None | `diana` |

### Environment Files Example

**Backend `.env`:**
```bash
PORT=8080
ENV=dev
DB_DSN=postgres://diana:diana@localhost:5432/diana?sslmode=disable
JWT_SECRET=$(openssl rand -base64 32)  # Generate securely!
CORS_ORIGINS=http://localhost:4000
MODEL_URL=http://localhost:5001/predict
ML_PORT=5001
MODEL_VERSION=binary_v2_no_bp
MODEL_DATASET_HASH=nhanes_postmenopausal_2011_2024
MODEL_TIMEOUT_MS=2000
ML_API_KEY=  # Optional in dev, required in production
```

**Frontend `frontend/.env.local`:**
```bash
VITE_API_BASE=http://localhost:8080
VITE_ML_BASE=http://localhost:5001
VITE_ML_API_KEY=  # Must match ML_API_KEY when set
```

---

## Production Deployment

> **Beyond Quick Start: This section covers production-specific configuration, security hardening, and SSL/TLS setup.**

### Prerequisites Checklist

Before deploying to production, ensure the following are configured:

| Category | Item | Status |
|----------|------|--------|
| **Infrastructure** | Domain configured and pointing to server IP | ✅ Required |
| **Infrastructure** | Ports 80 and 443 open on firewall | ✅ Required |
| **Infrastructure** | PostgreSQL database accessible (external or managed) | ✅ Required |
| **Infrastructure** | Docker installed (or container orchestration platform) | ✅ Required |
| **Security** | Strong JWT_SECRET (min 32 chars, cryptographically random) | ✅ Required |
| **Security** | ML_API_KEY configured for ML service auth | ✅ Required |
| **Security** | CORS_ORIGINS set to trusted domains only | ✅ Required |
| **Security** | SSL/TLS certificates obtained | ✅ Required |
| **Monitoring** | Database backup automation configured | ⚠️ Recommended |
| **Monitoring** | Health check endpoints monitored | ⚠️ Recommended |

### Environment Variable Checklist

| Variable | Required | Security Note | Production Value |
|----------|----------|---------------|------------------|
| `JWT_SECRET` | ✅ **Required** | **⚠️ Min 32 chars, use `openssl rand -base64 32`** | Cryptographically random string |
| `POSTGRES_PASSWORD` | ✅ **Required** | **⚠️ Strong password, never reuse** | Secure database password |
| `ML_API_KEY` | ✅ **Required** | **⚠️ Strong random key for ML auth** | Match in backend + ML + frontend |
| `CORS_ORIGINS` | ✅ **Required** | Only trusted HTTPS domains | `https://yourdomain.com` |
| `DB_DSN` | ✅ **Required** | Include `sslmode=require` for TLS | `postgres://...?sslmode=require` |
| `DOMAIN` | ✅ **Required** | Your production domain | `api.yourdomain.com` |
| `ENV` | ✅ **Required** | Must be `production` | `production` |
| `PORT` | ⚠️ Optional | Default 8080 | Standard or custom |
| `MODEL_VERSION` | ⚠️ Optional | Default `binary_v2_no_bp` | Choose validated model |
| `RATE_LIMIT_REQUESTS` | ⚠️ Optional | Rate limiting threshold | `100` (recommended) |
| `RATE_LIMIT_WINDOW` | ⚠️ Optional | Rate limiting window (seconds) | `60` (recommended) |

### Docker Compose Production Deployment

DianaV2 provides a production Docker Compose configuration with TLS/SSL termination:

```bash
# 1. Create production .env file
cp env.example .env.prod
# Edit .env.prod with production values (see checklist above)

# 2. Set required environment variables
export JWT_SECRET=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 24)
export ML_API_KEY=$(openssl rand -base64 32)
export DOMAIN=your-domain.com
export SSL_EMAIL=admin@your-domain.com

# 3. Obtain SSL/TLS certificates (Let's Encrypt)
./scripts/setup-ssl.sh --domain $DOMAIN --email $SSL_EMAIL

# 4. Deploy production stack with TLS
make deploy-prod
# OR manually:
# docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Verify deployment
make ssl-verify
curl -sf https://$DOMAIN/api/v1/healthz
```

#### Production Architecture

The production deployment uses:
- **Nginx reverse proxy** for TLS termination (port 443)
- **HTTP to HTTPS redirect** (port 80 → 443)
- **Certbot** for automatic certificate renewal
- **Internal network isolation** (services not exposed externally)
- **Rate limiting** via backend configuration

```mermaid
flowchart LR
    subgraph External["External Access"]
        Client["Client Browser"]
    end
    
    subgraph Production["Production Stack"]
        Nginx["Nginx Proxy<br/>(TLS/SSL)"]
        Backend["Go Backend<br/>(Internal)"]
        ML["ML Server<br/>(Internal)"]
        Frontend["React Frontend<br/>(Static)"]
        DB["PostgreSQL<br/>(Internal)"]
    end
    
    Client -->|"HTTPS 443"| Nginx
    Nginx -->|"Proxy"| Backend
    Nginx -->|"Proxy"| ML
    Nginx -->|"Static Files"| Frontend
    Backend --> DB
    Backend --> ML
```

### SSL/TLS Setup

DianaV2 uses Let's Encrypt for free, automatic SSL certificates:

#### Quick SSL Setup

```bash
# Obtain and configure SSL certificates
./scripts/setup-ssl.sh --domain api.yourdomain.com --email admin@yourdomain.com

# Verify TLS configuration
./scripts/verify-tls.sh --domain api.yourdomain.com

# Test with SSL Labs (external)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com
```

#### SSL Certificate Details

| Item | Path/Command |
|------|--------------|
| Certificate location | `/etc/letsencrypt/live/$DOMAIN/` |
| Nginx SSL directory | `/etc/nginx/ssl/` (copies for Docker) |
| Renewal automation | Daily cron job (auto-setup) |
| Manual renewal | `certbot renew` |

#### SSL Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production overlay with Nginx TLS proxy |
| `scripts/setup-ssl.sh` | Let's Encrypt certificate automation |
| `scripts/verify-tls.sh` | TLS configuration verification |
| `frontend/nginx-ssl.conf` | Nginx TLS configuration |

### Security Hardening

#### JWT Secret Requirements

```bash
# Generate secure JWT secret (minimum 32 characters)
openssl rand -base64 32

# ⚠️ WARNING: Never use:
# - Simple passwords
# - Dictionary words
# - Short strings (< 32 chars)
# - Same secret across environments
```

#### ML API Key Configuration

The ML service requires API key authentication in production:

```bash
# Generate ML API key
openssl rand -base64 32

# Configure in three locations:
# 1. Backend: ML_API_KEY=<generated-key>
# 2. ML Server: ML_API_KEY=<generated-key>
# 3. Frontend: VITE_ML_API_KEY=<generated-key>
```

#### CORS Security

```bash
# Production CORS (HTTPS only, specific domains)
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# ⚠️ WARNING: Never use:
# - Wildcards (*) in production
# - HTTP origins (only HTTPS)
# - localhost URLs (except dev)
```

#### Database Security

```bash
# Production DB connection string (SSL required)
DB_DSN=postgres://diana:$POSTGRES_PASSWORD@db-host:5432/diana?sslmode=require

# ⚠️ WARNING:
# - Always use sslmode=require in production
# - Never store password in code
# - Use managed database services when possible
```

### Backup & Monitoring

#### Database Backups

```bash
# Run backup manually
make backup

# List available backups
make backup-list

# Restore from backup
make backup-restore backups/diana_backup_YYYYMMDD.sql.gz

# Test restoration process
make backup-test
```

See [deployment/BACKUP-README.md](./deployment/BACKUP-README.md) for full backup documentation.

#### Health Monitoring

```bash
# Check backend health
curl -sf https://$DOMAIN/api/v1/healthz

# Check ML service health
curl -sf https://$DOMAIN/ml/health

# Docker container status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View logs
make deploy-prod-logs
```

### Production Commands Summary

```bash
# Deployment
make deploy-prod          # Deploy production stack
make deploy-prod-down     # Stop production stack
make deploy-prod-logs     # View nginx proxy logs

# SSL/TLS
make ssl-setup DOMAIN=your-domain.com SSL_EMAIL=admin@your-domain.com
make ssl-verify DOMAIN=your-domain.com

# Backups
make backup               # Run backup
make backup-list          # List backups
make backup-test          # Test restoration
```

---

## Testing

DianaV2 has a comprehensive test suite across all three tiers: Go backend, React frontend, and Python ML service.

### Backend (Go)

The backend uses Go's built-in testing framework with coverage support.

```bash
# Run all backend tests
make test
# Or directly:
cd backend && go test ./...

# Run tests with verbose output
cd backend && go test -v ./...

# Run tests with coverage report
cd backend && go test -race -coverprofile=coverage.out ./...

# View coverage report
cd backend && go tool cover -html=coverage.out

# Run specific test package
cd backend && go test -v ./internal/ml

# Run specific test file
cd backend && go test -v ./internal/ml/mock_test.go -run TestMockPredictor_Predict

# Run contract tests (API validation)
make test-contract
# Or directly:
cd backend && go test -v -run "TestContract_" ./internal/http/handlers/

# Run linter
make lint
# Or directly:
cd backend && go vet ./...
```

### Frontend (React)

The frontend uses Vitest for unit/component tests with React Testing Library.

```bash
# Run all frontend tests (single run)
cd frontend && npm test
# Or directly:
cd frontend && vitest run

# Run tests in watch mode (for development)
cd frontend && npm run test:watch
# Or directly:
cd frontend && vitest

# Run tests with coverage report
cd frontend && npm run test:coverage
# Or directly:
cd frontend && vitest run --coverage

# Run API contract tests
cd frontend && npm run test:api-contract

# Run linter
cd frontend && npm run lint

# Fix linting issues automatically
cd frontend && npm run lint:fix

# Check code formatting
cd frontend && npm run format:check

# Format code automatically
cd frontend && npm run format
```

**Note**: Playwright E2E tests are archived (see [frontend/e2e/AGENTS.md](./frontend/e2e/AGENTS.md) for details). They are not in CI and not actively maintained.

### ML Service (Python)

The ML service uses pytest for testing.

```bash
# Run all ML tests
make test-ml
# Or directly:
cd Ian_ML && python -m pytest tests/ -v --tb=short

# Run tests with coverage
cd Ian_ML && python -m pytest tests/ -v --cov=service --cov-report=html

# Run specific test file
cd Ian_ML && pytest tests/test_predict.py -v

# Run specific test function
cd Ian_ML && pytest tests/test_predict.py -v -k "test_prediction_endpoint"
```

### Test Summary

| Tier | Framework | Command | Coverage |
|------|-----------|---------|----------|
| Backend | Go testing | `make test` | `go test -race -coverprofile=coverage.out ./...` |
| Frontend | Vitest + RTL | `cd frontend && npm test` | `vitest run --coverage` |
| ML | pytest | `make test-ml` | `pytest --cov=service` |

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

## Security

> **This application handles sensitive health data for diabetes risk assessment. Security is a critical priority.**

### Vulnerability Reporting

If you discover a security vulnerability in DianaV2, please report it responsibly:

**Preferred Method (Email):**
- Send details to: [security@diana.app](mailto:security@diana.app)
- Include: vulnerability description, steps to reproduce, potential impact
- Response time: We aim to respond within 48 hours

**GitHub Security Issue:**
- For non-critical issues, use [GitHub Security Advisories](https://github.com/Skufu/DianaV2/security/advisories)
- Mark as "Security Vulnerability" when creating

**Please do NOT:**
- Open public GitHub issues for security vulnerabilities
- Exploit vulnerabilities beyond minimal proof-of-concept
- Share vulnerability details publicly before fix is released

### Health Data Privacy

DianaV2 is designed to handle sensitive health data including:
- Biomarker values (HbA1c, Fasting Blood Sugar, cholesterol, BMI)
- Medical history and demographics
- Diabetes risk predictions

**Key Privacy Considerations:**
- All data transmission uses HTTPS/TLS encryption
- User authentication requires JWT tokens with secure signing
- Database credentials are stored securely (never in source code)
- ML predictions are stored with user consent tracking

**HIPAA Awareness:**
This application handles health-related data. Organizations deploying DianaV2 in healthcare settings should:
- Conduct proper HIPAA compliance assessment
- Implement appropriate administrative, physical, and technical safeguards
- Maintain audit logs (built-in audit trail in admin dashboard)
- Ensure proper data retention and disposal policies

### Authentication Security

**JWT Best Practices (Implemented):**
- JWT secrets must be at least 32 characters (`JWT_SECRET` environment variable)
- Tokens have configurable expiration (refresh token flow available)
- Authorization checks enforced via RBAC middleware
- Session events tracked via audit logging

**Recommendations for Production:**
- Use strong, unique JWT secrets generated with cryptographic tools
- Enable `ML_API_KEY` authentication for ML service calls
- Set `CORS_ORIGINS` to only trusted frontend domains
- Review audit logs regularly for suspicious authentication patterns

### ML Disclaimer

> **⚠️ Important Clinical Disclaimer**

The machine learning models in DianaV2 are **screening tools**, not diagnostic devices:
- Risk scores are probabilities, not medical diagnoses
- Predictions should be reviewed by qualified healthcare professionals
- ML outputs do not replace clinical judgment or laboratory testing
- Users should consult healthcare providers before making medical decisions

See [docs/03-ml/methodology.md](./docs/03-ml/methodology.md) for methodology details.

---

## License

This project is currently **unlicensed**. A formal license should be established before public distribution or commercial use.

### Recommended License Options

For open-source distribution, consider one of the following licenses:

| License | Use Case | Key Features |
|---------|----------|--------------|
| **MIT** | Open source, permissive | Simple, permissive, allows commercial use with attribution |
| **Apache-2.0** | Open source, patent-aware | Permissive, includes patent grant, attribution required |
| **Proprietary** | Commercial, restricted | Custom terms, restricts modification/distribution |

### Copyright Notice

Copyright © 2024 DianaV2 Contributors. All rights reserved until license is formally established.

### License File

Once a license is chosen, a `LICENSE` file should be created in the repository root containing the full license text. This README section should then be updated to reference that file.

---

## References & Acknowledgments

> **Citations and acknowledgments for research data, methodology, and clinical guidelines used in DianaV2.**

### Data Sources

| Source | Citation | Usage |
|--------|----------|-------|
| **NHANES** | Centers for Disease Control and Prevention (CDC). National Center for Health Statistics (NCHS). National Health and Nutrition Examination Survey Data. Hyattsville, MD: U.S. Department of Health and Human Services, Centers for Disease Control and Prevention, [2009-2023](https://wwwn.cdc.gov/nchs/nhanes/default.aspx). | Primary dataset for ML training: biomarkers, demographics, lifestyle factors from postmenopausal women (cycles F-L). |

### Clinical Guidelines & Classification

| Source | Citation | Usage |
|--------|----------|-------|
| **ADA Standards** | American Diabetes Association. Standards of Care in Diabetes—2024. *Diabetes Care* 2024;47(Suppl 1):S1–S321. DOI: [10.2337/dc24-S001](https://doi.org/10.2337/dc24-S001). | Diabetes classification thresholds (HbA1c ≥6.5%, FBS ≥126 mg/dL) and glycemic status definitions. |
| **Ahlqvist Clustering** | Ahlqvist, E., et al. (2018). Novel subgroups of adult-onset diabetes and their association with outcomes: a data-driven cluster analysis of six variables. *The Lancet Diabetes & Endocrinology*, 6(5), 361–372. DOI: [10.1016/S2213-8587(18)30051-2](https://doi.org/10.1016/S2213-8587(18)30051-2). | K-Means clustering framework (K=4): SIRD, SIDD, MOD, MARD diabetes subtypes adapted for DIANA. |

### ML Methodology

| Source | Citation | Usage |
|--------|----------|-------|
| **SHAP Values** | Lundberg, S. M., & Lee, S. I. (2017). A Unified Approach to Interpreting Model Predictions. *Advances in Neural Information Processing Systems*, 30. [NeurIPS Proceedings](https://proceedings.neurips.cc/paper/2017/hash/8a20a862115ef7d44bc5290ed57d2d1d-Abstract.html). | Feature contribution explainability for clinical dashboard (waterfall charts, risk factor attribution). |
| **MICE Imputation** | Van Buuren, S., & Groothuis-Oudshoorn, K. (2011). mice: Multivariate Imputation by Chained Equations in R. *Journal of Statistical Software*, 45(3), 1–67. DOI: [10.18637/jss.v045.i03](https://doi.org/10.18637/jss.v045.i03). | Missing biomarker imputation preserving physiological correlations. |
| **Nested CV** | Vabalas, A., et al. (2019). Machine learning algorithm validation with a limited sample size. *PLOS ONE*, 14(11), e0224365. DOI: [10.1371/journal.pone.0224365](https://doi.org/10.1371/journal.pone.0224365). | Defensible performance estimation (Leave-One-Cycle-Out validation). |

### Ethics & Governance

| Source | Citation | Usage |
|--------|----------|-------|
| **WHO AI Ethics** | World Health Organization. Ethics and Governance of Artificial Intelligence for Health: WHO Guidance. Geneva: WHO, 2021. [ISBN 9789240029200](https://www.who.int/publications/i/item/9789240029200). | "Screening, not diagnosis" positioning, transparency, and human-in-the-loop clinical judgment. |

### Thesis & Research Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **Manuscript** | [docs/07-research/thesis-drafts/manuscript.md](./docs/07-research/thesis-drafts/manuscript.md) | Complete thesis manuscript for DIANA research. |
| **Methodology** | [docs/07-research/thesis-drafts/METHODOLOGY.md](./docs/07-research/thesis-drafts/METHODOLOGY.md) | Detailed methodology documentation with defensibility justification. |
| **Defense Citations** | [docs/03-ml/defense/diana-citations.md](./docs/03-ml/defense/diana-citations.md) | Panel-facing citation appendix for ML methodology defense. |
| **Diabetes Subgroups** | [docs/07-research/diabetes_subgroups.md](./docs/07-research/diabetes_subgroups.md) | Analysis of Ahlqvist subtypes and DIANA adaptations. |
| **Paper Requirements** | [docs/07-research/paper-requirements.md](./docs/07-research/paper-requirements.md) | Publication requirements and research specifications. |

### Acknowledgments

- **CDC/NCHS**: Public availability of NHANES data enabling population health research
- **Ahlqvist et al.**: Foundational clustering framework for diabetes subtyping
- **Scikit-learn**: Open-source ML library enabling reproducible research
- **Clinical Experts**: Doctor interviews for feature weight validation (see [docs/07-research/doctor-interview-*.md](./docs/07-research/))

---

## Search Keywords

`diabetes` `prediction` `menopausal women` `biomarkers` `HbA1c` `machine learning` `Go` `Gin` `React` `Vite` `PostgreSQL` `Flask` `Logistic Regression` `Random Forest` `K-Means` `clustering` `NHANES` `ADA criteria` `SIRD` `SIDD` `MOD` `MARD` `JWT` `authentication` `REST API` `SQLC`
