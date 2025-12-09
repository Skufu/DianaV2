#!/usr/bin/env bash
set -euo pipefail

# Runs backend (Go) and frontend (Vite) for local dev.
# Requirements: Postgres running and accessible via DB_DSN.

export DB_DSN="${DB_DSN:-postgres://diana:diana@localhost:5432/diana?sslmode=disable}"
export JWT_SECRET="${JWT_SECRET:-change-me}"
export PORT="${PORT:-8080}"
export VITE_API_BASE="${VITE_API_BASE:-http://localhost:8080}"

echo "Starting backend on port $PORT..."
go run ./cmd/server &
API_PID=$!

cleanup() {
  echo "Stopping backend (pid $API_PID)..."
  kill $API_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting frontend (Vite)..."
cd frontend
npm install
npm run dev

