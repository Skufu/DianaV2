# DIANA ML Methodology

## Overview

This document describes the machine learning methodology used in DIANA, aligned with the research paper requirements.

> **For detailed RAG references, see [`paper_rag/`](paper_rag/README.md)**

---

## Data Strategy

### Development Dataset: NHANES
Due to Philippine hospital data collection challenges, we use NHANES (US National Health and Nutrition Examination Survey) 2009-2023 as our development dataset. This allows us to:
1. Build and test the complete ML pipeline
2. Validate the clustering methodology
3. Create a working demo with 1,376 records

### Swap to Philippine Data
When Philippine hospital records become available:
1. Format data to match the same schema (see [paper_rag/biomarkers.md](paper_rag/biomarkers.md))
2. Re-run `process_nhanes.py` equivalent 
3. Re-run training scripts
4. Update cluster profiles (patterns may differ between populations)

---

## Inclusion Criteria

| Criterion | Value | NHANES Variable |
|-----------|-------|-----------------|
| Sex | Female | RIAGENDR=2 |
| Age | 45-60 years | RIDAGEYR |
| Menopausal Status | Postmenopausal | RHQ031=2 |
| Required Biomarkers | FBS + HbA1c | Non-null LBXGLU, LBXGH |

---

## Feature Selection

### Primary Method: Mutual Information (sklearn)
Using `mutual_info_classif()` which handles continuous features natively via k-NN estimation.

### Secondary Validation: Clinical Discretization
For panel defense, also compute Information Gain using clinical thresholds.

### Process
1. **Compute** Mutual Information for all features using sklearn
2. **Cross-validate** with Random Forest feature importance
3. **Compare** rankings for consensus
4. **Document** both methods for thesis

### Expected Feature Importance (verified)
1. HbA1c: 1.0076 (defines label directly - circular for ADA model)
2. FBS: 0.3168 (secondary diagnostic criteria)
3. BMI: 0.0605 (metabolic indicator)
4. HDL: 0.0465 (lipid profile)
5. Triglycerides: 0.0278

> **See**: [ml-rationale.md](ml-rationale.md) for full methodology justification

---

## Feature Preprocessing

| Aspect | Method |
|--------|--------|
| **Standardization** | Z-score (StandardScaler) |
| **Rationale** | Per paper: "k-means applied to standardized versions" |
| **Weighting** | Equal (no differential weighting) |
| **Missing Data** | Exclude records missing core biomarkers |

---

## Supervised Classification

### Algorithms (All 7 Models Trained)
| Model | Parameters | Purpose |
|-------|------------|---------|
| Logistic Regression | C=0.1, balanced weights | Interpretable baseline |
| Random Forest | n_estimators=300, max_depth=6, min_samples_leaf=15 | Captures nonlinear relationships |
| **XGBoost** ⭐ | n_estimators=300, max_depth=4, learning_rate=0.05, reg_lambda=2.0 | **Best performer (AUC 0.6732)** |
| CatBoost | depth=5, iterations=300, l2_leaf_reg=5 | Handles categorical features natively |
| LightGBM | num_leaves=31, n_estimators=300, reg_lambda=10 | Fast gradient boosting |
| Voting Ensemble | soft voting, weighted (LR+RF+XGB+LightGBM) | Combines base learners |
| Stacking Ensemble | LR meta-learner on 4 base models | Learns optimal combination |

### Feature Engineering (25 features)
| Category | Features |
|----------|----------|
| Base | bmi, triglycerides, ldl, hdl, age, systolic, diastolic |
| Categorical | bmi_category, bp_category, age_group |
| Lipid Ratios | tg_hdl_ratio, ldl_hdl_ratio, cholesterol_hdl_ratio, tg_hdl_ratio_sq |
| Advanced | vldl, non_hdl, metabolic_syndrome_score, metabolic_risk |
| Polynomial | bmi_squared, age_bmi_interaction, tg_log |
| Lifestyle | smoking_encoded, activity_encoded, alcohol_encoded, hypertension |

### Class Imbalance
- **Method**: SMOTE+Tomek (SMOTETomek)
- **Rationale**: Combines oversampling with Tomek link removal for cleaner decision boundaries

### Data Splitting
| Split | Portion | Purpose |
|-------|---------|---------|
| Training | ~85% | Model training + cross-validation |
| Testing | ~15% | Final evaluation (held-out) |
| Validation | Leave-One-Cycle-Out | Temporal validation across NHANES cycles |

### Cross-Validation
- **Method**: 5-fold Stratified CV + Leave-One-Cycle-Out
- **Scoring**: AUC-ROC (weighted OvR)
- **Purpose**: Hyperparameter tuning, temporal generalization

---

## Unsupervised Clustering

### K-Means Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| K | 4 | Matches T2DM subtypes (SIRD, SIDD, MOD, MARD) |
| K Range Tested | 2-6 | Per paper methodology (optimization plots generated) |
| Selection | Fixed K=4 | Enforced for clinical alignment (Ahlqvist) |
| Distance | Euclidean | Standard K-Means |
| random_state | 42 | Reproducibility |

### Cluster Labeling (Verified Results)
Clusters labeled using rank-based assignment for NHANES postmenopausal population:

| Label | n (%) | Key Biomarkers | Characteristics |
|-------|-------|----------------|------------------|
| **SIDD-like** | 97 (7.1%) | HbA1c=9.24%, FBS=223.78 | Highest hyperglycemia |
| **SIRD-like** | 404 (29.4%) | BMI=38.28, TG=114.68, HDL=51.84 | Highest metabolic risk |
| **MOD-like** | 370 (26.9%) | BMI=29.58, TG=176.37, HbA1c=5.80% | Moderate obesity, high TG |
| **MARD-like** | 505 (36.7%) | BMI=25.74, HDL=72.98, HbA1c=5.51% | Healthiest profile |

> **See**: [paper_rag/diabetes_subgroups.md](paper_rag/diabetes_subgroups.md)

---

## Model Selection

### Criteria (in priority order)
1. **AUC-ROC** (primary) - discrimination ability
2. **F1-Score** (secondary) - balance of precision/recall
3. **Clinical Interpretability** (tertiary) - explainability

### Target Performance (Actual Results)
| Model Type | AUC Target | Best Model | Test AUC | Notes |
|------------|------------|------------|----------|-------|
| ADA Predictor | ~1.0 | N/A | ~1.0 | HbA1c feature = circular, validates implementation |
| **Clinical Predictor** | ≥ 0.70 | **XGBoost** | **0.6732** | Best non-circular screening model |

**All Clinical Model Results:**
- XGBoost: **0.6732** (best) - Selected for deployment
- CatBoost: 0.6726 (very close second)
- Logistic Regression: 0.6683 
- Stacking Ensemble: 0.6689
- Voting Ensemble: 0.6632
- Random Forest: 0.6534
- LightGBM: 0.6452

> **Note**: AUC ~0.67 is realistic and acceptable for non-circular screening (comparable to CDC tools at 0.72-0.79).

---

## Model Types in Codebase

### 1. ADA Predictor (DianaPredictor)
- **Features**: HbA1c, FBS, BMI, TG, LDL, HDL, Age
- **Use Case**: Diagnostic confirmation
- **Expected AUC**: ~1.0 (circular - HbA1c defines labels)

### 2. Clinical Predictor (ClinicalPredictor)
- **Features**: BMI, TG, LDL, HDL, Age (NO HbA1c/FBS)
- **Use Case**: Screening without lab test
- **Expected AUC**: ≥ 0.70 (Good discrimination for screening)
- **Rationale**: See [ml-rationale.md](ml-rationale.md) for non-circular defense

---

## Reproducibility

All random operations use `random_state=42` for reproducibility.

### Model Artifacts Location
| Artifact | Path |
|----------|------|
| StandardScaler | `models/scaler.joblib` |
| K-Means Model | `models/kmeans_model.joblib` |
| Cluster Labels | `models/cluster_labels.json` |
| Cluster Profiles | `models/cluster_profiles.csv` |
| Clinical Models | `models/clinical/*.joblib` |
| Results | `models/clinical/results/` |
| Visualizations | `models/clinical/visualizations/` |

---

## Training Pipeline

```bash
# 1. Download NHANES data
python scripts/download_nhanes_multi.py

# 2. Complete pipeline (Recommended)
source venv/bin/activate && ./scripts/retrain_all.sh

# Individual steps:
# 3. Process and Clean
python scripts/process_nhanes_multi.py
python ml/data_processing.py

# 4. Impute
python scripts/impute_missing_data.py

# 5. Train and Cluster
python ml/train.py
python scripts/train_clusters.py

# 6. Start ML server
python ml/server.py
```

---

## RAG Reference Index

| Topic | Document |
|-------|----------|
| All Details | [paper_rag/README.md](paper_rag/README.md) |
| ML Algorithms | [paper_rag/ml_algorithms.md](paper_rag/ml_algorithms.md) |
| Metrics | [paper_rag/metrics.md](paper_rag/metrics.md) |
| Data Pipeline | [paper_rag/data_pipeline.md](paper_rag/data_pipeline.md) |
| Code Alignment | [paper_rag/codebase_alignment.md](paper_rag/codebase_alignment.md) |
