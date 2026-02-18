# Models Directory - Clinical Model V2 (Production)

> **Purpose**: Trained machine learning models and artifacts for diabetes prediction  
> **Current Model**: Clinical V2 - AUC 0.694 (69.4%)  
> **Format**: Joblib serialized sklearn models

---

## Current Production Model: Clinical V2

**Location**: `models/clinical_v2/`

**AUC-ROC**: 0.6941 (69.4%)  
**Algorithm**: Logistic Regression (calibrated)  
**Features**: 13 clinical biomarkers (NO HbA1c/FBS)  
**Population**: Postmenopausal women (45-60 years)  

### Model Files

| File | Purpose |
|------|---------|
| `best_model.joblib` | Production classifier (calibrated) |
| `best_model_calibrated.joblib` | Calibrated probability model |
| `best_model_uncalibrated.joblib` | Uncalibrated base model |
| `scaler.joblib` | StandardScaler for feature normalization |
| `imputer.joblib` | Missing value imputer |
| `kmeans_model.joblib` | K-Means clustering (K=4) |
| `cluster_labels.json` | Cluster ID to risk level mapping |
| `features.json` | Feature list (13 features) |

### Key Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **AUC-ROC** | 0.6941 | ≥0.70 | ⚠️ Just below |
| **Diabetic Sensitivity** | 72.9% | >70% | ✅ PASS |
| **Diabetic NPV** | 89.6% | >85% | ✅ PASS |
| **Brier Score** | 0.1947 | <0.25 | ✅ Good calibration |
| **Overfit Gap** | 16.9% | <20% | ✅ Acceptable |

### Risk Clusters (K-Means, K=4)

| Cluster | Label | Risk Level | Diabetic Rate |
|---------|-------|------------|---------------|
| 0 | Low-Moderate | Low-Moderate | 9.3% |
| 1 | High Risk | High | 36.1% |
| 2 | Low Risk | Low | 8.1% |
| 3 | Moderate Risk | Moderate | 26.1% |

---

## Features Used (13 Total)

```python
[
    'bmi', 'triglycerides', 'ldl', 'hdl', 'age', 
    'systolic', 'diastolic', 'bmi_category', 'tg_hdl_ratio', 
    'metabolic_syndrome_score', 'smoking_encoded', 
    'activity_encoded', 'alcohol_encoded'
]
```

**Note**: HbA1c and FBS are intentionally EXCLUDED to avoid circular reasoning.

---

## Usage

```python
import joblib

# Load model and scaler
model = joblib.load('models/clinical_v2/best_model.joblib')
scaler = joblib.load('models/clinical_v2/scaler.joblib')
kmeans = joblib.load('models/clinical_v2/kmeans_model.joblib')

# Prepare features (13 features, NO HbA1c/FBS)
features = [bmi, triglycerides, ldl, hdl, age, systolic, diastolic, 
            bmi_category, tg_hdl_ratio, metabolic_syndrome_score,
            smoking_encoded, activity_encoded, alcohol_encoded]
scaled = scaler.transform([features])

# Predict
prediction = model.predict(scaled)
cluster = kmeans.predict(scaled)
```

---

## Results Directory

`models/clinical_v2/results/` contains:
- `best_model_report.json` - Full metrics report
- `model_comparison.csv` - Comparison of all 7 models
- `cluster_profiles.csv` - Cluster characteristics
- `decision_thresholds.json` - Operating point analysis
- `operating_points.csv` - Clinical utility metrics

---

## Search Keywords

`clinical_v2` `clinical model` `joblib` `sklearn` `Logistic Regression` `K-Means` `clustering` `scaler` `StandardScaler` `diabetes prediction` `risk cluster` `SIRD` `SIDD` `MOD` `MARD` `postmenopausal` `screening`
