# Diana V2 – Local Development Setup

Quick guide to get Diana V2 running locally.

---

## Option A: Docker Setup (Recommended)

The easiest way – no need to install Go, Node, Python, or PostgreSQL.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run with Docker
```bash
git clone git@github.com:Skufu/DianaV2.git
cd DianaV2

# Create .env file (required for docker-compose)
cat > .env << 'EOF'
# PostgreSQL (docker-compose requires these)
POSTGRES_USER=diana
POSTGRES_PASSWORD=diana
POSTGRES_DB=diana

# JWT secret (min 32 chars)
JWT_SECRET=1BF4YI+OIjQZ3gfSWcM2oxD38YOfnSDeYgRTzJfaTnY=

# Optional: ML API key (leave blank for dev)
ML_API_KEY=
EOF

# Start all services
docker-compose up --build
```

**Note:** The `docker-compose.yml` requires `POSTGRES_PASSWORD` to be set. If you see the error `required variable POSTGRES_PASSWORD is missing a value`, ensure your `.env` file contains the required variables.

**Services:**
| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend | http://localhost:8080/api/v1/healthz |
| ML Server | http://localhost:5000/health |

Press `Ctrl+C` to stop.

---

## Option B: Manual Setup (Without Docker)

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Git | Any | https://git-scm.com/download/win |
| Go | 1.21+ | https://go.dev/dl/ |
| Node.js | 18+ | https://nodejs.org/ |
| PostgreSQL | 16+ | https://www.postgresql.org/download/windows/ |
| Goose | Latest | `go install github.com/pressly/goose/v3/cmd/goose@latest` |

### First-Time Setup

**1. Clone & Install Dependencies**
```bash
git clone git@github.com:Skufu/DianaV2.git
cd DianaV2
bash scripts/dev/setup.sh
```

**2. Create Database** (replace `YOUR_POSTGRES_PASSWORD`):
```bash
PGPASSWORD=YOUR_POSTGRES_PASSWORD psql -U postgres -c "CREATE USER diana WITH PASSWORD 'diana' SUPERUSER;"
PGPASSWORD=YOUR_POSTGRES_PASSWORD psql -U postgres -c "CREATE DATABASE diana OWNER diana;"
```

**3. Run Migrations**
```bash
goose -dir ./backend/migrations postgres "postgres://diana:diana@localhost:5432/diana?sslmode=disable" up
```

**4. Configure** `.env` (at project root):
```bash
PORT=8080
ENV=dev

# PostgreSQL (for local development)
DB_DSN=postgres://diana:diana@localhost:5432/diana?sslmode=disable

# PostgreSQL (for docker-compose compatibility)
POSTGRES_USER=diana
POSTGRES_PASSWORD=diana
POSTGRES_DB=diana

JWT_SECRET=1BF4YI+OIjQZ3gfSWcM2oxD38YOfnSDeYgRTzJfaTnY=
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
MODEL_URL=http://localhost:5001/predict
ML_PORT=5001
MODEL_VERSION=v0-mock
MODEL_DATASET_HASH=mock_dataset_v1
MODEL_TIMEOUT_MS=2000
EXPORT_MAX_ROWS=5000

# Demo credentials (for quick testing)
DEMO_EMAIL=demo@diana.app
DEMO_PASSWORD=demopassword123
```

### Running the App
```bash
./scripts/dev/start-all.sh
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:4000 |
| Backend | http://localhost:8080/api/v1/healthz |
| ML Server | http://localhost:5001/health |

---

## Login Credentials

| Email | Password | Role |
|-------|----------|------|
| demo@diana.app | demopassword123 | User |
| admin@diana.app | admin123 | Admin |

---

## Git Workflow

### Daily Development
```bash
# 1. Pull latest changes before starting work
git pull origin main

# 2. Make your changes...

# 3. Check what changed
git status

# 4. Stage your changes
git add .

# 5. Commit with a message
git commit -m "feat: description of what you did"

# 6. Push to remote
git push origin main
```

### Commit Message Format
- `feat:` – New feature
- `fix:` – Bug fix
- `docs:` – Documentation changes
- `refactor:` – Code refactoring
- `style:` – Formatting, no code change

### Before Pushing
1. Make sure the app runs without errors
2. Test your changes work
3. Don't commit `.env` files with secrets

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | Close terminals or: `taskkill //F //PID <PID>` |
| CORS errors | Add frontend port to `CORS_ORIGINS` in `.env` (currently: http://localhost:4000 for manual setup) |
| `POSTGRES_PASSWORD is missing a value` error | Ensure `.env` file contains `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` variables for docker-compose |
| DB connection error | Check PostgreSQL running and `DB_DSN` correct |
| ML models not found | Run `bash scripts/dev/retrain-all.sh` |
| ML server connection error | Docker: Ensure ML server on port 5000. Manual: Ensure ML server on port 5001 |
| Frontend Vite not loading | Run `cd frontend && npm run dev` (uses port 4000) |

---

## Available Scripts

| Script | Purpose |
|--------|---------|
| `scripts/dev/setup.sh` | First-time setup |
| `scripts/dev/start-all.sh` | Start all services |
| `scripts/dev/retrain-all.sh` | Retrain ML models |
