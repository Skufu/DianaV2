# Scripts Directory - Development & Data Processing Utilities

> **Purpose**: Shell scripts and Python utilities for development, data processing, and ML training  
> **Contents**: 18 files (shell scripts + Python scripts)

---

## Quick Search Index

| Task | Script |
|------|--------|
| Initial Setup | `setup.sh` |
| Start Dev Servers | `run-dev.sh`, `start-all.sh` |
| Start ML Server | `start-ml-server.sh`, `start-ml.sh` |
| Download NHANES | `download_nhanes.sh`, `download_nhanes_multi.py` |
| Process NHANES | `process_nhanes.py`, `process_nhanes_multi.py` |
| Train Models | `train_enhanced.py`, `train_clusters.py` |
| Feature Analysis | `feature_selection.py` |
| Database Debug | `test-db.sh`, `debug-neon.sh` |

---

## Directory Structure

```
scripts/
├── Shell Scripts (Development)
│   ├── setup.sh              # First-time project setup
│   ├── run-dev.sh            # Start frontend + backend
│   ├── start-all.sh          # Start all services (backend + frontend + ML)
│   ├── start-ml.sh           # Train models + start ML server
│   ├── start-ml-server.sh    # Start ML server only
│   ├── test-db.sh            # Test database connection
│   └── debug-neon.sh         # Debug Neon cloud database
│
├── Python Scripts (Data & ML)
│   ├── download_nhanes.sh    # Download NHANES data (shell)
│   ├── download_nhanes_py.py # Download NHANES data (Python)
│   ├── download_nhanes_multi.py   # Multi-cycle NHANES download
│   ├── download_lifestyle_data.py # Download lifestyle factors
│   ├── process_nhanes.py     # Process single NHANES cycle
│   ├── process_nhanes_multi.py    # Process multiple cycles
│   ├── train_enhanced.py     # Enhanced model training
│   ├── train_clusters.py     # K-Means cluster training
│   ├── feature_selection.py  # Information Gain analysis
│   └── evaluate_clusters.py  # Cluster quality evaluation
│
└── models/                   # Temporary model output (if any)
```

---

## Shell Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup.sh` | Install deps, create .env, run migrations | `bash scripts/setup.sh` |
| `run-dev.sh` | Start backend + frontend dev servers | `bash scripts/run-dev.sh` |
| `start-all.sh` | Start backend + frontend + ML server | `bash scripts/start-all.sh` |
| `start-ml.sh` | Train models then start ML server | `bash scripts/start-ml.sh` |
| `start-ml-server.sh` | Start ML server only (no training) | `bash scripts/start-ml-server.sh` |
| `test-db.sh` | Test PostgreSQL connection | `bash scripts/test-db.sh` |
| `debug-neon.sh` | Debug Neon cloud DB connectivity | `bash scripts/debug-neon.sh` |
| `download_nhanes.sh` | Download NHANES XPT files | `bash scripts/download_nhanes.sh` |

---

## Python Scripts Reference

### Data Download
| Script | Purpose | Output |
|--------|---------|--------|
| `download_nhanes_py.py` | Download single NHANES cycle | `data/nhanes/*.XPT` |
| `download_nhanes_multi.py` | Download multiple cycles | `data/nhanes/*.XPT` |
| `download_lifestyle_data.py` | Download SMQ, ALQ, PAQ files | `data/nhanes/*_*.XPT` |

### Data Processing
| Script | Purpose | Output |
|--------|---------|--------|
| `process_nhanes.py` | Process single cycle → CSV | `data/nhanes/processed_data.csv` |
| `process_nhanes_multi.py` | Merge all cycles + lifestyle | `data/nhanes/processed_nhanes_data.csv` |

### Model Training
| Script | Purpose | Output |
|--------|---------|--------|
| `train_enhanced.py` | Train RF, XGB, LR classifiers | `models/*.joblib` |
| `train_clusters.py` | Train K-Means clustering | `models/kmeans_model.joblib` |

### Analysis
| Script | Purpose | Output |
|--------|---------|--------|
| `feature_selection.py` | Information Gain ranking | Feature importance scores |
| `evaluate_clusters.py` | Cluster quality metrics | Silhouette scores |

---

## Key Functions

### `process_nhanes_multi.py`
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

### `train_enhanced.py`
```python
def train_classifiers(X, y):
    """Train RF, XGB, LR with cross-validation."""
    
def save_best_model(models, X_test, y_test):
    """Select and save best performing model."""
```

### `feature_selection.py`
```python
def calculate_information_gain(X, y):
    """Rank features by Information Gain (mutual information)."""
```

---

## Common Workflows

### First-Time Setup
```bash
bash scripts/setup.sh
```

### Daily Development
```bash
bash scripts/run-dev.sh
```

### Full Stack with ML
```bash
bash scripts/start-all.sh
```

### Retrain Models
```bash
python scripts/download_nhanes_multi.py
python scripts/process_nhanes_multi.py
python scripts/train_enhanced.py
python scripts/train_clusters.py
```

---

## Search Keywords

`setup` `development` `run` `start` `NHANES` `download` `process` `train` `model` `clustering` `K-Means` `feature selection` `Information Gain` `database` `test` `debug` `Neon` `PostgreSQL` `shell` `bash` `Python`
