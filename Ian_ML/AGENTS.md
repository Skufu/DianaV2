# ML SERVICE KNOWLEDGE BASE

**Directory:** `Ian_ML/`
**Generated:** 2026-03-09
**Commit:** c56c602

## OVERVIEW
Flask ML prediction server for diabetes risk assessment. Dual predictor pattern: DianaPredictor (ADA baseline) + ClinicalPredictor (metabolic models). Port 5001.

## STRUCTURE
```
Ian_ML/
├── service/           # Inference API (Flask)
│   ├── server.py      # Main Flask app
│   ├── predict.py     # DianaPredictor, ClinicalPredictor classes
│   ├── explainability.py  # SHAP explanations
│   ├── ab_testing.py  # Model selection framework
│   ├── drift_detection.py # Prediction drift monitoring
│   └── validation.py  # Input validation
├── training/          # Model training scripts
│   ├── train_binary_v2_no_bp.py  # Defensible nested CV (PRIMARY)
│   ├── train_binary_v2_with_bp.py # With blood pressure
│   ├── clustering.py  # K-Means (K=4 Ahlqvist subtypes)
│   ├── data_processing.py # NHANES preprocessing
│   └── archive/       # Deprecated experiments - DO NOT USE
├── tests/             # pytest test suites
├── common/            # Shared utilities
│   ├── feature_constants.py # Feature definitions (single source of truth)
│   └── paths.py       # Path configurations
└── requirements.txt
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Inference server | `service/server.py` | Flask app, port 5001 |
| Predictors | `service/predict.py` | DianaPredictor, ClinicalPredictor |
| Training (defensible) | `training/train_binary_v2_no_bp.py` | LOGO/nested-CV, AUC 0.72 |
| Training (with BP) | `training/train_binary_v2_with_bp.py` | Includes blood pressure |
| Clustering | `training/clustering.py` | K-Means (K=4 Ahlqvist) |
| SHAP explanations | `service/explainability.py` | Feature importance |
| A/B testing | `service/ab_testing.py` | Model selection |
| Drift monitoring | `service/drift_detection.py` | Prediction drift |
| Feature constants | `common/feature_constants.py` | **Single source of truth** |
| Path config | `common/paths.py` | Model/data paths |

## API ENDPOINTS

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/predict` | POST | Single prediction |
| `/predict/batch` | POST | Batch predictions |
| `/predict/explain` | POST | Prediction with SHAP |
| `/insights/metrics` | GET | Model performance |
| `/insights/clusters` | GET | Cluster distribution |
| `/insights/information-gain` | GET | Feature importance |
| `/monitoring/drift` | GET | Drift status |

## DUAL PREDICTOR PATTERN

### DianaPredictor (ADA baseline)
- **Features**: HbA1c, FBS, BMI, triglycerides, LDL, HDL (6 features)
- **Use case**: Diagnostic confirmation when HbA1c/FBS available

### ClinicalPredictor (screening)
- **Features**: BMI, triglycerides, LDL, HDL, age, waist_circumference, smoking, activity, alcohol (9 features)
- **Use case**: Screening WITHOUT diagnostic biomarkers (no circular reasoning)
- **Performance**: AUC 0.72

## CONVENTIONS

- **Feature constants**: NEVER hardcode - import from `common.feature_constants`
- **Paths**: NEVER hardcode - import from `common.paths`
- **Model URL**: Empty `MODEL_URL` triggers mock mode for local dev
- **Headers**: Include `X-Model-Version` if `MODEL_VERSION` set
- **SHAP**: Use `service/explainability` for waterfall plots
- **Tests**: pytest with clinical risk-based assertions
- **Random state**: Always `random_state=42`

## ANTI-PATTERNS

- **NEVER** hardcode feature names - use `feature_constants.py`
- **NEVER** use `training/archive/` scripts - deprecated methodology
- **NEVER** include HbA1c/FBS in screening features (circular reasoning)
- **NEVER** use output for defensible model training
- **AVOID** deep learning without strong regularization
- **AVOID** aggressive SMOTE (>100% oversampling)
- **NEVER** trust probability outputs from resampled data without calibration

## AHLQVIST SUBTYPES (K=4)

| Cluster | Name | Characteristics | Risk |
|---------|------|-----------------|------|
| SIRD | Severe Insulin-Resistant Diabetes | High BMI, TG; low HDL | HIGH |
| SIDD | Severe Insulin-Deficient Diabetes | High LDL, atherogenic | HIGH |
| MOD | Mild Obesity-Related Diabetes | Moderate metabolic | MEDIUM |
| MARD | Mild Age-Related Diabetes | Older, milder | LOW |

**LIMITATION**: DIANA lacks HOMA2-B, HOMA2-IR, C-peptide. Labels are "Ahlqvist-inspired" per Tanabe et al. (2024).

## SHAP EXPLAINABILITY

### Background Data Requirement

SHAP KernelExplainer requires background data representing training distribution.

| Scenario | Background Source | Reliability |
|----------|------------------|-------------|
| TreeExplainer | None needed | Reliable |
| KernelExplainer + saved background | Training data sample | Reliable |
| KernelExplainer + fallback | Patient data repeated | Degraded |

**Artifact:**
- `shap_background.joblib` (saved during training)
- 100 samples from processed training data
- Validated on load (shape, feature count, NaN check)

**Response Metadata:**
- `shap_metadata.background_source`: "saved_training_data" | "patient_data_fallback"

## COMMANDS

```bash
# Start ML server
python Ian_ML/service/server.py

# Train models
python Ian_ML/training/train_binary_v2_no_bp.py
python Ian_ML/training/clustering.py --k 4

# Run tests
cd Ian_ML && pytest tests/ -v
```

## NOTES

- Default model: `binary_v2_no_bp` (screening without HbA1c/FBS)
- MLflow tracking enabled for experiment management
- Deterministic mocks for reproducible tests
- See `training/AGENTS.md` for detailed training documentation