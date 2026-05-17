# Chapter 3+4 Codebase Truth Audit

Date checked: 2026-05-17

Primary thesis file: `ch3+4-final-academic-draft.md`

Technical backup: `ch3+4.md`

## Verdict

The final Chapter 3+4 draft now matches the current codebase for the system features checked in this pass. The clean thesis-ready version is `ch3+4-final-academic-draft.md`; `ch3+4.md` should remain the detailed technical backup.

## High-Risk Corrections Confirmed

- Citations are APA-style author-date in text, with APA-style reference-list entries.
- The active thesis workflow is direct user assessment, not a clinic workflow. Legacy clinic routes and repository code still exist, but clinics are not described as an active Chapter 3+4 feature.
- Deployment wording now matches the repository: Vercel/Caddy/managed PostgreSQL is one supported path, while Docker Compose production overlay with Nginx and internal PostgreSQL 16 is also present.
- The database is described as PostgreSQL 16-compatible persistence, not only NeonDB.
- Frontend charts are described as Recharts-based. Plotly is not listed in the current frontend dependency set.
- User export is described as PDF health report export through `/api/v1/users/me/export/pdf`, not CSV export.
- ML proxy routes are described as conditional on `MODEL_URL`.
- Chapter metrics match `models/binary_v2_no_bp/results`, including information gain, threshold arbitration, and model-comparison values.

## Verified Current Features

- Auth: login, register, refresh, logout.
- User profile, onboarding, consent, trends, account deletion, and privacy export/delete routes.
- Assessment create/list/update/delete with `binary_v2_no_bp` as the locked doctor model type.
- PDF report export.
- Admin dashboard, audit logs, auth events stream, user management, model traceability, and operations health/log surfaces.
- Insights endpoints for cluster distribution, biomarker trends, cohort analysis, and ML-backed metrics/visualizations when the ML proxy is configured.
- Python ML service with no-BP binary model artifacts, waist-circumference imputation, metabolic guardrail boost, weighted K-Means, SHAP background support, and drift hooks.

## Verification Evidence

| Check | Result |
|---|---|
| `python3 scripts/thesis/check_metrics_consistency.py docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md docs/07-research/thesis-drafts/ch3+4.md` | PASS: 43 checked claims per document |
| `cd backend && GOCACHE=/private/tmp/diana-go-build go test ./...` | PASS |
| `cd Ian_ML && ./venv/bin/python -m pytest -q` | PASS: 270 tests |
| `cd frontend && npm run test:coverage` | PASS: 15 files, 232 tests; 71.26% lines/statements, 60.58% branches, 44.24% functions |

## Still Pending Evidence

- Real UAT results and SUS scores.
- Clinical expert ratings and quotes.
- Formal accessibility audit evidence.
- Production load/performance test evidence.
- Final screenshots captured from the running application.

Do not convert these pending items into completed findings unless the corresponding evidence is collected.
