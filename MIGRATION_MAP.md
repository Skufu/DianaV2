# Codebase Migration Map (Hybrid Layout v1)

This file defines the canonical post-migration structure and old-to-new path mapping used for the phased reorganization.

## Canonical Structure

- `backend/` (unchanged service root)
- `frontend/` (unchanged service root)
- `Ian_ML/`
  - `service/` runtime inference server and support modules
  - `training/` training and data-prep modules
  - `tests/` ML test suites
  - `common/` shared path/config helpers
- `scripts/`
  - `dev/`, `data/`, `train/`, `eval/`, `thesis/`, `util/`, `legacy/`
- `models/`
  - family directories remain versioned (`clinical`, `clinical_v2`, `binary`)
  - root legacy artifacts moved under `models/legacy/`

## Move Manifest

### Root scripts -> scripts/*

- `generate_defensibility_outputs.py` -> `scripts/thesis/generate_defensibility_outputs.py`
- `quick_artifact_gen.py` -> `scripts/thesis/quick_artifact_gen.py`
- `retrain_clustering.py` -> `scripts/train/retrain_clustering.py`
- `train_quick.py` -> `scripts/train/train_quick.py`
- `test_predictor.py` -> `scripts/eval/test_predictor.py`
- `test_ml_server_fix.py` -> `scripts/eval/test_ml_server_fix.py`
- `scripts/dev/check-api-drift.sh` -> `scripts/dev/check-api-drift.sh`
- `scripts/util/remove_bg.py` -> `scripts/util/remove_bg.py`

### Ian_ML -> Ian_ML/{service,training,tests}

- `Ian_ML/service/server.py` -> `Ian_ML/service/server.py`
- `Ian_ML/service/predict.py` -> `Ian_ML/service/predict.py`
- `Ian_ML/service/predict_binary.py` -> `Ian_ML/service/predict_binary.py`
- `Ian_ML/service/explainability.py` -> `Ian_ML/service/explainability.py`
- `Ian_ML/service/explainer.py` -> `Ian_ML/service/explainer.py`
- `Ian_ML/service/ab_testing.py` -> `Ian_ML/service/ab_testing.py`
- `Ian_ML/service/drift_detection.py` -> `Ian_ML/service/drift_detection.py`
- `Ian_ML/service/mlflow_config.py` -> `Ian_ML/service/mlflow_config.py`
- `Ian_ML/training/train.py` -> `Ian_ML/training/train.py`
- `Ian_ML/training/train_v2.py` -> `Ian_ML/training/train_v2.py`
- `Ian_ML/training/train_binary.py` -> `Ian_ML/training/train_binary.py`
- `Ian_ML/training/clustering.py` -> `Ian_ML/training/clustering.py`
- `Ian_ML/training/data_processing.py` -> `Ian_ML/training/data_processing.py`
- `Ian_ML/training/feature_selection_analysis.py` -> `Ian_ML/training/feature_selection_analysis.py`
- `Ian_ML/tests/test_server.py` -> `Ian_ML/tests/test_server.py`
- `Ian_ML/tests/test_predict.py` -> `Ian_ML/tests/test_predict.py`
- `Ian_ML/tests/test_train.py` -> `Ian_ML/tests/test_train.py`
- `Ian_ML/tests/test_clustering.py` -> `Ian_ML/tests/test_clustering.py`

### models root legacy artifacts

- `models/*.joblib|*.json|*.csv|*.png` (root only) -> `models/legacy/artifacts/`

## Compatibility Rule

- Prefer direct reference rewrites over permanent shims.
- Keep temporary wrappers only if required to keep an intermediate phase runnable.
- Remove temporary wrappers in final cleanup phase.
