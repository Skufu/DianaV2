# ML System Guide

## Overview

DIANA uses machine learning to predict Type 2 Diabetes risk in postmenopausal women using biomarker data from NHANES.

---

## Directory Structure
```text
Ian_ML/
├── service/                 # Flask serving layer
├── training/                # Training pipeline scripts
├── common/                  # Shared constants and schema
└── requirements.txt

models/
└── binary_v2_no_bp/         # Active screening artifacts, reports, plots
```

---

## Model Architecture

| Aspect | Details |
|--------|---------|
| **Dataset** | NHANES 2009-2023 (6 cycles, 1,376 postmenopausal women) |
| **Features** | 12 features: metabolic + engineered (no HbA1c/FBS for screening) |
| **Target** | Binary screening (Normal vs At‑Risk) |
| **Algorithms** | Logistic Regression, Random Forest |
| **Best Model** | Logistic Regression (AUC-ROC: ~0.72, binary_v2_no_bp) |
| **Clustering** | Weighted K-Means with K=4 (Ahlqvist diabetes subtypes with expert-elicited weights) |
| **Imputation** | Median/GroupKFold pipeline imputation (no SMOTE) |

> **Note on AUC**: The binary screening model achieves ~0.72 AUC (Logistic Regression), which is realistic for non‑circular prediction that excludes HbA1c/FBS. This is comparable to CDC diabetes risk calculators (AUC 0.72–0.79) and is intended for screening rather than diagnosis.

---

## Model Types

### 1. ADA Baseline Model
Uses all biomarkers including HbA1c (diagnostic criterion):
```python
REQUIRED_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
```

### 2. Screening Model (Non-Circular)
Uses non‑circular features, excluding HbA1c/FBS:
```python
SCREENING_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'bmi_category', 'tg_hdl_ratio', 'smoking_encoded', 'activity_encoded', 'alcohol_encoded', 'metabolic_syndrome_score', 'waist_circumference']
```

---

## Key Files

### `service/predict.py`
Contains serving-time predictor logic and model loading for screening and ADA contexts.

### `server.py`
 
Flask API with these endpoints:
 
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Single prediction |
| `/predict/batch` | POST | Multiple predictions |
| `/predict/explain` | POST | Prediction with SHAP explanation |
| `/insights/metrics` | GET | Model metrics (both ADA and clinical) |
| `/insights/clusters` | GET | Cluster analysis |
| `/insights/information-gain` | GET | Feature importance |
| `/insights/visualizations/<name>` | GET | PNG images |
| `/ab-tests` | GET/POST | A/B testing management |
| `/ab-tests/<test_id>` | GET/PATCH/DELETE | A/B test details and management |
| `/ab-tests/<test_id>/results` | GET | A/B test comparison |
| `/monitoring/drift` | GET | Drift monitoring status |
| `/monitoring/drift/check` | POST | Check for drift |
| `/monitoring/drift/reference` | POST | Set reference data for drift detection |
| `/monitoring/alerts` | GET | Drift alerts |
| `/monitoring/alerts/<timestamp>/acknowledge` | POST | Acknowledge alert |
| `/models` | GET | List model versions (MLflow) |
| `/model/info` | GET | Current model information |
| `/models/<name>/runs` | GET | List model runs |
| `/models/<name>/<version>/promote` | POST | Promote model to production |
| `/models/experiments` | GET | List MLflow experiments |

---

## Dual-Output Architecture

The system provides **two complementary outputs** that serve different clinical purposes:

### Output 1: Diabetes Probability (Continuous Risk Quantification)
- **Source**: Logistic Regression binary_v2_no_bp
- **Output**: 0-100% probability representing likelihood patient is At‑Risk (pre‑diabetic/diabetic)
- **Clinical Meaning**: Screening probability based on non‑circular metabolic features (no HbA1c/FBS)
- **Example**: 72% probability for a patient with elevated TG/low HDL → At‑Risk screening flag

### Output 2: Metabolic Subtype (Qualitative Phenotype Classification)
- **Source**: Weighted K-Means Clustering (K=4, per Ahlqvist et al. 2018 with expert-elicited feature weights)
- **Output**: SIRD-like, SIDD-like, MOD-like, or MARD-like cluster assignment
- **Clinical Meaning**: Based on full biomarker profile (metabolic phenotype pattern)
- **Runtime semantic note**: DIANA runtime uses an adapted SIDD meaning (atherogenic/lipid-driven) as documented in `../03-ml/assessment-contract.md`. The "-like" suffix emphasizes heuristic proxy status rather than validated subtype diagnosis.

### Why Both Outputs Are Complementary

| Aspect | Classifier | Clustering |
|--------|-----------|------------|
| **Primary Goal** | Predict current diabetes status | Identify metabolic phenotype |
| **Strength** | High discrimination for screening with non-circular features | Reveals subtype patterns |
| **Limitation** | Screening model is not diagnostic confirmation | No direct probability output |
| **Key Finding** | Classifier probability and subtype assignment can carry different but complementary clinical signals |
| **Clinical Value** | Detects metabolic risk patterns classifier would miss | Enables phenotype-specific treatment |

This dual-output architecture enables clinicians to understand:
1. **What is the diabetes likelihood?** (from classifier)
2. **What metabolic subtype pattern does this represent?** (from clustering)
3. **What treatment implications?** (subtype-specific per Ahlqvist framework)

---

## Training & Execution

> [!IMPORTANT]
> Modern systems (macOS/Linux) require a virtual environment. Run `scripts/dev/setup.sh` first to create it.

### Using Makefile (Recommended)
```bash
# Train all models
make ml-train

# Start ML server
make ml
```

### Manual execution (via venv)
```bash
# Full pipeline (recommended - processes data, imputes, trains, clusters)
source venv/bin/activate && ./scripts/dev/retrain-binary.sh

# Or run individual steps:
./venv/bin/python scripts/data/process_nhanes_multi.py
./venv/bin/python Ian_ML/training/data_processing.py
./venv/bin/python Ian_ML/training/train_binary_v2_no_bp.py
./venv/bin/python scripts/train/train_clusters.py

# Start ML server
./venv/bin/python Ian_ML/service/server.py
```

> **See**: `../03-ml/methodology.md` and `../03-ml/assessment-contract.md` for canonical methodology and runtime semantics.

---

## Cluster Definitions (Runtime-Aligned)

Based on Ahlqvist et al. diabetes subtype classification with DIANA NHANES results:

| Cluster | Full Name | n (%) | Key Biomarkers | Risk |
|---------|-----------|-------|----------------|------|
| **SIDD** | Atherogenic / Lipid-Driven Diabetes | 97 (7.1%) | High LDL / severe dyslipidemia pattern | High |
| **SIRD** | Severe Insulin-Resistant Diabetes | 404 (29.4%) | BMI=38.28, TG=114.68 | High |
| **MOD** | Mild Obesity-Related Diabetes | 370 (26.9%) | BMI=29.58, TG=176.37 | Moderate |
| **MARD** | Mild Age-Related Diabetes | 505 (36.7%) | BMI=25.74, HDL=72.98 | Low |

> If discussing the original paper taxonomy (e.g., SOIRD/MIDD variants), label it explicitly as paper-context naming and not runtime semantics.

---

## ML Infrastructure Features

### SHAP Explanations
```python
from Ian_ML.service.explainability import SHAPExplainer, format_for_clinician

explainer = SHAPExplainer(model, model_type="tree")
explanation = explainer.explain(features, feature_names)
```

### A/B Testing
```python
from Ian_ML.service.ab_testing import get_ab_manager

manager = get_ab_manager()
test = manager.create_test(
    test_name="xgboost-vs-catboost",
    baseline_version="v1.0",
    challenger_version="v1.1",
    traffic_split=0.1
)
```

### Drift Detection
```python
from Ian_ML.service.drift_detection import get_drift_monitor

monitor = get_drift_monitor()
report = monitor.check_feature_drift(current_data)
if report.has_drift:
    monitor.create_alert(report)
```

### MLflow Integration
```python
from Ian_ML.service.mlflow_config import get_mlflow_manager

manager = get_mlflow_manager()
versions = manager.get_model_versions("diana-clinical")
```

---

## Defense Points

1. **"Why is accuracy so high?"**
   > Clarify model context first. ADA baseline may show near-perfect behavior due to diagnostic-feature inclusion; non-circular screening performance is expected around AUC ~0.72.

2. **"Is this circular reasoning?"**
   > Not for the active screening model. The screening path explicitly excludes HbA1c/FBS and is intended for triage support, not diagnosis.

3. **"What's the clinical utility?"**
   > The system provides cluster-based risk stratification (SIRD/SIDD/MOD/MARD) beyond simple diagnosis, helping identify treatment-relevant subgroups.
