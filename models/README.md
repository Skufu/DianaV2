# Models Directory - Binary V2 No-BP (Production)

> **Purpose**: Trained machine learning models and artifacts for diabetes prediction  
> **Current Model**: Binary V2 No-BP - pooled AUC 0.7366 (73.7%)
> **Format**: Joblib serialized sklearn models

---

## Current Production Model: Binary V2 No-BP

**Location**: `models/binary_v2_no_bp/`

**Pooled AUC-ROC**: 0.7366 (73.7%)
**Mean Fold AUC-ROC**: 0.736
**Algorithm**: Logistic Regression
**Features**: 9 clinical features (NO HbA1c/FBS)
**Population**: Postmenopausal women (45-60 years)

### Model Files

| File | Purpose |
|------|---------|
| `best_model.joblib` | Production Logistic Regression classifier pipeline |
| `weighted_kmeans_model.joblib` | Active weighted K-Means clustering artifact (K=4) |
| `cluster_imputer.joblib` | Median imputer for clustering inputs |
| `cluster_scaler.joblib` | StandardScaler for clustering inputs |
| `kmeans_model.joblib` | Legacy K-Means artifact retained for compatibility |
| `cluster_labels.json` | Cluster ID to risk level mapping |
| `features.json` | Feature list (9 features) |

### Key Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Pooled AUC-ROC** | 0.7366 | ≥0.70 | ✅ PASS |
| **Mean fold AUC-ROC** | 0.736 | ≥0.70 | ✅ PASS |
| **Sensitivity** | 74.8% | >70% | ✅ PASS |
| **Specificity** | 59.0% | Reported | - |
| **NPV** | 67.2% | >60% | ✅ PASS |
| **F1** | 0.710 | >0.65 | ✅ PASS |
| **Mean threshold** | 0.465 | Reported | - |

### Risk Clusters (K-Means, K=4)

| Subtype | Count | Percentage | Key Pattern | Risk Level |
|---------|------:|-----------:|-------------|------------|
| SIRD-like | 77 | 10.5% | High triglycerides, central adiposity, low HDL | High |
| SIDD-like | 199 | 27.1% | Atherogenic / lipid-driven LDL pattern | High |
| MOD-like | 226 | 30.8% | Severe obesity-pattern centroid | Moderate |
| MARD-like | 232 | 31.6% | Milder metabolic dysfunction with older age pattern | Low |

---

## Features Used (9 Total)

```python
[
    'bmi', 'triglycerides', 'ldl', 'hdl', 'age',
    'waist_circumference', 'smoking_encoded',
    'activity_encoded', 'alcohol_encoded'
]
```

**Note**: HbA1c and FBS are intentionally EXCLUDED to avoid circular reasoning.

---

## Usage

```python
import joblib

# Load model pipeline and clustering artifacts
model = joblib.load('models/binary_v2_no_bp/best_model.joblib')
kmeans = joblib.load('models/binary_v2_no_bp/weighted_kmeans_model.joblib')
cluster_imputer = joblib.load('models/binary_v2_no_bp/cluster_imputer.joblib')
cluster_scaler = joblib.load('models/binary_v2_no_bp/cluster_scaler.joblib')

# Prepare features (9 features, NO HbA1c/FBS)
features = [bmi, triglycerides, ldl, hdl, age,
            waist_circumference, smoking_encoded,
            activity_encoded, alcohol_encoded]
# Predict
prediction = model.predict([features])
cluster_features = [bmi, triglycerides, ldl, hdl, age, waist_circumference]
cluster_input = cluster_scaler.transform(cluster_imputer.transform([cluster_features]))
cluster = kmeans.predict(cluster_input)
```

---

## Results Directory

`models/binary_v2_no_bp/results/` contains:
- `best_model_report.json` - Full metrics report
- `logo_summary_by_model.csv` - Comparison of candidate models by LOGO fold
- `cluster_analysis.json` - Cluster characteristics
- `threshold.json` - Operating point analysis
- `logo_fold_metrics.csv` - LOGO fold metrics for defensibility

The source of truth for headline performance is `models/binary_v2_no_bp/results/best_model_report.json`. The source of truth for mean fold model comparison is `models/binary_v2_no_bp/results/logo_summary_by_model.csv`.

---

## Search Keywords

`clinical_v2` `clinical model` `joblib` `sklearn` `Logistic Regression` `K-Means` `clustering` `scaler` `StandardScaler` `diabetes prediction` `risk cluster` `SIRD` `SIDD` `MOD` `MARD` `postmenopausal` `screening`
