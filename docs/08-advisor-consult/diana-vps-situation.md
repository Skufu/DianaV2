# DianaV2 VPS Situation & Questions for AI Advisor

## Current Setup

### Infrastructure

**VPS (Dedicated Server)**
- Docker Compose deployment with 5 services:
  - **nginx-proxy** (TLS termination via Let's Encrypt)
  - **backend** (Go/Gin API, port 8080)
  - **ml** (Python Flask ML server, port 5000)
  - **frontend** (React/Vite via Nginx, port 80)
  - **postgres** (PostgreSQL 16)
- Network: Docker bridge network (`172.28.0.0/16`), internal-only ports
- Deployed via GitHub Actions CD: tag push (v*) → build Docker images → push to GHCR → SSH into VPS → `docker compose up -d --no-build`

**Local Dev (Mac)**
- Same codebase, but runs natively (not in Docker for dev):
  - Python ML server directly (`python Ian_ML/service/server.py`)
  - Go backend with `go run` or `air` (hot reload)
  - React dev server (`npm run dev`, port 4000)
  - Local Postgres (via Docker or native)
- Docker Compose also available for local full-stack testing
- Both local and VPS use the same `.env` structure (gitignored)

### Codebase Structure
```
DianaV2/
├── backend/              # Go/Gin REST API
│   ├── cmd/server        # Entry point
│   ├── internal/
│   │   ├── http/         # Handler, middleware, router
│   │   ├── ml/           # ML predictor (HTTP client + mock)
│   │   ├── store/        # SQLC + pgx data layer
│   │   └── ...
│   └── migrations/       # Goose SQL migrations
├── frontend/             # React 18 (Vite)
│   └── src/
│       ├── api.js        # React Query hooks
│       └── components/   # admin/, user/, insights/, etc.
├── Ian_ML/               # Python Flask ML inference
└── scripts/              # Dev + backup utilities
```

### Current Admin Panel

**Backend admin endpoints** (under `/api/v1/admin/`, `RoleRequired("admin")`):
| Endpoint | Purpose |
|----------|---------|
| `GET /admin/dashboard` | System stats (users, assessments, risk counts) |
| `GET /admin/users` | User CRUD (list, create, update, deactivate) |
| `GET /admin/audit` | Paginated audit events (admin actions) |
| `GET /admin/models` | ML model run tracking |
| `GET /admin/clinics` | Clinic listing |
| `GET /admin/clinics/comparison` | Per-clinic stats |

**Frontend admin components** (tabbed interface in AdminDashboard):
- **Overview**: KPI cards (users, assessments, risk), cluster pie chart, biomarker trend area chart, clinic comparison table
- **User Management**: Paginated user list, create/edit/deactivate
- **Audit Logs**: Paginated audit events with expandable details, filtered by actor/action/date
- **Auth Events**: Streamed auth event timeline
- **Model Tracking**: ML model run versions, dataset hashes
- **Model Rationale**: Clinical model documentation

### Current Logging Infrastructure

**Backend logging** (zerolog):
- Dev: pretty-printed console output to stderr
- Prod: JSON to stdout (structured: request_id, method, path, status, latency, etc.)
- Health check paths skipped to reduce noise
- Writes to container stdout → captured by Docker

**Audit events** (in-database):
- Admin actions (user.create, user.update, user.deactivate, etc.)
- Stored in `audit_events` table via middleware
- Visible through the admin Audit Logs tab
- Synchronous writes (not fire-and-forget anymore)

**On the VPS, to see logs you must:**
```bash
ssh user@vps
cd /opt/diana
docker-compose logs backend    # raw JSON logs
docker-compose logs ml         # ML server logs
docker-compose logs nginx-proxy # nginx access logs
# Or for everything:
docker-compose logs --tail=100
```

There is NO in-app log viewer for system/application logs.

## Questions for the AI Advisor

### 1. Sync Strategy: Local ↔ VPS

**Current reality**: Local dev runs natively, VPS runs Docker. Schema migrations are shared (same migration files, run separately on each). Code is shared via git. But:
- There's no automated sync between local DB data and VPS DB data
- ML models trained locally must be manually copied to VPS or rebuilt in Docker
- Environment variables are managed separately
- `docker-compose.prod.yml` has production-specific overrides (TLS, no port exposure)

**Should we even sync?** Or treat local as pure dev/sandbox and VPS as production with its own data lifecycle?

**If yes (sync)**: What's the right approach? Options considered:
- GitHub as the single source of truth, VPS pulls from GHCR on deploy
- Database: is there value in syncing prod data down to local for debugging?
- ML models: should the VPS serve models trained on the VPS, or should models be trained locally and pushed?
- Feature flags / env-specific config: how to keep these in sync without drift?

### 2. In-App System Log Viewer for Admin

**The problem**: Checking logs on the VPS requires SSH + `docker-compose logs`. For thesis demo/review, this is painful. I want to see application logs (backend stdout, errors, ML server logs, maybe Docker container health) directly in the web admin panel.

**Constraints / requirements**:
- Must work through the existing admin login (already have RBAC with admin role)
- Should NOT expose Docker-level access to the web (no `docker exec` from web)
- Must handle multi-line log entries cleanly
- Server-sent events (SSE) for streaming logs already exists in the project for auth events — could extend this pattern
- Must be secure: no log injection, rate-limited, admin-only
- Ideally retroactive: should be able to see past logs, not just stream from now

**Current existing infrastructure we could leverage**:
- SSE broker (`backend/internal/http/sse/`) already supports real-time event streaming
- zerolog outputs structured JSON to stdout in production
- Docker already captures all container stdout
- Admin auth + RBAC is fully functional

**Approach ideas I've considered**:
1. **Backend exposes a log read endpoint** that reads from Docker's log store or from a log file and serves paginated/filtered results. But how would the Go container access Docker's log storage from inside another container?
2. **Write logs to DB** — have the backend write structured logs to a `system_logs` table (with level, service, message, timestamp, request_id). Admin panel reads from there. Downside: DB storage growth, write overhead.
3. **Use Docker log driver** to ship logs somewhere (syslog, fluentd, etc.) and then read them back. But that's adding infrastructure.
4. **Shared log volume** — mount `/var/lib/docker/containers/*/*-json.log` into the backend container, or use a named volume that all services write logs to, and serve them through an API.
5. **Log sidecar container** — a dedicated container that tails Docker logs and exposes them via HTTP endpoint.

Which of these (or other approaches) makes sense for a thesis-stage project with limited time? How would you implement the chosen approach?

### 3. General Deployment Health

**Bonus concerns** that might matter:
- The CD pipeline builds Docker images on every tag push but there's no staging environment — deployments go straight from local merge to production. What's a practical end-to-end flow for this scale of project?
- ML model files (`models/`) are volume-mounted into the ML container. When retraining, how to hot-swap without downtime?
- Database backups exist (`scripts/backup.sh`) but I'm not sure if there's an automated cron for this on the VPS.

## Context Files for Answers

When answering, please reference:
- `docker-compose.yml` and `docker-compose.prod.yml` (in root)
- `backend/internal/http/middleware/logger.go` (zerolog config)
- `backend/internal/http/middleware/audit.go` (DB-based audit logging)
- `backend/internal/http/sse/` (existing SSE broker)
- `backend/internal/http/router/router.go` (route registration pattern)
- `.github/workflows/cd.yml` (deployment pipeline)
- `frontend/src/components/admin/` (all admin components)
- `frontend/src/api.js` (React Query hooks)

## Vibe Check

This is a thesis project (defense May 27, 2026) — CS capstone, diabetes risk screening for postmenopausal women. Practicality matters more than perfect architecture. If there's a simple, pragmatic approach that works well enough for a demo/review, prefer that over a full observability platform.
