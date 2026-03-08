# Project Structure

This document provides a practical codebase structure reference for DIANA V2.

## Repository Tree (Condensed)
```text
DIANA V2/
├── backend/
│   ├── cmd/                 # server, migrate, seed
│   ├── internal/
│   │   ├── config/
│   │   ├── http/            # handlers, middleware, router
│   │   ├── ml/              # predictor client, validation, mock
│   │   ├── models/
│   │   ├── pdf/
│   │   └── store/           # repositories + sqlc
│   ├── migrations/
│   └── sqlc.yaml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── main.jsx
│   └── e2e/
├── Ian_ML/
│   ├── service/
│   ├── training/
│   ├── common/
│   └── requirements.txt
├── models/
├── scripts/
├── docs/
│   ├── 00-legacy/
│   ├── 01-architecture/
│   ├── 02-guides/
│   ├── 03-ml/
│   ├── 05-planning/
│   ├── 06-operations/
│   ├── 07-research/
│   └── 08-fixes/
├── build/
├── configs/
└── README.md
```

## Docs Subtree (Current)
```text
docs/
├── 00-legacy/                 # archived legacy references
├── 01-architecture/            # overview, detailed-architecture, layout, project-structure
├── 02-guides/                  # backend, frontend, database, admin, security, ml-system
├── 03-ml/                      # assessment-contract, api-contract, feature-documentation, methodology, etc.
├── 05-planning/                # backend-refactoring-prd
├── 06-operations/              # deployment, deployment-internal, logging-improvements
├── 07-research/                # paper-requirements, manuscript-updates, metrics, data_pipeline, etc.
└── 08-fixes/                   # historical fix logs
```

## Layer Notes
- **Frontend layer**: UI, interaction flow, API consumption.
- **Backend layer**: auth, validation, normalization, persistence.
- **ML layer**: training and prediction service.
- **Storage layer**: Postgres with SQLC-generated query bindings.

## Canonical Runtime Docs
When in doubt about assessment and model semantics, use:
- `docs/03-ml/assessment-contract.md`
- `docs/03-ml/api-contract.md`
- `docs/03-ml/feature-documentation.md`
- `docs/03-ml/methodology.md`
