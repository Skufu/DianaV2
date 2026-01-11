# Project Structure

This document outlines the organizational structure of the Diana V2 codebase.

## Directory Layout

```
DIANA V2/
├── backend/                    # Go backend server
│   ├── cmd/                   # Application entrypoints
│   │   ├── server/            # Main API server
│   │   ├── migrate/           # Database migrations
│   │   └── seed/              # Database seeding
│   ├── docs/                  # Swagger documentation
│   │   └── docs.go            # Generated swagger docs
│   ├── internal/              # Private application code
│   │   ├── config/            # Configuration management
│   │   ├── http/              # HTTP handlers and middleware
│   │   │   ├── handlers/      # Request handlers
│   │   │   │   ├── auth.go
│   │   │   │   ├── patients.go
│   │   │   │   ├── assessments.go
│   │   │   │   ├── analytics.go
│   │   │   │   ├── cohort.go
│   │   │   │   ├── export.go
│   │   │   │   ├── health.go
│   │   │   │   ├── clinic_dashboard.go
│   │   │   │   ├── admin_dashboard.go
│   │   │   │   ├── admin_users.go
│   │   │   │   ├── admin_audit.go
│   │   │   │   └── admin_models.go
│   │   │   ├── middleware/    # HTTP middleware
│   │   │   │   ├── auth.go
│   │   │   │   ├── rbac.go
│   │   │   │   ├── ratelimit.go
│   │   │   │   ├── security.go
│   │   │   │   ├── logger.go
│   │   │   │   └── audit.go
│   │   │   └── router/        # Route definitions
│   │   │       └── router.go
│   │   ├── ml/                # ML client integration
│   │   │   ├── http_predictor.go
│   │   │   ├── mock.go
│   │   │   └── validation.go
│   │   ├── models/            # Domain models
│   │   │   └── types.go
│   │   ├── pdf/               # PDF generation
│   │   │   └── generator.go
│   │   └── store/             # Database access layer
│   │       ├── store.go
│   │       ├── postgres.go
│   │       ├── postgres_admin.go
│   │       ├── postgres_cohort.go
│   │       └── sqlc/          # Generated SQLC code
│   ├── migrations/            # SQL migration files
│   │   ├── 0001_init.sql
│   │   ├── 0002_add_family_history_and_phys_activity.sql
│   │   ├── 0003_add_updated_at_and_indexes.sql
│   │   ├── 0004_add_refresh_tokens.sql
│   │   ├── 0005_add_patient_user_id.sql
│   │   ├── 0006_add_mock_data.sql
│   │   ├── 0007_update_cluster_names.sql
│   │   ├── 0008_update_cluster_names.sql
│   │   ├── 0009_add_clinics.sql
│   │   └── 0010_admin_features.sql
│   ├── go.mod
│   ├── go.sum
│   └── sqlc.yaml              # SQLC configuration
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── analytics/     # Analytics & cohort analysis
│   │   │   ├── auth/          # Login
│   │   │   ├── clinic/        # Clinic dashboard
│   │   │   ├── common/        # Shared components
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── education/     # Educational content
│   │   │   ├── export/        # Data export
│   │   │   ├── layout/        # Layout components
│   │   │   └── patients/      # Patient management
│   │   ├── utils/             # Utility functions
│   │   ├── App.jsx            # Main application
│   │   ├── api.js             # API client
│   │   └── main.jsx           # Application entrypoint
│   ├── e2e/                   # Playwright E2E tests
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.cjs
│   └── playwright.config.js
│
├── ml/                         # Machine Learning (Python)
│   ├── server.py              # Flask API server
│   ├── predict.py             # Prediction logic
│   ├── train.py               # Model training
│   ├── clustering.py          # Risk clustering
│   ├── data_processing.py     # Data preparation
│   ├── explainability.py      # SHAP explanations
│   ├── explainer.py           # Explainer utilities
│   ├── ab_testing.py          # A/B testing
│   ├── drift_detection.py     # Drift monitoring
│   ├── mlflow_config.py       # MLflow integration
│   └── requirements.txt       # Python dependencies
│
├── models/                     # Trained ML model artifacts
│   ├── clinical/              # Clinical model files
│   │   ├── best_model.joblib
│   │   ├── scaler.joblib
│   │   ├── kmeans_model.joblib
│   │   ├── cluster_labels.json
│   │   ├── results/
│   │   └── visualizations/
│   ├── best_model.joblib      # ADA baseline
│   ├── scaler.joblib
│   ├── kmeans_model.joblib
│   └── results/
│
├── data/                       # Raw datasets
│   └── nhanes/                # NHANES data files
│
├── scripts/                    # Shell/Python scripts
│   ├── setup.sh               # Project setup
│   ├── run-dev.sh             # Development runner
│   ├── start-all.sh           # Start all services
│   ├── start-ml.sh            # ML server starter
│   ├── retrain-all.sh         # Full ML retraining
│   ├── test-db.sh             # Database testing
│   ├── process_nhanes_multi.py
│   ├── feature_selection.py
│   ├── train_enhanced.py
│   ├── train_clusters.py
│   ├── impute_missing_data.py
│   └── generate_thesis_outputs.py
│
├── docs/                       # Documentation
│   ├── architecture/          # Architecture docs
│   │   ├── ARCHITECTURE.md
│   │   ├── PROJECT_STRUCTURE.md
│   │   └── layout.md
│   ├── dev/                   # Developer guides
│   │   ├── CLAUDE.md
│   │   ├── LOCAL_SETUP.md
│   │   ├── TROUBLESHOOTING.md
│   │   └── *.md
│   ├── ops/                   # Operations docs
│   │   ├── deployment.md
│   │   └── logging-improvements.md
│   ├── paper_rag/             # Paper RAG documentation
│   ├── ARCHITECTURE.md
│   ├── BACKEND.md
│   ├── FRONTEND.md
│   ├── DATABASE.md
│   ├── ML_SYSTEM.md
│   ├── ADMIN.md
│   ├── SECURITY.md
│   └── README.md
│
├── build/                      # Container configuration
│   └── Dockerfile
├── configs/                    # Configuration files
├── Makefile                    # Build commands
├── docker-compose.yml          # Docker compose config
├── .env                        # Environment variables
└── README.md                   # Project overview
```

## Architecture Layers

### 1. Presentation Layer (`frontend/`, `internal/http/`)
- **Frontend**: React 18 with Vite build system
- **API Layer**: Gin HTTP framework with structured routing
- **Middleware**: Authentication, RBAC, rate limiting, CORS, security headers, audit logging

### 2. Business Logic Layer (`internal/`)
- **Handlers**: HTTP request processing and response formatting
- **Models**: Domain objects and data transfer objects
- **ML Integration**: Pluggable machine learning prediction system with HTTP and mock predictors

### 3. Data Access Layer (`internal/store/`, `migrations/`)
- **Store**: Repository pattern with interface-based design
- **Database**: PostgreSQL with Goose migration management
- **Queries**: SQLC for type-safe SQL query generation

### 4. ML Layer (`ml/`)
- **Prediction**: Two model types (ADA baseline, Clinical non-circular)
- **Clustering**: K-Means with Ahlqvist subtypes (SIRD/SIDD/MOD/MARD)
- **Explainability**: SHAP-based feature explanations
- **Infrastructure**: A/B testing, drift detection, MLflow integration

### 5. Infrastructure Layer (`build/`, `scripts/`, `configs/`)
- **Containerization**: Docker-based deployment
- **Configuration**: Environment-based configuration management
- **Development Tools**: Scripts for local development and testing

## Key Design Principles

### 1. **Clean Architecture**
- Clear separation between layers
- Dependency inversion through interfaces
- Business logic independent of frameworks

### 2. **Industry Standards**
- Structured logging with request tracing
- Comprehensive error handling
- Security best practices (JWT, CORS, RBAC, input validation)

### 3. **Development Experience**
- Hot reloading for both frontend and backend
- Mock mode for database-free development
- Comprehensive documentation and troubleshooting guides

### 4. **Observability**
- Structured logging with request IDs
- Performance metrics and slow query detection
- User action tracking and audit trails

### 5. **Scalability**
- Stateless API design
- Database connection pooling
- Pluggable ML prediction system

## Configuration Management

### Environment-Based Configuration
- **Development**: `.env`, `.env.local` with console logging
- **Staging**: Structured JSON logging with debug info
- **Production**: Structured JSON logging with minimal verbosity

### Security Configuration
- JWT secret management
- CORS origin configuration
- Database connection security (SSL, connection pooling)
- RBAC for admin routes

## Development Workflow

1. **Setup**: Run `scripts/setup.sh` for initial configuration
2. **Development**: Use `scripts/run-dev.sh` for full-stack development
3. **Testing**: `go test ./...` for backend, `npx playwright test` for E2E
4. **Deployment**: Docker-based deployment with environment-specific configs

## Logging and Observability

### Structured Logging
- **Request ID**: Unique identifier for request tracing
- **User Context**: Email and role from JWT claims
- **Performance Metrics**: Latency, response size, slow request detection
- **Error Context**: Detailed error information with request correlation

### Audit Events
- All admin actions logged to `audit_events` table
- JSONB details field for flexible event data
- Queryable by actor, action, date range

This structure follows Go and web application best practices while providing a scalable foundation for the diabetes risk assessment platform.
