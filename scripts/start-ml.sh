#!/bin/bash
# DIANA ML Pipeline - Complete Setup & Run Script
# This script handles everything: dependencies, training, and server startup

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "============================================================"
echo "DIANA ML Pipeline - All-in-One Setup"
echo "============================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python
echo -e "\n${YELLOW}[1/6] Checking Python...${NC}"
if [ -d "venv" ]; then
    PYTHON="venv/bin/python"
    echo -e "${GREEN}   Using virtual environment (venv)${NC}"
elif [ -d "../venv" ]; then
    PYTHON="../venv/bin/python"
    echo -e "${GREEN}   Using virtual environment (venv)${NC}"
elif command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo -e "${RED}   ERROR: Python not found. Please install Python 3.10+${NC}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON --version 2>&1)
echo "   Found: $PYTHON_VERSION"

# Check Pip
if [[ "$PYTHON" == *"venv"* ]]; then
    PIP="$(dirname "$PYTHON")/pip"
elif command -v pip3 &> /dev/null; then
    PIP=pip3
elif command -v pip &> /dev/null; then
    PIP=pip
else
    # Try as python module if standalone not found
    if $PYTHON -m pip --version &> /dev/null; then
        PIP="$PYTHON -m pip"
    else
        echo -e "${RED}   ERROR: pip not found.${NC}"
        exit 1
    fi
fi

# Install dependencies
echo -e "\n${YELLOW}[2/6] Installing ML dependencies...${NC}"
$PIP install -q pandas pyreadstat scikit-learn numpy matplotlib joblib xgboost flask flask-cors seaborn
echo "   Dependencies installed"

# Check if data needs to be downloaded
echo -e "\n${YELLOW}[3/6] Checking NHANES data...${NC}"
if [ -f "data/nhanes/processed/diana_dataset_final.csv" ]; then
    RECORD_COUNT=$(wc -l < "data/nhanes/processed/diana_dataset_final.csv")
    echo "   Dataset exists: $RECORD_COUNT records"
else
    echo "   Dataset not found. Running full pipeline..."
    
    echo "   Downloading NHANES data..."
    $PYTHON scripts/download_nhanes_multi.py
    
    echo "   Processing data..."
    $PYTHON scripts/process_nhanes_multi.py
    
    echo "   Preparing final dataset..."
    $PYTHON scripts/prepare_dataset.py
fi

# Check if models need training
echo -e "\n${YELLOW}[4/6] Checking models...${NC}"
if [ -f "models/best_model.joblib" ] && [ -f "models/results/model_comparison.csv" ]; then
    echo "   Models already trained"
else
    echo "   Training models..."
    
    echo "   Feature selection..."
    $PYTHON scripts/feature_selection.py
    
    echo "   Training classifiers..."
    $PYTHON scripts/train_models.py
    
    echo "   Clustering..."
    $PYTHON scripts/clustering.py
fi

# Verify everything is ready
echo -e "\n${YELLOW}[5/6] Verification...${NC}"
$PYTHON -c "
from pathlib import Path
import json

models = ['scaler.joblib', 'best_model.joblib', 'kmeans_model.joblib']
results = ['model_comparison.csv', 'information_gain_results.json', 'cluster_analysis.json']

all_ok = True
for m in models:
    if not (Path('models') / m).exists():
        print(f'   MISSING: {m}')
        all_ok = False
for r in results:
    if not (Path('models/results') / r).exists():
        print(f'   MISSING: {r}')
        all_ok = False

if all_ok:
    with open('models/results/best_model_report.json') as f:
        report = json.load(f)
    print(f'   Best Model: {report[\"best_model\"]}')
    print(f'   AUC-ROC: {report[\"metrics\"][\"auc_roc\"]}')
    print('   All checks PASSED')
"

# Start ML server
echo -e "\n${YELLOW}[6/6] Starting ML Server...${NC}"
echo "============================================================"
echo -e "${GREEN}DIANA ML Server starting on port ${ML_PORT:-5000}${NC}"
echo "============================================================"
echo ""
echo "API Endpoints:"
echo "   Health:  http://localhost:${ML_PORT:-5000}/health"
echo "   Predict: http://localhost:${ML_PORT:-5000}/predict"
echo "   Info:    http://localhost:${ML_PORT:-5000}/model/info"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

$PYTHON scripts/ml_server.py
