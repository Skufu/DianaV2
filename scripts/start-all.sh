#!/bin/bash
# DIANA V2 - Start All Services
# Starts: ML Server, Go Backend, Frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "============================================================"
echo -e "${CYAN}DIANA V2 - Starting All Services${NC}"
echo "============================================================"

# Trap to clean up background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $ML_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Check if ML models exist
if [ ! -f "models/random_forest.joblib" ] && [ ! -f "models/best_model.joblib" ]; then
    echo -e "${RED}ML models not found. Run 'python scripts/train_enhanced.py' first.${NC}"
    exit 1
fi

# Load environment
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Start ML Server (port 5000)
echo -e "\n${YELLOW}[1/3] Starting ML Server...${NC}"
python ml/server.py &
ML_PID=$!
sleep 2

# Check if ML server started
if ! kill -0 $ML_PID 2>/dev/null; then
    echo -e "${RED}Failed to start ML Server${NC}"
    exit 1
fi
echo -e "${GREEN}   ML Server running on port ${ML_PORT:-5000}${NC}"

# Start Go Backend (port 8080)
echo -e "\n${YELLOW}[2/3] Starting Go Backend...${NC}"
cd backend
go run ./cmd/server &
BACKEND_PID=$!
cd ..
sleep 3

# Check if backend started
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Failed to start Backend${NC}"
    kill $ML_PID 2>/dev/null
    exit 1
fi
echo -e "${GREEN}   Backend running on port ${PORT:-8080}${NC}"

# Start Frontend (port 5173)
echo -e "\n${YELLOW}[3/3] Starting Frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
sleep 2

echo ""
echo "============================================================"
echo -e "${GREEN}All services started!${NC}"
echo "============================================================"
echo ""
echo "Services:"
echo -e "  ${CYAN}ML Server:${NC}  http://localhost:${ML_PORT:-5000}/health"
echo -e "  ${CYAN}Backend:${NC}    http://localhost:${PORT:-8080}/api/v1/healthz"
echo -e "  ${CYAN}Frontend:${NC}   http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for any process to exit
wait
