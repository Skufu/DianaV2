# ML System Guide

## Overview

DIANA uses machine learning to predict Type 2 Diabetes risk in postmenopausal women using biomarker data from NHANES.

---

## Directory Structure

```
ml/
├── server.py             # Flask API server
├── predict.py            # DianaPredictor class
├── train.py              # Clinical model training (non-circular)
├── clustering.py         # K-Means clustering (K=4 Ahlqvist)
└── explainability.py     # SHAP explanations

scripts/
├── feature_selection.py  # MI + IG analysis
├── train_enhanced.py     # Combined training pipeline
├── generate_thesis_outputs.py  # All-in-one thesis output generator
└── process_nhanes_multi.py     # Data preprocessing

models/
├── clinical/
│   ├── best_model.joblib     # Best classifier
│   ├── scaler.joblib         # StandardScaler
│   ├── kmeans_model.joblib   # K-Means (K=4)
│   ├── cluster_labels.json   # SIRD/SIDD/MOD/MARD mapping
│   ├── results/              # Metrics and reports
│   └── visualizations/       # PNG plots
└── results/
    └── information_gain_results.json
```

---

## Model Architecture

| Aspect | Details |
|--------|---------|
| **Dataset** | NHANES 2009-2023 (6 cycles, 1,376 postmenopausal women) |
| **Features** | 25 features: 7 base biomarkers + 18 engineered (ratios, categories, interactions) |
| **Target** | Diabetes status (3-class: Normal/Pre-diabetic/Diabetic) |
| **Algorithms** | LR, RF, XGBoost, CatBoost, LightGBM, Voting Ensemble, Stacking Ensemble |
| **Best Model** | XGBoost (AUC-ROC: 0.6732, selected for deployment) |
| **Clustering** | K-Means with K=4 (Ahlqvist diabetes subtypes) |
| **Imputation** | SMOTE+Tomek for class balance, median for biomarkers |

> **Note on AUC**: Clinical model achieves 0.6732 AUC (XGBoost) which is realistic for 
> non-circular prediction (excludes HbA1c/FBS from features). This is comparable to 
> CDC diabetes risk calculators (AUC 0.72-0.79). All 7 models tested: XGBoost (0.6732), 
> CatBoost (0.6726), LR (0.6683), Stacking (0.6689), Voting (0.6632), RF (0.6534), LightGBM (0.6452).

---

## Key Files

### `predict.py`

```python
class DianaPredictor:
    """Diabetes risk predictor using all biomarkers."""
    FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']
    
    def predict(self, features: dict) -> dict:
        # Returns: prediction, cluster, risk_score
```

### `ml_server.py`

Flask API with these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Single prediction |
| `/predict/batch` | POST | Multiple predictions |
| `/analytics/metrics` | GET | Model metrics |
| `/analytics/clusters` | GET | Cluster analysis |
| `/analytics/information-gain` | GET | Feature importance |
| `/analytics/visualizations/<name>` | GET | PNG images |

---

## Training & Execution

> [!IMPORTANT]
> Modern systems (macOS/Linux) require a virtual environment. Run `scripts/setup.sh` first to create it.

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
source venv/bin/activate && ./scripts/retrain_all.sh

# Or run individual steps:
./venv/bin/python scripts/process_nhanes_multi.py
./venv/bin/python ml/data_processing.py
./venv/bin/python scripts/impute_missing_data.py
./venv/bin/python ml/train.py
./venv/bin/python scripts/train_clusters.py

# Start ML server
./venv/bin/python ml/server.py
```

> **See**: [ml-rationale.md](ml-rationale.md) for methodology justification

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

## Defense Points

1. **"Why is accuracy so high?"**
   > Because HbA1c is both a predictive feature AND the primary diagnostic criterion per ADA guidelines. The model correctly learns and applies these thresholds.

2. **"Is this circular reasoning?"**
   > The goal is to demonstrate a working diabetes classification system for menopausal women. The model correctly applies ADA diagnostic criteria, which is the expected behavior for a clinical decision support tool.

3. **"What's the clinical utility?"**
   > The system provides cluster-based risk stratification (SIRD/SIDD/MOD/MARD) beyond simple diagnosis, helping identify treatment-relevant subgroups.
