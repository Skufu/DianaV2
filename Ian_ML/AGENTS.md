# ML SERVICE KNOWLEDGE BASE

**Directory:** `Ian_ML/`
**Generated:** 2026-02-26

## OVERVIEW
Flask ML prediction server for diabetes risk assessment. Dual predictor pattern: DianaPredictor (ADA baseline) + ClinicalPredictor (metabolic models).

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Inference server | `service/server.py` | Flask app, port 5001 |
| Predictors | `service/predict.py` | DianaPredictor, ClinicalPredictor |
| Training | `training/train_binary_v2_no_bp.py` | Defensible nested CV training |
| Clustering | `training/clustering.py` | K-Means (K=4 Ahlqvist subtypes) |
| SHAP | `service/explainability.py` | Feature importance |
| A/B testing | `service/ab_testing.py` | Model selection |
| Drift detection | `service/drift_detection.py` | Prediction drift monitoring |

## CONVENTIONS

- **Feature constants**: Never hardcode - import from `common.feature_constants`
- **Model URL**: Empty `MODEL_URL` triggers mock mode for local dev
- **Headers**: Include `X-Model-Version` if `MODEL_VERSION` set
- **SHAP**: Use `ml.explainability` for waterfall plots
- **Tests**: pytest with clinical risk-based assertions

## ANTI-PATTERNS

- NEVER hardcode feature names - use `feature_constants`
- NEVER use output for defensible model training
- AVOID deep learning without strong regularization
- AVOID aggressive SMOTE (>100% oversampling)
- NEVER trust probability outputs from resampled data

## NOTES

- Dual predictor: ADA baseline vs clinical metabolic models
- MLflow tracking for experiment management
- Deterministic mocks for reproducible tests
