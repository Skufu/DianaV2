# DIANA ML Methodology

## Overview

This document describes the machine learning methodology used in DIANA, aligned with the research paper requirements.

> **For detailed RAG references, see [`paper_rag/`](paper_rag/README.md)**

---

## Data Strategy

### Development Dataset: NHANES
Due to Philippine hospital data collection challenges, we use NHANES (US National Health and Nutrition Examination Survey) 2009-2018 as our development dataset. This allows us to:
1. Build and test the complete ML pipeline
2. Validate the clustering methodology
3. Create a working demo with ~1,111 records

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

### Information Gain Process
1. **Discretize** continuous features into clinical bins
2. **Compute** overall entropy H(Y) of diabetes labels
3. **For each feature Xⱼ**: Calculate IG(Y, Xⱼ) = H(Y) - H(Y|Xⱼ)
4. **Rank** features by IG (highest first)
5. **Select** top features for model training

### Expected Feature Importance (from paper)
1. HbA1c (defines label directly - circular for ADA model)
2. FBS (secondary diagnostic criteria)
3. BMI (metabolic indicator)
4. Lipid profile (TG, LDL, HDL)
5. Age

> **See**: [paper_rag/feature_selection.md](paper_rag/feature_selection.md)

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
| Model Type | AUC Target | Notes |
|------------|------------|-------|
| ADA Predictor | ~1.0 | HbA1c feature = perfect alignment |
| Clinical Predictor | > 0.80 | Realistic screening model |

---

## Model Types in Codebase

### 1. ADA Predictor (DianaPredictor)
- **Features**: HbA1c, FBS, BMI, TG, LDL, HDL, Age
- **Use Case**: Diagnostic confirmation
- **Expected AUC**: ~1.0 (circular - HbA1c defines labels)

### 2. Clinical Predictor (ClinicalPredictor)
- **Features**: BMI, TG, LDL, HDL, Age (NO HbA1c/FBS)
- **Use Case**: Screening without lab test
- **Expected AUC**: > 0.80 (realistic screening)

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
python scripts/download_lifestyle_data.py

# 2. Process data
python scripts/process_nhanes_multi.py

# 3. Train models (includes K-Means + classifiers)
python scripts/train_enhanced.py

# 4. (Optional) Train clinical-only models
python ml/train.py
python ml/clustering.py

# 5. Start ML server
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
