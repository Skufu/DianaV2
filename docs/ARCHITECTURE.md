# System Architecture

## Overview

DIANA V2 is a **three-tier web application** for diabetes risk prediction in postmenopausal women.

---

## Components

### 1. Frontend (React + Vite)
- **Location:** `frontend/`
- **Port:** 5173 (dev), served from backend in production
- **Key Files:**
  - `src/App.jsx` — Routing, authentication state
  - `src/api.js` — All API calls, token refresh logic
  - `src/components/` — UI components by feature

### 2. Backend (Go + Gin)
- **Location:** `backend/`
- **Port:** 8080
- **Purpose:** REST API, authentication, database access, ML proxy
- **Key Packages:**
  - `internal/http/router/` — Route definitions
  - `internal/http/handlers/` — Request handlers
  - `internal/http/middleware/` — Auth, rate limiting, CORS
  - `internal/ml/` — ML server HTTP client
  - `internal/store/` — Database layer (SQLC)

### 3. ML Server (Python + Flask)
- **Location:** `scripts/`
- **Port:** 5000
- **Purpose:** Diabetes prediction, analytics, visualizations
- **Key Files:**
  - `ml_server.py` — Flask API
  - `predict.py` — DianaPredictor (ADA), ClinicalPredictor
  - `train_models_v2.py` — Non-circular model training

### 4. Database (PostgreSQL)
- **Migrations:** `backend/migrations/`
- **Schema:** Users, patients, assessments, payment records
- **Query Generation:** SQLC (`backend/sqlc.yaml`)

---

## Request Flow

```
┌──────────┐   HTTP    ┌──────────┐   HTTP    ┌──────────┐
│ Browser  │ ───────▶  │ Go API   │ ───────▶  │ ML Flask │
│          │ ◀───────  │ :8080    │ ◀───────  │ :5000    │
└──────────┘   JSON    └────┬─────┘   JSON    └──────────┘
                            │
                            ▼ SQL
                       ┌──────────┐
                       │ Postgres │
                       └──────────┘
```

---

## Authentication Flow

1. **Login:** Frontend → `POST /api/v1/auth/login` → Returns JWT + refresh token
2. **Protected Routes:** Frontend sends `Authorization: Bearer <token>`
3. **Token Refresh:** If 401, `POST /api/v1/auth/refresh` with refresh token
4. **Middleware:** `middleware.Auth()` validates JWT on every protected request

---

## Environment Variables

### Backend (`backend/.env`)
```bash
DATABASE_URL=postgres://...
JWT_SECRET=...
MODEL_URL=http://localhost:5000  # ML server
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env.local`)
```bash
VITE_API_BASE=http://localhost:8080
VITE_ML_BASE=http://localhost:5000  # For direct ML calls
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Go for backend | Performance, type safety, single binary deployment |
| Flask for ML | scikit-learn/XGBoost native Python ecosystem |
| SQLC for queries | Type-safe SQL, no ORM magic |
| JWT auth | Stateless, scalable, standard |
| Dual-model ML | Avoids circular reasoning (see ML docs) |
| Unit tests | Config, middleware, ML validation all tested |
