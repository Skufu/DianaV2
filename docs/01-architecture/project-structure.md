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
│   │   │   │   ├── auth_events.go
│   │   │   │   ├── users.go
│   │   │   │   ├── assessments.go
│   │   │   │   ├── insights.go
│   │   │   │   ├── cohort.go
│   │   │   │   ├── analytics.go
│   │   │   │   ├── export.go
│   │   │   │   ├── health.go
│   │   │   │   ├── clinic_dashboard.go
│   │   │   │   ├── admin_dashboard.go
│   │   │   │   ├── admin_users.go
│   │   │   │   ├── admin_audit.go
│   │   │   │   ├── admin_models.go
│   │   │   │   └── utils.go
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
│   │   ├── 0010_admin_features.sql
│   │   ├── 0011_refactor_users_to_menopausal.sql
│   │   └── 0012_add_auth_events.sql
│   ├── go.mod
│   ├── go.sum
│   └── sqlc.yaml              # SQLC configuration
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── 3d/            # 3D visualizations
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── auth/          # Login
│   │   │   ├── backup/        # Backup components
│   │   │   ├── common/        # Shared components
│   │   │   ├── education/     # Educational content
│   │   │   ├── export/        # Data export
│   │   │   ├── insights/      # Insights components
│   │   │   ├── layout/        # Layout components
│   │   │   └── user/          # User management
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
├── Ian_ML/                     # Machine Learning (Python)
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
│   ├── predict_binary.py      # Binary prediction
│   ├── train_binary.py        # Binary training
│   ├── models/                # ML model artifacts
│   │   ├── best_model.joblib
│   │   ├── kmeans_model.joblib
│   │   └── scaler.joblib
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
│   ├── README.md
│   ├── check-api-drift.sh     # API drift detection
│   ├── data/                  # Data processing scripts
│   │   ├── check_raw_datasets.py
│   │   ├── download_lifestyle_data.py
│   │   ├── download_nhanes_multi.py
│   │   ├── impute_missing_data.py
│   │   └── process_nhanes_multi.py
│   ├── dev/                   # Development scripts
│   │   ├── logs.sh
│   │   ├── retrain-all.sh
│   │   ├── setup.sh
│   │   ├── start-all.bat
│   │   ├── start-all.ps1
│   │   └── start-all.sh
│   ├── eval/                  # Evaluation scripts
│   │   ├── ablation_study.py
│   │   ├── calculate_confidence_intervals.py
│   │   ├── calculate_metrics.py
│   │   ├── calculate_per_class_metrics.py
│   │   ├── evaluate_clusters.py
│   │   ├── feature_selection.py
│   │   └── weighting_ablation.py
│   ├── legacy/                # Legacy scripts
│   │   ├── download_nhanes.sh
│   │   ├── download_nhanes_py.py
│   │   ├── process_nhanes.py
│   │   ├── remove_bg.py
│   │   └── train_enhanced.py
│   ├── thesis/                # Thesis generation scripts
│   │   ├── generate_comparison_table.py
│   │   ├── generate_executive_summary.py
│   │   ├── generate_limitations.py
│   │   ├── generate_thesis_outputs.py
│   │   ├── generate_vignettes.py
│   │   └── verify_manuscript.py
│   ├── train/                 # Training scripts
│   │   └── train_clusters.py
│   └── util/                  # Utility scripts
│       └── debug_data.py
│
├── docs/                       # Documentation
│   ├── 00-legacy/            # Legacy archived docs
│   ├── 01-architecture/       # Architecture docs
│   │   ├── overview.md
│   │   ├── detailed-architecture.md
│   │   ├── project-structure.md
│   │   └── layout.md
│   ├── 02-guides/            # Component guides
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   ├── database.md
│   │   ├── ml-system.md
│   │   ├── admin.md
│   │   └── security.md
│   ├── 03-ml/                # ML-specific docs
│   │   ├── api-contract.md
│   │   ├── AUDIT_REPORT.md
│   │   ├── integration.md
│   │   ├── methodology.md
│   │   └── rationale.md
│   ├── 04-development/        # Developer guides
│   │   ├── local-setup.md
│   │   ├── troubleshooting.md
│   │   ├── api-drift-prevention.md
│   │   └── claude-instructions.md
│   ├── 05-planning/           # Planning docs
│   │   ├── backend-plan.md
│   │   ├── backend-plan-root.md
│   │   ├── frontend-plan.md
│   │   ├── frontend-plan-root.md
│   │   ├── admin-dashboard-plan.md
│   │   ├── concerns.md
│   │   └── backend-refactoring-prd.md
│   ├── 06-operations/         # Operations docs
│   │   ├── deployment.md
│   │   ├── deployment-internal.md
│   │   └── logging-improvements.md
│   ├── 07-research/           # Research/thesis docs
│   │   ├── README.md
│   │   ├── biomarkers.md
│   │   ├── codebase_alignment.md
│   │   ├── data_pipeline.md
│   │   ├── diabetes_subgroups.md
│   │   ├── feature_selection.md
│   │   ├── manuscript-updates.md
│   │   ├── metrics.md
│   │   ├── ml_algorithms.md
│   │   ├── paper_alignment_analysis.md
│   │   ├── paper-requirements.md
│   │   └── ui_requirements.md
│   ├── AUTHENTICATION_AND_SECURITY.md
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

### 4. ML Layer (`Ian_ML/`)
- **Prediction**: Two model types (ADA baseline, Clinical non-circular, Binary)
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
