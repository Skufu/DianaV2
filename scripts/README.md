# Scripts Directory - Development & Data Processing Utilities

> **Purpose**: Organized collection of shell scripts and Python utilities for development, data processing, ML training, evaluation, and thesis reporting
> **Structure**: Categorized by function into subdirectories

---

## Directory Structure

```
scripts/
├── dev/                  # Development & deployment scripts
├── data/                 # Data download & processing
├── train/                # Model training
├── eval/                 # Evaluation & analysis
├── thesis/               # Thesis/reporting scripts
├── util/                 # Utility scripts
└── legacy/               # Deprecated/unused scripts
```

---

## Quick Search Index

| Task | Category | Script |
|------|----------|---------|
| **Project Setup** | dev | `setup.sh` |
| **Start Development** | dev | `run-dev.sh` |
| **Start All Services** | dev | `start-all.sh` |
| **Retrain ML Models** | dev | `retrain-all.sh` |
| **Download NHANES Data** | data | `download_nhanes_multi.py` |
| **Process NHANES Data** | data | `process_nhanes_multi.py` |
| **Impute Missing Data** | data | `impute_missing_data.py` |
| **Train Clustering** | train | `train_clusters.py` |
| **Ablation Study** | eval | `ablation_study.py`, `weighting_ablation.py` |
| **Feature Selection** | eval | `feature_selection.py` |
| **Model Evaluation** | eval | `evaluate_clusters.py`, `calculate_metrics.py` |
| **Confidence Intervals** | eval | `calculate_confidence_intervals.py` |
| **Per-Class Metrics** | eval | `calculate_per_class_metrics.py` |
| **Generate Thesis Output** | thesis | `generate_thesis_outputs.py` |
| **Executive Summary** | thesis | `generate_executive_summary.py` |
| **Clinical Vignettes** | thesis | `generate_vignettes.py` |
| **Limitations Section** | thesis | `generate_limitations.py` |
| **Comparison Table** | thesis | `generate_comparison_table.py` |
| **Verify Manuscript** | thesis | `verify_manuscript.py` |
| **Debug Data Issues** | util | `debug_data.py` |

---

## Development Scripts (`dev/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup.sh` | Install dependencies, create .env, run migrations | `bash scripts/dev/setup.sh` |
| `setup-local-postgres.sh` | Local PostgreSQL setup (Mac) with dummy data | `bash scripts/dev/setup-local-postgres.sh` |
| `run-dev.sh` | Start backend + frontend dev servers | `bash scripts/dev/run-dev.sh` |
| `start-all.sh` | Start backend + frontend + ML server | `bash scripts/dev/start-all.sh` |
| `start-ml.sh` | Train models then start ML server | `bash scripts/dev/start-ml.sh` |
| `start-ml-server.sh` | Start ML server only (no training) | `bash scripts/dev/start-ml-server.sh` |
| `retrain-all.sh` | Full ML pipeline retrain (process → impute → train) | `bash scripts/dev/retrain-all.sh` |
| `test-db.sh` | Test PostgreSQL connection | `bash scripts/dev/test-db.sh` |

---

## Data Scripts (`data/`)

### Data Download
| Script | Purpose | Output |
|--------|---------|--------|
| `download_nhanes_multi.py` | Download multiple NHANES cycles | `data/nhanes/*.XPT` |
| `download_lifestyle_data.py` | Download lifestyle factors (SMQ, ALQ, PAQ) | `data/nhanes/*_*.XPT` |
| `check_raw_datasets.py` | Verify and count records in raw NHANES files | Console report |

### Data Processing
| Script | Purpose | Output |
|--------|---------|--------|
| `process_nhanes_multi.py` | Merge all cycles + lifestyle features | `data/nhanes/processed/diana_dataset_final.csv` |
| `impute_missing_data.py` | Fill missing values (KNN for continuous, mode for categorical) | `data/nhanes/processed/diana_dataset_imputed.csv` |

---

## Training Scripts (`train/`)

| Script | Purpose | Output |
|--------|---------|--------|
| `train_clusters.py` | Train K-Means clustering (K=4 Ahlqvist subtypes) | `models/clinical/kmeans_model.joblib` |

---

## Evaluation Scripts (`eval/`)

### Ablation Studies
| Script | Purpose | Output |
|--------|---------|--------|
| `ablation_study.py` | Compare classifier vs clustering vs combined approaches | Ablation metrics report |
| `weighting_ablation.py` | Test different weighting schemes for combined model | Weighting ablation report |

### Model Evaluation
| Script | Purpose | Output |
|--------|---------|--------|
| `evaluate_clusters.py` | Cluster quality metrics (silhouette scores) | Console metrics |
| `feature_selection.py` | Information Gain ranking for features | Feature importance scores |
| `calculate_metrics.py` | AUC with bootstrap CI logic | CI calculation template |

### Statistical Analysis
| Script | Purpose | Output |
|--------|---------|--------|
| `calculate_confidence_intervals.py` | 95% CI for all 7 models (Hanley-McNeil method) | `models/clinical/results/confidence_intervals.json` |
| `calculate_per_class_metrics.py` | Precision, Recall, F1, NPV for each class | `models/clinical/results/per_class_metrics.csv` |

---

## Thesis Scripts (`thesis/`)

| Script | Purpose | Output |
|--------|---------|--------|
| `generate_thesis_outputs.py` | Generate all thesis outputs at once | Multiple output files |
| `generate_executive_summary.py` | 1-page comprehensive thesis summary | `models/clinical/results/thesis_executive_summary.md` |
| `generate_vignettes.py` | Create 3 patient example scenarios | `models/clinical/results/clinical_vignettes.md` |
| `generate_limitations.py` | Document 5-6 key limitations with metrics | `models/clinical/results/limitations_summary.md` |
| `generate_comparison_table.py` | Comprehensive model comparison for thesis | `models/clinical/results/thesis_model_comparison.csv` |
| `verify_manuscript.py` | Extract exact numbers for manuscript | Console report |

---

## Utility Scripts (`util/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| `debug_data.py` | Debug data issues (e.g., missing 2021-2023 cycle) | `python scripts/util/debug_data.py` |

---

## Legacy Scripts (`legacy/`)

> **Note**: These scripts are deprecated or superseded by newer versions. Kept for reference only.

| Script | Status | Replacement |
|--------|--------|-------------|
| `download_nhanes.sh` | Deprecated (Python version exists) | `data/download_nhanes_multi.py` |
| `download_nhanes_py.py` | Superseded by multi-cycle version | `data/download_nhanes_multi.py` |
| `process_nhanes.py` | Superseded by multi-cycle version | `data/process_nhanes_multi.py` |
| `train_enhanced.py` | Superseded by `ml/train.py` | `ml/train.py` |
| `remove_bg.py` | Unrelated to DIANA (image utility) | N/A |

---

## Common Workflows

### First-Time Setup
```bash
bash scripts/dev/setup.sh
```

### Daily Development
```bash
bash scripts/dev/run-dev.sh
```

### Full Stack with ML
```bash
bash scripts/dev/start-all.sh
```

### Complete ML Pipeline Retrain
```bash
bash scripts/dev/retrain-all.sh
```

### Manual ML Pipeline Step-by-Step
```bash
# 1. Download data
python scripts/data/download_nhanes_multi.py
python scripts/data/download_lifestyle_data.py

# 2. Process data
python scripts/data/process_nhanes_multi.py

# 3. Clean and label
python ml/data_processing.py

# 4. Impute missing values
python scripts/data/impute_missing_data.py

# 5. Train classifiers
python ml/train.py

# 6. Train clustering
python scripts/train/train_clusters.py
```

### Evaluation & Analysis
```bash
# Feature importance
python scripts/eval/feature_selection.py

# Ablation studies
python scripts/eval/ablation_study.py
python scripts/eval/weighting_ablation.py

# Confidence intervals & per-class metrics
python scripts/eval/calculate_confidence_intervals.py
python scripts/eval/calculate_per_class_metrics.py
```

### Generate All Thesis Outputs
```bash
# Run individual scripts
python scripts/thesis/generate_executive_summary.py
python scripts/thesis/generate_vignettes.py
python scripts/thesis/generate_limitations.py
python scripts/thesis/generate_comparison_table.py

# Or run all at once
python scripts/thesis/generate_thesis_outputs.py

# Verify manuscript numbers
python scripts/thesis/verify_manuscript.py
```

---

## Key Functions

### `data/process_nhanes_multi.py`
```python
def load_and_merge_nhanes():
    """Load all NHANES XPT files and merge by SEQN."""

def create_diabetes_labels(df):
    """Add diabetes_status column using ADA HbA1c thresholds."""

def filter_postmenopausal(df):
    """Filter to women aged 45+."""

def derive_lifestyle_features(df):
    """Create smoking_status, physical_activity, alcohol_use."""
```

### `eval/feature_selection.py`
```python
def calculate_information_gain(X, y):
    """Rank features by Information Gain (mutual information)."""
```

### `train/train_clusters.py`
```python
def train_kmeans(X, n_clusters=4):
    """Train K-Means and assign Ahlqvist subtype labels."""
```

---

## Search Keywords

`setup` `development` `run` `start` `NHANES` `download` `process` `train` `model` `clustering` `K-Means` `feature selection` `Information Gain` `ablation` `weighting` `database` `test` `PostgreSQL` `shell` `bash` `Python` `thesis` `executive summary` `vignettes` `limitations` `manuscript` `confidence intervals` `per-class metrics`
