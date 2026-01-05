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

# Detect Python version
if [ -d "venv" ]; then
    PYTHON="venv/bin/python"
    echo -e "${GREEN}Using virtual environment (venv)${NC}"
elif [ -d "../venv" ]; then
    PYTHON="../venv/bin/python"
    echo -e "${GREEN}Using virtual environment (venv)${NC}"
elif command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo -e "${RED}Error: Python not found. Please install Python 3.10+${NC}"
    exit 1
fi

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
    echo -e "${RED}ML models not found. Run '$PYTHON scripts/train_enhanced.py' first.${NC}"
    exit 1
fi

# Load environment
if [ -f ".env" ]; then
    # Use a more reliable way to export env vars
    set -a
    source .env
    set +a
    
    # Ensure backend has access to .env for godotenv
    if [ ! -f "backend/.env" ]; then
        cp .env backend/.env
    fi
fi

# Modern macOS (Darwin) often uses port 5000 for AirPlay Receiver
# Default to 5001 if port 5000 is likely to be an issue
if [[ "$OSTYPE" == "darwin"* ]] && [ -z "${ML_PORT:-}" ]; then
    echo -e "${YELLOW}macOS detected: Defaulting ML_PORT to 5001 to avoid AirPlay conflict${NC}"
    export ML_PORT=5001
    export MODEL_URL="http://localhost:5001/predict"
fi

ML_PORT=${ML_PORT:-5000}

# Start ML Server
echo -e "\n${YELLOW}[1/3] Starting ML Server...${NC}"
echo -e "${CYAN}   Port: $ML_PORT${NC}"
$PYTHON ml/server.py &
ML_PID=$!
sleep 2

# Check if ML server started
if ! kill -0 $ML_PID 2>/dev/null; then
    echo -e "${RED}Failed to start ML Server${NC}"
    echo -e "${YELLOW}Hint: If port 5000 is in use, try changing ML_PORT to 5001 in .env${NC}"
    echo -e "${YELLOW}On macOS, you may need to disable 'AirPlay Receiver' in System Settings > General > AirDrop & Handoff${NC}"
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
echo -e "  ${CYAN}Frontend:${NC}   http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for any process to exit
wait
