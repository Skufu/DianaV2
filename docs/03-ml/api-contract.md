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
- **Runtime gating behavior:** Subtype clustering only executes when `predicted_status == "At-Risk"`. Normal predictions receive neutral sentinel values: `risk_cluster="N/A"`, `metabolic_subtype="N/A"`, `metabolic_subtype_full="N/A"`, `cluster_description=""`, `treatment_focus=""`.
- optional explainability payload for `/predict/explain`

Backend performs normalization before exposing result to frontend, including canonicalizing neutral sentinels to blank values at persistence. Frontend should not bind directly to raw ML transport assumptions.

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

| Cluster | Full Name | Risk | Clinical Context |
|---|---|---|------------------|
| SIDD | Atherogenic / Lipid-Driven Diabetes | HIGH | **Heuristic proxy:** Uses high LDL as proxy for atherogenic dyslipidemia phenotype (Tanabe 2024 adaptation), not insulin-deficiency diagnosis. Requires HOMA2-B or C-peptide for true SIDD identification (unavailable in NHANES). |
| SIRD | Severe Insulin-Resistant Diabetes | HIGH | Heuristic classification based on LAP score and metabolic syndrome patterns |
| MOD | Mild Obesity-Related Diabetes | MODERATE | Heuristic classification based on BMI using Asia-Pacific WHO cutoff (BMI >= 25 kg/m²) |
| MARD | Mild Age-Related Diabetes | LOW | **Heuristic residual category:** Cases not clearly aligned with primary metabolic drivers; "mild" reflects metabolic severity within at-risk cohort, not clinical trajectory |

**Important:** These Ahlqvist-inspired subtype labels are heuristic proxy labels derived from clustering biomarker patterns in NHANES data. They should be interpreted as screening stratification tools for identifying dominant metabolic patterns within at-risk populations, not as validated biological subtype diagnoses or definitive treatment prescriptions. They inform clinical prioritization but do not replace clinical judgment, confirmatory diagnostic testing, or specialist evaluation.

## Operational Notes
- Use explicit model types (`binary_v2_no_bp`, `binary_v2_bp`, `ada`) in new integrations.
- Treat `clinical` as compatibility alias, not long-term model identity.
- Keep this file aligned with `assessment-contract.md` whenever transport or normalization rules change.
