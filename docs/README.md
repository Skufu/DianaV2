# DIANA V2 - Documentation Hub

> **Purpose**: Centralized documentation index for thesis defense and development  
> **Last Updated**: January 12, 2026

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
| **📖 Paper RAG (AI)** | [paper_rag/README.md](./paper_rag/README.md) |

---

## System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   ML Server     │
│   (React/Vite)  │     │   (Go/Gin)      │     │   (Flask/Python)│
│   Port: 4000    │     │   Port: 8080    │     │   Port: 5000    │
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
| [architecture/layout.md](./architecture/layout.md) | This high-level layout and boundary overview |

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
| ML predictor client | `backend/internal/ml/http_predictor.go` |
| Database queries | `backend/internal/store/sqlc/*.sql.go` |

### Frontend (React)
| Purpose | File |
|---------|------|
| Main app | `frontend/src/App.jsx` |
| API wrapper | `frontend/src/api.js` |
| Dashboard | `frontend/src/components/dashboard/Dashboard.jsx` |
| Patients | `frontend/src/components/patients/PatientHistory.jsx` |
| Analytics | `frontend/src/components/insights/Insights.jsx` | ML visualizations, model metrics |
| Cohort Analysis | `frontend/src/components/insights/CohortAnalysis.jsx` | Cohort comparison analysis |
| Login | `frontend/src/components/auth/Login.jsx` |
| Export | `frontend/src/components/export/Export.jsx` | CSV export functionality |
| Education | `frontend/src/components/education/Education.jsx` | Educational content for clinicians |
| Admin Dashboard | `frontend/src/components/admin/AdminDashboard.jsx` | Admin panel (users, audit, models) |
| User Management | `frontend/src/components/admin/UserManagement.jsx` | User CRUD operations |
| Audit Log Viewer | `frontend/src/components/admin/AuditLogViewer.jsx` | Audit log viewing |
| Model Traceability | `frontend/src/components/admin/ModelTraceability.jsx` | ML model tracking |
| Clinic Dashboard | `frontend/src/components/clinic/ClinicDashboard.jsx` | Clinic-specific dashboard |
| Sidebar | `frontend/src/components/layout/Sidebar.jsx` | Navigation sidebar |
| Biological Network | `frontend/src/components/layout/BiologicalNetwork.jsx` | Animated background |

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
1. User enters biomarkers in Frontend (PatientHistory.jsx)
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
