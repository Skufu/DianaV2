#!/bin/bash
# Start the DIANA ML Server
# This runs the Flask API that the Go backend calls for predictions

cd "$(dirname "$0")/.."

echo "Starting DIANA ML Server..."
echo "================================"
echo "Port: ${ML_PORT:-5000}"
echo "Health: http://localhost:${ML_PORT:-5000}/health"
echo "Predict: http://localhost:${ML_PORT:-5000}/predict"
echo "================================"
echo ""
echo "To connect Go backend, set: MODEL_URL=http://localhost:${ML_PORT:-5000}/predict"
echo ""

# Detect Python
if [ -d "venv" ]; then
  PYTHON="venv/bin/python"
elif [ -d "../venv" ]; then
  PYTHON="../venv/bin/python"
elif command -v python3 &> /dev/null; then
  PYTHON=python3
elif command -v python &> /dev/null; then
  PYTHON=python
else
  echo "Error: Python not found."
  exit 1
fi

$PYTHON scripts/ml_server.py
