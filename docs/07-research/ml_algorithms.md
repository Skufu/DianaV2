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
| **Algorithm** | Weighted K-Means | Paper specification with expert-elicited feature weights |
| **K** | 4 | Matches T2DM subtypes (SIRD-like, SIDD-like, MOD-like, MARD-like) |
| **K Range Tested** | 2-6 | Elbow/silhouette analysis |
| **Features** | Standardized biomarkers | Z-score normalization |
| **Distance** | Weighted Euclidean | Expert-elicited feature weights applied post-standardization |
| **random_state** | 42 | Reproducibility |

**Expert-Elicited Feature Weights (Single-Expert):**
- `triglycerides`: 2.0 (lipid dysregulation marker)
- `ldl`: 2.5 (atherogenic risk - highest weight)
- `hdl`: 1.2 (protective lipid factor)
- `bmi`: 1.5 (obesity driver)
- `waist_circumference`: 2.0 (visceral adiposity proxy)
- `age`: 1.0 (baseline weight)

**Weighted Distance Computation:** Distance is computed post-standardization as: `d(x, c) = sqrt(sum(w_j * (x_j - c_j)^2))` for each sample x and centroid c, where w_j is the expert-specified weight for feature j. This preserves the mathematical properties of K-Means while incorporating domain-informed feature importance.

**Expert Elicitation Limitation:** The weight configuration represents single-expert elicitation, not multi-specialist consensus or clinical validation. This is a methodological limitation acknowledged openly—weights reflect one specialist's clinical judgment rather than empirically validated importance. Future work should expand elicitation to a multi-expert Delphi process for more robust weight derivation.

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
| Weighted K-Means | `Ian_ML/training/clustering.py` | Clustering module with expert-elicited weights |

---

## Hyperparameter Tuning

Paper recommends using cross-validation to tune:
- `n_estimators` for RF
- `max_depth` for RF
- `C` and `class_weight` for Logistic Regression

---

## Keywords

`Logistic Regression` `Random Forest` `SVM` `Weighted K-Means` `clustering` `classification` `cross-validation` `stratified` `train test split` `hyperparameter` `sklearn` `scikit-learn`
