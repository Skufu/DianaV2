#!/bin/bash
# =============================================================================
# DIANA ML Pipeline - Full Retrain Script
# Runs all steps: process raw data → impute → train models
# 
# Usage: source venv/bin/activate (Mac/Linux) or source venv/Scripts/activate (Windows)
#        Then run: ./scripts/retrain_all.sh
# =============================================================================

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Step 1: Process raw NHANES data
echo ""
echo -e "${BLUE}Step 1/5: Processing raw NHANES data...${NC}"
echo "------------------------------------------------------------"
python scripts/process_nhanes_multi.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data processing failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Raw data processing complete${NC}"

# Step 2: Run data cleaning/labeling
echo ""
echo -e "${BLUE}Step 2/5: Cleaning and labeling data...${NC}"
echo "------------------------------------------------------------"
python ml/data_processing.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data cleaning failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Data cleaning complete${NC}"

# Step 3: Impute missing values
echo ""
echo -e "${BLUE}Step 3/5: Imputing missing values...${NC}"
echo "------------------------------------------------------------"
python scripts/impute_missing_data.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Imputation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Imputation complete${NC}"

# Step 4: Train models
echo ""
echo -e "${BLUE}Step 4/5: Training ML models...${NC}"
echo "------------------------------------------------------------"
python ml/train.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Model training failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Model training complete${NC}"

# Step 5: Train clustering (K=4 Ahlqvist subtypes)
echo ""
echo -e "${BLUE}Step 5/5: Training K-Means clustering...${NC}"
echo "------------------------------------------------------------"
python scripts/train_clusters.py
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}WARNING: Clustering failed (non-critical)${NC}"
fi
echo -e "${GREEN}✓ Clustering complete${NC}"

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
