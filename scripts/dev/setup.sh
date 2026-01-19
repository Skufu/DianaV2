#!/usr/bin/env bash
#
# Diana V2 Development Setup Script
# Run this once after cloning to set up your local development environment.
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_step() { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Diana V2 Development Setup       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────
# 1. Check required tools
# ─────────────────────────────────────────────────────────────
print_step "Checking required tools..."

MISSING_TOOLS=()

if ! command -v go &> /dev/null; then
  MISSING_TOOLS+=("go")
fi

if ! command -v node &> /dev/null; then
  MISSING_TOOLS+=("node")
fi

if ! command -v npm &> /dev/null; then
  MISSING_TOOLS+=("npm")
fi

if ! command -v goose &> /dev/null; then
  MISSING_TOOLS+=("goose")
fi

# Detect Python/Pip
if command -v python3 &> /dev/null; then
  PYTHON_CMD=python3
elif command -v python &> /dev/null; then
  PYTHON_CMD=python
else
  MISSING_TOOLS+=("python3")
fi

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
  print_error "Missing required tools: ${MISSING_TOOLS[*]}"
  echo ""
  echo "Please install the missing tools:"
  for tool in "${MISSING_TOOLS[@]}"; do
    case $tool in
      go)     echo "  - Go: https://go.dev/doc/install" ;;
      node)   echo "  - Node.js: https://nodejs.org/" ;;
      npm)    echo "  - npm: comes with Node.js" ;;
      goose)  echo "  - Goose: go install github.com/pressly/goose/v3/cmd/goose@latest" ;;
      python3) echo "  - Python 3: https://www.python.org/downloads/" ;;
    esac
  done
  exit 1
fi

print_success "All required tools found"
echo "   Go:     $(go version | cut -d' ' -f3)"
echo "   Node:   $(node --version)"
echo "   npm:    $(npm --version)"
echo "   Goose:  $(goose --version 2>&1 | head -1)"
echo "   Python: $($PYTHON_CMD --version)"
echo ""

# ─────────────────────────────────────────────────────────────
# 2. Setup environment variables
# ─────────────────────────────────────────────────────────────
print_step "Setting up environment variables..."

if [ -f "${ROOT_DIR}/.env" ]; then
  print_success ".env file already exists"
else
  cp "${ROOT_DIR}/env.example" "${ROOT_DIR}/.env"
  print_success "Created .env from env.example"
  
  # Generate a random JWT secret
  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  
  # Update JWT_SECRET and ML_PORT in .env
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/JWT_SECRET=change-me/JWT_SECRET=${JWT_SECRET}/" "${ROOT_DIR}/.env"
    sed -i '' "s/ML_PORT=5000/ML_PORT=5001/" "${ROOT_DIR}/.env"
    sed -i '' "s/localhost:5000/localhost:5001/" "${ROOT_DIR}/.env"
  else
    sed -i "s/JWT_SECRET=change-me/JWT_SECRET=${JWT_SECRET}/" "${ROOT_DIR}/.env"
  fi
  
  print_success "Generated random JWT_SECRET"
  print_warning "Review .env and update DB_DSN with your database connection string"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# 3. Download Go dependencies
# ─────────────────────────────────────────────────────────────
print_step "Downloading Go dependencies..."

cd "${ROOT_DIR}/backend"
go mod download

print_success "Go dependencies downloaded"
echo ""

# ─────────────────────────────────────────────────────────────
# 4. Install frontend dependencies
# ─────────────────────────────────────────────────────────────
print_step "Installing frontend dependencies..."

cd "${ROOT_DIR}/frontend"
npm install

# Update frontend .env if needed
if [ -f ".env" ]; then
  if ! grep -q "VITE_ML_BASE" .env; then
    echo "VITE_ML_BASE=http://localhost:5001" >> .env
  fi
else
  echo "VITE_API_BASE=http://localhost:8080" > .env
  echo "VITE_ML_BASE=http://localhost:5001" >> .env
fi

print_success "Frontend dependencies installed and .env configured"
echo ""

# ─────────────────────────────────────────────────────────────
# 5. Setup Python Virtual Environment
# ─────────────────────────────────────────────────────────────
print_step "Setting up Python virtual environment..."

cd "${ROOT_DIR}"
if [ ! -d "venv" ]; then
  $PYTHON_CMD -m venv venv
  print_success "Created virtual environment in ./venv"
else
  print_success "Virtual environment already exists"
fi

# Activate venv and install requirements
if [ -f "venv/Scripts/activate" ]; then
  source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
else
  print_error "Could not find virtual environment activation script"
  exit 1
fi

print_step "Installing ML dependencies into venv..."
if [ -f "ml/requirements.txt" ]; then
  python -m pip install --upgrade pip
  pip install -r ml/requirements.txt
  print_success "ML dependencies installed"
else
  print_warning "ml/requirements.txt not found. Skipping ML dependency install."
fi
echo ""

# ─────────────────────────────────────────────────────────────
# 6. Run database migrations (if DB_DSN is configured)
# ─────────────────────────────────────────────────────────────
print_step "Checking database configuration..."

cd "${ROOT_DIR}"

# Load env vars
set -a
source "${ROOT_DIR}/.env"
set +a

if [[ -n "${DB_DSN:-}" && "${DB_DSN}" != *"localhost"* ]]; then
  print_step "Running database migrations..."
  goose -dir ./backend/migrations postgres "${DB_DSN}" up
  print_success "Migrations complete"
else
  print_warning "DB_DSN not configured or using localhost. Skipping migrations."
  echo "   To run migrations manually:"
  echo "     goose -dir ./migrations postgres \"\$DB_DSN\" up"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════╗"
echo "║     Setup Complete! 🎉               ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Configure your database:"
echo "     Update DB_DSN in .env with your Postgres/Neon connection string"
echo ""
echo "  2. Run migrations (if not auto-run above):"
echo "     make db_up   or   goose -dir ./migrations postgres \"\$DB_DSN\" up"
echo ""
echo "  3. Start the development server:"
echo -e "     ${BLUE}make dev${NC}   or   ${BLUE}./run-dev.sh${NC}"
echo ""
echo "  4. Open in your browser:"
echo "     Frontend: http://localhost:3000 or http://localhost:5173"
echo "     Backend:  http://localhost:8080/api/v1/healthz"
echo ""
echo "Useful commands:"
echo "  make dev        - Start dev server (backend + frontend)"
echo "  make db_up      - Run database migrations"
echo "  make db_status  - Check migration status"
echo "  make test       - Run backend tests"
echo "  make sqlc       - Regenerate sqlc code"
echo ""
