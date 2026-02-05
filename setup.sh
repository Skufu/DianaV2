#!/usr/bin/env bash
#
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                       DIANA V2 - Complete Setup                            ║
# ║                                                                            ║
# ║  This script sets up everything you need to run Diana V2 locally.         ║
# ║  Just run: bash setup.sh                                                   ║
# ╚════════════════════════════════════════════════════════════════════════════╝
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Colors and Helpers
# ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_step()    { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BOLD}${CYAN}▶ $1${NC}"; }
print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }
print_info()    { echo -e "  ${BLUE}ℹ${NC} $1"; }

# ─────────────────────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${CYAN}"
echo "  ██████╗ ██╗ █████╗ ███╗   ██╗ █████╗     ██╗   ██╗██████╗ "
echo "  ██╔══██╗██║██╔══██╗████╗  ██║██╔══██╗    ██║   ██║╚════██╗"
echo "  ██║  ██║██║███████║██╔██╗ ██║███████║    ██║   ██║ █████╔╝"
echo "  ██║  ██║██║██╔══██║██║╚██╗██║██╔══██║    ╚██╗ ██╔╝██╔═══╝ "
echo "  ██████╔╝██║██║  ██║██║ ╚████║██║  ██║     ╚████╔╝ ███████╗"
echo "  ╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝      ╚═══╝  ╚══════╝"
echo -e "${NC}"
echo -e "${BOLD}  Complete Setup Script${NC}"
echo -e "  Predictive Diabetes Risk Assessment for Menopausal Women"
echo ""

# ─────────────────────────────────────────────────────────────
# Detect OS
# ─────────────────────────────────────────────────────────────
IS_MACOS=false
IS_LINUX=false
IS_WINDOWS=false

if [[ "$OSTYPE" == "darwin"* ]]; then
    IS_MACOS=true
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    IS_LINUX=true
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "${WINDIR:-}" ]]; then
    IS_WINDOWS=true
fi

# ─────────────────────────────────────────────────────────────
# Step 1: Check Required Tools
# ─────────────────────────────────────────────────────────────
print_step "Checking Required Tools"

MISSING_TOOLS=()
INSTALL_HINTS=""

# Check for Go
if command -v go &> /dev/null; then
    print_success "Go $(go version | cut -d' ' -f3)"
else
    MISSING_TOOLS+=("go")
    if $IS_MACOS; then
        INSTALL_HINTS+="\n  brew install go"
    else
        INSTALL_HINTS+="\n  Download from: https://go.dev/doc/install"
    fi
fi

# Check for Node.js
if command -v node &> /dev/null; then
    print_success "Node.js $(node --version)"
else
    MISSING_TOOLS+=("node")
    if $IS_MACOS; then
        INSTALL_HINTS+="\n  brew install node"
    else
        INSTALL_HINTS+="\n  Download from: https://nodejs.org/"
    fi
fi

# Check for npm
if command -v npm &> /dev/null; then
    print_success "npm $(npm --version)"
else
    MISSING_TOOLS+=("npm")
    INSTALL_HINTS+="\n  (npm comes with Node.js)"
fi

# Check for Python
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    print_success "Python $($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)"
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
    print_success "Python $($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)"
else
    MISSING_TOOLS+=("python3")
    if $IS_MACOS; then
        INSTALL_HINTS+="\n  brew install python3"
    else
        INSTALL_HINTS+="\n  Download from: https://www.python.org/downloads/"
    fi
fi

# Check for Goose (optional - will install if missing)
if command -v goose &> /dev/null; then
    print_success "Goose $(goose --version 2>&1 | head -1)"
else
    print_warning "Goose not found (will install automatically)"
fi

# Check for Docker (optional)
if command -v docker &> /dev/null; then
    print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found (optional - for containerized PostgreSQL)"
    DOCKER_AVAILABLE=false
fi

# Check for PostgreSQL client
if command -v psql &> /dev/null; then
    print_success "PostgreSQL client $(psql --version | cut -d' ' -f3)"
    PSQL_AVAILABLE=true
else
    print_warning "PostgreSQL client not found (optional)"
    PSQL_AVAILABLE=false
fi

# Exit if missing required tools
if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo ""
    print_error "Missing required tools: ${MISSING_TOOLS[*]}"
    echo -e "\n  Please install them first:${INSTALL_HINTS}"
    echo ""
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# Step 2: Install Goose (if missing)
# ─────────────────────────────────────────────────────────────
if ! command -v goose &> /dev/null; then
    print_step "Installing Goose (Database Migration Tool)"
    go install github.com/pressly/goose/v3/cmd/goose@latest
    
    # Add Go bin to PATH for this session
    export PATH="$PATH:$(go env GOPATH)/bin"
    
    if command -v goose &> /dev/null; then
        print_success "Goose installed successfully"
    else
        print_warning "Goose installed but not in PATH. Add this to your shell profile:"
        echo "  export PATH=\"\$PATH:\$(go env GOPATH)/bin\""
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 3: Setup Environment Variables
# ─────────────────────────────────────────────────────────────
print_step "Setting Up Environment"

cd "$ROOT_DIR"

if [ -f ".env" ]; then
    print_success ".env file already exists"
else
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success "Created .env from env.example"
    else
        # Create a default .env file
        cat > .env << 'EOF'
# Diana V2 - Local Development Configuration

PORT=8080
ENV=dev
DB_DSN=postgres://diana:diana@localhost:5432/diana?sslmode=disable
JWT_SECRET=REPLACE_ME
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173
MODEL_URL=http://localhost:5001/predict
ML_PORT=5001
MODEL_VERSION=v0-mock
MODEL_DATASET_HASH=mock_dataset_v1
MODEL_TIMEOUT_MS=2000
EXPORT_MAX_ROWS=5000

# Docker Configuration
POSTGRES_PASSWORD=diana
POSTGRES_USER=diana
POSTGRES_DB=diana
ML_API_KEY=dev-ml-api-key-12345
EOF
        print_success "Created default .env file"
    fi
    
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    if $IS_MACOS; then
        sed -i '' "s/JWT_SECRET=REPLACE_ME/JWT_SECRET=${JWT_SECRET}/" .env
        sed -i '' "s/JWT_SECRET=change-me/JWT_SECRET=${JWT_SECRET}/" .env 2>/dev/null || true
        sed -i '' "s/ML_PORT=5000/ML_PORT=5001/" .env 2>/dev/null || true
        sed -i '' "s/localhost:5000/localhost:5001/g" .env 2>/dev/null || true
    else
        sed -i "s/JWT_SECRET=REPLACE_ME/JWT_SECRET=${JWT_SECRET}/" .env
        sed -i "s/JWT_SECRET=change-me/JWT_SECRET=${JWT_SECRET}/" .env 2>/dev/null || true
        sed -i "s/ML_PORT=5000/ML_PORT=5001/" .env 2>/dev/null || true
        sed -i "s/localhost:5000/localhost:5001/g" .env 2>/dev/null || true
    fi
    
    print_success "Generated secure JWT_SECRET"
fi

# Copy .env to backend if needed
if [ ! -f "backend/.env" ]; then
    cp .env backend/.env
    print_success "Copied .env to backend/"
fi

# ─────────────────────────────────────────────────────────────
# Step 4: Setup PostgreSQL Database
# ─────────────────────────────────────────────────────────────
print_step "Setting Up PostgreSQL Database"

# Load environment
set -a
source .env
set +a

POSTGRES_READY=false

# Check if PostgreSQL is already running on port 5432
if command -v pg_isready &> /dev/null && pg_isready -h localhost -p 5432 &> /dev/null; then
    print_success "PostgreSQL is already running on localhost:5432"
    POSTGRES_READY=true
elif $DOCKER_AVAILABLE; then
    # Check if diana-postgres container already exists and is running
    if docker ps --format '{{.Names}}' | grep -q '^diana-postgres$'; then
        print_success "Docker container 'diana-postgres' is already running"
        POSTGRES_READY=true
    elif docker ps -a --format '{{.Names}}' | grep -q '^diana-postgres$'; then
        # Container exists but not running, start it
        print_info "Starting existing 'diana-postgres' container..."
        docker start diana-postgres
        sleep 3
        POSTGRES_READY=true
    else
        # Create and start a new PostgreSQL container
        print_info "Creating PostgreSQL container with Docker..."
        docker run -d \
            --name diana-postgres \
            -e POSTGRES_USER="${POSTGRES_USER:-diana}" \
            -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-diana}" \
            -e POSTGRES_DB="${POSTGRES_DB:-diana}" \
            -p 5432:5432 \
            postgres:16-alpine
        
        print_info "Waiting for PostgreSQL to be ready..."
        for i in {1..30}; do
            if docker exec diana-postgres pg_isready -U "${POSTGRES_USER:-diana}" &> /dev/null; then
                POSTGRES_READY=true
                break
            fi
            sleep 1
        done
        
        if $POSTGRES_READY; then
            print_success "PostgreSQL container created and running"
        else
            print_error "PostgreSQL container failed to start"
        fi
    fi
else
    print_warning "No PostgreSQL detected and Docker not available"
    echo ""
    echo "  Please install PostgreSQL manually:"
    if $IS_MACOS; then
        echo "    brew install postgresql@16"
        echo "    brew services start postgresql@16"
    elif $IS_LINUX; then
        echo "    sudo apt install postgresql postgresql-contrib"
        echo "    sudo systemctl start postgresql"
    fi
    echo ""
    echo "  Then create the database:"
    echo "    createuser -s diana"
    echo "    createdb -O diana diana"
    echo ""
fi

# ─────────────────────────────────────────────────────────────
# Step 5: Create Database User and Database (if needed)
# ─────────────────────────────────────────────────────────────
if $POSTGRES_READY && $DOCKER_AVAILABLE; then
    # For Docker, the database is already created via environment variables
    print_success "Database 'diana' ready (created by Docker)"
elif $POSTGRES_READY && $PSQL_AVAILABLE; then
    print_info "Checking database configuration..."
    
    # Try to connect as diana user
    if PGPASSWORD="${POSTGRES_PASSWORD:-diana}" psql -h localhost -U "${POSTGRES_USER:-diana}" -d "${POSTGRES_DB:-diana}" -c '\q' 2>/dev/null; then
        print_success "Database '${POSTGRES_DB:-diana}' accessible"
    else
        print_warning "Cannot connect to database. You may need to create it manually:"
        echo "    createuser -s diana"
        echo "    createdb -O diana diana"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 6: Download Go Dependencies
# ─────────────────────────────────────────────────────────────
print_step "Installing Go Dependencies"

cd "$ROOT_DIR/backend"
go mod download
print_success "Go dependencies downloaded"

# ─────────────────────────────────────────────────────────────
# Step 7: Install Frontend Dependencies
# ─────────────────────────────────────────────────────────────
print_step "Installing Frontend Dependencies"

cd "$ROOT_DIR/frontend"
npm install --silent 2>/dev/null || npm install
print_success "Frontend dependencies installed"

# Create frontend .env if needed
if [ ! -f ".env" ]; then
    echo "VITE_API_BASE=http://localhost:8080" > .env
    echo "VITE_ML_BASE=http://localhost:5001" >> .env
    print_success "Created frontend/.env"
fi

# ─────────────────────────────────────────────────────────────
# Step 8: Setup Python Virtual Environment
# ─────────────────────────────────────────────────────────────
print_step "Setting Up Python Environment (ML Server)"

cd "$ROOT_DIR"

if [ ! -d "venv" ]; then
    $PYTHON_CMD -m venv venv
    print_success "Created virtual environment"
else
    print_success "Virtual environment already exists"
fi

# Activate venv
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Install ML dependencies
if [ -f "Ian_ML/requirements.txt" ]; then
    print_info "Installing ML dependencies (this may take a moment)..."
    python -m pip install --upgrade pip --quiet 2>/dev/null || python -m pip install --upgrade pip
    pip install -r Ian_ML/requirements.txt --quiet 2>/dev/null || pip install -r Ian_ML/requirements.txt
    print_success "ML dependencies installed"
fi

# ─────────────────────────────────────────────────────────────
# Step 9: Run Database Migrations
# ─────────────────────────────────────────────────────────────
if $POSTGRES_READY; then
    print_step "Running Database Migrations"
    
    cd "$ROOT_DIR"
    
    # Ensure goose is in PATH
    export PATH="$PATH:$(go env GOPATH)/bin"
    
    if command -v goose &> /dev/null; then
        if goose -dir ./backend/migrations postgres "${DB_DSN}" up 2>/dev/null; then
            print_success "Database migrations complete"
        else
            print_warning "Migration failed. You may need to run manually:"
            echo "    goose -dir ./backend/migrations postgres \"\$DB_DSN\" up"
        fi
    else
        print_warning "Goose not found in PATH. Add to your shell profile:"
        echo "    export PATH=\"\$PATH:\$(go env GOPATH)/bin\""
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 10: Check ML Models
# ─────────────────────────────────────────────────────────────
print_step "Checking ML Models"

cd "$ROOT_DIR"

if [ -f "models/clinical/random_forest.joblib" ] || [ -f "models/clinical/xgboost.joblib" ] || [ -f "models/clinical/best_model.joblib" ]; then
    print_success "ML models found"
else
    print_warning "ML models not found. You may need to train them:"
    echo "    bash scripts/dev/retrain-all.sh"
fi

# ─────────────────────────────────────────────────────────────
# Complete!
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}${BOLD}  ✓ Setup Complete!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}To start the application:${NC}"
echo ""
echo -e "    ${CYAN}bash scripts/dev/start-all.sh${NC}"
echo ""
echo -e "  ${BOLD}Access Points:${NC}"
echo ""
echo -e "    Frontend:   ${CYAN}http://localhost:4000${NC}"
echo -e "    Backend:    ${CYAN}http://localhost:8080/api/v1/healthz${NC}"
echo -e "    ML Server:  ${CYAN}http://localhost:5001/health${NC}"
echo ""
echo -e "  ${BOLD}Demo Credentials:${NC}"
echo ""
echo -e "    User:   ${YELLOW}demo@diana.app${NC} / ${YELLOW}demo123${NC}"
echo -e "    Admin:  ${YELLOW}admin@diana.app${NC} / ${YELLOW}admin123${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
