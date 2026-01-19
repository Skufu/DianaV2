#!/usr/bin/env bash
#
# Diana V2 - Local PostgreSQL Setup for Mac
# Run this script to quickly set up a local PostgreSQL database with dummy data.
#
# Prerequisites:
#   - Homebrew (will prompt to install if missing)
#   - goose (will prompt to install if missing)
#
# Usage: ./scripts/setup-local-postgres.sh
#
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"

print_step() { echo -e "${BLUE}==> ${NC}$1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Diana V2 - Local PostgreSQL Setup (Mac)     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────
# 1. Check for Homebrew
# ─────────────────────────────────────────────────────────────
print_step "Checking for Homebrew..."

if ! command -v brew &> /dev/null; then
  print_error "Homebrew is not installed."
  echo ""
  echo "Install Homebrew with:"
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  echo ""
  exit 1
fi

print_success "Homebrew found: $(brew --version | head -1)"
echo ""

# ─────────────────────────────────────────────────────────────
# 2. Install PostgreSQL if not present
# ─────────────────────────────────────────────────────────────
print_step "Checking for PostgreSQL..."

if ! command -v psql &> /dev/null; then
  print_warning "PostgreSQL not found. Installing via Homebrew..."
  brew install postgresql@16
  
  # Add to PATH for this session
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
  print_success "PostgreSQL installed"
else
  print_success "PostgreSQL found: $(psql --version)"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# 3. Start PostgreSQL service
# ─────────────────────────────────────────────────────────────
print_step "Starting PostgreSQL service..."

# Try to start postgresql (handles both postgresql and postgresql@16)
if brew services list | grep -q "postgresql@16"; then
  brew services start postgresql@16 2>/dev/null || true
elif brew services list | grep -q "postgresql"; then
  brew services start postgresql 2>/dev/null || true
else
  # Fallback: try to start manually
  pg_ctl -D /opt/homebrew/var/postgresql@16 start 2>/dev/null || \
  pg_ctl -D /usr/local/var/postgres start 2>/dev/null || true
fi

# Wait for PostgreSQL to be ready
sleep 2

# Check if PostgreSQL is running
if pg_isready -q 2>/dev/null; then
  print_success "PostgreSQL is running"
else
  print_warning "PostgreSQL may not be running. Attempting to start..."
  brew services restart postgresql@16 2>/dev/null || brew services restart postgresql 2>/dev/null || true
  sleep 3
  
  if pg_isready -q 2>/dev/null; then
    print_success "PostgreSQL is now running"
  else
    print_error "Could not start PostgreSQL. Please start it manually:"
    echo "  brew services start postgresql@16"
    exit 1
  fi
fi
echo ""

# ─────────────────────────────────────────────────────────────
# 4. Create database and user
# ─────────────────────────────────────────────────────────────
print_step "Creating diana database and user..."

# Create user if not exists
if psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='diana'" 2>/dev/null | grep -q 1; then
  print_success "User 'diana' already exists"
else
  # Try creating with different methods (some Macs use current user, some use postgres)
  createuser -s diana 2>/dev/null || \
  psql -c "CREATE USER diana WITH PASSWORD 'diana' SUPERUSER;" 2>/dev/null || \
  psql -U $(whoami) -c "CREATE USER diana WITH PASSWORD 'diana' SUPERUSER;" 2>/dev/null || \
  psql postgres -c "CREATE USER diana WITH PASSWORD 'diana' SUPERUSER;" 2>/dev/null || true
  print_success "Created user 'diana'"
fi

# Create database if not exists
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw diana; then
  print_success "Database 'diana' already exists"
else
  createdb -O diana diana 2>/dev/null || \
  psql -c "CREATE DATABASE diana OWNER diana;" 2>/dev/null || \
  psql postgres -c "CREATE DATABASE diana OWNER diana;" 2>/dev/null || true
  print_success "Created database 'diana'"
fi

# Set password for diana user (in case it was created without one)
psql -d diana -c "ALTER USER diana WITH PASSWORD 'diana';" 2>/dev/null || \
psql postgres -c "ALTER USER diana WITH PASSWORD 'diana';" 2>/dev/null || true

echo ""

# ─────────────────────────────────────────────────────────────
# 5. Check for goose
# ─────────────────────────────────────────────────────────────
print_step "Checking for goose..."

if ! command -v goose &> /dev/null; then
  print_warning "goose not found. Installing..."
  go install github.com/pressly/goose/v3/cmd/goose@latest
  export PATH="$HOME/go/bin:$PATH"
  print_success "goose installed"
else
  print_success "goose found: $(goose --version 2>&1 | head -1)"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# 6. Run migrations
# ─────────────────────────────────────────────────────────────
print_step "Running database migrations..."

cd "${ROOT_DIR}/backend"
export DB_DSN="postgres://diana:diana@localhost:5432/diana?sslmode=disable"

goose -dir ./migrations postgres "${DB_DSN}" up

print_success "All migrations applied successfully"
echo ""

# ─────────────────────────────────────────────────────────────
# 7. Configure .env for local development
# ─────────────────────────────────────────────────────────────
print_step "Configuring environment..."

cd "${ROOT_DIR}"

# Create/update .env with local PostgreSQL settings
if [ -f ".env" ]; then
  # Backup existing .env
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
  print_warning "Backed up existing .env"
fi

# Generate a random JWT secret
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

cat > .env << EOF
# Diana V2 - Local Development Configuration
# Generated by setup-local-postgres.sh on $(date)

PORT=8080
ENV=dev
DB_DSN=postgres://diana:diana@localhost:5432/diana?sslmode=disable
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173
MODEL_URL=http://localhost:5001/predict
ML_PORT=5001
MODEL_VERSION=v0-mock
MODEL_DATASET_HASH=mock_dataset_v1
MODEL_TIMEOUT_MS=2000
EXPORT_MAX_ROWS=5000

# Demo credentials (for quick testing)
DEMO_EMAIL=demo@diana.app
DEMO_PASSWORD=demopassword123
EOF

print_success ".env configured for local PostgreSQL"
echo ""

# ─────────────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
echo "║     Local PostgreSQL Setup Complete! 🎉      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Database:${NC} diana (localhost:5432)"
echo -e "${GREEN}User:${NC}     diana / diana"
echo ""
echo -e "${BLUE}Pre-loaded accounts:${NC}"
echo "┌──────────────────────────────┬───────────────────┬────────────┐"
echo "│ Email                        │ Password          │ Role       │"
echo "├──────────────────────────────┼───────────────────┼────────────┤"
echo "│ demo@diana.app               │ demopassword123   │ user       │"
echo "│ admin@diana.app              │ adminpassword123  │ admin      │"
echo "└──────────────────────────────┴───────────────────┴────────────┘"
echo ""
echo -e "${BLUE}Pre-loaded data:${NC}"
echo "  • Sample users with realistic profiles"
echo "  • Sample assessments (low/moderate/high risk)"
echo "  • Audit events and model runs"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Start the backend:"
echo "     cd backend && go run ./cmd/server"
echo ""
echo "  2. Start the frontend:"
echo "     cd frontend && npm run dev"
echo ""
echo "  3. Open http://localhost:4000 and login with:"
echo "     admin@diana.app / adminpassword123"
echo ""
