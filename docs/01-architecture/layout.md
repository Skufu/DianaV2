# Repository Layout

This document summarizes the high-level DIANA V2 repository layout and clarifies service boundaries.

## Top-Level Overview
- `backend/`: Go API, auth, persistence, and ML transport client
- `frontend/`: React/Vite SPA
- `Ian_ML/`: Python ML service and training code
- `models/`: trained model artifacts and reports
- `scripts/`: training, data, and operational helpers
- `docs/`: architecture, guides, ML contracts, operations, and research docs

## Service Boundaries
- **Frontend**
  - Submits assessments to backend and renders backend-normalized results
  - Main API client: `frontend/src/api.js`
- **Backend**
  - Authoritative normalization boundary for assessment result shape
  - Main area: `backend/internal/http/handlers/assessments.go`
- **ML service**
  - Produces model predictions/explainability payloads
  - Transport contract consumed by backend (`docs/03-ml/api-contract.md`)

## Documentation Layout (Current)
- `00-legacy/`: historical docs (not primary map)
- `01-architecture/`: architecture docs
- `02-guides/`: backend/frontend/database/admin/security guides
- `03-ml/`: assessment contract, API contract, methodology, feature docs
- `05-planning/`: planning/PRD docs
- `06-operations/`: deployment and operational docs
- `07-research/`: manuscript/research support docs
- `08-fixes/`: historical fix logs (not primary map)

## Canonical Docs For Runtime ML Behavior
- `docs/03-ml/assessment-contract.md`
- `docs/03-ml/api-contract.md`
- `docs/03-ml/feature-documentation.md`
- `docs/03-ml/methodology.md`

Use these as authority when other docs conflict.
