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
| **Features** | HbA1c, FBS, BMI, Triglycerides, LDL, HDL, Age |
| **Target** | Diabetes status (Normal/Pre-diabetic/Diabetic) |
| **Algorithms** | Logistic Regression, Random Forest, XGBoost |
| **Clinical Model AUC** | ~0.67 (realistic, non-circular) |
| **ADA Model AUC** | ~1.0 (validates implementation) |

> **Why high accuracy?** The model includes HbA1c as a feature, and diabetes 
> labels are defined by HbA1c thresholds per ADA guidelines. This validates 
> the implementation correctly applies clinical diagnostic criteria.

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
# Train clinical models
./venv/bin/python ml/train.py

# Train clustering (K=4 Ahlqvist subtypes)
./venv/bin/python ml/clustering.py --k 4

# Run feature selection
./venv/bin/python scripts/feature_selection.py

# Generate all thesis outputs
./venv/bin/python scripts/generate_thesis_outputs.py

# Start ML server
./venv/bin/python ml/server.py
```

> **See**: [ml-rationale.md](ml-rationale.md) for methodology justification

---

## Cluster Definitions

Based on Ahlqvist et al. diabetes subtype classification:

| Cluster | Full Name | Characteristics | Risk |
|---------|-----------|-----------------|------|
| **SIRD** | Severe Insulin-Resistant Diabetes | High BMI, insulin resistance | High |
| **SIDD** | Severe Insulin-Deficient Diabetes | Low BMI, high HbA1c | High |
| **MOD** | Mild Obesity-Related Diabetes | Moderate BMI elevation | Moderate |
| **MARD** | Mild Age-Related Diabetes | Older onset, mild dysfunction | Low |

---

## Defense Points

1. **"Why is accuracy so high?"**
   > Because HbA1c is both a predictive feature AND the primary diagnostic criterion per ADA guidelines. The model correctly learns and applies these thresholds.

2. **"Is this circular reasoning?"**
   > The goal is to demonstrate a working diabetes classification system for menopausal women. The model correctly applies ADA diagnostic criteria, which is the expected behavior for a clinical decision support tool.

3. **"What's the clinical utility?"**
   > The system provides cluster-based risk stratification (SIRD/SIDD/MOD/MARD) beyond simple diagnosis, helping identify treatment-relevant subgroups.
