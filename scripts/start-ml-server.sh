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

python scripts/ml_server.py
