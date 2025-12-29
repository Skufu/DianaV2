# DIANA V2 - Documentation Hub

> **Purpose**: Centralized documentation index for thesis defense and development  
> **Last Updated**: December 29, 2024

---

## Quick Search Index

| Topic | Document |
|-------|----------|
| System Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Backend API | [BACKEND.md](./BACKEND.md) |
| Frontend Components | [FRONTEND.md](./FRONTEND.md) |
| ML System | [ML_SYSTEM.md](./ML_SYSTEM.md) |
| Database Schema | [DATABASE.md](./DATABASE.md) |
| ML API Contract | [ml-api-contract.md](./ml-api-contract.md) |
| Paper Requirements | [paper-requirements.md](./paper-requirements.md) |

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

## Documentation Map

### Architecture & Design
| Document | Description | Key Topics |
|----------|-------------|------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System overview | Components, request flow, auth flow |
| [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) | Detailed architecture | Data models, API design |
| [architecture/PROJECT_STRUCTURE.md](./architecture/PROJECT_STRUCTURE.md) | Directory layout | Folder organization |

### Component Guides
| Document | Description | Key Topics |
|----------|-------------|------------|
| [BACKEND.md](./BACKEND.md) | Go/Gin API | Handlers, routes, SQLC, middleware |
| [FRONTEND.md](./FRONTEND.md) | React client | Components, state, API integration |
| [DATABASE.md](./DATABASE.md) | PostgreSQL | Tables, migrations, queries |

### ML System
| Document | Description | Key Topics |
|----------|-------------|------------|
| [ML_SYSTEM.md](./ML_SYSTEM.md) | ML overview | Models, training, clusters |
| [ml-api-contract.md](./ml-api-contract.md) | ML API spec | Endpoints, request/response formats |
| [ml-integration.md](./ml-integration.md) | Backend-ML integration | HTTPPredictor, mock mode |
| [ml-methodology.md](./ml-methodology.md) | Research methodology | ADA criteria, Ahlqvist clusters |

### Operations
| Document | Description | Key Topics |
|----------|-------------|------------|
| [ops/deployment.md](./ops/deployment.md) | Deployment guide | Render, Neon, Vercel |

---

## Key File Locations

### Backend (Go)
| Purpose | File |
|---------|------|
| Route definitions | `backend/internal/http/router/router.go` |
| Auth handler | `backend/internal/http/handlers/auth.go` |
| Patient handler | `backend/internal/http/handlers/patients.go` |
| Assessment handler | `backend/internal/http/handlers/assessments.go` |
| ML predictor client | `backend/internal/ml/predictor.go` |
| Database queries | `backend/internal/store/sqlc/queries.sql` |

### Frontend (React)
| Purpose | File |
|---------|------|
| Main app | `frontend/src/App.jsx` |
| API wrapper | `frontend/src/api.js` |
| Dashboard | `frontend/src/components/dashboard/Dashboard.jsx` |
| Patients | `frontend/src/components/patients/PatientList.jsx` |
| Analytics | `frontend/src/components/analytics/Analytics.jsx` |

### ML (Python)
| Purpose | File |
|---------|------|
| Flask server | `ml/server.py` |
| Predictors | `ml/predict.py` |
| Model training | `ml/train.py` |
| Clustering | `ml/clustering.py` |

---

## Data Flow: Patient Assessment

```
1. User enters biomarkers in Frontend (PatientList.jsx)
2. Frontend POST → Backend /api/v1/patients/:id/assessments
3. Backend (assessments.go) → ML Server POST /predict?model_type=clinical
4. ML Server (predict.py) → Returns prediction + cluster
5. Backend → Saves to database (sqlc) → Returns to Frontend
6. Frontend → Displays risk status and cluster assignment
```

---

## Common Questions

| Question | Answer Location |
|----------|-----------------|
| How does authentication work? | [BACKEND.md](./BACKEND.md) → Authentication Flow |
| How are predictions made? | [ML_SYSTEM.md](./ML_SYSTEM.md) → Model Architecture |
| What are the cluster types? | [ML_SYSTEM.md](./ML_SYSTEM.md) → Cluster Definitions |
| How to add a new API endpoint? | [BACKEND.md](./BACKEND.md) → Handlers section |
| How to add a new component? | [FRONTEND.md](./FRONTEND.md) → Components |

---

## Search Keywords

`architecture` `backend` `frontend` `ML` `machine learning` `database` `PostgreSQL` `API` `endpoints` `authentication` `JWT` `patients` `assessments` `diabetes` `prediction` `clustering` `biomarkers` `NHANES` `ADA` `Ahlqvist` `SIRD` `SIDD` `MOD` `MARD` `deployment` `thesis` `defense`
