# DIANA V2 - Documentation Hub

> **Purpose**: Centralized documentation index for thesis defense and development
> **Last Updated**: January 23, 2026

---

## Quick Search Index

| Topic | Document |
|-------|----------|
| System Architecture | [01-architecture/overview.md](./01-architecture/overview.md) |
| Backend API | [02-guides/backend.md](./02-guides/backend.md) |
| Frontend Components | [02-guides/frontend.md](./02-guides/frontend.md) |
| ML System | [02-guides/ml-system.md](./02-guides/ml-system.md) |
| Database Schema | [02-guides/database.md](./02-guides/database.md) |
| ML API Contract | [03-ml/api-contract.md](./03-ml/api-contract.md) |
| Paper Requirements | [07-research/paper-requirements.md](./07-research/paper-requirements.md) |

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

### 📁 01-architecture/
| Document | Description | Key Topics |
|----------|-------------|------------|
| [overview.md](./01-architecture/overview.md) | System overview | Components, request flow, auth flow |
| [detailed-architecture.md](./01-architecture/detailed-architecture.md) | Detailed architecture | Data models, API design |
| [project-structure.md](./01-architecture/project-structure.md) | Directory layout | Folder organization |
| [layout.md](./01-architecture/layout.md) | High-level layout | Boundary overview |

### 📁 02-guides/
| Document | Description | Key Topics |
|----------|-------------|------------|
| [backend.md](./02-guides/backend.md) | Go/Gin API | Handlers, routes, SQLC, middleware |
| [frontend.md](./02-guides/frontend.md) | React client | Components, state, API integration |
| [database.md](./02-guides/database.md) | PostgreSQL | Tables, migrations, queries |
| [ml-system.md](./02-guides/ml-system.md) | ML overview | Models, training, clusters |
| [admin.md](./02-guides/admin.md) | Admin Dashboard | User management, audit, models |
| [security.md](./02-guides/security.md) | Security guidelines | Auth, RBAC, best practices |

### 📁 03-ml/
| Document | Description | Key Topics |
|----------|-------------|------------|
| [integration.md](./03-ml/integration.md) | Backend-ML integration | HTTPPredictor, mock mode |
| [api-contract.md](./03-ml/api-contract.md) | ML API spec | Endpoints, request/response formats |
| [methodology.md](./03-ml/methodology.md) | Research methodology | ADA criteria, Ahlqvist clusters |
| [rationale.md](./03-ml/rationale.md) | ML justification | Defense-ready methodology |

### 📁 04-development/
| Document | Description | Key Topics |
|----------|-------------|------------|
| [local-setup.md](./04-development/local-setup.md) | Local development setup | Environment, dependencies |
| [troubleshooting.md](./04-development/troubleshooting.md) | Common issues | Debugging, fixes |
| [api-drift-prevention.md](./04-development/api-drift-prevention.md) | API consistency | SQLC, schema evolution |
| [claude-instructions.md](./04-development/claude-instructions.md) | AI agent guidelines | Development assistance |

### 📁 05-planning/
| Document | Description | Key Topics |
|----------|-------------|------------|
| [backend-plan.md](./05-planning/backend-plan.md) | Backend implementation plan | Gin, routes, SQLC |
| [backend-plan-root.md](./05-planning/backend-plan-root.md) | Backend root plan | High-level design |
| [frontend-plan.md](./05-planning/frontend-plan.md) | Frontend implementation plan | React components, state |
| [frontend-plan-root.md](./05-planning/frontend-plan-root.md) | Frontend root plan | High-level design |
| [admin-dashboard-plan.md](./05-planning/admin-dashboard-plan.md) | Admin dashboard plan | User management, audit |
| [concerns.md](./05-planning/concerns.md) | Development concerns | Risks, decisions |
| [backend-refactoring-prd.md](./05-planning/backend-refactoring-prd.md) | Refactoring PRD | Transactions, audit, errors |

### 📁 06-operations/
| Document | Description | Key Topics |
|----------|-------------|------------|
| [deployment.md](./06-operations/deployment.md) | Deployment guide | Render, Neon, Vercel |
| [deployment-internal.md](./06-operations/deployment-internal.md) | Internal deployment | Private infrastructure |
| [logging-improvements.md](./06-operations/logging-improvements.md) | Logging strategy | Observability, monitoring |

### 📁 07-research/
| Document | Description | Key Topics |
|----------|-------------|------------|
| [paper-requirements.md](./07-research/paper-requirements.md) | Thesis requirements | Manuscript, figures |
| [manuscript-updates.md](./07-research/manuscript-updates.md) | Manuscript revisions | Model results, discussion |
| [codebase-alignment.md](./07-research/codebase-alignment.md) | Code vs paper alignment | Feature mapping |
| [biomarkers.md](./07-research/biomarkers.md) | Biomarker details | Clinical ranges, validation |
| [diabetes-subgroups.md](./07-research/diabetes-subgroups.md) | Subtype clustering | Ahlqvist categories |
| [feature-selection.md](./07-research/feature-selection.md) | Feature engineering | Mutual information, IG |
| [metrics.md](./07-research/metrics.md) | Model metrics | AUC, precision, recall |
| [ml-algorithms.md](./07-research/ml-algorithms.md) | ML algorithms comparison | XGBoost, CatBoost, etc. |
| [data-pipeline.md](./07-research/data-pipeline.md) | Data processing | NHANES, imputation |
| [ui-requirements.md](./07-research/ui-requirements.md) | UI specifications | Paper figures alignment |
| [README.md](./07-research/README.md) | Research RAG index | Paper documentation hub |

### 📁 00-legacy/
| Document | Description | Status |
|----------|-------------|--------|
| [codebase-map.md](./00-legacy/codebase-map.md) | Legacy codebase map | Archived |
| [known-issues.md](./00-legacy/known-issues.md) | Legacy issues list | Archived |

---

## Key File Locations

### Backend (Go)
| Purpose | File |
|---------|------|
| Route definitions | `backend/internal/http/router/router.go` |
| Auth handler | `backend/internal/http/handlers/auth.go` |
| Users handler | `backend/internal/http/handlers/users.go` |
| Assessment handler | `backend/internal/http/handlers/assessments.go` |
| ML predictor client | `backend/internal/ml/http_predictor.go` |
| Database queries | `backend/internal/store/sqlc/*.sql.go` |

### Frontend (React)
| Purpose | File |
|---------|------|
| Main app | `frontend/src/App.jsx` |
| API wrapper | `frontend/src/api.js` |
| Dashboard | `frontend/src/components/dashboard/Dashboard.jsx` |
| User Dashboard | `frontend/src/components/user/Dashboard_user.jsx` | User overview, assessments |
| Admin Dashboard | `frontend/src/components/admin/AdminDashboard.jsx` | Admin system stats |
| Profile | `frontend/src/components/user/UserProfile.jsx` | Profile management |
| Onboarding | `frontend/src/components/user/Onboarding.jsx` | Multi-step onboarding |
| Insights | `frontend/src/components/insights/Insights.jsx` | ML visualizations, analytics |
| Export | `frontend/src/components/export/Export.jsx` | PDF export functionality |
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
1. User enters biomarkers in Frontend
2. Frontend POST → Backend /api/v1/users/me/assessments
3. Backend (assessments.go) → ML Server POST /predict?model_type=clinical
4. ML Server (predict.py) → Returns prediction + cluster
5. Backend → Saves to database (sqlc) → Returns to Frontend
6. Frontend → Displays risk status and cluster assignment
```

---

## Common Questions

| Question | Answer Location |
|----------|-----------------|
| How does authentication work? | [02-guides/backend.md](./02-guides/backend.md) → Authentication Flow |
| How are predictions made? | [02-guides/ml-system.md](./02-guides/ml-system.md) → Model Architecture |
| What are the cluster types? | [02-guides/ml-system.md](./02-guides/ml-system.md) → Cluster Definitions |
| How to add a new API endpoint? | [02-guides/backend.md](./02-guides/backend.md) → Handlers section |
| How to add a new component? | [02-guides/frontend.md](./02-guides/frontend.md) → Components |
| How to prevent API drift? | [04-development/api-drift-prevention.md](./04-development/api-drift-prevention.md) |
| How to set up local development? | [04-development/local-setup.md](./04-development/local-setup.md) |
| How to deploy? | [06-operations/deployment.md](./06-operations/deployment.md) |

---

## Search Keywords

`architecture` `backend` `frontend` `ML` `machine learning` `database` `PostgreSQL` `API` `endpoints` `authentication` `JWT` `patients` `assessments` `diabetes` `prediction` `clustering` `biomarkers` `NHANES` `ADA` `Ahlqvist` `SIRD` `SIDD` `MOD` `MARD` `deployment` `thesis` `defense` `documentation` `development` `operations` `planning` `research`
