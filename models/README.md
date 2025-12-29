# Models Directory - Trained ML Artifacts

> **Purpose**: Trained machine learning models and artifacts for diabetes prediction  
> **Format**: Joblib serialized sklearn/XGBoost models

---

## Quick Search Index

| Model | File | Purpose |
|-------|------|---------|
| Best Classifier | `best_model.joblib` | Primary diabetes prediction |
| Random Forest | `random_forest.joblib` | RF classifier |
| XGBoost | `xgboost.joblib` | XGB classifier |
| Logistic Regression | `logistic_regression.joblib` | LR baseline |
| K-Means Clustering | `kmeans_model.joblib` | Risk cluster assignment |
| Feature Scaler | `scaler.joblib` | StandardScaler for features |

---

## Directory Structure

```
models/
├── best_model.joblib             # Best performing classifier
├── random_forest.joblib          # Random Forest model
├── xgboost.joblib                # XGBoost model
├── logistic_regression.joblib    # Logistic Regression model
├── kmeans_model.joblib           # K-Means clustering (K=3 or K=4)
├── scaler.joblib                 # StandardScaler for feature normalization
├── cluster_labels.json           # Cluster name mappings
├── cluster_profiles.csv          # Cluster centroid profiles
├── feature_importance.csv        # Feature importance scores
├── feature_importance.png        # Feature importance chart
├── k_optimization.png            # Elbow method plot
├── model_metrics.json            # Model performance metrics
│
├── clinical/                     # Clinical model variant (non-HbA1c)
│   ├── best_model.joblib         # Clinical classifier
│   ├── random_forest.joblib      # Clinical RF
│   ├── xgboost.joblib            # Clinical XGB
│   ├── logistic_regression.joblib
│   ├── kmeans_model.joblib       # Clinical clustering
│   ├── scaler.joblib             # Clinical scaler
│   ├── results/                  # Clinical metrics
│   └── visualizations/           # Clinical plots
│
├── results/                      # Model performance data
│   ├── model_comparison.csv      # Accuracy/AUC comparison
│   ├── confusion_matrix.csv      # Classification results
│   └── classification_report.txt # Detailed metrics
│
└── visualizations/               # Generated plots
    ├── roc_curve.png             # ROC-AUC curve
    ├── confusion_matrix.png      # Confusion matrix heatmap
    ├── feature_importance.png    # Feature importance bar chart
    ├── cluster_distribution.png  # Cluster counts
    └── correlation_matrix.png    # Feature correlations
```

---

## Model Types

### ADA Model (Default)
- **Features**: `hba1c`, `fbs`, `bmi`, `triglycerides`, `ldl`, `hdl`, `age`
- **Target**: Diabetes status (Normal/Pre-diabetic/Diabetic)
- **Note**: High accuracy because HbA1c is diagnostic criterion

### Clinical Model (`clinical/`)
- **Features**: `fbs`, `bmi`, `triglycerides`, `ldl`, `hdl`, `age`, `smoking_status`, `physical_activity`, `alcohol_use`
- **Target**: Diabetes status
- **Note**: Excludes HbA1c to avoid circular reasoning

---

## Feature Requirements

| Feature | Type | Range | Preprocessing |
|---------|------|-------|---------------|
| `hba1c` | float | 4.0-15.0 | StandardScaler |
| `fbs` | float | 60-400 | StandardScaler |
| `bmi` | float | 15-60 | StandardScaler |
| `triglycerides` | float | 30-1500 | StandardScaler |
| `ldl` | float | 40-300 | StandardScaler |
| `hdl` | float | 20-150 | StandardScaler |
| `age` | int | 45-85 | StandardScaler |

---

## Cluster Definitions

Based on Ahlqvist et al. diabetes subtype classification:

| Cluster ID | Name | Full Name | Risk Level |
|------------|------|-----------|------------|
| 0 | MARD | Mild Age-Related Diabetes | Low |
| 1 | MOD | Mild Obesity-Related Diabetes | Moderate |
| 2 | SIDD | Severe Insulin-Deficient Diabetes | High |
| 3 | SIRD | Severe Insulin-Resistant Diabetes | High |

---

## Usage

```python
import joblib

# Load model and scaler
model = joblib.load('models/best_model.joblib')
scaler = joblib.load('models/scaler.joblib')
kmeans = joblib.load('models/kmeans_model.joblib')

# Prepare features
features = [hba1c, fbs, bmi, triglycerides, ldl, hdl, age]
scaled = scaler.transform([features])

# Predict
prediction = model.predict(scaled)
cluster = kmeans.predict(scaled)
```

---

## Search Keywords

`model` `joblib` `sklearn` `XGBoost` `Random Forest` `Logistic Regression` `K-Means` `clustering` `scaler` `StandardScaler` `feature importance` `ROC curve` `confusion matrix` `clinical model` `ADA model` `diabetes prediction` `risk cluster` `SIRD` `SIDD` `MOD` `MARD`
