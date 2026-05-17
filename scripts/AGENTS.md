# SCRIPTS KNOWLEDGE BASE

**Directory:** `scripts/`
**Generated:** 2026-02-26
**Updated:** 2026-05-17

## OVERVIEW
Development utilities, data pipeline, ML training orchestration, and thesis artifact generation.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Data pipeline | `data/*.py` | NHANES download, merge, imputation |
| Dev setup | `dev/setup.sh`, `dev/start-all.sh` | Local orchestration |
| ML training | `train/train_clusters.py`, `dev/retrain-binary.sh` | K-Means orchestration and binary-model retraining helpers |
| Thesis outputs | `thesis/generate_thesis_outputs.py`, `thesis/verify_manuscript.py`, `thesis/check_metrics_consistency.py` | Artifact generation, manuscript verification, and metric consistency checks |
| Validation | `validation/*.py` | Input validation scripts |

## CONVENTIONS

- **Python scripts**: Preferred over shell scripts
- **Data files**: Output to `data/` directory
- **Models**: Output to `models/` directory
- **NHANES**: Download and process via `data/process_nhanes_multi.py`
- **Primary binary training**: Main defensible classifier training lives in `Ian_ML/training/train_binary_v2_no_bp.py`; scripts should orchestrate it rather than duplicating feature logic

## ANTI-PATTERNS (THIS PROJECT)

- **Legacy scripts**: Do NOT use `scripts/legacy/*.sh` - superseded by Python versions
- **Feature constants**: Import from `Ian_ML/common/feature_constants`, never hardcode

## NOTES

- Use `bash scripts/dev/start-all.sh` to run full stack
- Use `bash scripts/dev/setup.sh` for initial setup
- Thesis generation requires all ML models trained first
- For Chapter 3+4 thesis checks, use `scripts/thesis/check_metrics_consistency.py` against the clean draft and technical backup
