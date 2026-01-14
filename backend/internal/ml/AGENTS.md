# ML INTEGRATION KNOWLEDGE BASE (internal/ml)

**Generated:** 2026-01-14
**Commit:** N/A
**Branch:** N/A

## OVERVIEW
Integration layer for diabetes risk assessment, supporting external ML server calls and local mock prediction logic.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| ML Interface | `internal/ml/mock.go` | `Predictor` interface definition |
| HTTP Client | `internal/ml/http_predictor.go` | Calls Python/FastAPI ML server |
| Mock Logic | `internal/ml/mock.go` | Rule-based local cluster assignment |
| Data Validation | `internal/ml/validation.go` | Clinical biomarker range checks |
| Model Config | `internal/config/config.go` | Env var loading (MODEL_URL, etc.) |

## CONVENTIONS

**Dual Predictor Pattern:**
- Use the `Predictor` interface to decouple business logic from implementation.
- `HTTPPredictor`: Production client for remote inference.
- `MockPredictor`: Default fallback for local dev/test if `MODEL_URL` is unset.

**Biomarker Validation:**
- Always run `ValidateBiomarkers` before calling any predictor.
- Populates `validation_status` field with codes (e.g., `fbs_prediabetic_range`).
- Reference ranges follow the SIDD/SIRD research methodology.

**Configuration:**
- `MODEL_URL`: ML server endpoint (empty triggers mock mode).
- `MODEL_VERSION`: Tracked via `X-Model-Version` header.
- `MODEL_DATASET_HASH`: Used for data lineage tracking.
- `MODEL_TIMEOUT_MS`: Default 2000ms, configurable via env.

## UNIQUE STYLES

**Prediction Flow:**
1. Handlers call `ValidateBiomarkers(assessment)` to get clinical warnings.
2. `Predictor.Predict()` is invoked:
   - **HTTP**: POSTs JSON to `${MODEL_URL}?model_type=ada`.
   - **Mock**: Deterministic rules (e.g., `BMI > 30 && HbA1c > 6.0` → `SIRD`).
3. Returns `cluster` name and `risk_score` (0-100) for database persistence.

**Header Requirements:**
- HTTP requests MUST include `X-Model-Version` if `MODEL_VERSION` is set.
- All requests use `application/json` content type.
