DIANA V2
========

Predictive diabetes risk application for menopausal women. Backend: Go 1.21 + Gin + Postgres. Frontend: React 18 (Vite) + Tailwind. ML calls are pluggable; a deterministic mock is used when no model URL is configured.

Repo layout
-----------
- `cmd/server`: API entrypoint, config wiring.
- `internal/`: app code (config, HTTP router/handlers, middleware, store, ml, models).
- `migrations/`: Postgres schema (goose).
- `frontend/`: Vite React client (components, API helpers).
- `docs/`: central documentation hub (see `docs/architecture/PROJECT_STRUCTURE.md` for layout).

Quickstart (local)
------------------
Requirements: Go 1.21+, Node 18+, Postgres running.

1) Env: copy `env.example` to `.env` and adjust:
- `DB_DSN` (Postgres URL), `JWT_SECRET`, `CORS_ORIGINS`, `MODEL_URL` (optional), `MODEL_VERSION`, `MODEL_DATASET_HASH` (optional traceability tag), `MODEL_TIMEOUT_MS`, `EXPORT_MAX_ROWS`.

2) Backend:
- `go run ./cmd/server`
- Ports: `PORT` (default 8080). Base path: `/api/v1`.

3) Frontend:
- `cd frontend && npm install`
- `VITE_API_BASE=http://localhost:8080` (or your deployed API URL)
- `npm run dev` (defaults to port 3000)

One-shot dev (backend + frontend):
- `./run-dev.sh` (expects Postgres reachable at `DB_DSN`)

Database + migrations
---------------------
- Apply: `DB_DSN=<url> make db_up`
- Down: `DB_DSN=<url> make db_down`
- Status: `DB_DSN=<url> make db_status`
- Seed user (clinician@example.com / password123): `go run ./cmd/seed` (requires DB).

Testing
-------
- Unit: `go test ./...`
- Integration handlers: requires `TEST_DB_DSN` Postgres with migrations applied.

Key endpoints (auth required unless noted)
------------------------------------------
- Health (no auth): `GET /api/v1/healthz`, `GET /api/v1/livez`
- Auth: `POST /api/v1/auth/login` -> `{token}`
- Patients: `GET /api/v1/patients`, `POST /api/v1/patients`
- Assessments: `GET /api/v1/patients/:id/assessments`, `POST /api/v1/patients/:id/assessments`
- Analytics: `GET /api/v1/analytics/cluster-distribution`, `GET /api/v1/analytics/biomarker-trends`
- Export: `GET /api/v1/export/patients.csv`, `GET /api/v1/export/assessments.csv`, `GET /api/v1/export/datasets/:slice`

Deployment (summary)
--------------------
Default path: Render (Go API) + Neon Postgres + Vercel (frontend). See `docs/ops/deployment.md` for commands and envs. Ensure CORS allows the frontend domain and set `VITE_API_BASE` to the deployed API.

Frontend at a glance
--------------------
- Components: `Login` (JWT flow), `Sidebar`, `Dashboard`, `PatientHistory` (list + assessment form), `Analytics` (placeholder), `Export` (links to CSV endpoints).
- API helper: `frontend/src/api.js` uses `VITE_API_BASE` and bearer tokens.

Troubleshooting
---------------
- 401/403: check `JWT_SECRET` consistency and Authorization header (`Bearer <token>`).
- DB errors: ensure `DB_DSN` reachable and migrations applied.
- CORS errors: update `CORS_ORIGINS` in env to include frontend origin.
- Model timeouts/errors: with no `MODEL_URL`, mock predictor is used; with `MODEL_URL`, increase `MODEL_TIMEOUT_MS` if needed.

More detail: see `docs/architecture/ARCHITECTURE.md` for flows, data model, and component interactions.

