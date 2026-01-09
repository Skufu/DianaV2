#!/bin/bash
# =============================================================================
# DIANA ML Pipeline - Full Retrain Script
# Runs all steps: process raw data → impute → train models
# 
# Usage: source venv/bin/activate (Mac/Linux) or source venv/Scripts/activate (Windows)
#        Then run: ./scripts/retrain-all.sh
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
echo -e "${BLUE}DIANA ML Pipeline - Full Retrain${NC}"
echo "============================================================"
echo ""

# Check if we're in the project root
if [ ! -d "data/nhanes/raw" ]; then
    echo -e "${RED}ERROR: Run this script from the project root directory${NC}"
    echo "  cd /path/to/DianaV2"
    echo "  ./scripts/retrain-all.sh"
    exit 1
fi

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
        echo "Please run ./scripts/setup.sh first."
        exit 1
    fi
fi

# =============================================================================
# STEP 0: Verify ML Dependencies
# =============================================================================
echo ""
echo -e "${CYAN}Step 0/6: Verifying ML dependencies...${NC}"
echo "------------------------------------------------------------"

MISSING_DEPS=""

# Check for LightGBM (|| true prevents set -e from exiting)
if python -c "import lightgbm" 2>/dev/null; then
    echo -e "${GREEN}  ✓ LightGBM available${NC}"
else
    echo -e "${YELLOW}  ⚠ LightGBM not installed${NC}"
    MISSING_DEPS="$MISSING_DEPS lightgbm"
fi

# Check for CatBoost
if python -c "import catboost" 2>/dev/null; then
    echo -e "${GREEN}  ✓ CatBoost available${NC}"
else
    echo -e "${YELLOW}  ⚠ CatBoost not installed${NC}"
    MISSING_DEPS="$MISSING_DEPS catboost"
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
echo -e "${BLUE}Step 1/6: Processing raw NHANES data...${NC}"
echo "------------------------------------------------------------"
python scripts/process_nhanes_multi.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data processing failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Raw data processing complete${NC}"

# Step 2: Run data cleaning/labeling
echo ""
echo -e "${BLUE}Step 2/6: Cleaning and labeling data...${NC}"
echo "------------------------------------------------------------"
python ml/data_processing.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data cleaning failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Data cleaning complete${NC}"

# Step 3: Impute missing values
echo ""
echo -e "${BLUE}Step 3/6: Imputing missing values...${NC}"
echo "------------------------------------------------------------"
python scripts/impute_missing_data.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Imputation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Imputation complete${NC}"

# Step 4: Train models
echo ""
echo -e "${BLUE}Step 4/6: Training ML models...${NC}"
echo "------------------------------------------------------------"
python ml/train.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Model training failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Model training complete${NC}"

# Step 5: Train clustering (K=4 Ahlqvist subtypes)
echo ""
echo -e "${BLUE}Step 5/6: Training K-Means clustering...${NC}"
echo "------------------------------------------------------------"
python scripts/train_clusters.py
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}WARNING: Clustering failed (non-critical)${NC}"
fi
echo -e "${GREEN}✓ Clustering complete${NC}"

# =============================================================================
# STEP 6: Validate Output & Report Actual Results
# =============================================================================
echo ""
echo -e "${CYAN}Step 6/6: Validating outputs...${NC}"
echo "------------------------------------------------------------"

# Check which models were actually created
echo ""
echo "Models created:"
MODELS_DIR="models/clinical"

if [ -f "$MODELS_DIR/logistic_regression.joblib" ]; then
    echo -e "  ${GREEN}✓ Logistic Regression${NC}"
else
    echo -e "  ${RED}✗ Logistic Regression${NC}"
fi

if [ -f "$MODELS_DIR/random_forest.joblib" ]; then
    echo -e "  ${GREEN}✓ Random Forest${NC}"
else
    echo -e "  ${RED}✗ Random Forest${NC}"
fi

if [ -f "$MODELS_DIR/xgboost.joblib" ]; then
    echo -e "  ${GREEN}✓ XGBoost${NC}"
else
    echo -e "  ${RED}✗ XGBoost${NC}"
fi

if [ -f "$MODELS_DIR/catboost.joblib" ]; then
    echo -e "  ${GREEN}✓ CatBoost${NC}"
else
    echo -e "  ${YELLOW}✗ CatBoost (not trained)${NC}"
fi

if [ -f "$MODELS_DIR/lightgbm.joblib" ]; then
    echo -e "  ${GREEN}✓ LightGBM${NC}"
else
    echo -e "  ${YELLOW}✗ LightGBM (not trained)${NC}"
fi

if [ -f "$MODELS_DIR/voting_ensemble.joblib" ]; then
    echo -e "  ${GREEN}✓ Voting Ensemble${NC}"
else
    echo -e "  ${YELLOW}✗ Voting Ensemble (not trained)${NC}"
fi

if [ -f "$MODELS_DIR/stacking_ensemble.joblib" ]; then
    echo -e "  ${GREEN}✓ Stacking Ensemble${NC}"
else
    echo -e "  ${YELLOW}✗ Stacking Ensemble (not trained)${NC}"
fi

# Extract and display actual metrics from best_model_report.json
echo ""
REPORT_FILE="$MODELS_DIR/results/best_model_report.json"
if [ -f "$REPORT_FILE" ]; then
    echo "Actual Results (from best_model_report.json):"
    
    BEST_MODEL=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['best_model'])" 2>/dev/null || echo "Unknown")
    AUC_ROC=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['metrics']['auc_roc'])" 2>/dev/null || echo "0.0")
    THRESHOLD_MET=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['auc_threshold_met'])" 2>/dev/null || echo "False")
    SMOTE=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['smote_applied'])" 2>/dev/null || echo "False")
    OVERFIT=$(python -c "import json; print(json.load(open('$REPORT_FILE'))['metrics']['overfit_gap'])" 2>/dev/null || echo "0.0")
    
    echo -e "  Best Model:     ${CYAN}$BEST_MODEL${NC}"
    echo -e "  AUC-ROC:        ${CYAN}$AUC_ROC${NC}"
    echo -e "  SMOTE Applied:  $SMOTE"
    echo -e "  Overfit Gap:    $OVERFIT"
    
    if [ "$THRESHOLD_MET" = "True" ]; then
        echo -e "  ${GREEN}✓ AUC threshold (0.70) MET${NC}"
    else
        echo -e "  ${RED}✗ AUC threshold (0.70) NOT MET${NC}"
    fi
else
    echo -e "${YELLOW}WARNING: Could not find best_model_report.json${NC}"
fi

# Summary
echo ""
echo "============================================================"
echo -e "${GREEN}DIANA ML Pipeline Complete!${NC}"
echo "============================================================"
echo ""
echo "Outputs:"
echo "  - Processed data:  data/nhanes/processed/diana_training_data_multi.csv"
echo "  - Final dataset:   data/nhanes/processed/diana_dataset_imputed.csv"
echo "  - Models:          models/clinical/*.joblib"
echo "  - Visualizations:  models/clinical/visualizations/"
echo "  - Results:         models/clinical/results/"
echo ""
echo -e "${YELLOW}IMPORTANT: Check the actual results above before updating documentation!${NC}"
echo ""
