# ML Algorithms Reference

> Supervised and unsupervised learning requirements per paper

---

## Supervised Classification Models

### Required Models

| Model | Library | Key Parameters |
|-------|---------|----------------|
| **Logistic Regression** | sklearn | `max_iter=1000`, `solver='lbfgs'` |
| **Random Forest** | sklearn | `n_estimators=100`, `max_depth=10` |
| **XGBoost** | xgboost | `n_estimators=100`, `max_depth=5` |

### Optional Models (considered)
- **Support Vector Machine (SVM)** - if preliminary results indicate benefit

---

## Model Selection Criteria

1. **Primary**: AUC-ROC (highest value)
2. **Secondary**: F1-Score (balance of precision/recall)
3. **Tertiary**: Clinical interpretability

> Paper expects AUC ~1.0 for ADA predictor (since HbA1c defines labels). **Verified clinical predictor AUC: ~0.67** (realistic for non-circular prediction without HbA1c/FBS).

---

## Unsupervised Clustering

### K-Means Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Algorithm** | K-Means | Paper specification |
| **K** | 4 | Matches T2DM subtypes (SIRD, SIDD, MOD, MARD) |
| **K Range Tested** | 2-6 | Elbow/silhouette analysis |
| **Features** | Standardized biomarkers | Z-score normalization |
| **Distance** | Euclidean | Standard K-Means |
| **random_state** | 42 | Reproducibility |

### Validation Metrics
- **Elbow Method**: Within-cluster sum of squares (SSE/Inertia)
- **Silhouette Score**: -1 to 1, higher = better separation

---

## Data Splitting

| Split | Percentage | Purpose |
|-------|------------|---------|
| **Training** | 70% | Model training + CV |
| **Testing** | 30% | Final evaluation (held-out) |
| **Stratification** | By diabetes_status | Preserve class distribution |

### Cross-Validation
- **Method**: K-fold
- **K**: 5 (typical)
- **Scope**: Within 70% training set only

---

## Implementation Files

| Component | File | Description |
|-----------|------|-------------|
| Training Pipeline | `scripts/train_enhanced.py` | Main training script |
| Cluster Training | `scripts/train_clusters.py` | K-Means only |
| Clinical Model | `ml/train.py` | Non-circular model training |
| Prediction | `ml/predict.py` | Inference module |
| K-Means | `ml/clustering.py` | Clustering module |

---

## Hyperparameter Tuning

Paper recommends using cross-validation to tune:
- `n_estimators` for RF/XGBoost
- `max_depth` for RF/XGBoost
- `C` and `class_weight` for Logistic Regression

---

## Keywords

`Logistic Regression` `Random Forest` `XGBoost` `SVM` `K-Means` `clustering` `classification` `cross-validation` `stratified` `train test split` `hyperparameter` `sklearn` `scikit-learn`
