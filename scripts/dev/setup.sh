#!/usr/bin/env bash
#
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                       DIANA V2 - Complete Setup                            ║
# ║                                                                            ║
# ║  This script sets up everything you need to run Diana V2 locally.         ║
# ║  Just run: bash scripts/dev/setup.sh                                       ║
# ║                                                                            ║
# ║  This script will ATTEMPT TO AUTO-INSTALL missing tools.                  ║
# ║  If auto-install fails, manual instructions will be provided.             ║
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if command -v git >/dev/null 2>&1 && git -C "$SCRIPT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
    ROOT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
else
    ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi
AUTO_INSTALL_ATTEMPTS=()
AUTO_INSTALL_FAILED=()

print_step()    { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BOLD}${CYAN}▶ $1${NC}"; }
print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_warning() { echo -e "  ${YELLOW}⚠${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }
print_info()    { echo -e "  ${BLUE}ℹ${NC} $1"; }
print_attempt() { echo -e "  ${CYAN}→${NC} Attempting: $1"; }

# ─────────────────────────────────────────────────────────────
# Auto-install functions
# ─────────────────────────────────────────────────────────────
attempt_go_install() {
    print_attempt "Auto-installing Go..."
    AUTO_INSTALL_ATTEMPTS+=("Go")
    
    if $IS_MACOS; then
        if command -v brew &> /dev/null; then
            brew install go
            if command -v go &> /dev/null; then
                print_success "Go installed via Homebrew"
                return 0
            fi
        fi
    elif $IS_LINUX; then
        # Try different package managers
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y golang-go 2>/dev/null || true
        elif command -v yum &> /dev/null; then
            sudo yum install -y golang 2>/dev/null || true
        elif command -v pacman &> /dev/null; then
            sudo pacman -S go --noconfirm 2>/dev/null || true
        fi
        
        if command -v go &> /dev/null; then
            print_success "Go installed via package manager"
            return 0
        fi
    fi
    
    AUTO_INSTALL_FAILED+=("Go")
    return 1
}

attempt_node_install() {
    print_attempt "Auto-installing Node.js..."
    AUTO_INSTALL_ATTEMPTS+=("Node.js")
    
    if $IS_MACOS; then
        if command -v brew &> /dev/null; then
            brew install node
            if command -v node &> /dev/null; then
                print_success "Node.js installed via Homebrew"
                return 0
            fi
        fi
    elif $IS_LINUX; then
        # Try to install via package manager
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
            sudo apt-get install -y nodejs 2>/dev/null || true
        elif command -v yum &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - 2>/dev/null || true
            sudo yum install -y nodejs 2>/dev/null || true
        elif command -v pacman &> /dev/null; then
            sudo pacman -S nodejs npm --noconfirm 2>/dev/null || true
        fi
        
        if command -v node &> /dev/null; then
            print_success "Node.js installed via package manager"
            return 0
        fi
    fi
    
    AUTO_INSTALL_FAILED+=("Node.js")
    return 1
}

attempt_python_install() {
    print_attempt "Auto-installing Python 3..."
    AUTO_INSTALL_ATTEMPTS+=("Python 3")
    
    if $IS_MACOS; then
        if command -v brew &> /dev/null; then
            brew install python
            if command -v python3 &> /dev/null || command -v python &> /dev/null; then
                print_success "Python installed via Homebrew"
                return 0
            fi
        fi
    elif $IS_LINUX; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y python3 python3-venv python3-pip 2>/dev/null || true
        elif command -v yum &> /dev/null; then
            sudo yum install -y python3 python3-venv python3-pip 2>/dev/null || true
        elif command -v pacman &> /dev/null; then
            sudo pacman -S python python-pip --noconfirm 2>/dev/null || true
        fi
        
        if command -v python3 &> /dev/null || command -v python &> /dev/null; then
            print_success "Python installed via package manager"
            return 0
        fi
    fi
    
    AUTO_INSTALL_FAILED+=("Python 3")
    return 1
}

# ─────────────────────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────────────────────
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
echo -e "  ${YELLOW}(With Auto-Install)${NC}"
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
# Step 1: Check Required Tools (with auto-install)
# ─────────────────────────────────────────────────────────────
print_step "Checking Required Tools (Auto-Install Enabled)"

MISSING_TOOLS=()
INSTALL_HINTS=""
NEEDS_MANUAL_INSTALL=false

# Check for Go
if command -v go &> /dev/null; then
    print_success "Go $(go version | cut -d' ' -f3)"
else
    print_warning "Go not found - attempting auto-install..."
    if attempt_go_install; then
        : # Success
    else
        MISSING_TOOLS+=("Go")
        INSTALL_HINTS+="\n  ${BOLD}Go:${NC}"
        INSTALL_HINTS+="\n    macOS:   brew install go"
        INSTALL_HINTS+="\n    Linux:   sudo apt-get install golang-go"
        INSTALL_HINTS+="\n    Windows: https://go.dev/doc/install"
        INSTALL_HINTS+="\n    Or use:  https://github.com/moovweb/gvm"
        NEEDS_MANUAL_INSTALL=true
    fi
fi

# Check for Node.js
if command -v node &> /dev/null; then
    print_success "Node.js $(node --version)"
else
    print_warning "Node.js not found - attempting auto-install..."
    if attempt_node_install; then
        : # Success
    else
        MISSING_TOOLS+=("Node.js")
        INSTALL_HINTS+="\n  ${BOLD}Node.js:${NC}"
        INSTALL_HINTS+="\n    macOS:   brew install node"
        INSTALL_HINTS+="\n    Linux:   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
        INSTALL_HINTS+="\n    Windows: https://nodejs.org/ (download LTS)"
        INSTALL_HINTS+="\n    Or use:  https://github.com/nvm-sh/nvm"
        NEEDS_MANUAL_INSTALL=true
    fi
fi

# Check for npm (comes with Node.js usually)
if command -v npm &> /dev/null; then
    print_success "npm $(npm --version)"
else
    MISSING_TOOLS+=("npm")
    INSTALL_HINTS+="\n  ${BOLD}npm:${NC} Comes with Node.js installation"
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
    print_warning "Python not found - attempting auto-install..."
    if attempt_python_install; then
        # Re-detect Python after install
        if command -v python3 &> /dev/null; then
            PYTHON_CMD=python3
        elif command -v python &> /dev/null; then
            PYTHON_CMD=python
        fi
    else
        MISSING_TOOLS+=("Python 3")
        INSTALL_HINTS+="\n  ${BOLD}Python 3:${NC}"
        INSTALL_HINTS+="\n    macOS:   brew install python"
        INSTALL_HINTS+="\n    Linux:   sudo apt-get install python3 python3-venv python3-pip"
        INSTALL_HINTS+="\n    Windows: https://www.python.org/downloads/"
        INSTALL_HINTS+="\n    Or use:  https://github.com/pyenv/pyenv"
        NEEDS_MANUAL_INSTALL=true
    fi
fi

# Check for Docker
DOCKER_AVAILABLE=false
if command -v docker &> /dev/null; then
    print_success "Docker available"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found (optional - for auto PostgreSQL setup)"
    print_info "Install from: https://www.docker.com/products/docker-desktop"
fi

# Report auto-install status
if [ ${#AUTO_INSTALL_ATTEMPTS[@]} -ne 0 ]; then
    echo ""
    print_step "Auto-Install Summary"
    print_info "Attempted to auto-install: ${AUTO_INSTALL_ATTEMPTS[*]}"
    if [ ${#AUTO_INSTALL_FAILED[@]} -ne 0 ]; then
        print_warning "Auto-install failed for: ${AUTO_INSTALL_FAILED[*]}"
        print_info "See manual installation instructions below"
    fi
fi

# Exit if missing required tools
if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo ""
    print_error "╭────────────────────────────────────────────────────────────╮"
    print_error "│  MISSING REQUIRED TOOLS - MANUAL INSTALLATION REQUIRED     │"
    print_error "╰────────────────────────────────────────────────────────────╯"
    echo ""
    echo -e "  The script attempted to auto-install but failed for:${NC}"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo -e "    ${RED}✗${NC} $tool"
    done
    echo ""
    echo -e "  ${BOLD}Manual Installation Instructions:${NC}"
    echo -e "$INSTALL_HINTS"
    echo ""
    print_info "After installing, re-run: bash scripts/dev/setup.sh"
    echo ""
    
    # Save failed status
    echo "SETUP_FAILED_MISSING_TOOLS: ${MISSING_TOOLS[*]}" > .setup-verification.txt
    echo "AUTO_INSTALL_ATTEMPTED: ${AUTO_INSTALL_ATTEMPTS[*]}" >> .setup-verification.txt
    echo "AUTO_INSTALL_FAILED: ${AUTO_INSTALL_FAILED[*]}" >> .setup-verification.txt
    
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# Step 2: Install Goose (if missing) - AUTO INSTALL
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
else
    print_success "Goose $(goose --version 2>&1 | head -1)"
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
MODEL_VERSION=binary_v2_no_bp
MODEL_DATASET_HASH=nhanes_postmenopausal_2011_2020
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
# Step 4: Setup PostgreSQL Database (Auto-create with Docker)
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
# Step 5: Download Go Dependencies
# ─────────────────────────────────────────────────────────────
print_step "Installing Go Dependencies"

cd "$ROOT_DIR/backend"
go mod download
print_success "Go dependencies downloaded"

# ─────────────────────────────────────────────────────────────
# Step 6: Install Frontend Dependencies
# ─────────────────────────────────────────────────────────────
print_step "Installing Frontend Dependencies"

cd "$ROOT_DIR/frontend"
npm install --silent 2>/dev/null || npm install
print_success "Frontend dependencies installed"

# Create frontend .env if needed
if [ ! -f ".env" ]; then
    echo "VITE_API_BASE=/api/v1" > .env
    echo "VITE_ML_BASE=http://localhost:5001" >> .env
    echo "VITE_ML_PORT=5001" >> .env
    echo "VITE_ML_API_KEY=dev-ml-api-key-12345" >> .env
    print_success "Created frontend/.env"
fi

# ─────────────────────────────────────────────────────────────
# Step 7: Setup Python Virtual Environment
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
# Step 8: Run Database Migrations
# ─────────────────────────────────────────────────────────────
if $POSTGRES_READY; then
    print_step "Running Database Migrations"
    
    cd "$ROOT_DIR"
    
    # Ensure goose is in PATH
    export PATH="$PATH:$(go env GOPATH)/bin"
    
    if command -v goose &> /dev/null; then
        echo "Running migrations..."
        goose -dir ./backend/migrations postgres "${DB_DSN}" up
        if [ $? -eq 0 ]; then
            print_success "Database migrations complete"
        else
            print_warning "Migration may have already been applied or failed. You can run manually:"
            print_info "goose -dir ./backend/migrations postgres \"\$DB_DSN\" up"
        fi
    else
        print_warning "Goose not found in PATH. Add to your shell profile:"
        echo "    export PATH=\"\$PATH:\$(go env GOPATH)/bin\""
    fi
fi

# ─────────────────────────────────────────────────────────────
# Step 9: Check ML Models
# ─────────────────────────────────────────────────────────────
print_step "Checking ML Models"

cd "$ROOT_DIR"

MODELS_FOUND=false
if [ -f "models/binary_v2_no_bp/best_model.joblib" ] && [ -f "models/binary_v2_no_bp/kmeans_model.joblib" ]; then
    MODELS_FOUND=true
    print_success "ML models found"
else
    print_warning "ML models not found. You need to train them or copy from shared location:"
    print_info "Option 1: Train models: bash scripts/dev/retrain-binary.sh"
    print_info "Option 2: Copy from shared drive if someone has trained them (put in models/binary_v2_no_bp/)"
fi

# ─────────────────────────────────────────────────────────────
# Step 10: Create Setup Verification File
# ─────────────────────────────────────────────────────────────
print_step "Creating Setup Verification"

GOOSE_VERSION=$(goose --version 2>&1 | head -1 2>/dev/null || echo "Not installed")
DOCKER_STATUS=$(if $DOCKER_AVAILABLE; then echo "Yes"; else echo "No"; fi)
POSTGRES_STATUS=$(if $POSTGRES_READY; then echo "Running on port 5432"; else echo "NOT RUNNING"; fi)
MODELS_STATUS=$(if $MODELS_FOUND; then echo "Found"; else echo "NOT FOUND - Training required"; fi)
MIGRATION_STATUS=$(if $POSTGRES_READY; then echo "Applied"; else echo "Skipped - No database"; fi)

cat > .setup-verification.txt << EOF
Diana V2 Setup Verification
===========================
Setup completed: $(date)
Machine: $(hostname)
User: $(whoami)

Tools Installed:
- Go: $(go version)
- Node: $(node --version)
- npm: $(npm --version)
- Python: $($PYTHON_CMD --version 2>&1)
- Goose: $GOOSE_VERSION
- Docker: $DOCKER_STATUS

Auto-Install Attempts:
- Attempted: ${AUTO_INSTALL_ATTEMPTS[*]:-None}
- Failed: ${AUTO_INSTALL_FAILED[*]:-None}

Services Configured:
- PostgreSQL: $POSTGRES_STATUS
- Environment: .env files created
- Go dependencies: Downloaded
- Frontend dependencies: Installed
- Python venv: Created and configured
- Database migrations: $MIGRATION_STATUS
- ML Models: $MODELS_STATUS

Next Steps:
1. $(if [ "$MODELS_FOUND" = false ]; then echo "TRAIN ML MODELS: bash scripts/dev/retrain-binary.sh"; else echo "ML models ready"; fi)
2. START APPLICATION: bash scripts/dev/start-all.sh
3. Access: http://localhost:4000

Demo Credentials:
- User: demo@diana.app / demopassword123
- Admin: admin@diana.app / admin123
EOF

print_success "Setup verification saved to .setup-verification.txt"

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
echo -e "  ${BOLD}Next steps:${NC}"
echo ""

if [ "$MODELS_FOUND" = false ]; then
    echo -e "  ${YELLOW}1. Train ML models (REQUIRED before starting):${NC}"
    echo -e "     ${CYAN}bash scripts/dev/retrain-binary.sh${NC}"
    echo ""
    echo "     OR copy models from shared location to models/binary_v2_no_bp/"
    echo ""
    echo -e "  ${BOLD}2. Start the application:${NC}"
else
    echo -e "  ${BOLD}1. Start the application:${NC}"
fi

echo -e "     ${CYAN}bash scripts/dev/start-all.sh${NC}"
echo ""
echo -e "  ${BOLD}Access Points:${NC}"
echo -e "     Frontend:   ${CYAN}http://localhost:4000${NC}"
echo -e "     Backend:    ${CYAN}http://localhost:8080/api/v1/healthz${NC}"
echo -e "     ML Server:  ${CYAN}http://localhost:5001/health${NC}"
echo ""
echo -e "  ${BOLD}Demo Credentials:${NC}"
echo -e "     User:   ${YELLOW}demo@diana.app / demopassword123${NC}"
echo -e "     Admin:  ${YELLOW}admin@diana.app / admin123${NC}"
echo ""

if [ "$POSTGRES_READY" = false ]; then
    echo -e "  ${RED}${BOLD}⚠ WARNING: PostgreSQL is not running!${NC}"
    echo -e "     ${RED}The application will fail to start without a database.${NC}"
    echo -e "     ${RED}Install PostgreSQL or Docker, then run setup again.${NC}"
    echo ""
fi

echo -e "  ${BOLD}Setup Verification:${NC}"
echo -e "     ${CYAN}cat .setup-verification.txt${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
