# Deployment Plan (free-friendly dev)

## Stack choice
- Backend: Render (free web service) running Go server.
- Database: Neon free Postgres (serverless), connect via `DB_DSN`.
- Frontend: Vercel static (React/Vite build) pointing to backend API.
- Local dev optional: Docker Compose (Postgres + API).

## Backend (Render)
- Build: `go build -o server ./cmd/server`
- Start: `./server`
- Env vars:
  - `PORT` (Render provides)
  - `DB_DSN` = Neon connection string (add `?sslmode=require` if needed)
  - `JWT_SECRET` = strong secret
  - `CORS_ORIGINS` = `https://<vercel-domain>,http://localhost:3000`
  - `MODEL_VERSION` = `v0-placeholder`
  - `EXPORT_MAX_ROWS` = `5000`
- Health path: `/api/v1/healthz`
- Apply migrations once: `make db_up`
- Seed user: `make seed` (clinician@example.com / password123)

## Database (Neon)
- Create project/database.
- Copy Postgres URL to `DB_DSN`.
- Run migrations: `DB_DSN=<url> make db_up`
- Seed: `DB_DSN=<url> make seed`

## Frontend (Vercel)
- Build command: `npm install && npm run build`
- Output dir: `dist`
- Env in frontend build: `VITE_API_BASE=https://<render-app>.onrender.com/api/v1`
- CORS on backend must include the Vercel domain.

## Local dev (optional)
- Docker Compose service:
  - Postgres: `postgres://diana:pass@db:5432/diana_dev?sslmode=disable`
  - API: use `.env` with DB_DSN pointing to the compose db
- Run: `docker compose up -d`, then `make db_up` (pointed to compose DB), `make seed`, `make dev`.

## CI note
- GitHub Actions already runs `go test ./...`.
- To run integration tests in CI, set `TEST_DB_DSN` to a Postgres service in the workflow.

