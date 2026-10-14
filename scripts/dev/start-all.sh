#!/bin/bash
# DIANA V2 - Start All Services
# Starts: ML Server, Go Backend, Frontend

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if command -v git >/dev/null 2>&1 && git -C "$SCRIPT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
    PROJECT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
else
    PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
fi
cd "$PROJECT_DIR" || exit 1

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "============================================================"
echo -e "${CYAN}DIANA V2 - Starting All Services${NC}"
echo "============================================================"

# Detect if running on Windows (Git Bash/MSYS/Cygwin)
IS_WINDOWS=false
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WINDIR" ]] || [[ -n "$MSYSTEM" ]]; then
    IS_WINDOWS=true
fi

# Detect if running on macOS
IS_MAC=false
if [[ "$OSTYPE" == darwin* ]]; then
    IS_MAC=true
fi

# Detect Python
if [ -d "venv/Scripts" ]; then
    PYTHON="venv/Scripts/python.exe"
    echo -e "${GREEN}Using virtual environment (venv/Scripts)${NC}"
elif [ -d "venv/bin" ]; then
    PYTHON="venv/bin/python"
    echo -e "${GREEN}Using virtual environment (venv/bin)${NC}"
elif command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo -e "${RED}Error: Python not found. Please install Python 3.10+${NC}"
    exit 1
fi

# Function to kill process on a specific port
kill_on_port() {
    local port=$1
    echo -e "${CYAN}Checking port $port...${NC}"
    
    if [ "$IS_WINDOWS" = true ]; then
        local pid=$(netstat -ano 2>/dev/null | grep ":$port" | grep "LISTENING" | awk '{print $5}' | head -n 1)
        if [ -n "$pid" ] && [ "$pid" != "0" ]; then
            echo -e "${YELLOW}Killing process $pid on port $port...${NC}"
            taskkill //F //PID "$pid" > /dev/null 2>&1 || true
            sleep 1
        fi
    else
        local pid=$(lsof -ti :$port 2>/dev/null | head -n 1)
        if [ -n "$pid" ]; then
            echo -e "${YELLOW}Killing process $pid on port $port...${NC}"
            kill -9 "$pid" 2>/dev/null || true
            sleep 1
        fi
    fi
}

# Determine model version (default to binary_v2_no_bp - the current deployed screening model)
MODEL_VERSION="${MODEL_VERSION:-binary_v2_no_bp}"
MODEL_DIR="models/$MODEL_VERSION"

# Check if ML models exist for the configured model version
if [ ! -f "$MODEL_DIR/best_model.joblib" ]; then
    echo -e "${RED}ML models not found at $MODEL_DIR/${NC}"
    echo -e "${YELLOW}Run 'bash scripts/dev/retrain-binary.sh' to train the screening model.${NC}"
    exit 1
fi

# Check clustering artifacts exist
if [ ! -f "$MODEL_DIR/weighted_kmeans_model.joblib" ] || [ ! -f "$MODEL_DIR/cluster_scaler.joblib" ]; then
    echo -e "${YELLOW}Clustering artifacts not found. Training clustering...${NC}"
    "$PYTHON" "Ian_ML/training/clustering.py" || exit 1
fi

# Load environment
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
    
    if [ ! -f "backend/.env" ]; then
        cp .env backend/.env
    fi
fi

# Set default ports
export ML_PORT="${ML_PORT:-5001}"
export MODEL_URL="${MODEL_URL:-http://localhost:5001/predict}"
export PORT="${PORT:-8080}"

# Create logs directory
mkdir -p logs

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    
    # Kill tail process if running
    if [ -n "$TAIL_PID" ]; then
        kill $TAIL_PID 2>/dev/null || true
    fi
    
    # Kill by port to be safe
    if [ "$IS_WINDOWS" = true ]; then
        for p in $ML_PORT $PORT 4000; do
            local pid=$(netstat -ano 2>/dev/null | grep ":$p" | grep "LISTENING" | awk '{print $5}' | head -n 1)
            if [ -n "$pid" ]; then
                taskkill //F //PID "$pid" > /dev/null 2>&1 || true
            fi
        done
    fi
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ============================================
# Start ML Server
# ============================================
echo -e "\n${YELLOW}[1/3] Starting ML Server...${NC}"
kill_on_port $ML_PORT
echo -e "${CYAN}   Port: $ML_PORT${NC}"

# Convert to Windows path if needed
if [ "$IS_WINDOWS" = true ]; then
    # Use absolute path
    ML_SCRIPT="$PROJECT_DIR/Ian_ML/service/server.py"
    # Convert /c/Users/... to C:/Users/... format for Python
    ML_SCRIPT=$(echo "$ML_SCRIPT" | sed 's|^/\([a-zA-Z]\)/|\1:/|')
else
    ML_SCRIPT="Ian_ML/service/server.py"
fi

# Start ML server in background
cd "$PROJECT_DIR"
"$PYTHON" "$ML_SCRIPT" > logs/ml-server.log 2>&1 &
ML_PID=$!
sleep 5

# Check if ML server started
ML_RUNNING=false
for i in {1..8}; do
    if kill -0 $ML_PID 2>/dev/null; then
        # Try to connect to the health endpoint
        if curl -s http://localhost:$ML_PORT/health > /dev/null 2>&1; then
            ML_RUNNING=true
            break
        fi
    else
        # Process died
        break
    fi
    sleep 1
done

if [ "$ML_RUNNING" = false ]; then
    echo -e "${RED}Failed to start ML Server${NC}"
    echo -e "${YELLOW}Last 20 lines of logs/ml-server.log:${NC}"
    tail -20 logs/ml-server.log 2>/dev/null || echo "(log file not found or empty)"
    exit 1
fi
echo -e "${GREEN}   ML Server running on port $ML_PORT (PID: $ML_PID)${NC}"

# ============================================
# Start Go Backend
# ============================================
echo -e "\n${YELLOW}[2/3] Starting Go Backend...${NC}"
kill_on_port $PORT

cd backend || exit 1
USE_AIR=false
AIR_CONFIG=""

# Windows keeps the default execution path (go run).
# macOS conditionally uses air only when config file + binary exist.
if [ "$IS_WINDOWS" = true ]; then
    echo -e "${GREEN}   Using 'go run' for backend server...${NC}"
elif [ "$IS_MAC" = true ]; then
    if [ -f ".air.toml" ]; then
        AIR_CONFIG=".air.toml"
    elif [ -f "air.toml" ]; then
        AIR_CONFIG="air.toml"
    elif [ -f "../.air.toml" ]; then
        AIR_CONFIG="../.air.toml"
    elif [ -f "../air.toml" ]; then
        AIR_CONFIG="../air.toml"
    fi

    if [ -n "$AIR_CONFIG" ] && command -v air >/dev/null 2>&1; then
        USE_AIR=true
        echo -e "${GREEN}   Using 'air' for backend live reloading...${NC}"
        echo -e "${CYAN}   Config: $AIR_CONFIG${NC}"
    elif [ -n "$AIR_CONFIG" ]; then
        echo -e "${YELLOW}   Air config found ($AIR_CONFIG) but 'air' is not installed. Using 'go run'.${NC}"
    else
        echo -e "${YELLOW}   No air config found. Using 'go run'.${NC}"
    fi
else
    echo -e "${GREEN}   Using 'go run' for backend server...${NC}"
fi

if [ "$USE_AIR" = true ]; then
    air -c "$AIR_CONFIG" > ../logs/backend.log 2>&1 &
elif [ "$IS_WINDOWS" = true ]; then
    GO_BIN=$(which go)
    "$GO_BIN" run ./cmd/server > ../logs/backend.log 2>&1 &
else
    go run ./cmd/server > ../logs/backend.log 2>&1 &
fi
BACKEND_PID=$!
cd ..
sleep 15  # Go build can take a while

# Check if backend started (wait up to 45 seconds for build + startup)
BACKEND_RUNNING=false
for i in {1..30}; do
    if kill -0 $BACKEND_PID 2>/dev/null; then
        if curl -s http://localhost:$PORT/api/v1/healthz > /dev/null 2>&1; then
            BACKEND_RUNNING=true
            break
        fi
    else
        break
    fi
    sleep 1
done

if [ "$BACKEND_RUNNING" = false ]; then
    echo -e "${RED}Failed to start Backend${NC}"
    echo -e "${YELLOW}Last 20 lines of logs/backend.log:${NC}"
    tail -20 logs/backend.log 2>/dev/null || echo "(log file not found or empty)"
    exit 1
fi
echo -e "${GREEN}   Backend running on port $PORT (PID: $BACKEND_PID)${NC}"

# ============================================
# Start Frontend
# ============================================
echo -e "\n${YELLOW}[3/3] Starting Frontend...${NC}"
kill_on_port 4000
cd frontend || exit 1

npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 5

# Check if frontend started
FRONTEND_RUNNING=false
for i in {1..8}; do
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        if curl -s http://localhost:4000 > /dev/null 2>&1; then
            FRONTEND_RUNNING=true
            break
        fi
    else
        break
    fi
    sleep 1
done

if [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}   Frontend running on port 4000 (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}Frontend starting... (may take a moment)${NC}"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "============================================================"
echo -e "${GREEN}All services started!${NC}"
echo "============================================================"
echo ""
echo "Services:"
echo -e "  ${CYAN}ML Server:${NC}  http://localhost:$ML_PORT/health"
echo -e "  ${CYAN}Backend:${NC}    http://localhost:$PORT/api/v1/healthz"
echo -e "  ${CYAN}Frontend:${NC}   http://localhost:4000"
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo ""
echo "============================================================"
echo -e "${CYAN}Live Logs${NC}"
echo "============================================================"

# Start tail in background
tail -f logs/ml-server.log logs/backend.log logs/frontend.log &
TAIL_PID=$!

# Wait loop that responds to Ctrl+C
while kill -0 $TAIL_PID 2>/dev/null; do
    sleep 1
done
