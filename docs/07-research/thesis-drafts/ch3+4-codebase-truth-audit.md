# Chapter 3+4 Codebase Truth Audit

Date checked: 2026-05-30

Primary thesis file: `ch3+4-final-academic-draft.md`

Technical backup: `ch3+4.md`

## Verdict

The final Chapter 3+4 draft now matches the current codebase for the system features checked in this pass. The clean thesis-ready version is `ch3+4-final-academic-draft.md`; `ch3+4.md` should remain the detailed technical backup.

## High-Risk Corrections Confirmed

- Citations are APA-style author-date in text, with APA-style reference-list entries.
- The active thesis workflow is direct user assessment, not a clinic workflow. Legacy clinic routes and repository code still exist, but clinics are not described as an active Chapter 3+4 feature.
- Deployment wording now matches the repository: Vercel/Caddy/managed PostgreSQL is one supported path, while Docker Compose production overlay with Nginx and internal PostgreSQL 16 is also present.
- Deployment/security wording is limited to configuration-level readiness and direct service-port isolation. The Nginx overlay contains an optional `/ml/` reverse-proxy route, so the manuscript no longer claims that every topology has no public ML HTTP route.
- The database is described as PostgreSQL 16-compatible persistence, not only NeonDB.
- Frontend charts are described as Recharts-based. Plotly is not listed in the current frontend dependency set.
- User export is described as PDF health report export through `/api/v1/users/me/export/pdf`, not CSV export.
- ML proxy routes are described as conditional on `MODEL_URL`.
- Chapter metrics match `models/binary_v2_no_bp/results`, including information gain, threshold arbitration, and model-comparison values.
- UI screenshot provenance is documented in `screenshots/README.md` with capture date, local capture endpoints, 1440 x 1000 PNG dimensions, source views, and SHA-256 hashes.
- Live deployment security evidence now exists for public port exposure, HTTPS redirect, TLS certificate identity, security headers, production CORS allow-list behavior, backend health, database ping, and backend-mediated ML proxy behavior. Runtime database TLS mode and actual host firewall rules remain unproven without operator-level access to the active database connection, database session settings, or firewall rule inventory. Live ML logs show `ML_API_KEY` is not configured, so current ML-service API-key enforcement must not be claimed.

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
| `cd Ian_ML && ./venv/bin/python -m pytest -q` | PASS: 274 tests |
| `cd frontend && npm run test:coverage` | PASS: 15 files, 232 tests; 71.26% lines/statements, 60.55% branches, 44.24% functions |
| `shasum -a 256 docs/07-research/thesis-drafts/screenshots/*.png` | PASS: cited UI screenshots have recorded hashes in the screenshot manifest |
| `rg -n "ports:|expose:|/ml/|ML_API_KEY|CORS_ORIGINS" docker-compose.prod.yml deployment/Caddyfile frontend/nginx-ssl.conf Ian_ML/service/server.py` | REVIEWED: direct container ports are reset in production compose; optional Nginx `/ml/` route is now qualified in manuscript wording |
| Live deployment external audit against `diana-v2.duckdns.org` and `https://diana-v2.vercel.app` | PASS/PARTIAL: 80/443 open, 22/8080/5000/5001/5432 timed out externally, HTTPS certificate verified, CORS allow-list verified, authenticated operations health reported backend/database/ML healthy, authenticated backend ML proxy succeeded, and live ML logs showed `ML_API_KEY` unset |

## Still Pending Evidence

- Real UAT results and SUS scores.
- Clinical expert ratings and quotes.
- Formal accessibility audit evidence.
- Production load/performance test evidence.
- Operator-level runtime database TLS evidence. The live audit verified external exposure, TLS, CORS, backend/database/ML health, and ML proxy-boundary behavior, but public endpoints do not expose the active database connection mode.
- Operator-level host/cloud firewall rule evidence. External port checks verify effective public exposure only.
- Runtime ML API-key enforcement evidence after `ML_API_KEY` is configured in both backend and ML service; current live logs show it is unset.
- Future replacement screenshots, if any, should be captured from the running application and added to the screenshot manifest with hashes.

Do not convert these pending items into completed findings unless the corresponding evidence is collected.
