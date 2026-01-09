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

### Algorithms
| Model | Parameters | Purpose |
|-------|------------|---------|
| Logistic Regression | max_iter=1000, solver='lbfgs' | Interpretable baseline |
| Random Forest | n_estimators=100, max_depth=10 | Captures nonlinear relationships |
| XGBoost | n_estimators=100, max_depth=5 | Best structured data performance |

### Data Splitting
| Split | Portion | Purpose |
|-------|---------|---------|
| Training | 70% | Model training + cross-validation |
| Testing | 30% | Final evaluation (held-out) |
| Stratification | By diabetes_status | Preserve class distribution |

### Cross-Validation
- **Method**: 5-fold CV
- **Scope**: Within 70% training set
- **Purpose**: Hyperparameter tuning, stable performance estimates

---

## Unsupervised Clustering

### K-Means Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| K | 4 | Matches T2DM subtypes (SIRD, SIDD, MOD, MARD) |
| K Range Tested | 2-6 | Per paper methodology |
| Selection | Highest silhouette score | With clinical interpretability |
| Distance | Euclidean | Standard K-Means |
| random_state | 42 | Reproducibility |

### Cluster Labeling
Clusters labeled post-hoc by comparing profiles to Ahlqvist et al. (2018) criteria:

| Label | Characteristics |
|-------|-----------------|
| SIDD-like | High HbA1c/FBS, lower BMI, younger |
| SIRD-like | High BMI, high TG, low HDL |
| MOD-like | High BMI (>30), moderate HbA1c |
| MARD-like | Older age (>55), mild elevations |

> **See**: [paper_rag/diabetes_subgroups.md](paper_rag/diabetes_subgroups.md)

---

## Model Selection

### Criteria (in priority order)
1. **AUC-ROC** (primary) - discrimination ability
2. **F1-Score** (secondary) - balance of precision/recall
3. **Clinical Interpretability** (tertiary) - explainability

### Target Performance
| Model Type | AUC Target | Actual | Notes |
|------------|------------|--------|-------|
| ADA Predictor | ~1.0 | ~1.0 | HbA1c feature = perfect alignment |
| Clinical Predictor | > 0.70 | ~0.67 | Realistic screening model without HbA1c/FBS |

> **Note**: Clinical Predictor AUC of 0.67 is realistic for non-circular prediction. See [ml-rationale.md](ml-rationale.md).

---

## Model Types in Codebase

### 1. ADA Predictor (DianaPredictor)
- **Features**: HbA1c, FBS, BMI, TG, LDL, HDL, Age
- **Use Case**: Diagnostic confirmation
- **Expected AUC**: ~1.0 (circular - HbA1c defines labels)

### 2. Clinical Predictor (ClinicalPredictor)
- **Features**: BMI, TG, LDL, HDL, Age (NO HbA1c/FBS)
- **Use Case**: Screening without lab test
- **Expected AUC**: ~0.67 (realistic screening)
- **Rationale**: See [ml-rationale.md](ml-rationale.md) for why this is expected

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
