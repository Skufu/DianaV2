# ML Algorithms Reference

# PAPER ALIGNMENT REFERENCE (UPDATED)
> Current supervised/unsupervised requirements aligned to binary_v2_no_bp screening pipeline.

---

## Supervised Classification Models

### Required Models

| Model | Library | Key Parameters |
|-------|---------|----------------|
| **Logistic Regression** | sklearn | `max_iter=1000`, `class_weight='balanced'` |
| **Random Forest** | sklearn | `n_estimators=[200,300,500]`, `max_depth=[3,4,5,6]` |

### Optional Models (considered)
- **Support Vector Machine (SVM)** - not used in the current screening pipeline

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
- **Method**: Nested LOGO (outer) + GroupKFold (inner)
- **Scope**: Temporal generalization across NHANES cycles

---

## Implementation Files

| Component | File | Description |
|-----------|------|-------------|
| Clinical Model | `Ian_ML/training/train_binary_v2_no_bp.py` | Defensible nested CV training |
| Clinical Model Legacy | `Ian_ML/training/train_legacy.py` | Archived v1 (non-defensible) |
| Binary Model | `Ian_ML/training/train_binary_v2_no_bp.py` | Binary classification training |
| Prediction | `Ian_ML/service/predict.py` | Inference module |
| K-Means | `Ian_ML/training/clustering.py` | Clustering module |

---

## Hyperparameter Tuning

Paper recommends using cross-validation to tune:
- `n_estimators` for RF
- `max_depth` for RF
- `C` and `class_weight` for Logistic Regression

---

## Keywords

`Logistic Regression` `Random Forest` `SVM` `K-Means` `clustering` `classification` `cross-validation` `stratified` `train test split` `hyperparameter` `sklearn` `scikit-learn`
