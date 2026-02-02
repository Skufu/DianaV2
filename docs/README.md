# DIANA V2 - Documentation Hub

> **Purpose**: Centralized documentation index for thesis defense and development
> **Last Updated**: January 28, 2026

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
| [codebase_alignment.md](./07-research/codebase_alignment.md) | Code vs paper alignment | Feature mapping |
| [biomarkers.md](./07-research/biomarkers.md) | Biomarker details | Clinical ranges, validation |
| [diabetes_subgroups.md](./07-research/diabetes_subgroups.md) | Subtype clustering | Ahlqvist categories |
| [feature-selection.md](./07-research/feature-selection.md) | Feature engineering | Mutual information, IG |
| [metrics.md](./07-research/metrics.md) | Model metrics | AUC, precision, recall |
| [ml_algorithms.md](./07-research/ml_algorithms.md) | ML algorithms comparison | XGBoost, CatBoost, etc. |
| [data_pipeline.md](./07-research/data_pipeline.md) | Data processing | NHANES, imputation |
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
| Analytics handler | `backend/internal/http/handlers/analytics.go` |
| Insights handler | `backend/internal/http/handlers/insights.go` |
| Auth Events handler | `backend/internal/http/handlers/auth_events.go` |
| Clinic Dashboard handler | `backend/internal/http/handlers/clinic_dashboard.go` |
| Cohort handler | `backend/internal/http/handlers/cohort.go` |
| Export handler | `backend/internal/http/handlers/export.go` |
| Health handler | `backend/internal/http/handlers/health.go` |
| Admin Users handler | `backend/internal/http/handlers/admin_users.go` |
| Admin Audit handler | `backend/internal/http/handlers/admin_audit.go` |
| Admin Models handler | `backend/internal/http/handlers/admin_models.go` |
| Admin Dashboard handler | `backend/internal/http/handlers/admin_dashboard.go` |
| Utils | `backend/internal/http/handlers/utils.go` |
| JWT Middleware | `backend/internal/http/middleware/auth.go` |
| RBAC Middleware | `backend/internal/http/middleware/rbac.go` |
| CORS Middleware | `backend/internal/http/middleware/cors.go` |
| Rate Limit Middleware | `backend/internal/http/middleware/ratelimit.go` |
| Security Middleware | `backend/internal/http/middleware/security.go` |
| ML predictor client | `backend/internal/ml/http_predictor.go` |
| Mock predictor | `backend/internal/ml/mock.go` |
| Biomarker validation | `backend/internal/ml/validation.go` |
| PDF Generator | `backend/internal/pdf/generator.go` |
| SSE Broker | `backend/internal/http/sse/broker.go` |
| Redis Cache | `backend/internal/cache/redis_cache.go` |
| Validation Service | `backend/internal/services/validation_service.go` |
| PDF Export Service | `backend/internal/services/pdf_export_service.go` |
| Notification Service | `backend/internal/services/notification_service.go` |
| Database queries | `backend/internal/store/sqlc/*.sql.go` |
| Postgres repositories | `backend/internal/store/postgres.go` |
| Store interface | `backend/internal/store/store.go` |
| Models | `backend/internal/models/types.go` |
| Config | `backend/internal/config/config.go` |

### Frontend (React)
| Purpose | File |
|---------|------|
| Main app | `frontend/src/App.jsx` |
| API wrapper | `frontend/src/api.js` |
| Main Dashboard | `frontend/src/components/dashboard/Dashboard_user.jsx` | Main dashboard component |
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
| Main Sidebar | `frontend/src/components/layout/Sidebar.jsx` | Main navigation sidebar |
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
| Purpose | File |
|---------|------|
| Flask server | `Ian_ML/server.py` |
| Predictors | `Ian_ML/predict.py` |
| Model training | `Ian_ML/train.py` |
| Clustering | `Ian_ML/clustering.py` |
| Data Processing | `Ian_ML/data_processing.py` |
| Explainability | `Ian_ML/explainability.py` |
| Explainer | `Ian_ML/explainer.py` |
| A/B Testing | `Ian_ML/ab_testing.py` |
| Drift Detection | `Ian_ML/drift_detection.py` |
| MLflow Config | `Ian_ML/mlflow_config.py` |

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
