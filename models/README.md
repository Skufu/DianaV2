# Models Directory - Binary V2 No-BP (Production)

> **Purpose**: Trained machine learning models and artifacts for diabetes prediction  
> **Current Model**: Binary V2 No-BP - AUC 0.720 (72.0%)  
> **Format**: Joblib serialized sklearn models

---

## Current Production Model: Binary V2 No-BP

**Location**: `models/binary_v2_no_bp/`

**AUC-ROC**: 0.7202 (72.0%)  
**Algorithm**: Logistic Regression (calibrated)  
**Features**: 12 clinical biomarkers (NO HbA1c/FBS)  
**Population**: Postmenopausal women (45-60 years)  

### Model Files

| File | Purpose |
|------|---------|
| `best_model.joblib` | Production classifier (calibrated) |
| `scaler.joblib` | StandardScaler for feature normalization |
| `kmeans_model.joblib` | K-Means clustering (K=4) |
| `cluster_labels.json` | Cluster ID to risk level mapping |
| `features.json` | Feature list (12 features) |

### Key Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **AUC-ROC** | 0.7202 | ≥0.70 | ✅ PASS |
| **Sensitivity** | 73.6% | >70% | ✅ PASS |
| **NPV** | 63.4% | >60% | ✅ PASS |
| **F1** | 0.684 | >0.65 | ✅ PASS |

### Risk Clusters (K-Means, K=4)

| Cluster | Label | Risk Level | Diabetic Rate |
|---------|-------|------------|---------------|
| 0 | Low-Moderate | Low-Moderate | 9.3% |
| 1 | High Risk | High | 36.1% |
| 2 | Low Risk | Low | 8.1% |
| 3 | Moderate Risk | Moderate | 26.1% |

---

## Features Used (12 Total)

```python
[
    'bmi', 'triglycerides', 'ldl', 'hdl', 'age', 
    'bmi_category', 'tg_hdl_ratio', 'smoking_encoded', 
    'activity_encoded', 'alcohol_encoded',
    'metabolic_syndrome_score', 'waist_circumference'
]
```

**Note**: HbA1c and FBS are intentionally EXCLUDED to avoid circular reasoning.

---

## Usage

```python
import joblib

# Load model and scaler
model = joblib.load('models/binary_v2_no_bp/best_model.joblib')
scaler = joblib.load('models/binary_v2_no_bp/scaler.joblib')
kmeans = joblib.load('models/binary_v2_no_bp/kmeans_model.joblib')

# Prepare features (12 features, NO HbA1c/FBS)
features = [bmi, triglycerides, ldl, hdl, age, bmi_category, tg_hdl_ratio,
            smoking_encoded, activity_encoded, alcohol_encoded,
            metabolic_syndrome_score, waist_circumference]
scaled = scaler.transform([features])

# Predict
prediction = model.predict(scaled)
cluster = kmeans.predict(scaled)
```

---

## Results Directory

`models/binary_v2_no_bp/results/` contains:
- `best_model_report.json` - Full metrics report
- `model_comparison.csv` - Comparison of candidate models
- `cluster_analysis.json` - Cluster characteristics
- `decision_thresholds.json` - Operating point analysis
- `logo_fold_metrics.csv` - LOGO fold metrics for defensibility

---

## Search Keywords

`clinical_v2` `clinical model` `joblib` `sklearn` `Logistic Regression` `K-Means` `clustering` `scaler` `StandardScaler` `diabetes prediction` `risk cluster` `SIRD` `SIDD` `MOD` `MARD` `postmenopausal` `screening`
