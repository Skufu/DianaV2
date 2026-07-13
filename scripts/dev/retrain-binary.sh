#!/bin/bash
# =============================================================================
# DIANA ML Pipeline - Binary Retrain Script
# Runs all steps: process raw data → label → train binary_v2_no_bp model (At-Risk vs Normal)
# → weighted K-Means clustering for descriptive metabolic profiles
#
# Usage: source venv/bin/activate (Mac/Linux) or source venv/Scripts/activate (Windows)
#        Then run: ./scripts/dev/retrain-binary.sh
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
    echo "  ./scripts/dev/retrain-binary.sh"
    exit 1
fi

# Set PYTHONPATH to include project root (needed for Ian_ML imports)
export PYTHONPATH="${PROJECT_DIR}:${PYTHONPATH}"

# An explicit output directory makes audit/retest runs non-promoting. When unset,
# the historical production path remains the default.
MODELS_DIR="${DIANA_MODEL_OUTPUT_DIR:-models/binary_v2_no_bp}"
export DIANA_MODEL_OUTPUT_DIR="$MODELS_DIR"

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
python scripts/data/process_nhanes_multi.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data processing failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Raw data processing complete${NC}"

# Step 2: Run data cleaning/labeling
echo ""
echo -e "${BLUE}Step 2/6: Cleaning and labeling data...${NC}"
echo "------------------------------------------------------------"
python Ian_ML/training/data_processing.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Data cleaning failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Data cleaning complete${NC}"

# Step 3: Validate features and check for data leakage
echo ""
echo -e "${BLUE}Step 3/6: Feature validation & leakage detection...${NC}"
echo "------------------------------------------------------------"
python Ian_ML/training/validate_no_leakage.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Leakage detected! Aborting training.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Feature validation passed (no leakage detected)${NC}"

# Step 4: Train binary_v2_no_bp model (At-Risk vs Normal with nested CV)
echo ""
echo -e "${BLUE}Step 4/6: Training Binary ML model (At-Risk vs Normal)...${NC}"
echo "------------------------------------------------------------"
python Ian_ML/training/train_binary_v2_no_bp.py
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Binary model training failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Binary model training complete${NC}"

# Step 5: Train the legacy-serving Weighted K-Means K=4 enrichment
echo ""
echo -e "${BLUE}Step 5/6: Training legacy-serving Weighted K-Means K=4 enrichment...${NC}"
echo "------------------------------------------------------------"
echo ""
echo -e "${CYAN}Researcher-Defined, Literature-Informed Feature Weights:${NC}"
echo "  bmi=1.5, triglycerides=2.0, ldl=2.5, hdl=1.2, age=1.0, waist_circumference=2.0"
echo "  Source: Systematic literature review (see docs/03-ml/rationale.md for citations)"
echo ""
python Ian_ML/training/clustering.py --k 4
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Weighted K-Means clustering failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Weighted K-Means clustering complete${NC}"

# =============================================================================
# STEP 6: Validate Output & Report Actual Results
# =============================================================================
echo ""
echo -e "${CYAN}Step 6/6: Validating outputs...${NC}"
echo "------------------------------------------------------------"

echo ""
echo "Classifier Artifacts:"

if [ -f "$MODELS_DIR/best_model.joblib" ]; then
    echo -e "  ${GREEN}✓ Best Model (Pipeline with embedded scaler)${NC}"
else
    echo -e "  ${RED}✗ Best Model${NC}"
fi

if [ -f "$MODELS_DIR/features.json" ]; then
    echo -e "  ${GREEN}✓ Feature Manifest${NC}"
else
    echo -e "  ${RED}✗ Feature Manifest${NC}"
fi

# Validate the artifact written by this exact run, including isolated audit
# directories. This proves BMI/waist medians belong to the saved training
# Pipeline rather than a later serving-only calculation.
python - "$MODELS_DIR" <<'PY'
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, REPO_ROOT
from Ian_ML.training.train_binary_v2_no_bp import engineer_features

models_dir = Path(sys.argv[1]).expanduser()
if not models_dir.is_absolute():
    models_dir = REPO_ROOT / models_dir

artifact = joblib.load(models_dir / "best_model.joblib")
if list(getattr(artifact, "named_steps", {}))[:2] != ["preprocessor", "model"]:
    raise SystemExit("Saved classifier is not the expected preprocessing-and-model Pipeline")

features = json.loads((models_dir / "features.json").read_text())["features"]
frame = engineer_features(
    pd.read_csv(NHANES_PROCESSED_ROOT / "diana_dataset_final.csv")
)
X = frame[features].to_numpy(dtype=float)
statistics = np.asarray(
    artifact.named_steps["preprocessor"]
    .named_transformers_["continuous"]
    .named_steps["imputer"]
    .statistics_,
    dtype=float,
)
for feature in ("bmi", "waist_circumference"):
    index = features.index(feature)
    expected = float(np.nanmedian(X[:, index]))
    learned = float(statistics[index])
    if not np.isclose(learned, expected):
        raise SystemExit(
            f"{feature} imputer mismatch: saved={learned}, training median={expected}"
        )

probe = X[:1].copy()
probe[0, features.index("waist_circumference")] = np.nan
if not np.isfinite(artifact.predict_proba(probe)).all():
    raise SystemExit("Saved Pipeline failed to impute a missing waist value")

print(
    "  Saved Pipeline imputer verified: "
    f"BMI={statistics[features.index('bmi')]:.2f}, "
    f"waist={statistics[features.index('waist_circumference')]:.2f}"
)
PY
echo -e "  ${GREEN}✓ Saved classifier owns training-fitted BMI/waist imputation${NC}"

echo ""
echo "Clustering Artifacts:"

if [ -f "$MODELS_DIR/weighted_kmeans_model.joblib" ]; then
    echo -e "  ${GREEN}✓ Weighted K-Means Model${NC}"
else
    echo -e "  ${RED}✗ Weighted K-Means Model${NC}"
fi

if [ -f "$MODELS_DIR/cluster_scaler.joblib" ]; then
    echo -e "  ${GREEN}✓ Cluster Scaler${NC}"
else
    echo -e "  ${RED}✗ Cluster Scaler${NC}"
fi

if [ -f "$MODELS_DIR/cluster_imputer.joblib" ]; then
    echo -e "  ${GREEN}✓ Cluster Imputer${NC}"
else
    echo -e "  ${RED}✗ Cluster Imputer${NC}"
fi

if [ -f "$MODELS_DIR/cluster_labels.json" ]; then
    echo -e "  ${GREEN}✓ Cluster Labels${NC}"
else
    echo -e "  ${RED}✗ Cluster Labels${NC}"
fi

if [ -f "$MODELS_DIR/feature_weights.json" ]; then
    echo -e "  ${GREEN}✓ Feature Weights${NC}"
else
    echo -e "  ${RED}✗ Feature Weights${NC}"
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
    THRESH_STRATEGY=$(python -c "import json; print(json.load(open('$REPORT_FILE')).get('threshold_policy', {}).get('strategy_mode', 'unknown'))" 2>/dev/null || echo "unknown")
    GUARDRAIL_FOLDS=$(python -c "import json; print(json.load(open('$REPORT_FILE')).get('threshold_policy', {}).get('guardrail_folds', '0'))" 2>/dev/null || echo "0")
    
    echo -e "  Best Model:    ${CYAN}$BEST_MODEL${NC}"
    echo -e "  AUC-ROC:       ${CYAN}$AUC_ROC${NC}"
    echo -e "  Sensitivity:   ${CYAN}$SENSITIVITY${NC}"
    echo -e "  Specificity:   ${CYAN}$SPECIFICITY${NC}"
    echo -e "  NPV:           ${CYAN}$NPV${NC}"
    echo -e "  Threshold:     ${CYAN}$THRESHOLD${NC}"
    echo -e "  Threshold mode:${CYAN}$THRESH_STRATEGY${NC}"
    echo -e "  Guardrail folds:${CYAN}$GUARDRAIL_FOLDS${NC}"
    
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

FOLD_METRICS_FILE="$MODELS_DIR/results/logo_fold_metrics.csv"
if [ -f "$FOLD_METRICS_FILE" ]; then
    echo ""
    echo "Threshold Policy Summary (per-fold):"
    python -c "import csv, collections; rows=list(csv.DictReader(open('$FOLD_METRICS_FILE', newline=''))); ctr=collections.Counter((r.get('Model','Unknown'), r.get('Threshold_Strategy','unknown')) for r in rows); [print(f'  {model}: {strategy} x{count}') for (model, strategy), count in sorted(ctr.items())]" 2>/dev/null || true
fi

# Optional, non-promoting minor-revision evidence. These scripts save tables and
# figures only; they never replace the classifier or serving K=4 artifacts.
if [ "${DIANA_RUN_EXPANDED_FEATURE_TEST:-0}" = "1" ]; then
    echo ""
    echo -e "${CYAN}Audit A: Expanded non-circular feature test (includes CRP/insulin/BP)...${NC}"
    EXPANDED_OUTPUT_DIR="${DIANA_EXPANDED_OUTPUT_DIR:-docs/07-research/model-experiments/expanded-non-circular}"
    python Ian_ML/training/explore_expanded_non_circular.py \
        --output-dir "$EXPANDED_OUTPUT_DIR"
    echo -e "${GREEN}✓ Expanded feature evidence complete (not promoted)${NC}"
fi

if [ "${DIANA_RUN_UNLABELED_CLUSTER_TEST:-0}" = "1" ]; then
    echo ""
    echo -e "${CYAN}Audit B: Anonymous broad-K centroid scan (no subtype labels)...${NC}"
    UNLABELED_OUTPUT_DIR="${DIANA_UNLABELED_OUTPUT_DIR:-docs/07-research/model-experiments/unlabeled-centroids}"
    python Ian_ML/training/explore_unlabeled_centroids.py \
        --output-dir "$UNLABELED_OUTPUT_DIR" \
        --stability-runs "${DIANA_CLUSTER_STABILITY_RUNS:-30}"
    echo -e "${GREEN}✓ Anonymous centroid evidence complete (not promoted)${NC}"
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
echo "  - Binary Models:   $MODELS_DIR/*.joblib"
echo "  - Clustering:      $MODELS_DIR/weighted_kmeans_model.joblib"
echo "  - Feature Weights: $MODELS_DIR/feature_weights.json"
echo "  - Visualizations:  $MODELS_DIR/visualizations/"
echo "  - Results:         $MODELS_DIR/results/"
echo ""
echo -e "${CYAN}Researcher-Defined, Literature-Informed Weights Used for Clustering:${NC}"
echo "  bmi=1.5, triglycerides=2.0, ldl=2.5, hdl=1.2, age=1.0, waist_circumference=2.0"
echo "  Source: Systematic literature review (Huang et al. 2023, Ahmed et al. 2021, Wei et al. 2024)"
echo ""
echo -e "${YELLOW}IMPORTANT: Check the actual results above before updating documentation!${NC}"
echo ""
