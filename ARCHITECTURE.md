Architecture Overview
=====================

Purpose
-------
End-to-end diabetes risk workflow: clinicians log in, manage patients, submit assessments, receive cluster/risk outputs (mocked or via HTTP model), view aggregates, and export data.

System map
----------
- Backend (Go 1.21, Gin):
  - `cmd/server`: loads env, builds pgx pool, wires router, graceful shutdown.
  - `internal/http/router`: routes, CORS, auth middleware, handler registration.
  - `internal/http/handlers`: domain endpoints (auth, patients, assessments, analytics, export, health).
  - `internal/http/middleware/auth`: JWT bearer validation.
  - `internal/store`: interfaces + Postgres implementation (sqlc-generated queries).
  - `internal/ml`: predictor interface; HTTP-backed predictor or mock fallback.
  - `internal/models`: API/domain structs.
- Frontend (React 18, Vite + Tailwind):
  - Single-page app with `Sidebar`, `Dashboard`, `PatientHistory` (list + form), `Analytics`, `Export`, `Login`.
  - `src/api.js` centralizes fetch with `VITE_API_BASE`.

Backend request flow
--------------------
1) Client hits `/api/v1/*` (CORS enforced from `CORS_ORIGINS`).
2) Public paths: `/healthz`, `/livez`, `/auth/login`.
3) Protected paths: apply `Auth` middleware (`Authorization: Bearer <JWT>` signed with `JWT_SECRET`).
4) Handler executes domain logic, persists via `store` (pgx/sqlc) against Postgres.
5) Assessments: predictor invoked (mock or HTTP). Validation warnings computed server-side.
6) Response serialized to JSON (or CSV for export).

Config (env)
------------
- `PORT`, `ENV`
- `DB_DSN`
- `JWT_SECRET`
- `CORS_ORIGINS` (comma-separated)
- `MODEL_URL`, `MODEL_VERSION`, `MODEL_TIMEOUT_MS`
- `EXPORT_MAX_ROWS`
- Demo creds (seed): `DEMO_EMAIL`, `DEMO_PASSWORD`

Data model (key fields)
-----------------------
- User: `id`, `email`, `password_hash`, `role`, timestamps.
- Patient: `id`, `name`, `age`, `menopause_status`, `years_menopause`, `bmi`, `bp_systolic/diastolic`, lifestyle/comorbidity flags, lipid panel, timestamps.
- Assessment: `id`, `patient_id`, biomarker panel (FBS, HbA1c, chol/ldl/hdl/tg, BP), lifestyle flags, `bmi`, `cluster`, `risk_score`, `model_version`, `dataset_hash`, `validation_status`, timestamps.
- Analytics (derived): cluster counts, trend averages.

Routing surface
---------------
- Health: `GET /api/v1/healthz`, `GET /api/v1/livez`
- Auth: `POST /api/v1/auth/login` -> JWT (`sub`, `role`, 24h exp)
- Patients: `GET /api/v1/patients`, `POST /api/v1/patients`
- Assessments: `GET /api/v1/patients/:id/assessments`, `POST /api/v1/patients/:id/assessments`
- Analytics: `GET /api/v1/analytics/cluster-distribution`, `GET /api/v1/analytics/biomarker-trends`
- Export: `GET /api/v1/export/patients.csv`, `GET /api/v1/export/assessments.csv`, `GET /api/v1/export/datasets/:slice`

Handlers and behaviors
----------------------
- Auth: bcrypt password check, JWT HS256 with `scope=diana`.
- Patients: list/create. Errors 500 on store failures; 400 on bad payload.
- Assessments: binds JSON, attaches `model_version`, computes `validation_status` (ranges on FBS/HbA1c/lipids/BP/BMI). Predictor returns `cluster`, `risk_score`; stored with record.
- Analytics: aggregates via store (`ClusterCounts`, `TrendAverages`).
- Export: CSV streams limited by `EXPORT_MAX_ROWS`; dataset slice stub returns hash metadata.
- Health: simple JSON ok/live.

Predictor strategy
------------------
- If `MODEL_URL` is set: `HTTPPredictor` posts assessment JSON with `X-Model-Version`, timeout `MODEL_TIMEOUT_MS` ms; non-200/error -> `cluster="error", risk=0`.
- If `MODEL_URL` empty: `MockPredictor` returns deterministic cluster/risk for stable dev/test.

Store layer
-----------
- Interface in `internal/store/store.go`; Postgres implementation in `internal/store/postgres.go`.
- sqlc queries in `internal/store/queries/*.sql`, generated code in `internal/store/sqlc`.
- Requires Postgres connection (`DB_DSN`). If `DB_DSN` empty, store returns errors on access (handlers will 500).
- Migrations: `migrations/0001_init.sql` (users, patients, assessments, model_runs, audit).

Frontend composition
--------------------
- `Login`: calls `/auth/login`, stores JWT in state; default creds from seed.
- `App`: holds auth/token, active tab, patients cache; fetches patients after login; lazy fetch assessments per patient.
- `PatientHistory`: renders list/form; computes BMI client-side; posts assessment then refreshes list.
- `Dashboard`: static stats + links to patient/assessment flow.
- `Analytics`: placeholder; wire to analytics endpoints as needed.
- `Export`: links to CSV endpoints (uses `API_BASE`).
- Styling: Tailwind (see `index.css`, `tailwind.config.cjs`); Vite dev server on 3000.

Data flow (happy path)
----------------------
Login -> JWT -> set token -> fetch patients -> select/create patient -> submit assessment -> server validates + predicts + stores -> response with cluster/risk -> UI shows assessment history -> optional analytics/export fetches.

Error and edge handling
-----------------------
- Auth: missing/invalid token -> 401; wrong creds -> 401.
- DB missing/unreachable -> handlers 500.
- Model errors/timeouts -> assessment stored with `cluster="error"`, `risk_score=0`.
- Validation: `validation_status` prefixed `warning:` when biomarkers out-of-range; does not block creation.
- Export: capped by `EXPORT_MAX_ROWS`.
- CORS: must include frontend origin; otherwise browser blocks.

Dev and ops
-----------
- Run backend: `go run ./cmd/server`
- Frontend: `cd frontend && npm run dev`
- Combined: `./run-dev.sh`
- Tests: `go test ./...` (integration needs `TEST_DB_DSN`).
- Migrations: `make db_up` (requires goose installed).

Deployment pointers
-------------------
- Default: Render (API) + Neon (Postgres) + Vercel (frontend). Set envs accordingly; see `deployment.md`.
- Frontend build: `npm run build`, serve `dist`, set `VITE_API_BASE` to deployed API `/api/v1`.

Observability and ops notes
---------------------------
- Logging: Gin logger + recovery. Consider structured logging and request IDs if extending.
- Health: `/healthz` for readiness, `/livez` for liveness.
- Security: keep `JWT_SECRET` strong; restrict CORS to expected origins; bcrypt for stored users.

