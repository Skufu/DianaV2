from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
ML_ROOT = REPO_ROOT / "Ian_ML"
MODELS_ROOT = REPO_ROOT / "models"
DATA_ROOT = REPO_ROOT / "data"
NHANES_PROCESSED_ROOT = DATA_ROOT / "nhanes" / "processed"

# Production model directory (binary_v2_no_bp is the current production model)
BINARY_V2_NO_BP_MODELS_DIR = MODELS_ROOT / "binary_v2_no_bp"

# Legacy/Archived model directories - DO NOT USE in production
# These are kept for reference only. All production code should use binary_v2_no_bp.
CLINICAL_MODELS_DIR = MODELS_ROOT / "archived" / "clinical"  # DEPRECATED: Use BINARY_V2_NO_BP_MODELS_DIR
CLINICAL_3CLASS_MODELS_DIR = MODELS_ROOT / "archived" / "clinical_3class"  # DEPRECATED: Use BINARY_V2_NO_BP_MODELS_DIR
