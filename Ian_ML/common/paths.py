from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
ML_ROOT = REPO_ROOT / "Ian_ML"
MODELS_ROOT = REPO_ROOT / "models"
DATA_ROOT = REPO_ROOT / "data"
NHANES_PROCESSED_ROOT = DATA_ROOT / "nhanes" / "processed"

CLINICAL_MODELS_DIR = MODELS_ROOT / "clinical"
CLINICAL_V2_MODELS_DIR = MODELS_ROOT / "clinical_v2"
