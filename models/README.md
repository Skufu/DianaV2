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
├── kmeans_model.joblib           # K-Means clustering (K=4)
├── scaler.joblib                 # StandardScaler for feature normalization
├── cluster_labels.json           # Cluster name mappings
├── cluster_profiles.csv          # Cluster centroid profiles
├── feature_importance.csv        # Feature importance scores
├── feature_importance.png        # Feature importance chart
├── k_optimization.png            # Elbow method plot
├── model_metrics.json            # Model performance metrics
│
├── binary/                       # Binary classification models (Diabetic vs Non-Diabetic)
│   ├── best_model.joblib
│   ├── logistic_regression.joblib
│   ├── random_forest.joblib
│   ├── scaler.joblib
│   ├── xgboost.joblib
│   ├── results/
│   └── visualizations/
│
├── clinical/                     # Clinical model variant (non-HbA1c)
│   ├── best_model.joblib         # Clinical classifier
│   ├── best_model_calibrated.joblib # Calibrated probability model
│   ├── catboost.joblib           # CatBoost model
│   ├── lightgbm.joblib           # LightGBM model
│   ├── stacking_ensemble.joblib  # Stacking ensemble
│   ├── voting_ensemble.joblib    # Voting ensemble
│   ├── random_forest.joblib      # Clinical RF
│   ├── xgboost.joblib            # Clinical XGB
│   ├── logistic_regression.joblib
│   ├── kmeans_model.joblib       # Clinical clustering
│   ├── cluster_scaler.joblib     # Scaler for clustering
│   ├── scaler.joblib             # Clinical scaler
│   ├── results/                  # Clinical metrics
│   └── visualizations/           # Clinical plots
│
├── results/                      # Model performance data
│   ├── best_model_report.json    # Detailed report of best model
│   ├── cluster_analysis.json     # Clustering analysis results
│   ├── information_gain_results.json # Feature importance analysis
│   ├── model_comparison.csv      # Accuracy/AUC comparison
│   └── weighting_ablation.csv    # Class weighting analysis
│
└── visualizations/               # Generated plots
    ├── roc_curve.png             # ROC-AUC curve
    ├── confusion_matrix.png      # Confusion matrix heatmap
    ├── feature_importance_comparison.png # Comparison of feature importance
    ├── cluster_distribution.png  # Cluster counts
    ├── cluster_heatmap.png       # Cluster feature heatmap
    ├── cluster_scatter.png       # Cluster visualization
    ├── information_gain_chart.png # Information gain plot
    └── k_optimization.png        # Elbow method plot
```

---

## Model Types

### ADA Model (Default)
- **Features**: `hba1c`, `fbs`, `bmi`, `triglycerides`, `ldl`, `hdl`, `age`
- **Target**: Diabetes status (Normal/Pre-diabetic/Diabetic)
- **Note**: High accuracy because HbA1c is diagnostic criterion

### Binary Model (`binary/`)
- **Features**: Same as ADA
- **Target**: Binary Diabetes status (0=Normal/Pre-diabetic, 1=Diabetic)
- **Note**: Simplified classification task

### Clinical Model (`clinical/`)
- **Features**: `fbs`, `bmi`, `triglycerides`, `ldl`, `hdl`, `age`, `smoking_status`, `physical_activity`, `alcohol_use`
- **Target**: Diabetes status
- **Note**: Excludes HbA1c to avoid circular reasoning. Includes advanced ensemble models (Stacking, Voting) and gradient boosting variants (CatBoost, LightGBM).

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

`model` `joblib` `sklearn` `XGBoost` `Random Forest` `Logistic Regression` `CatBoost` `LightGBM` `Ensemble` `K-Means` `clustering` `scaler` `StandardScaler` `feature importance` `ROC curve` `confusion matrix` `clinical model` `ADA model` `binary model` `diabetes prediction` `risk cluster` `SIRD` `SIDD` `MOD` `MARD`
