# DIANA V2 - System Documentation Index

> **Purpose:** Comprehensive documentation for thesis defense preparation.  
> **Last Updated:** December 28, 2024

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [1. System Architecture](./ARCHITECTURE.md) | High-level overview, data flow, component interaction |
| [2. Backend Guide](./BACKEND.md) | Go/Gin API, database, authentication |
| [3. Frontend Guide](./FRONTEND.md) | React components, state management, API integration |
| [4. ML System Guide](./ML_SYSTEM.md) | Dual-model architecture, training, prediction API |
| [5. Database Schema](./DATABASE.md) | Tables, migrations, SQLC queries |
| [6. API Reference](./ml-api-contract.md) | All endpoints with request/response formats |
| [7. Defense Q&A](./DEFENSE_QA.md) | Common panel questions and prepared answers |

---

## System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   ML Server     │
│   (React/Vite)  │     │   (Go/Gin)      │     │   (Flask/Python)│
│   Port: 5173    │     │   Port: 8080    │     │   Port: 5000    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   PostgreSQL    │
                        │   Database      │
                        └─────────────────┘
```

---

## Key Files to Understand

### Backend (Go)
- `backend/internal/http/router/router.go` — Route definitions
- `backend/internal/http/handlers/` — Request handlers
- `backend/internal/ml/predictor.go` — ML server client
- `backend/internal/store/sqlc/` — Database queries

### Frontend (React)
- `frontend/src/api.js` — API wrapper with token refresh
- `frontend/src/App.jsx` — Main app router
- `frontend/src/components/` — UI components

### ML (Python)
- `scripts/ml_server.py` — Flask API server
- `scripts/predict.py` — DianaPredictor, ClinicalPredictor classes
- `scripts/train_models_v2.py` — Clinical model training

---

## Data Flow: Patient Assessment

```
1. User enters biomarkers in Frontend
2. Frontend POST → Backend /api/v1/patients/:id/assessments
3. Backend → ML Server POST /predict?model_type=clinical
4. ML Server → Returns prediction JSON
5. Backend → Saves to database → Returns to Frontend
6. Frontend → Displays risk status and cluster
```
