#!/usr/bin/env bash
set -euo pipefail

# Runs backend (Go) and frontend (Vite) for local dev in one command.
# Optional: set ENV_FILE=.env to load your Neon DSN and other vars.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

export DB_DSN="${DB_DSN:-postgres://diana:diana@localhost:5432/diana?sslmode=disable}"
export JWT_SECRET="${JWT_SECRET:-change-me}"
export PORT="${PORT:-8080}"
export VITE_API_BASE="${VITE_API_BASE:-http://localhost:8080}"

echo "Starting backend on port $PORT..."
cd "$ROOT_DIR/backend"
go run ./cmd/server &
API_PID=$!

echo "Starting ML server on port ${ML_PORT:-5001}..."
if [[ -f "$ROOT_DIR/venv/Scripts/activate" ]]; then
  source "$ROOT_DIR/venv/Scripts/activate"
elif [[ -f "$ROOT_DIR/venv/bin/activate" ]]; then
  source "$ROOT_DIR/venv/bin/activate"
fi

# Set python path to root so imports work
export PYTHONPATH="$ROOT_DIR"
python "$ROOT_DIR/ml/server.py" &
ML_PID=$!

cleanup() {
  echo "Stopping backend (pid $API_PID) and ML server (pid $ML_PID)..."
  kill "$API_PID" 2>/dev/null || true
  kill "$ML_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting frontend (Vite)..."
cd "$ROOT_DIR/frontend"
npm install
npm run dev