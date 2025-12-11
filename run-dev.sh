#!/usr/bin/env bash
set -euo pipefail

# Runs backend (Go) and frontend (Vite) for local dev in one command.
# Optional: set ENV_FILE=.env to load your Neon DSN and other vars.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
go run ./cmd/server &
API_PID=$!

cleanup() {
  echo "Stopping backend (pid $API_PID)..."
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting frontend (Vite)..."
cd "$ROOT_DIR/frontend"
npm install
npm run dev