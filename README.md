# 🩺 Diana V2

> **Predictive diabetes risk assessment application for menopausal women**

A full-stack health application that helps clinicians assess diabetes risk using machine learning predictions. Built with Go, React, and PostgreSQL.

---

## 📚 Table of Contents

- [What is Diana V2?](#-what-is-diana-v2)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Available Commands](#-available-commands)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 What is Diana V2?

Diana V2 is a healthcare application designed to:

- **Assess diabetes risk** in menopausal women using predictive models
- **Manage patient records** with secure authentication
- **Track health assessments** over time
- **Visualize analytics** and trends
- **Export data** for clinical use

The ML model is pluggable—a deterministic mock is used when no model URL is configured, making development easy without external dependencies.

---

## 🛠 Tech Stack

| Layer       | Technology                         |
|-------------|-------------------------------------|
| **Backend** | Go 1.21+, Gin web framework        |
| **Frontend**| React 18 (Vite), Tailwind CSS      |
| **Database**| PostgreSQL (with Goose migrations) |
| **ML**      | Pluggable (mock predictor by default) |

---

## ✅ Prerequisites

Before you begin, make sure you have these installed on your computer:

### Required Tools

| Tool    | Version | Installation                                           |
|---------|---------|--------------------------------------------------------|
| **Go**  | 1.21+   | [Download Go](https://go.dev/doc/install)              |
| **Node.js** | 18+ | [Download Node.js](https://nodejs.org/)                |
| **PostgreSQL** | 14+ | [Download PostgreSQL](https://www.postgresql.org/download/) |
| **Goose** | Latest | `go install github.com/pressly/goose/v3/cmd/goose@latest` |

### Check Your Installation

```bash
# Verify all tools are installed
go version          # Should show go1.21 or higher
node --version      # Should show v18 or higher
npm --version       # Should show 8 or higher
goose --version     # Should show goose vX.X.X
psql --version      # Should show PostgreSQL version
```

---

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script to automatically configure everything:

```bash
# Clone the repository
git clone <repository-url>
cd DianaV2

# Run the setup script
make setup
# or
./scripts/setup.sh
```

The setup script will:
1. ✅ Check all required tools are installed
2. ✅ Create your `.env` file from the template
3. ✅ Generate a secure JWT secret
4. ✅ Download Go dependencies
5. ✅ Install frontend npm packages
6. ✅ Run database migrations (if configured)

### Option 2: Manual Setup

If you prefer to set things up yourself:

#### Step 1: Clone and Enter the Project

```bash
git clone <repository-url>
cd DianaV2
```

#### Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Open .env in your editor and update:
# - DB_DSN: Your PostgreSQL connection string
# - JWT_SECRET: A secure random string (min 32 characters)
```

#### Step 3: Install Dependencies

```bash
# Install Go dependencies (from project root)
go mod download

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### Step 4: Set Up the Database

```bash
# Run database migrations
make db_up
# or
goose -dir ./backend/migrations postgres "$DB_DSN" up
```

#### Step 5: (Optional) Seed Demo Data

```bash
# Create a demo user account
make seed
# Creates: clinician@example.com / password123
```

#### Step 6: Start the Application

```bash
# Start both backend and frontend
make run-dev
# or
./scripts/run-dev.sh
```

### 🌐 Access the Application

| Service   | URL                                    |
|-----------|----------------------------------------|
| Frontend  | http://localhost:5173 (or :3000)       |
| Backend   | http://localhost:8080/api/v1/healthz   |

---

## 📁 Project Structure

```
DianaV2/
├── 📂 backend/              # Go API server
│   ├── cmd/
│   │   ├── server/          # API entrypoint
│   │   └── seed/            # Database seeder
│   ├── internal/            # Application code
│   │   ├── config/          # Configuration loading
│   │   ├── handlers/        # HTTP request handlers
│   │   ├── middleware/      # Auth, logging, etc.
│   │   ├── models/          # Data structures
│   │   ├── store/           # Database access layer
│   │   └── ml/              # ML model integration
│   └── migrations/          # Database migrations (Goose)
│
├── 📂 frontend/             # React Vite client
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── auth/        # Authentication
│   │   │   ├── dashboard/   # Main dashboard
│   │   │   ├── patients/    # Patient management
│   │   │   ├── analytics/   # Data visualization
│   │   │   └── export/      # Data export
│   │   └── api.js           # API client helper
│   └── package.json
│
├── 📂 scripts/              # Development & utility scripts
│   ├── setup.sh             # Initial setup
│   ├── run-dev.sh           # Start dev servers
│   └── test-db.sh           # Database tests
│
├── 📂 docs/                 # Documentation
│   └── architecture/        # Architecture docs
│
├── Makefile                 # Build/dev commands
├── env.example              # Environment template
└── README.md                # You are here! 👋
```

---

## ⌨️ Available Commands

All commands can be run using `make`:

### Development

| Command         | Description                              |
|-----------------|------------------------------------------|
| `make setup`    | Run initial project setup                |
| `make run-dev`  | Start backend + frontend together        |
| `make dev`      | Start backend only                       |

### Database

| Command          | Description                             |
|------------------|----------------------------------------|
| `make db_up`     | Apply all pending migrations            |
| `make db_down`   | Rollback last migration                 |
| `make db_status` | Show migration status                   |
| `make seed`      | Create demo user account                |
| `make sqlc`      | Regenerate SQL query code               |

### Testing & Quality

| Command       | Description                               |
|---------------|-------------------------------------------|
| `make test`   | Run all backend tests                     |
| `make lint`   | Run Go linter (go vet)                    |
| `make build`  | Build the backend                         |
| `make tidy`   | Clean up Go module dependencies           |

---

## 🔐 Environment Variables

Create a `.env` file in the project root (or copy from `env.example`):

```bash
# Server Configuration
PORT=8080                   # API server port
ENV=dev                     # Environment: dev, staging, production

# Database (Required)
DB_DSN=postgres://user:pass@localhost:5432/diana?sslmode=disable

# Security (Required)
JWT_SECRET=your-secure-secret-min-32-chars

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# ML Model (Optional - mock is used if not set)
MODEL_URL=                  # URL to ML prediction service
MODEL_VERSION=v0-placeholder
MODEL_DATASET_HASH=         # For model traceability
MODEL_TIMEOUT_MS=2000       # ML request timeout

# Export Settings
EXPORT_MAX_ROWS=5000        # Max rows in CSV export

# Demo Credentials (for seeding)
DEMO_EMAIL=clinician@example.com
DEMO_PASSWORD=password123
```

### Frontend Environment

Create `frontend/.env.local`:

```bash
VITE_API_BASE=http://localhost:8080
```

---

## 🔌 API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint               | Description          |
|--------|------------------------|----------------------|
| GET    | `/api/v1/healthz`      | Health check         |
| GET    | `/api/v1/livez`        | Liveness probe       |
| POST   | `/api/v1/auth/login`   | User login → JWT     |

### Protected Endpoints (JWT Required)

| Method | Endpoint                                   | Description               |
|--------|--------------------------------------------|---------------------------|
| GET    | `/api/v1/patients`                         | List all patients         |
| POST   | `/api/v1/patients`                         | Create new patient        |
| GET    | `/api/v1/patients/:id/assessments`         | Get patient assessments   |
| POST   | `/api/v1/patients/:id/assessments`         | Create assessment         |
| GET    | `/api/v1/analytics/cluster-distribution`   | Risk cluster analytics    |
| GET    | `/api/v1/analytics/biomarker-trends`       | Biomarker trend data      |
| GET    | `/api/v1/export/patients.csv`              | Export patients CSV       |
| GET    | `/api/v1/export/assessments.csv`           | Export assessments CSV    |

### Making API Requests

```bash
# Login and get JWT token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "clinician@example.com", "password": "password123"}'

# Use token in subsequent requests
curl http://localhost:8080/api/v1/patients \
  -H "Authorization: Bearer <your-token>"
```

---

## 🚢 Deployment

### Recommended Stack

| Service    | Platform              |
|------------|-----------------------|
| Backend    | [Render](https://render.com) |
| Database   | [Neon](https://neon.tech) (Serverless Postgres) |
| Frontend   | [Vercel](https://vercel.com) |

### Deployment Checklist

1. ✅ Set `ENV=production` in environment
2. ✅ Configure `DB_DSN` with production database URL
3. ✅ Set a strong `JWT_SECRET` (32+ characters)
4. ✅ Update `CORS_ORIGINS` to include frontend domain
5. ✅ Set `VITE_API_BASE` in frontend to production API URL
6. ✅ Run `make db_up` to apply migrations

For detailed deployment instructions, see `docs/ops/deployment.md`.

---

## 🔧 Troubleshooting

### Common Issues

#### ❌ "401 Unauthorized" or "403 Forbidden"
- **Cause:** Incorrect email/password or expired token.
- **Fix:** Use one of the demo accounts seeded in the database:

| User Type | Email | Password |
|-----------|-------|----------|
| Demo User | `demo@diana.app` | `demo123` |
| Clinician | `clinician@example.com` | `password123` |
| Admin | `admin@diana.app` | `admin123` |
| Researcher| `researcher@diana.app` | `research456` |

- **Check:** Ensure you are running the frontend in `frontend/` directory (not serving old build).
- **Check:** Hard refresh the page to clear any stale state.

#### ❌ Database Connection Errors
- **Check:** Is PostgreSQL running?
- **Check:** Is `DB_DSN` correct in `.env`?
- **Check:** Did you run migrations?

```bash
# Check database connection
psql "$DB_DSN" -c "SELECT 1;"

# Check migration status
make db_status

# Apply migrations
make db_up
```

#### ❌ CORS Errors in Browser
- **Check:** Is your frontend URL in `CORS_ORIGINS`?
- **Fix:** Update `.env` with correct origins

```bash
# Example: Allow multiple origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### ❌ Frontend Can't Connect to Backend
- **Check:** Is `VITE_API_BASE` set correctly?
- **Check:** Is the backend running?

```bash
# Test backend health
curl http://localhost:8080/api/v1/healthz
```

#### ❌ ML Model Timeouts
- **Fix:** Without `MODEL_URL`, a mock predictor is used automatically
- **Fix:** If using real model, increase `MODEL_TIMEOUT_MS`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `make test`
5. Commit: `git commit -m "Add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

### Code Style

- **Backend:** Follow Go conventions, run `make lint`
- **Frontend:** Use Prettier/ESLint defaults

---

## 📖 More Documentation

- [Architecture Overview](docs/architecture/ARCHITECTURE.md) - System design and data flows
- [Project Structure](docs/architecture/PROJECT_STRUCTURE.md) - Detailed folder organization
- [Deployment Guide](docs/ops/deployment.md) - Production deployment instructions

---

<div align="center">


</div>
