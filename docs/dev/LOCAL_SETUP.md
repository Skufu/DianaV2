# Diana V2 – Local Development Setup (Team Guide)

This guide is for the team to get Diana V2 running **locally** and understand the basics of the stack, configuration, and daily workflow.

If you just want the ultra-short version, see the **TL;DR** below. For more detail, keep reading.

---

## TL;DR – First-Time Setup

From the repo root (after you’ve installed Go, Node, and Postgres – see **Prerequisites**):

1. **Clone & enter repo**
   - `git clone git@github.com:Skufu/DianaV2.git`
   - `cd DianaV2`
2. **Create env file**
   - `cp env.example .env`
   - (Optional but recommended) edit `.env` to point `DB_DSN` at your local Postgres.
3. **Run helper script once (recommended)**
   - `./scripts/dev-setup.sh`
   - This:
     - Ensures `.env` exists (copies from `env.example` if missing),
     - Installs frontend dependencies,
     - Downloads Go modules,
     - Optionally sanity-checks DB connectivity.
4. **Start backend + frontend together**
   - Preferred:
     - `./scripts/run-dev.sh`
   - Alternatively (legacy path mentioned in `README`):
     - `./run-dev.sh`

You should end up with:
- API on something like `http://localhost:8082/api/v1` (from `scripts/run-dev.sh`, configurable),
- Frontend on `http://localhost:3000` (Vite dev server).

Use the demo user from `.env` (see **Demo account** below) to log in.

---

## Prerequisites – Tools You Must Install First

Install these once on your machine before following the rest of this guide:

- **Git**
  - macOS: already installed in most cases; otherwise `xcode-select --install`.
  - Windows: install Git for Windows from the official site.
- **Go 1.21+**
  - Download from the official Go downloads page and follow installer instructions.
  - Verify:
    - `go version` → should show at least `go1.21`.
- **Node.js 18+ (includes npm)**
  - Recommended: use `nvm` (Node Version Manager) or the official installer.
  - Verify:
    - `node -v` → `v18.x` or higher,
    - `npm -v` → any recent version.
- **PostgreSQL**
  - macOS:
    - `brew install postgresql` (using Homebrew),
    - `brew services start postgresql`.
  - Linux (Debian/Ubuntu):
    - `sudo apt-get install postgresql`,
    - `sudo service postgresql start`.
  - Windows:
    - Install from the official PostgreSQL Windows installer (StackBuilder), then ensure the service is running.
  - Alternatively: run Postgres via Docker (see **Database & Migrations** for an example).
- **Optional but useful**
  - **Docker** – for containerized Postgres or running the app in containers.
  - **sqlc** – if you plan to touch the SQL query generation workflow.

Once these are installed and on your `PATH`, you can follow the TL;DR steps above.

---

## Stack Overview (What You’re Working With)

- **Backend**
  - Language: Go 1.21+
  - Framework: `gin-gonic/gin`
  - DB: Postgres (via `pgx` connection pool)
  - Entry: `cmd/server/main.go`
  - Base API path: `/api/v1`
- **Frontend**
  - React 18 + Vite
  - Tailwind for styling
  - Lives under `frontend/`
  - Uses `VITE_API_BASE` to know where the API lives.
- **Configuration**
  - Main env file: `.env` at repo root.
  - Example configs:
    - `env.example` (root) – base local defaults.
    - `configs/env.example` – variant with slightly different demo credentials and CORS defaults.

You do **not** need the real ML model to develop the app: with no `MODEL_URL` set, a deterministic mock is used.

---

## Environment Variables (Key Ones Only)

The core env vars you’ll touch for local dev (all shown in `env.example` and `configs/env.example`):

- `PORT` – backend HTTP port (default `8080`, scripts may override, e.g. `8082`).
- `ENV` – environment label; usually `dev` locally.
- `DB_DSN` – Postgres connection string, e.g.  
  `postgres://diana:diana@localhost:5432/diana?sslmode=disable`
- `JWT_SECRET` – secret for signing JWTs. **Change this** for any non-local environment.
- `CORS_ORIGINS` – comma-separated list of allowed origins, e.g.  
  `http://localhost:3000,http://localhost:5173`.
- `MODEL_URL` – optional ML endpoint URL; leave empty to use mock model.
- `MODEL_VERSION`, `MODEL_DATASET_HASH` – traceability metadata; safe to leave as defaults for dev.
- `MODEL_TIMEOUT_MS` – timeout for model calls; lower in dev is fine.
- `EXPORT_MAX_ROWS` – safety limit for export endpoints.
- `DEMO_EMAIL`, `DEMO_PASSWORD` – credentials for the demo clinician user.

Minimal rule-of-thumb for teammates:

- Make sure **`DB_DSN`, `JWT_SECRET`, and `CORS_ORIGINS`** are reasonable for your machine.
- Ensure **`VITE_API_BASE`** in your frontend env matches the backend URL + `/api/v1`.

---

## Backend – How to Run It Locally

### Option A: Via helper script (recommended)

From repo root:

- `./scripts/run-dev.sh`

What it does:
- Loads env variables from `.env` (or `ENV_FILE` if you set it),
- Leaves `DB_DSN` empty if you haven’t configured it, so the backend can still start **without** a DB (handlers that touch the DB will error),
- Sets sane defaults for `JWT_SECRET`, `PORT`, and `VITE_API_BASE`,
- Starts the Go server in the background,
- Pings `/api/v1/healthz` and prints a status message.

### Option B: Manual

From repo root:

1. Ensure `.env` exists:
   - `cp env.example .env` (if you haven’t already), then edit `DB_DSN`, `CORS_ORIGINS`, etc.
2. Start Postgres (locally or via Docker) and make sure `DB_DSN` points to it.
3. Run:
   - `go run ./cmd/server`
4. Backend will start on `:${PORT}` (`8080` by default) and expose `/api/v1/...` routes.

If `DB_DSN` is empty, startup will log **“running without database”** and any DB-backed endpoints will fail at runtime – that’s expected.

---

## Frontend – How to Run It Locally

From repo root:

```bash
cd frontend
npm install        # first time
npm run dev       # afterwards
```

Notes:
- The dev server defaults to `http://localhost:3000` (Vite).
- Ensure `VITE_API_BASE` is set so the frontend knows where the backend lives:
  - When using `./scripts/run-dev.sh`, it sets a default such as `http://localhost:8082/api/v1`.
  - Manually, you can run:
    - `VITE_API_BASE=http://localhost:8080/api/v1 npm run dev`
- If you see CORS errors in the browser console, check:
  - `CORS_ORIGINS` in `.env` includes your frontend origin (`http://localhost:3000` etc.),
  - You restarted the backend after changing envs.

---

## Database & Migrations

The app uses **Postgres**. For a full flow (including persistence), you’ll want a local DB up and migrations applied.

### Quick local Postgres example (Docker)

You can use any approach, but a typical Docker command looks like:

```bash
docker run --name diana-db \
  -e POSTGRES_USER=diana \
  -e POSTGRES_PASSWORD=diana \
  -e POSTGRES_DB=diana \
  -p 5432:5432 \
  -d postgres:16
```

Then set in `.env`:

```bash
DB_DSN=postgres://diana:diana@localhost:5432/diana?sslmode=disable
```

### Migrations & seed user

From repo root (requires `DB_DSN` set to a reachable Postgres):

- Apply migrations:
  - `DB_DSN=<url> make db_up`
- Rollback:
  - `DB_DSN=<url> make db_down`
- Status:
  - `DB_DSN=<url> make db_status`
- Seed demo user:
  - `go run ./cmd/seed`

The seeded/demo user credentials line up with the `DEMO_EMAIL` and `DEMO_PASSWORD` values in your env file.

---

## Demo Account & Logging In

By default (see `env.example` and `configs/env.example`), you’ll have a clinician/demo user like:

- `DEMO_EMAIL`: `clinician@example.com` **or** `demo@diana.app`
- `DEMO_PASSWORD`: `password123` **or** `demo123`

Check your current `.env` to know exactly which values you’re using.

Use these credentials in the frontend `Login` screen to obtain a JWT and access the app.

---

## Typical Daily Workflow for Teammates

1. **Start Postgres** (if you’re using a local DB).
2. From repo root, launch stack:
   - `./scripts/run-dev.sh`
3. Visit frontend:
   - `http://localhost:3000`
4. Log in with the demo user.
5. Develop in:
   - Go backend under `internal/` and `cmd/server`,
   - React frontend under `frontend/src/`.
6. Run tests as needed:
   - `go test ./...` (from repo root).

If something looks off (auth errors, CORS, DB issues), see `docs/dev/TROUBLESHOOTING.md`.

---

## Things to Keep in Mind

- **Env consistency**
  - Ensure `.env` matches what your teammates use (at least for `DB_DSN` and `CORS_ORIGINS`) to avoid “works on my machine” issues.
- **Ports**
  - Scripts may use `8082` for backend; manual runs may default to `8080`. Adjust `VITE_API_BASE` accordingly.
- **DB optional**
  - For quick UI work, you can technically run without a DB (handlers that need data will fail). For anything realistic, configure `DB_DSN` and apply migrations.
- **Model integration**
  - Leaving `MODEL_URL` empty is fine for local; a mock predictor kicks in so you can exercise flows without a real ML service.
- **Security**
  - `JWT_SECRET`, demo credentials, and DSNs in `.env` are **local dev only**. Do not reuse in any shared or production environment.

For deeper architectural context, see `docs/architecture/ARCHITECTURE.md` and `docs/architecture/PROJECT_STRUCTURE.md`.

