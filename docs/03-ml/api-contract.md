# ML Inference API Contract

## Purpose
This document defines the HTTP transport contract between backend and ML service.

For frontend-facing canonical assessment result semantics, use:
- `assessment-contract.md`

This split is intentional:
- `api-contract.md` = backend <-> ML transport
- `assessment-contract.md` = backend-normalized output consumed by frontend

## Endpoints
- `POST /predict`
- `POST /predict/explain`

Query parameters:
- `model_type`: `binary_v2_no_bp`, `binary_v2_bp`, `ada`, or `clinical` (compatibility alias for `binary_v2_no_bp`)
- for explain endpoint:
  - `format`: `full` or `clinician`
  - `include_plot`: optional explainability plot flag

## Headers
- `Content-Type: application/json`
- `X-API-Key: <key>` when configured
- `X-Model-Version: <version>` when configured

## Model Inputs

### `binary_v2_no_bp` (active non-circular screening path)
Expected core payload fields:
- `bmi`
- `triglycerides`
- `ldl`
- `hdl`
- `age`

Notes:
- HbA1c and FBS are excluded from this screening path.
- Clustering may require `waist_circumference` depending on runtime cluster capability.

### `binary_v2_bp`
Expected core payload fields:
- all no-BP fields above
- `systolic`
- `diastolic`

### `ada`
Expected payload fields include diagnostic glucose markers:
- `hba1c`
- `fbs`
- plus metabolic features (`bmi`, `triglycerides`, `ldl`, `hdl`, optionally `age`)

## Response Expectations (ML Service -> Backend)
ML response may include:
- status/prediction fields (`predicted_status`, `probability`, `at_risk_probability`, etc.)
- subtype fields (`metabolic_subtype` and/or `risk_cluster`)
- optional explainability payload for `/predict/explain`

Backend performs normalization before exposing result to frontend.
Frontend should not bind directly to raw ML transport assumptions.

## Canonicalization Boundary
Backend normalization rules are authoritative and documented in `assessment-contract.md`, including:
- cluster alias resolution (`metabolic_subtype` preferred over `risk_cluster`)
- risk-level semantics
- warning payload transport/interpretation
- unknown cluster fallback policy

## Validation And Failure Handling
- Backend validates request fields before model call.
- Backend enforces target population constraints for assessments (including age range 45-60 in assessment flow).
- ML service validation remains a safety net; backend contract is authoritative for application behavior.
- Non-200 status, network failures, timeout, or decode errors are treated as assessment prediction failure in backend flow.

## Warning Codes
Warning codes originate from backend validation logic and are emitted via canonical backend fields.
Do not hardcode warning semantics from stale docs; align with backend validation implementation and `assessment-contract.md`.

## Cluster Semantics (Reference)
Cluster semantics expected by current system:

| Cluster | Full Name | Risk |
|---|---|---|
| SIDD | Atherogenic / Lipid-Driven Diabetes | HIGH |
| SIRD | Severe Insulin-Resistant Diabetes | HIGH |
| MOD | Mild Obesity-Related Diabetes | MODERATE |
| MARD | Mild Age-Related Diabetes | LOW |

## Operational Notes
- Use explicit model types (`binary_v2_no_bp`, `binary_v2_bp`, `ada`) in new integrations.
- Treat `clinical` as compatibility alias, not long-term model identity.
- Keep this file aligned with `assessment-contract.md` whenever transport or normalization rules change.
