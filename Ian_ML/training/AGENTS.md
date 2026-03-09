# ML TRAINING MODULE KNOWLEDGE BASE

**Directory:** `Ian_ML/training/`
**Generated:** 2026-03-09

## OVERVIEW
Model training scripts for diabetes risk prediction. Primary: defensible nested CV training (train_binary_v2_no_bp.py). Secondary: K-Means clustering for Ahlqvist subtypes.

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Binary classifier (defensible) | `train_binary_v2_no_bp.py` | LOGO/nested-CV, AUC 0.72, 9 features |
| Binary classifier (with BP) | `train_binary_v2_with_bp.py` | Includes blood pressure features |
| K-Means clustering | `clustering.py` | K=4 Ahlqvist subtypes (SIRD, SIDD, MOD, MARD) |
| Data preprocessing | `data_processing.py` | NHANES label creation, feature engineering |
| Feature selection | `feature_selection_analysis.py` | Information Gain, mutual information |
| Error analysis | `error_analysis.py` | Confusion matrix breakdown |
| Leakage validation | `validate_no_leakage.py` | Verify no temporal/data leakage |
| Legacy training | `archive/train_*.py` | Deprecated - DO NOT USE |

## TRAINING FEATURES

### Defensible Model (train_binary_v2_no_bp.py)
**9 LR-safe features (no HbA1c/FBS to avoid circular reasoning):**
```python
MODEL_FEATURES = [
    # Continuous (6)
    "bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference",
    # Ordinal encodings (3)
    "smoking_encoded", "activity_encoded", "alcohol_encoded",
]
```

### Clustering Features (clustering.py)
```python
CLUSTER_FEATURES = ["bmi", "triglycerides", "ldl", "hdl", "age"]
```

## AHLQVIST SUBTYPES

| Cluster | Name | Characteristics |
|---------|------|-----------------|
| SIRD | Severe Insulin-Resistant Diabetes | High BMI, high TG, low HDL |
| SIDD | Severe Insulin-Deficient Diabetes | High LDL, atherogenic |
| MOD | Mild Obesity-Related Diabetes | Moderate metabolic dysfunction |
| MARD | Mild Age-Related Diabetes | Older age, milder presentation |

**LIMITATION**: DIANA lacks HOMA2-B, HOMA2-IR, C-peptide - primary discriminators in Ahlqvist et al. (2018). Labels are "Ahlqvist-inspired" proxy metrics per Tanabe et al. (2024).

## CONVENTIONS

- **Feature constants**: Import from `Ian_ML.common.feature_constants` - NEVER hardcode
- **Paths**: Import from `Ian_ML.common.paths` - NEVER hardcode
- **Random state**: Always set `random_state=42` for reproducibility
- **Model outputs**: Save to `MODELS_ROOT / "binary_v2_no_bp"`
- **Visualizations**: Save to `MODELS_DIR / "visualizations"`

## ANTI-PATTERNS

- **NEVER** use `train_legacy.py` - non-defensible methodology
- **NEVER** hardcode feature lists - use `feature_constants.py`
- **NEVER** include HbA1c/FBS in screening model features (circular reasoning)
- **NEVER** use aggressive SMOTE (>100% oversampling)
- **NEVER** trust probability outputs from resampled data without calibration

## TRAINING COMMANDS

```bash
# Train binary classifier (recommended)
python Ian_ML/training/train_binary_v2_no_bp.py

# Train K-Means clustering
python Ian_ML/training/clustering.py --k 4

# Validate no data leakage
python Ian_ML/training/validate_no_leakage.py

# Run feature selection analysis
python Ian_ML/training/feature_selection_analysis.py
```

## OUTPUT ARTIFACTS

| File | Location | Purpose |
|------|----------|---------|
| `best_model.joblib` | `models/binary_v2_no_bp/` | Trained classifier |
| `scaler.joblib` | `models/binary_v2_no_bp/` | Feature scaler |
| `features.json` | `models/binary_v2_no_bp/` | Feature manifest |
| `kmeans_model.joblib` | `models/clinical/` | K-Means model |
| `cluster_centers.json` | `models/clinical/results/` | Cluster centroids |

## NOTES

- Primary model: `train_binary_v2_no_bp.py` achieves AUC 0.72 with nested CV
- Clustering is "Ahlqvist-inspired" - not true replication (lacks HOMA2)
- Archive directory contains deprecated experiments - do not use