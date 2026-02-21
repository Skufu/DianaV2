#!/bin/bash
#
# Diana V2 Docker Startup Script for macOS
# Usage: ./docker-start.sh [dev|prod|stop|logs|clean]
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_step() { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    echo "Diana V2 Docker Startup Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev       Start in development mode with hot reload (default)"
    echo "  prod      Start in production mode"
    echo "  stop      Stop all services"
    echo "  logs      View logs from all services"
    echo "  clean     Stop and remove all containers, volumes, and images"
    echo "  build     Rebuild all containers"
    echo "  status    Check status of all services"
    echo "  shell     Open a shell in the backend container"
    echo "  db        Open PostgreSQL console"
    echo "  migrate   Run database migrations"
    echo "  seed      Seed demo data"
    echo ""
    echo "Examples:"
    echo "  $0 dev          # Start development server"
    echo "  $0 logs         # View logs"
    echo "  $0 stop         # Stop all services"
}

check_env() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        echo ""
        echo "Please create a .env file. You can copy from .env.example:"
        echo "  cp .env.example .env"
        echo ""
        echo "Then edit .env and set the required variables:"
        echo "  - POSTGRES_PASSWORD"
        echo "  - JWT_SECRET (generate with: openssl rand -base64 32)"
        echo "  - ML_API_KEY (generate with: openssl rand -base64 32)"
        exit 1
    fi
    
    # Check if required variables are set
    if ! grep -q "^JWT_SECRET=" .env || grep -q "^JWT_SECRET=$" .env || grep -q "JWT_SECRET=change-me" .env; then
        print_warning "JWT_SECRET not configured in .env"
        print_info "Generate one with: openssl rand -base64 32"
    fi
    
    if ! grep -q "^ML_API_KEY=" .env || grep -q "^ML_API_KEY=$" .env; then
        print_warning "ML_API_KEY not configured in .env"
        print_info "Generate one with: openssl rand -base64 32"
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found!"
        echo "Please install Docker Desktop for Mac:"
        echo "  https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose not found!"
        echo "Please install Docker Desktop for Mac (includes Compose):"
        echo "  https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running!"
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

start_dev() {
    check_env
    check_docker
    
    print_step "Starting Diana V2 in DEVELOPMENT mode..."
    echo ""
    
    # Check if already running
    if docker-compose ps | grep -q "Up"; then
        print_warning "Services are already running!"
        echo "Use '$0 stop' to stop them first, or '$0 logs' to view logs."
        exit 1
    fi
    
    print_step "Building and starting services..."
    docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
    
    echo ""
    print_success "Services started!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🚀 Diana V2 Development Server"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Frontend:   http://localhost:4000"
    echo "  Backend:    http://localhost:8080/api/v1/healthz"
    echo "  ML Server:  http://localhost:5001/health"
    echo "  PostgreSQL: localhost:5432"
    echo ""
    echo "  Logs: $0 logs"
    echo "  Stop: $0 stop"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Show logs
    docker-compose logs -f
}

start_prod() {
    check_env
    check_docker
    
    print_step "Starting Diana V2 in PRODUCTION mode..."
    echo ""
    
    print_step "Building and starting services..."
    docker-compose up --build -d
    
    echo ""
    print_success "Services started!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🚀 Diana V2 Production Server"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Frontend:   http://localhost"
    echo "  Backend:    http://localhost:8080/api/v1/healthz"
    echo "  ML Server:  http://localhost:5001/health"
    echo ""
    echo "  Logs: $0 logs"
    echo "  Stop: $0 stop"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

stop_services() {
    print_step "Stopping Diana V2 services..."
    docker-compose down
    docker-compose -f docker-compose.yml -f docker-compose.override.yml down 2>/dev/null || true
    print_success "Services stopped"
}

view_logs() {
    echo "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

clean_all() {
    print_warning "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Cleaning up..."
        docker-compose down -v --rmi all
        docker-compose -f docker-compose.yml -f docker-compose.override.yml down -v --rmi all 2>/dev/null || true
        print_success "Cleanup complete"
    else
        print_info "Cleanup cancelled"
    fi
}

rebuild() {
    check_env
    check_docker
    print_step "Rebuilding all containers..."
    docker-compose down
    docker-compose up --build -d
    print_success "Rebuild complete"
}

show_status() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Diana V2 Service Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    docker-compose ps
    echo ""
    
    # Check health endpoints
    echo "Health Checks:"
    
    if curl -s http://localhost:8080/api/v1/healthz > /dev/null 2>&1; then
        print_success "Backend:    http://localhost:8080/api/v1/healthz"
    else
        print_error "Backend:    http://localhost:8080/api/v1/healthz"
    fi
    
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        print_success "ML Server:  http://localhost:5001/health"
    else
        print_error "ML Server:  http://localhost:5001/health"
    fi
    
    if curl -s http://localhost > /dev/null 2>&1 || curl -s http://localhost:4000 > /dev/null 2>&1; then
        print_success "Frontend:   http://localhost or http://localhost:4000"
    else
        print_error "Frontend:   Not responding"
    fi
}

open_shell() {
    print_step "Opening shell in backend container..."
    docker-compose exec backend sh
}

open_db() {
    print_step "Opening PostgreSQL console..."
    docker-compose exec postgres psql -U diana -d diana
}

run_migrations() {
    print_step "Running database migrations..."
    docker-compose exec backend go run ./cmd/migrate up
}

seed_data() {
    print_step "Seeding demo data..."
    docker-compose exec backend go run ./cmd/seed
}

# Main command handler
case "${1:-dev}" in
    dev|development)
        start_dev
        ;;
    prod|production)
        start_prod
        ;;
    stop|down)
        stop_services
        ;;
    logs)
        view_logs
        ;;
    clean)
        clean_all
        ;;
    build|rebuild)
        rebuild
        ;;
    status|ps)
        show_status
        ;;
    shell|exec)
        open_shell
        ;;
    db|postgres|psql)
        open_db
        ;;
    migrate|migration)
        run_migrations
        ;;
    seed)
        seed_data
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
