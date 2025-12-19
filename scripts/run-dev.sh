#!/usr/bin/env bash
set -euo pipefail

# Runs backend (Go) and frontend (Vite) for local dev in one command.
# Optional: set ENV_FILE=.env to load your Neon DSN and other vars.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

# Only set DB_DSN if not already set (allows running without database)
# Uncomment the line below if you want a default database connection
# export DB_DSN="${DB_DSN:-postgres://diana:diana@localhost:5432/diana?sslmode=disable}"
export JWT_SECRET="${JWT_SECRET:-change-me}"
export PORT="${PORT:-8082}"
export VITE_API_BASE="${VITE_API_BASE:-http://localhost:8082/api/v1}"

echo "🚀 Starting backend on port $PORT..."
if [[ -z "${DB_DSN:-}" ]]; then
  echo "⚠️  Note: DB_DSN not set; backend will run without database"
else
  echo "✅ Database configured: ${DB_DSN%%@*}@***"
fi

# Start backend in background, but don't fail script if it exits early
go run ./cmd/server &
API_PID=$!

# Give backend a moment to start and check if it's still running
echo "⏳ Waiting for backend to start..."
sleep 3

if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "❌ Warning: Backend process exited early. Check logs above for errors."
  echo "🔄 Continuing with frontend startup..."
else
  echo "✅ Backend started successfully"
  # Test health endpoint
  if command -v curl &> /dev/null; then
    if curl -s "http://localhost:$PORT/api/v1/healthz" > /dev/null; then
      echo "✅ Health check passed: http://localhost:$PORT/api/v1/healthz"
    else
      echo "⚠️  Health check failed, but continuing..."
    fi
  fi
fi

cleanup() {
  echo "Stopping backend (pid $API_PID)..."
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "🌐 Starting frontend (Vite)..."
echo "   Frontend will be available at:"
echo "   • http://localhost:3000 (or next available port)"
echo "   • Backend API: http://localhost:$PORT/api/v1"
echo ""
cd "$ROOT_DIR/frontend"
npm install
npm run dev