#!/usr/bin/env bash
set -euo pipefail

# This script sets up and runs the frontend in dev mode.
# Usage:
#   ./command.sh dev            # run dev server
#   ./command.sh build          # build production bundle
# Env:
#   VITE_API_BASE (optional)    # API base URL, defaults to http://localhost:8080

CMD="${1:-dev}"
export VITE_API_BASE="${VITE_API_BASE:-http://localhost:8080}"

case "$CMD" in
  dev)
    npm install
    npm run dev
    ;;
  build)
    npm install
    npm run build
    ;;
  *)
    echo "Unknown command: $CMD"
    echo "Usage: $0 [dev|build]"
    exit 1
    ;;
esac

