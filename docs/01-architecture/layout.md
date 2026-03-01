# Repository Layout

This document summarizes the high-level layout of the DIANA V2 repository and clarifies the backend/frontend boundary.

## Top-level overview

- `backend/`: Go backend application.
  - `cmd/`: Go entrypoints.
    - `cmd/server/`: Main API server (`main.go`).
    - `cmd/seed/`: One-off seeding utility for the database.
  - `internal/`: Private Go application code.
    - `internal/config/`: Configuration loading and environment wiring.
    - `internal/http/`: HTTP layer (router, handlers, middleware).
    - `internal/ml/`: ML predictor interface + HTTP and mock implementations.
    - `internal/models/`: Domain types (User, Patient, Assessment, analytics DTOs).
    - `internal/store/`: Data access layer (sqlc queries + Postgres repo implementation).
  - `migrations/`: Goose migrations defining the Postgres schema and indexes.
- `frontend/`: React (Vite) SPA client.
  - `frontend/src/`: Components, API helper, styles, app shell.
- `Ian_ML/`: Python ML service (Flask, scikit-learn).
  - `server.py`: Main ML server exposing prediction endpoints.
  - `train/`, `eval/`, `data/`: ML training, evaluation, and data directories.
- `configs/`: Example env files (`env.example`, `.env.local.example`).
- `build/`: Containerization and related build artifacts (e.g., `build/Dockerfile`).
- `scripts/`: Development and operational scripts (dev setup, test DB, etc.).
- `docs/`: Central documentation hub (see below).
- `README.md`: Project overview and quickstart.

## Backend vs frontend boundary

- **Backend (Go)**
  - Lives under `backend/` (including `backend/cmd/`, `backend/internal/`, `backend/migrations/`).
  - Exposes a JSON HTTP API on `/api/v1/*`.
  - Owns persistence (Postgres via `backend/internal/store` + `backend/migrations/`) and ML integration (`backend/internal/ml`).

- **Frontend (React)**
  - Lives entirely under `frontend/`.
  - Talks to the backend only via HTTP (`VITE_API_BASE` + `/api/v1/*`), using `frontend/src/api.js`.
  - Manages UI, navigation, and client-side state for clinicians.

- **ML Service (Python)**
  - Lives under `Ian_ML/`.
  - Exposes prediction endpoints via Flask server on port 5001.
  - Called by backend through `backend/internal/ml` HTTP client.

This separation lets you evolve the backend, frontend, and ML services independently (e.g., swap hosting, scale services) while keeping a clear contract at the HTTP API boundary.

## Docs layout

- `01-architecture/`
  - `overview.md`: System architecture overview
  - `detailed-architecture.md`: Detailed architecture, flows, and components.
  - `project-structure.md`: Detailed directory-by-directory project structure.
  - `layout.md`: This high-level layout and boundary overview.
- `02-guides/`
  - `backend.md`: Go/Gin backend API guide
  - `frontend.md`: React frontend guide
  - `database.md`: PostgreSQL database guide
  - `ml-system.md`: ML system overview
  - `admin.md`: Admin dashboard guide
  - `security.md`: Security guidelines
- `03-ml/`
  - `integration.md`: Backend-ML integration
  - `api-contract.md`: ML API contract specification used by `backend/internal/ml`
  - `methodology.md`: ML methodology
  - `rationale.md`: ML justification
  - `AUDIT_REPORT.md`: ML documentation audit report
- `04-development/`
  - `local-setup.md`: Primary local development setup guide for team
  - `troubleshooting.md`: Common issues and their resolutions
  - `api-drift-prevention.md`: API consistency and drift prevention
  - `claude-instructions.md`: Guidance for AI coding assistants
- `05-planning/`
  - `backend-refactoring-prd.md`: Backend refactoring requirements
- `06-operations/`
  - `deployment.md`: Primary deployment instructions and environment notes.
  - `deployment-internal.md`: Internal/legacy deployment notes.
  - `logging-improvements.md`: Logging and observability improvements.
- `07-research/`
  - Research files related to ML algorithms, biomarkers, data pipeline, manuscript alignment, etc.

For a more exhaustive, tree-style view of the repository, see `01-architecture/project-structure.md`.
