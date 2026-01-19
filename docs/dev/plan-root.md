# DIANA Backend Plan (Go + Gin)

Goal: scaffold a minimal, production-ready Go (Gin) backend that serves the existing React frontend and exposes REST endpoints for diabetes risk workflows (placeholders for ML until models are ready). Default datastore: PostgreSQL (with an in-memory mode only for fast tests).

## 1) Scope & Assumptions
- Frontend lives in `.md` React file; backend will be a separate Go service.
- Machine learning, clustering, and scoring will be stubbed with deterministic mock outputs until the real model is integrated.
- Data store: start with in-memory + optional SQLite/Postgres toggle via config.
- Auth: simple JWT-based clinician login (mock users in-memory or seeded table).
- Deployment: single service; no microservices yet; ready for containerization.

## 2) High-Level Architecture
- Gin HTTP server with versioned API: `/api/v1/*`.
- Modules/packages:
  - `cmd/server`: main entrypoint, config load, wiring.
  - `internal/config`: env/config parsing (ENV, .env).
  - `internal/http/middleware`: logging, recovery, CORS, auth (JWT).
  - `internal/http/handlers`: grouped by domain (auth, patients, assessments, analytics, export).
  - `internal/core`: business logic/services (patients, assessments, reports, analytics).
  - `internal/store`: repository interfaces + implementations (postgres primary, in-memory dev fallback).
  - `internal/models`: data structs (Patient, Assessment, BiomarkerPanel, User).
  - `internal/ml`: placeholder scoring/cluster assignment (returns mock risk/cluster).
  - `internal/export`: CSV/JSON export stubs.
- Graceful shutdown with context cancellation.

## 3) Data Model (initial)
- User: id, email, password_hash (or plaintext mock), role.
- Patient: id, name, age, menopause_status, years_menopause, bmi, bp, activity, smoking, hypertension, heart_disease, lipids (chol, ldl, hdl, tg), history[] (date, hba1c, fbs).
- Assessment: id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic, activity, history_flags, computed_bmi, risk_score, cluster, created_at.
- Audit/Event (optional later): id, actor, action, target_type/id, timestamp.

## 4) API Surface (v1, REST)
- Auth
  - `POST /api/v1/auth/login` -> {token} (mock validation).
  - `POST /api/v1/auth/refresh` (optional).
- Patients
  - `GET /api/v1/patients` (list, filter/search).
  - `POST /api/v1/patients` (create).
  - `GET /api/v1/patients/:id` (detail with history).
  - `PUT /api/v1/patients/:id` (update demographics/lifestyle).
- Assessments
  - `POST /api/v1/patients/:id/assessments` -> runs placeholder ML, stores assessment.
  - `GET /api/v1/patients/:id/assessments` (list).
  - `GET /api/v1/assessments/:id` (detail).
- Analytics (mocked)
  - `GET /api/v1/analytics/cluster-distribution` -> counts by cluster.
  - `GET /api/v1/analytics/biomarker-trends` -> cohort trend mock data.
- Export
  - `GET /api/v1/export/patients.csv`
  - `GET /api/v1/export/assessments.csv`
  - `GET /api/v1/export/datasets/:slice` (time-bounded, hash-stamped, for training)

## 5) Mapping to Frontend (current `.md`)
- Dashboard widgets: served by `analytics/*` endpoints.
- Patient History table/profile: driven by `patients` + `assessments` endpoints.
- New Assessment form: posts to `/patients/:id/assessments` (or anonymous create) and receives `{cluster, risk_score}` mock.
- Login screen: uses `auth/login` to fetch JWT.

## 6) Logic Flow (placeholder)
- Login: validate against in-memory user list -> issue JWT.
- Create patient: persist record, return object.
- Create assessment: compute BMI, call `ml.MockPredict` -> returns `{cluster, risk_score}`; store assessment with patient link; return summary.
- Analytics: aggregate from stored assessments; if empty, return static seed data.
- Export: stream CSV of patients/assessments and training slices (mock content if empty, hash-stamped for reproducibility).

## 7) Edge Cases & Failure Handling
- 400 on validation errors (missing age, fbs/hba1c out of bounds).
- 404 for missing patient/assessment ids.
- 401/403 for missing/invalid JWT.
- Deterministic mock ML so results are reproducible during placeholder phase.
- CORS enabled for local frontend dev.

## 8) Tech/Libs
- Gin, jose/jwt (or golang-jwt/jwt), zap or zerolog for structured logs, viper for config, pgx + sqlc (or sqlx) for Postgres, testify for tests, goose/migrate for migrations.

## 9) Config
- Env: `PORT`, `JWT_SECRET`, `DB_DSN` (Postgres), `ENV=dev|prod`, `CORS_ORIGINS`, `EXPORT_MAX_ROWS`, `MODEL_URL`, `MODEL_VERSION`.
- Defaults: `PORT=8080`, `DB_DSN=postgres://user:pass@localhost:5432/diana?sslmode=disable` (dev), in-memory store only for unit tests.

## 10) Testing Strategy
- Unit: services (patient, assessment, analytics), mock repos, mock ML.
- Handler tests with httptest covering auth, happy/edge cases.
- Smoke script (curl) for auth + create patient + create assessment + list.

## 11) Deliverables for “backbone” milestone
- Compilable Gin server with routing, middleware, health check.
- In-memory repositories + optional SQLite toggle.
- Auth login issuing JWT (mock credentials).
- CRUD patients; create/list assessments; mocked ML response.
- Analytics and export endpoints returning seeded data.
- README snippet for running: `go run ./cmd/server`.
- Database migration files and a `make db_migrate` helper.

## 12) Risks / Open Items
- Data persistence choice (memory vs SQLite) — decide early.
- Auth strength (mock vs real hashing) — keep obvious marker that it’s demo-only.
- Schema evolution once real model features arrive.
- Integrating actual model (Python/ONNX) later — keep `internal/ml` behind interface.

## 13) Paper Alignment (REVISION Final Manuscript (12).pdf)
- Support biomarkers emphasized in the manuscript: FBS, HbA1c, lipid panel (chol, LDL, HDL, triglycerides), BMI, BP, menopausal status/years, activity, smoking, hypertension, heart disease (per clinical feature lists and clustering variables).
- Cluster-based identification (SOIRD, SIDD, MARD, MIDD) remains first-class fields on assessments and analytics outputs.
- Phase alignment:
  - Phase 2a/2b: keep `model_version` and dataset hash in `model_runs` to map training/eval to deployments.
  - Phase 3 (integration): API contracts above; frontend already mirrors clusters/biomarkers.
  - Phase 4/5 (validation/doctor evaluation): add audit trails and export slices to support clinician review and tagging outcomes later.
- Include range metadata (Table 1–2 in paper) in validation layer to flag out-of-range inputs for clinician awareness (warning, not hard-fail, to reflect real-world lab variability).

## 14) pgx + sqlc + goose specifics
- Migrations: `migrations/0001_init.sql` (users, patients, assessments, biomarker_panels, model_runs, events/audit). Use goose timestamps for ordering. Add `down` statements.
- Codegen: `sqlc.yaml` targeting pgx; generate in `internal/store/sqlc`. Interfaces in `internal/store` should wrap sqlc queries (unit-testable with pgxpool + testcontainers or pgx mocked).
- Transactions: expose helper for service-layer Tx (patient + assessment write in one Tx).
- Connection: pgxpool with sane defaults (max conns, health check on startup).

## 15) Observability, Ops, and Data Safety
- Logging: zap/zerolog with request IDs and user IDs. Add HTTP access log middleware.
- Metrics: `/metrics` (Prometheus) and `/api/v1/healthz` (readiness) and `/api/v1/livez` (liveness).
- Backups: document `pg_dump` cadence; note WAL archiving if using managed PG later.
- PII: allow configurable hashing of patient IDs in exports; redaction middleware for logs.
- Rate limiting: optional middleware (simple token bucket) for auth and export endpoints.

## 16) Validation & Domain Rules (paper aligned)
- Enforce/flag lab ranges from Table 1–2 (FBS, HbA1c) as warnings; do not hard-fail but record a validation_status on assessments.
- Require units: mg/dL for glucose/lipids, mmHg for BP, kg/cm for BMI inputs (derive BMI).
- Store menopausal status and years since menopause; cluster labels required on assessments (even when mocked).

## 17) Tooling & DX
- Make targets: `make dev` (go run), `make lint`, `make test`, `make db_up`, `make db_down`, `make sqlc`.
- Seed script (go) to insert mock users and sample patients/assessments for frontend dev.
- Sample env file `.env.example` with PG DSN, JWT secret, CORS origins, model placeholders.

## 18) Implementation Log (backbone MVP)
- [x] Scaffold Gin server with CORS, routing, health endpoints.
- [x] Postgres migration 0001 (users, patients, assessments, model_runs, audit_events).
- [x] pgx pool wiring; graceful shutdown.
- [x] Handlers: auth (mock JWT), patients CRUD stub, assessments with mock predictor, analytics placeholders, export placeholders, health.
- [x] Mock ML predictor (deterministic cluster/risk).
- [x] Config/env template; Makefile commands.
- [x] gofmt + `go test ./...` pass.
- [x] sqlc queries + generated store layer (replaced raw SQL stubs).
- [x] Auth middleware (JWT bearer) with bcrypt-backed users (seed).
- [x] Validation rules (FBS/HbA1c warnings set on assessments per ranges).
- [x] Analytics wired to Postgres aggregates (cluster counts, trend averages); exports now stream CSV from DB with limits.
- [x] Seed script for mock users (patients/assessments seeding still optional).
- [x] Frontend root wired to backend (login to API, fetch patients/assessments, export links use API base).

## 19) Paper Alignment Check (REVISION Final Manuscript (12).pdf)
- Biomarkers present: FBS, HbA1c, lipid panel (chol, LDL, HDL, triglycerides), BMI (derived), BP, lifestyle (activity, smoking), comorbidities (hypertension, heart disease), menopausal status/years — all modeled and exposed in assessments/patients (aligned).
- Cluster-based identification: SOIRD/SIDD/MARD/MIDD fields captured on assessments and analytics endpoints (aligned).
- Phases 2a/2b: `model_runs`, `model_version`, `dataset_hash` fields present for mapping training/eval to deployment (aligned).
- Phase 3 (integration): REST surface matches frontend needs for dashboard, patient history, assessment creation, analytics, export (aligned).
- Phase 4/5: audit table present; export slice endpoint stubbed for clinician review and future validation datasets (aligned).
- Range metadata (Table 1–2): planned validation layer with warning/flag (todo).
- Outcome tagging for doctor evaluation: not yet implemented; can extend assessments/audit later (todo).

## 20) Deployment Plan (free-friendly dev)
- Backend: Render (free web service) or similar; build `go build -o server ./cmd/server`, start `./server`.
- Database: Neon free Postgres; set `DB_DSN` to Neon URL (`sslmode=require` if needed). Run migrations (`make db_up`) and seed (`make seed`) once.
- Frontend: Vercel static (deploy React/Vite build); set `VITE_API_BASE=https://<render-app>.onrender.com/api/v1`.
- Env vars: `PORT` (Render sets), `DB_DSN`, `JWT_SECRET`, `CORS_ORIGINS` (frontend origin + localhost for dev), `MODEL_VERSION`, `EXPORT_MAX_ROWS`.
- CORS: restrict to frontend origin; include localhost during dev.
- Health: use `/api/v1/healthz` for platform health checks.
- Optional Docker Compose for local dev: Postgres + API; configure `DB_DSN=postgres://diana:pass@db:5432/diana_dev?sslmode=disable`.