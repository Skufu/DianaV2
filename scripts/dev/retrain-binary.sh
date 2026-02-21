#!/bin/bash
# =============================================================================
# DIANA ML Pipeline - Binary Retrain Script
# Runs all steps: process raw data → label → train binary_v2_no_bp model (At-Risk vs Normal)
#
# Usage: source venv/bin/activate (Mac/Linux) or source venv/Scripts/activate (Windows)
#        Then run: ./scripts/dev/retrain-binary_v2_no_bp.sh
# =============================================================================

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "============================================================"
echo -e "${BLUE}DIANA ML Pipeline - Binary Retrain (At-Risk vs Normal)${NC}"
echo "============================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if command -v git >/dev/null 2>&1 && git -C "$SCRIPT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
    PROJECT_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
else
    PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi
cd "$PROJECT_DIR"

# Check if we're in the project root
if [ ! -d "data/nhanes/raw" ]; then
    echo -e "${RED}ERROR: Run this script from the project root directory${NC}"
    echo "  cd /path/to/DianaV2"
    echo "  ./scripts/dev/retrain-binary_v2_no_bp.sh"
    exit 1
fi

# Set PYTHONPATH to include project root (needed for Ian_ML imports)
export PYTHONPATH="${PROJECT_DIR}:${PYTHONPATH}"

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}WARNING: Virtual environment not activated${NC}"
    echo "Activating venv..."
    if [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    else
        echo -e "${RED}ERROR: Could not find virtual environment activation script${NC}"
        echo "Please run ./scripts/dev/setup.sh first."
        exit 1
    fi
fi

# =============================================================================
# STEP 0: Verify ML Dependencies
# =============================================================================
echo ""
echo -e "${CYAN}Step 0/5: Verifying ML dependencies...${NC}"
echo "------------------------------------------------------------"

MISSING_DEPS=""

# Check for LightGBM (|| true prevents set -e from exiting)
if python -c "import lightgbm" 2>/dev/null; then
    echo -e "${GREEN}  ✓ LightGBM available${NC}"
else
    echo -e "${YELLOW}  ⚠ LightGBM not installed${NC}"
    MISSING_DEPS="$MISSING_DEPS lightgbm"
fi

# Check for imbalanced-learn (SMOTE)
if python -c "import imblearn" 2>/dev/null; then
    echo -e "${GREEN}  ✓ imbalanced-learn (SMOTE) available${NC}"
else
    echo -e "${YELLOW}  ⚠ imbalanced-learn (SMOTE) not installed${NC}"
    MISSING_DEPS="$MISSING_DEPS imbalanced-learn"
fi

# Check for SHAP
if python -c "import shap" 2>/dev/null; then
    echo -e "${GREEN}  ✓ SHAP available${NC}"
else
    echo -e "${YELLOW}  ⚠ SHAP not installed (explainability disabled)${NC}"
fi

# Install missing dependencies
if [ -n "$MISSING_DEPS" ]; then
    echo ""
    echo -e "${YELLOW}Installing missing dependencies:${MISSING_DEPS}${NC}"
    pip install $MISSING_DEPS --quiet || echo -e "${RED}WARNING: Some dependencies failed to install.${NC}"
    echo -e "${GREEN}✓ Dependency check complete${NC}"
fi

# Step 1: Process raw NHANES data
echo ""
echo -e "${BLUE}Step 1/5: Processing raw NHANES data...${NC}"
echo "------------------------------------------------------------"
python scripts/data/process_nhanes_multi.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data processing failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Raw data processing complete${NC}"

# Step 2: Run data cleaning/labeling
echo ""
echo -e "${BLUE}Step 2/5: Cleaning and labeling data...${NC}"
echo "------------------------------------------------------------"
python Ian_ML/training/data_processing.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data cleaning failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Data cleaning complete${NC}"

# Step 3: SKIP pre-imputation (handled inside CV pipeline for leakage-safe evaluation)
echo ""
echo -e "${YELLOW}Step 3/5: Skipping pre-imputation (leakage-safe pipeline handles this)${NC}"
echo "------------------------------------------------------------"
echo "  Pre-imputation SKIPPED - SimpleImputer in CV pipeline prevents leakage"
echo "  See: train_binary_v2_no_bp.py uses diana_dataset_final.csv (not pre-imputed)"
echo -e "${GREEN}✓ Proceeding with leakage-safe imputation${NC}"

# Step 4: Train binary_v2_no_bp model (At-Risk vs Normal with nested CV)
echo ""
echo -e "${BLUE}Step 4/5: Training Binary ML model (At-Risk vs Normal)...${NC}"
echo "------------------------------------------------------------"
python Ian_ML/training/train_binary_v2_no_bp.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Binary model training failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Binary model training complete${NC}"

# =============================================================================
# STEP 5: Validate Output & Report Actual Results
# =============================================================================
echo ""
echo -e "${CYAN}Step 5/5: Validating outputs...${NC}"
echo "------------------------------------------------------------"

# Check which models were actually created
echo ""
echo "Models created:"
MODELS_DIR="models/binary_v2_no_bp"

if [ -f "$MODELS_DIR/best_model.joblib" ]; then
    echo -e "  ${GREEN}✓ Best Model (Pipeline)${NC}"
else
    echo -e "  ${RED}✗ Best Model${NC}"
fi

if [ -f "$MODELS_DIR/kmeans_model.joblib" ]; then
    echo -e "  ${GREEN}✓ K-Means Clustering${NC}"
else
    echo -e "  ${RED}✗ K-Means Clustering${NC}"
fi

if [ -f "$MODELS_DIR/cluster_scaler.joblib" ]; then
    echo -e "  ${GREEN}✓ Cluster Scaler${NC}"
else
    echo -e "  ${RED}✗ Cluster Scaler${NC}"
fi

if [ -f "$MODELS_DIR/cluster_labels.json" ]; then
    echo -e "  ${GREEN}✓ Cluster Labels${NC}"
else
    echo -e "  ${RED}✗ Cluster Labels${NC}"
fi

if [ -f "$MODELS_DIR/features.json" ]; then
    echo -e "  ${GREEN}✓ Feature Manifest${NC}"
else
    echo -e "  ${RED}✗ Feature Manifest${NC}"
fi

# Extract and display actual metrics from best_model_report.json
echo ""
REPORT_FILE="$MODELS_DIR/results/best_model_report.json"
if [ -f "$REPORT_FILE" ]; then
    echo "Actual Results (from best_model_report.json):"
    
    BEST_MODEL=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['best_model'])" 2>/dev/null || echo "Unknown")
    AUC_ROC=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['metrics']['auc_roc'])" 2>/dev/null || echo "0.0")
    SENSITIVITY=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['metrics']['sensitivity'])" 2>/dev/null || echo "0.0")
    SPECIFICITY=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['metrics']['specificity'])" 2>/dev/null || echo "0.0")
    NPV=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['metrics']['npv'])" 2>/dev/null || echo "0.0")
    THRESHOLD=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['metrics']['mean_threshold'])" 2>/dev/null || echo "0.5")
    
    echo -e "  Best Model:    ${CYAN}$BEST_MODEL${NC}"
    echo -e "  AUC-ROC:       ${CYAN}$AUC_ROC${NC}"
    echo -e "  Sensitivity:   ${CYAN}$SENSITIVITY${NC}"
    echo -e "  Specificity:   ${CYAN}$SPECIFICITY${NC}"
    echo -e "  NPV:           ${CYAN}$NPV${NC}"
    echo -e "  Threshold:     ${CYAN}$THRESHOLD${NC}"
    
    # Check if AUC >= 0.70 (minimum acceptable for binary_v2_no_bp)
    AUC_CHECK=$(python -c "import json; auc=json.load(open('$REPORT_FILE'))['metrics']['auc_roc']; print('PASS' if auc >= 0.70 else 'FAIL')" 2>/dev/null || echo "FAIL")
    if [ "$AUC_CHECK" = "PASS" ]; then
        echo -e "  ${GREEN}✓ AUC above minimum threshold (0.70)${NC}"
    else
        echo -e "  ${RED}✗ AUC below minimum threshold (0.70)${NC}"
    fi
    
    # Check if Sensitivity >= 0.70 (minimum acceptable for screening)
    SENS_CHECK=$(python -c "import json; sens=json.load(open('$REPORT_FILE'))['metrics']['sensitivity']; print('PASS' if sens >= 0.70 else 'FAIL')" 2>/dev/null || echo "FAIL")
    if [ "$SENS_CHECK" = "PASS" ]; then
        echo -e "  ${GREEN}✓ Sensitivity above minimum threshold (0.70)${NC}"
    else
        echo -e "  ${RED}✗ Sensitivity below minimum threshold (0.70)${NC}"
    fi
else
    echo -e "${YELLOW}WARNING: Could not find best_model_report.json${NC}"
fi

# Summary
echo ""
echo "============================================================"
echo -e "${GREEN}DIANA Binary ML Pipeline Complete!${NC}"
echo "============================================================"
echo ""
echo "Outputs:"
echo "  - Processed data:  data/nhanes/processed/diana_training_data_multi.csv"
echo "  - Final dataset:   data/nhanes/processed/diana_dataset_final.csv (leakage-safe)"
echo "  - Binary Models:   models/binary_v2_no_bp/*.joblib"
echo "  - Visualizations:  models/binary_v2_no_bp/visualizations/"
echo "  - Results:         models/binary_v2_no_bp/results/"
echo ""
echo -e "${YELLOW}IMPORTANT: Check the actual results above before updating documentation!${NC}"
echo ""
