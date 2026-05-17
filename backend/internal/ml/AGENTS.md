# ML INTEGRATION KNOWLEDGE BASE

**Directory**: `backend/internal/ml`
**Generated:** 2026-01-28
**Updated:** 2026-05-17

## OVERVIEW
Integration layer for diabetes risk assessment, supporting external ML server calls and local mock prediction logic.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| ML Interface | `internal/ml/mock.go` | `Predictor` interface definition |
| HTTP Client | `internal/ml/http_predictor.go` | Calls Python Flask ML server |
| Mock Logic | `internal/ml/mock.go` | Rule-based local cluster assignment |
| Data Validation | `internal/ml/validation.go` | Clinical biomarker range checks |
| Model Config | `internal/config/config.go` | Env var loading (MODEL_URL, etc.) |

## CONVENTIONS

**Dual Predictor Pattern:**
- Use the `Predictor` interface to decouple business logic from implementation.
- `HTTPPredictor`: Production client for remote inference.
- `MockPredictor`: Default fallback for local dev/test if `MODEL_URL` is unset.

**Biomarker Validation:**
- Always run `ValidateBiomarkers(input, cfg.ClinicalThresholds)` before calling any predictor.
- Populates `validation_status` field with codes (e.g., `fbs_prediabetic_range`).
- Reference ranges come from `config.ClinicalThresholds` defaults and environment overrides; glycemic thresholds follow ADA-style cutoffs and BMI uses Asia-Pacific cutoffs.

**Configuration:**
- `MODEL_URL`: ML server endpoint (empty triggers mock mode for local dev).
- `MODEL_VERSION`: Tracked via `X-Model-Version` header (default `binary_v2_no_bp`).
- `MODEL_DATASET_HASH`: Used for data lineage tracking.
- `MODEL_TIMEOUT_MS`: Default 2000ms, configurable via env.

## UNIQUE STYLES

**Prediction Flow:**
1. Handlers call `ValidateBiomarkers(assessment, thresholds)` to get clinical warnings.
2. `Predictor.PredictWithModelType()` is invoked for assessment create/update:
   - **HTTP**: POSTs JSON to `${MODEL_URL}?model_type=<model_type>`.
   - **Mock**: Deterministic rules (e.g., `BMI >= 35` plus elevated lipids → `SIRD`).
3. Returns `cluster` name, `risk_score`, and ML metadata for database persistence.

**Header Requirements:**
- HTTP requests MUST include `X-Model-Version` if `MODEL_VERSION` is set.
- All requests use `application/json` content type.
