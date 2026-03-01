# ML System Guide

## Overview

DIANA uses machine learning to predict Type 2 Diabetes risk in postmenopausal women using biomarker data from NHANES.

---

## Directory Structure

```
Ian_ML/
├── server.py             # Flask API server
├── predict.py            # DianaPredictor, ClinicalPredictor classes
├── train.py              # Model training
├── clustering.py         # K-Means clustering (K=4 Ahlqvist)
├── data_processing.py    # Data preparation
├── explainability.py     # SHAP explanations
├── explainer.py          # Additional explainability utilities
├── ab_testing.py         # A/B testing infrastructure
├── drift_detection.py    # Model drift monitoring
└── mlflow_config.py      # MLflow experiment tracking

scripts/
├── remove_bg.py           # Background removal utility
└── check-api-drift.sh    # API drift monitoring script

models/
└── binary_v2_no_bp/          # Binary model artifacts (created after training)
    ├── results/              # Metrics and reports
    └── visualizations/       # PNG plots

Note: Model files (best_model.joblib, scaler.joblib, kmeans_model.joblib, cluster_labels.json) are created after running the training pipeline.
```

---

## Model Architecture

| Aspect | Details |
|--------|---------|
| **Dataset** | NHANES 2009-2023 (6 cycles, 1,376 postmenopausal women) |
| **Features** | 13 features: metabolic + engineered (no HbA1c/FBS for screening) |
| **Target** | Binary screening (Normal vs At‑Risk) with optional 3‑class clinician mode |
| **Algorithms** | Logistic Regression, Random Forest |
| **Best Model** | Logistic Regression (AUC-ROC: ~0.72, binary_v2_no_bp) |
| **Clustering** | K-Means with K=4 (Ahlqvist diabetes subtypes) |
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
SCREENING_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'bmi_category', 'tg_hdl_ratio', 'smoking_encoded', 'activity_encoded', 'alcohol_encoded', 'metabolic_syndrome_score', 'waist_circumference', 'race_encoded']
```

---

## Key Files

### `predict.py`

```python
class DianaPredictor:
    """Diabetes risk predictor using all biomarkers."""
    FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
    
    def predict(self, features: dict) -> dict:
        # Returns: medical_status, risk_cluster, probability, risk_score

class ScreeningPredictor:
    """Non-circular predictor excluding HbA1c/FBS from features."""
    FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'bmi_category', 'tg_hdl_ratio', 'smoking_encoded', 'activity_encoded', 'alcohol_encoded', 'metabolic_syndrome_score', 'waist_circumference', 'race_encoded']
    
    def predict(self, features: dict) -> dict:
        # Returns: predicted_status, risk_cluster, probability, risk_score
```

### `server.py`
 
Flask API with these endpoints:
 
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Single prediction |
| `/predict/batch` | POST | Multiple predictions |
| `/predict/explain` | POST | Prediction with SHAP explanation |
| `/insights/metrics` | GET | Model metrics (both ADA and clinical) |
| `/insights/metrics/clinical` | GET | Clinical model metrics only |
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
- **Source**: K-Means Clustering (K=4, per Ahlqvist et al. 2018)
- **Output**: SIRD, SIDD, MOD, or MARD cluster assignment
- **Clinical Meaning**: Based on full biomarker profile (metabolic phenotype pattern)
- **Literature Backing**: Ahlqvist et al. identified 4 T2DM subtypes in Swedish cohort

### Why Both Outputs Are Complementary

| Aspect | Classifier | Clustering |
|--------|-----------|------------|
| **Primary Goal** | Predict current diabetes status | Identify metabolic phenotype |
| **Strength** | High accuracy when HbA1c/FBS included | Reveals subtype patterns |
| **Limitation** | Circular (HbA1c defines diagnosis) | No probability output |
| **Key Finding** | SIRD patients (high BMI, normal HbA1c) receive **low** classifier probability but are classified as **HIGH risk** by clustering |
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
./venv/bin/python scripts/process_nhanes_multi.py
./venv/bin/python Ian_ML/training/data_processing.py
./venv/bin/python scripts/impute_missing_data.py
./venv/bin/python Ian_ML/training/train_binary_v2_no_bp.py
./venv/bin/python scripts/train_clusters.py

# Start ML server
./venv/bin/python Ian_ML/service/server.py
```

> **See**: [rationale.md](../03-ml/rationale.md) for methodology justification

---

## Cluster Definitions (Verified)

Based on Ahlqvist et al. diabetes subtype classification with DIANA NHANES results:

| Cluster | Full Name | n (%) | Key Biomarkers | Risk |
|---------|-----------|-------|----------------|------|
| **SIDD** | Severe Insulin-Deficient Diabetes | 97 (7.1%) | HbA1c=9.24%, FBS=223.78 | High |
| **SIRD** | Severe Insulin-Resistant Diabetes | 404 (29.4%) | BMI=38.28, TG=114.68 | High |
| **MOD** | Mild Obesity-Related Diabetes | 370 (26.9%) | BMI=29.58, TG=176.37 | Moderate |
| **MARD** | Mild Age-Related Diabetes | 505 (36.7%) | BMI=25.74, HDL=72.98 | Low |

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
   > Because HbA1c is both a predictive feature AND the primary diagnostic criterion per ADA guidelines. The model correctly learns and applies these thresholds.

2. **"Is this circular reasoning?"**
   > The goal is to demonstrate a working diabetes classification system for menopausal women. The model correctly applies ADA diagnostic criteria, which is the expected behavior for a clinical decision support tool.

3. **"What's the clinical utility?"**
   > The system provides cluster-based risk stratification (SIRD/SIDD/MOD/MARD) beyond simple diagnosis, helping identify treatment-relevant subgroups.
