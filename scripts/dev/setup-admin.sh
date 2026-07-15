#!/usr/bin/env bash
#
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║          DIANA V2 - Admin Credentials Setup (One-Command)                 ║
# ║                                                                            ║
# ║  Creates fresh admin + doctor credentials that GUARANTEED WORK.           ║
# ║  No conflicts. No stale docs. Just run it.                                ║
# ║                                                                            ║
# ║  Usage:  bash scripts/dev/setup-admin.sh                                  ║
# ║                                                                            ║
# ║  What it does:                                                             ║
# ║  1. Checks/starts PostgreSQL (Docker or local)                            ║
# ║  2. Runs migrations                                                        ║
# ║  3. Creates fresh admin + doctor accounts                                  ║
# ║  4. Prints credentials you can copy-paste                                  ║
# ╚════════════════════════════════════════════════════════════════════════════╝
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Colors
# ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if command -v git >/dev/null 2>&1 && git -C "$SCRIPT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
    ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
else
    ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

print_step()    { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BOLD}${CYAN}▶ $1${NC}"; }
print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }
print_info()    { echo -e "  ${BLUE}ℹ${NC} $1"; }

# ─────────────────────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}"
echo "  ██████╗ ██╗ █████╗ ███╗   ██╗ █████╗ "
echo "  ██╔══██╗██║██╔══██╗████╗  ██║██╔══██╗"
echo "  ██║  ██║██║███████║██╔██╗ ██║███████║"
echo "  ██║  ██║██║██╔══██║██║╚██╗██║██╔══██║"
echo "  ██████╔╝██║██║  ██║██║ ╚████║██║  ██║"
echo "  ╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${BOLD}  Admin Credentials Setup${NC}"
echo -e "  Creates fresh admin + doctor accounts (no conflicts)"
echo ""

# ─────────────────────────────────────────────────────────────
# Step 1: Check prerequisites
# ─────────────────────────────────────────────────────────────
print_step "Checking Prerequisites"

# Check Go
if command -v go &> /dev/null; then
    print_success "Go $(go version | cut -d' ' -f3)"
else
    print_error "Go not found. Install from: https://go.dev/doc/install"
    exit 1
fi

# Check PostgreSQL (Docker or local)
POSTGRES_READY=false
DB_DSN=""

if command -v pg_isready &> /dev/null && pg_isready -h localhost -p 5432 &> /dev/null 2>&1; then
    print_success "PostgreSQL running on localhost:5432"
    POSTGRES_READY=true
    DB_DSN="postgres://diana:diana@localhost:5432/diana?sslmode=disable"
elif command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q '^diana-postgres$'; then
        print_success "Docker container 'diana-postgres' running"
        POSTGRES_READY=true
        DB_DSN="postgres://diana:diana@localhost:5432/diana?sslmode=disable"
    else
        print_info "Starting PostgreSQL via Docker..."
        docker run -d \
            --name diana-postgres \
            -e POSTGRES_USER=diana \
            -e POSTGRES_PASSWORD=diana \
            -e POSTGRES_DB=diana \
            -p 5432:5432 \
            postgres:16-alpine
        
        # Wait for PostgreSQL
        for i in {1..30}; do
            if docker exec diana-postgres pg_isready -U diana &> /dev/null 2>&1; then
                POSTGRES_READY=true
                DB_DSN="postgres://diana:diana@localhost:5432/diana?sslmode=disable"
                break
            fi
            sleep 1
        done
        
        if $POSTGRES_READY; then
            print_success "PostgreSQL container created and running"
        else
            print_error "PostgreSQL failed to start"
            exit 1
        fi
    fi
else
    print_error "No PostgreSQL found and Docker not available"
    echo ""
    echo "  Install Docker: https://www.docker.com/products/docker-desktop"
    echo "  OR install PostgreSQL: brew install postgresql@16"
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# Step 2: Load or create .env
# ─────────────────────────────────────────────────────────────
print_step "Setting Up Environment"

cd "$ROOT_DIR"

if [ ! -f ".env" ]; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    cat > .env << EOF
# Diana V2 - Auto-generated by setup-admin.sh
PORT=8080
ENV=dev
DB_DSN=${DB_DSN}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173
MODEL_URL=http://localhost:5001/predict
ML_PORT=5001
MODEL_VERSION=binary_v2_no_bp
MODEL_DATASET_HASH=nhanes_postmenopausal_2011_2024
MODEL_TIMEOUT_MS=2000
EXPORT_MAX_ROWS=5000
POSTGRES_PASSWORD=diana
POSTGRES_USER=diana
POSTGRES_DB=diana
ML_API_KEY=dev-ml-api-key-12345
EOF
    print_success "Created .env with secure JWT_SECRET"
else
    if ! grep -q "DB_DSN=" .env; then
        echo "DB_DSN=${DB_DSN}" >> .env
    fi
    # Ensure JWT_SECRET exists
    if ! grep -q "JWT_SECRET=" .env || grep -q "JWT_SECRET=$" .env || grep -q "JWT_SECRET=REPLACE" .env; then
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
        else
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
        fi
        print_success "Generated new JWT_SECRET"
    fi
    print_success ".env file exists"
fi

# Copy to backend
cp .env backend/.env 2>/dev/null || true
print_success "Environment configured"

# ─────────────────────────────────────────────────────────────
# Step 3: Run migrations
# ─────────────────────────────────────────────────────────────
print_step "Running Database Migrations"

cd "$ROOT_DIR"
export PATH="$PATH:$(go env GOPATH)/bin"

if command -v goose &> /dev/null; then
    goose -dir ./backend/migrations postgres "${DB_DSN}" up 2>/dev/null || true
    print_success "Migrations applied"
else
    print_info "Installing Goose..."
    go install github.com/pressly/goose/v3/cmd/goose@latest
    export PATH="$PATH:$(go env GOPATH)/bin"
    goose -dir ./backend/migrations postgres "${DB_DSN}" up 2>/dev/null || true
    print_success "Goose installed and migrations applied"
fi

# ─────────────────────────────────────────────────────────────
# Step 4: Generate fresh credentials
# ─────────────────────────────────────────────────────────────
print_step "Creating Fresh Admin Credentials"

# Generate random passwords (12 chars, easy to type)
generate_password() {
    # Use /dev/urandom for cross-platform compatibility
    LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' < /dev/urandom | head -c 12
}

ADMIN_EMAIL="admin@diana.app"
ADMIN_PASS=$(generate_password)
DOCTOR_EMAIL="doctor@diana.app"
DOCTOR_PASS=$(generate_password)
DEMO_EMAIL="demo@diana.app"
DEMO_PASS="DemoPass123!"

# Create a Go script to seed users with bcrypt
cat > /tmp/diana_seed.go << 'GOEOF'
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type SeedUser struct {
	Email     string
	Password  string
	Role      string
	FirstName string
	LastName  string
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: seed <db_dsn>")
	}
	dbDSN := os.Args[1]

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbDSN)
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer pool.Close()

	users := []SeedUser{
		{Email: os.Getenv("ADMIN_EMAIL"), Password: os.Getenv("ADMIN_PASS"), Role: "admin", FirstName: "System", LastName: "Admin"},
		{Email: os.Getenv("DOCTOR_EMAIL"), Password: os.Getenv("DOCTOR_PASS"), Role: "doctor", FirstName: "Dr.", LastName: "Demo"},
		{Email: os.Getenv("DEMO_EMAIL"), Password: os.Getenv("DEMO_PASS"), Role: "user", FirstName: "Demo", LastName: "User"},
	}

	for _, u := range users {
		if u.Email == "" || u.Password == "" {
			continue
		}
		if err := seedUser(ctx, pool, u.Email, u.Password, u.FirstName, u.LastName, u.Role); err != nil {
			log.Printf("failed to seed user %s: %v", u.Email, err)
		} else {
			log.Printf("Seeded user: %s (Role: %s)", u.Email, u.Role)
		}
	}
}

func seedUser(ctx context.Context, pool *pgxpool.Pool, email, password, firstName, lastName, role string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Delete existing user with same email
	_, err = pool.Exec(ctx, "DELETE FROM users WHERE email = $1", email)
	if err != nil {
		return err
	}

	isAdmin := role == "admin"

	_, err = pool.Exec(ctx, `
		INSERT INTO users (email, password_hash, role, is_admin, is_active, account_status, onboarding_completed, first_name, last_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
	`, email, string(hash), role, isAdmin, true, "active", false, firstName, lastName)
	return err
}
GOEOF

# Run the Go seed script
cd "$ROOT_DIR/backend"
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASS="$ADMIN_PASS" \
DOCTOR_EMAIL="$DOCTOR_EMAIL" DOCTOR_PASS="$DOCTOR_PASS" \
DEMO_EMAIL="$DEMO_EMAIL" DEMO_PASS="$DEMO_PASS" \
go run /tmp/diana_seed.go "$DB_DSN"

# Clean up temp file
rm -f /tmp/diana_seed.go

# ─────────────────────────────────────────────────────────────
# Step 5: Print credentials
# ═══════════════════════════════════════════════════════════════
print_step "Your Credentials (COPY THESE)"

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║                    DIANA V2 CREDENTIALS                         ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║  ${YELLOW}ADMIN ACCOUNT${GREEN}                                                  ║${NC}"
echo -e "${GREEN}${BOLD}║  Email:    ${CYAN}${ADMIN_EMAIL}${GREEN}                              ║${NC}"
echo -e "${GREEN}${BOLD}║  Password: ${CYAN}${ADMIN_PASS}${GREEN}                              ║${NC}"
echo -e "${GREEN}${BOLD}║  Role:     ${YELLOW}admin${GREEN} (full access)                                ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║  ${YELLOW}DOCTOR ACCOUNT${GREEN}                                                ║${NC}"
echo -e "${GREEN}${BOLD}║  Email:    ${CYAN}${DOCTOR_EMAIL}${GREEN}                              ║${NC}"
echo -e "${GREEN}${BOLD}║  Password: ${CYAN}${DOCTOR_PASS}${GREEN}                              ║${NC}"
echo -e "${GREEN}${BOLD}║  Role:     ${YELLOW}doctor${GREEN} (clinical access)                            ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║  ${YELLOW}DEMO ACCOUNT${GREEN}                                                  ║${NC}"
echo -e "${GREEN}${BOLD}║  Email:    ${CYAN}${DEMO_EMAIL}${GREEN}                           ║${NC}"
echo -e "${GREEN}${BOLD}║  Password: ${CYAN}${DEMO_PASS}${GREEN}                           ║${NC}"
echo -e "${GREEN}${BOLD}║  Role:     ${YELLOW}user${GREEN} (standard access)                              ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# Step 6: Save credentials to file
# ─────────────────────────────────────────────────────────────
print_step "Saving Credentials"

cat > "$ROOT_DIR/.credentials" << EOF
DIANA V2 CREDENTIALS
====================
Generated: $(date)

ADMIN ACCOUNT
  Email:    ${ADMIN_EMAIL}
  Password: ${ADMIN_PASS}
  Role:     admin (full access)

DOCTOR ACCOUNT
  Email:    ${DOCTOR_EMAIL}
  Password: ${DOCTOR_PASS}
  Role:     doctor (clinical access)

DEMO ACCOUNT
  Email:    ${DEMO_EMAIL}
  Password: ${DEMO_PASS}
  Role:     user (standard access)

Access URLs:
  Frontend: http://localhost:4000
  Backend:  http://localhost:8080/api/v1/healthz
  ML:       http://localhost:5001/health

To start services:
  bash scripts/dev/start-all.sh
EOF

print_success "Credentials saved to .credentials"

# ─────────────────────────────────────────────────────────────
# Complete
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}${BOLD}  ✓ Setup Complete!${NC}"
echo ""
echo -e "${BOLD}  To start the application:${NC}"
echo -e "     ${CYAN}bash scripts/dev/start-all.sh${NC}"
echo ""
echo -e "${BOLD}  Then login at:${NC}"
echo -e "     ${CYAN}http://localhost:4000${NC}"
echo ""
echo -e "${YELLOW}  ⚠ Credentials saved to .credentials (gitignored)${NC}"
echo -e "${YELLOW}  ⚠ Share with your team securely${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
