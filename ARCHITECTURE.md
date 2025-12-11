System Architecture
===================

Purpose & Scope
---------------
Clinical workflow for diabetes risk: clinicians log in, manage patients, submit assessments, receive cluster/risk outputs (HTTP model or mock), view aggregates, and export data. This document maps components, flows, data, runtime behavior, and operational levers.

Topology (high level)
---------------------
- Client: React 18 SPA (Vite + Tailwind) served statically (Vercel/local).
- API: Go 1.21 Gin service.
- Data: Postgres (sqlc-generated queries).
- ML: Pluggable predictor over HTTP; deterministic mock fallback.
- Paths: Frontend -> API (`/api/v1/*`) -> Postgres; Assessments flow optionally -> ML endpoint.

Backend components (Go)
-----------------------
- Entrypoint: `cmd/server` loads env, builds pgx pool, wires router, starts HTTP server with graceful shutdown.
- Router: `internal/http/router` sets CORS, logging/recovery, mounts `/api/v1`, registers handlers, and guards protected routes with JWT middleware.
- Middleware: `internal/http/middleware/auth` validates `Authorization: Bearer <JWT>` signed with `JWT_SECRET`.
- Handlers (`internal/http/handlers`):
  - Auth: `/auth/login` bcrypt check -> JWT (HS256, 24h, `scope=diana`, `role` claim).
  - Patients: list/create.
  - Assessments: create/list per patient; computes validation warnings; invokes predictor; persists.
  - Analytics: cluster counts, biomarker trend averages.
  - Export: CSV for patients/assessments; dataset slice stub.
  - Health: liveness/readiness.
- ML: `internal/ml`
  - Predictor interface.
  - `HTTPPredictor` posts assessment JSON to `MODEL_URL` with `X-Model-Version`; timeout `MODEL_TIMEOUT_MS`; any error/non-200 -> `cluster="error", risk=0`.
  - `MockPredictor` deterministic clusters for stable dev/test when `MODEL_URL` is empty.
- Store: `internal/store`
  - Interfaces in `store.go`; Postgres impl in `postgres.go` using sqlc (`internal/store/sqlc`).
  - If `DB_DSN` is unset, repos return errors on access (handlers surface 500).
- Models: `internal/models` define User/Patient/Assessment/analytics DTOs.

Frontend components (React)
---------------------------
- App shell: `src/App.jsx` manages auth state, active tab, patient cache, and assessment cache.
- API client: `src/api.js` wraps `fetch` with `API_BASE = VITE_API_BASE`, handles JSON/text.
- Screens: `Login`, `Dashboard`, `PatientHistory` (list + form), `Analytics`, `Export`, `Sidebar`.
- Flow: login -> store token -> fetch patients -> create patient -> submit assessment -> render history; optional analytics/export requests.

Data model (persistent)
-----------------------
- Users: email, password_hash (bcrypt), role, timestamps.
- Patients: demographics, menopause status, BMI, BP, activity/smoking/hypertension/heart disease, lipid panel, timestamps.
- Assessments: patient_id, biomarker panel, lifestyle flags, BMI, cluster, risk_score, model_version, dataset_hash, validation_status, created_at.
- Supporting tables: model_runs (version/hash notes), audit_events (generic audit hook).
- Schema defined in `migrations/0001_init.sql`.

Core request flows
------------------
- Auth: `POST /api/v1/auth/login` -> JWT; 401 on bad creds or missing payload.
- Patients: `GET /patients` (list), `POST /patients` (create). 400 on bad payload; 500 on store errors.
- Assessments:
  - `POST /patients/:id/assessments`: parse payload, compute `validation_status` (ranges on FBS/HbA1c/lipids/BP/BMI), call predictor, persist with `model_version` + `dataset_hash`, return created row.
  - `GET /patients/:id/assessments`: list by patient.
- Analytics: `GET /analytics/cluster-distribution`, `GET /analytics/biomarker-trends`; aggregate via store.
- Export: `GET /export/patients.csv`, `GET /export/assessments.csv`, `GET /export/datasets/:slice` (stubbed metadata). Rows capped by `EXPORT_MAX_ROWS`.
- Health: `GET /healthz`, `GET /livez`.

Configuration (env) and defaults
--------------------------------
- `PORT` (default `8080`), `ENV` (`dev` default).
- `DB_DSN` (Postgres URL). If empty, handlers fail on DB access.
- `JWT_SECRET` (default `dev-secret`).
- `CORS_ORIGINS` (comma list; default `http://localhost:3000`).
- `MODEL_URL` (optional), `MODEL_VERSION` (default `v0-placeholder`), `MODEL_DATASET_HASH` (optional), `MODEL_TIMEOUT_MS` (default `2000` ms).
- `EXPORT_MAX_ROWS` (default `5000`).

Runtime behaviors & failure modes
---------------------------------
- Startup: optional pgx pool connect/ping; logs warning when `DB_DSN` is unset (store will error on use).
- Shutdown: graceful HTTP shutdown with 5s timeout; pgx pool close.
- Auth errors: missing/invalid bearer -> 401.
- Model failures/timeouts/non-200: stored as `cluster="error", risk=0`; request still succeeds (201).
- Validation warnings: prefixed `warning:` and returned; does not block creation.
- Export caps: CSV limited by `EXPORT_MAX_ROWS`.
- CORS: enforced via configured origins.

Security notes
--------------
- JWT HS256 signed with `JWT_SECRET`; token includes `role` but no role-based checks in handlers yet.
- Passwords stored bcrypt-hashed.
- CORS restricted to configured origins; ensure production origins set.
- No PII encryption at rest; relies on Postgres and deployment environment controls.

Deployment & environments
-------------------------
- Reference stack: Render (API) + Neon (Postgres) + Vercel (frontend). See `deployment.md`.
- Backend build/run: `go build -o server ./cmd/server` then `./server`.
- Frontend build: `npm install && npm run build` (outputs `dist`).
- Env wiring: set `VITE_API_BASE` on frontend to deployed API `/api/v1`; set backend envs for DB/JWT/CORS/model/export.

Local development & testing
---------------------------
- Backend: `go run ./cmd/server`.
- Frontend: `cd frontend && npm run dev` (default port 3000).
- Combined helper: `./run-dev.sh` (expects Postgres reachable at `DB_DSN`).
- Migrations: `DB_DSN=<url> make db_up` (goose).
- Tests: `go test ./...` (integration needs `TEST_DB_DSN` with schema applied).

Observability & gaps
--------------------
- Logging: Gin logger + recovery only; no structured logging, tracing, or metrics yet.
- Health endpoints present; consider request IDs and structured logs for production.
- Model inference latency/availability not instrumented; add if needed.

Extensibility pointers
----------------------
- Add RBAC by extending JWT claims and middleware checks.
- Replace mock predictor by setting `MODEL_URL`; ensure timeouts tuned via `MODEL_TIMEOUT_MS`.
- Expand exports by filling `datasetSlice` logic and adding filters.
- Add analytics endpoints backed by new sqlc queries as domain evolves.

