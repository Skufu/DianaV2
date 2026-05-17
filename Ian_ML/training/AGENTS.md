# ML TRAINING MODULE KNOWLEDGE BASE

**Directory:** `Ian_ML/training/`
**Generated:** 2026-03-09
**Updated:** 2026-05-17

## OVERVIEW
Model training scripts for diabetes risk prediction. Primary: defensible nested CV training (train_binary_v2_no_bp.py). Secondary: K-Means clustering for Ahlqvist subtypes.

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Binary classifier (defensible) | `train_binary_v2_no_bp.py` | LOGO/nested-CV, mean LR AUC about 0.736, 9 features |
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
CLUSTER_FEATURES = ["bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"]
```
Current codebase truth: import `CLUSTER_FEATURES` from `Ian_ML.common.feature_constants`; do not duplicate this list in training or serving code.

## AHLQVIST SUBTYPES

| Cluster | Name | Characteristics |
|---------|------|-----------------|
| SIRD | Severe Insulin-Resistant Diabetes | High BMI, high TG, low HDL |
| SIDD | Severe Insulin-Deficient Diabetes | High LDL, atherogenic |
| MOD | Mild Obesity-Related Diabetes | Moderate metabolic dysfunction |
| MARD | Mild Age-Related Diabetes | Older age, milder presentation |

**LIMITATION**: DIANA lacks HOMA2-B, HOMA2-IR, C-peptide, and autoantibody measures used in the original Ahlqvist framework. Labels must be described as Ahlqvist-inspired heuristic proxy labels, not validated biological subtype diagnoses.

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
| `shap_background.joblib` | `models/binary_v2_no_bp/` | SHAP background data (100 samples from training) |
| `kmeans_model.joblib` | `models/binary_v2_no_bp/` | K-Means model |
| `weighted_kmeans_model.joblib` | `models/binary_v2_no_bp/` | Weighted K-Means model |
| `cluster_labels.json` | `models/binary_v2_no_bp/` | Cluster label metadata |
| `cluster_analysis.json` | `models/binary_v2_no_bp/results/` | Cluster analysis and centroids/profiles |

## SHAP ARTIFACTS

### shap_background.joblib (REQUIRED for consistent runtime SHAP)

**Contents:**
- `background`: np.ndarray (100 samples × n_features)
- `feature_names`: Ordered list matching model features
- `n_features`: Feature count
- `n_samples`: Background sample count
- `model_type`: Model identifier
- `artifact_version`: "1.0"

**Runtime Behavior:**
- Loaded by `ClinicalPredictor.get_shap_background()`
- Validated against current model features
- Fallback to patient data if missing (logged as warning)

**Regeneration:**
```bash
python Ian_ML/training/train_binary_v2_no_bp.py
```

## NOTES

- Primary model: `train_binary_v2_no_bp.py`; current artifact metrics are under `models/binary_v2_no_bp/results/`
- Clustering is "Ahlqvist-inspired" - not true replication (lacks HOMA2)
- Archive directory contains deprecated experiments - do not use
