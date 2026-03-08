# DIANA V2 Documentation Hub

> Purpose: trusted entry point for current docs
> Last Updated: 2026-03-08

## Start Here
- Runtime assessment behavior and result semantics: `03-ml/assessment-contract.md`
- Active screening features and biomarker rationale: `03-ml/feature-documentation.md`
- Backend integration path for assessments: `02-guides/backend.md`
- Frontend integration path for assessments/results: `02-guides/frontend.md`

## Canonical Source Of Truth
Use one canonical doc per domain:

| Domain | Canonical Document |
|---|---|
| Assessment output contract (cross-layer) | `03-ml/assessment-contract.md` |
| Backend to ML transport contract | `03-ml/api-contract.md` |
| Screening feature set and rationale | `03-ml/feature-documentation.md` |
| Method narrative for thesis alignment | `03-ml/methodology.md` |
| Backend implementation guide | `02-guides/backend.md` |
| Frontend implementation guide | `02-guides/frontend.md` |

Rule: when docs disagree, update non-canonical docs to match the canonical one.

## Active ML Position
- Active screening path is `binary_v2_no_bp` (non-circular screening model).
- HbA1c and FBS are not active screening inputs for `binary_v2_no_bp`.
- HbA1c and FBS remain diagnostic/labeling signals and are used in ADA-oriented contexts.
- Frontend should consume backend-normalized result fields instead of recalculating risk semantics.

## Documentation Map (Current)

### `01-architecture/`
- `overview.md`: high-level system architecture and request flow
- `detailed-architecture.md`: backend and service-level architecture details
- `project-structure.md`: repository structure reference
- `layout.md`: architecture and doc boundary notes

### `02-guides/`
- `backend.md`: backend endpoints, assessment handler flow, ML integration boundary
- `frontend.md`: frontend API usage, assessment form flow, result rendering boundary
- `database.md`: database and schema guide
- `database-schema-diagram.md`: schema diagram reference
- `ml-system.md`: broad ML guide (use canonical 03-ml docs for contract details)
- `admin.md`: admin-focused guide
- `security.md`: security guide

### `03-ml/`
- `assessment-contract.md`: canonical cross-layer assessment result contract
- `api-contract.md`: backend-ML HTTP transport contract
- `feature-documentation.md`: active feature definitions and engineering rationale
- `methodology.md`: current methodological narrative aligned to active approach
- `dataset-gap-analysis.md`: data availability and feature-gap analysis
- `cluster_feature_audit_and_fix.md`: cluster feature audit history
- `AUC_IMPROVEMENT_ANALYSIS.md`: performance analysis notes
- `DEFENSIBILITY_OUTPUTS_GUIDE.md`: defense artifact guide
- `DOCTOR_VALIDATION_GUIDE.md`: clinician validation notes
- `api-doc-contract-alignment-inventory.md`: mismatch inventory used for cleanup

### `05-planning/`
- `backend-refactoring-prd.md`: backend refactoring planning doc

### `06-operations/`
- `deployment.md`: deployment guide
- `deployment-internal.md`: internal deployment notes
- `logging-improvements.md`: logging and observability notes

### `07-research/`
- `README.md`: research document index
- `paper-requirements.md`: thesis/paper requirements
- `manuscript-updates.md`: current manuscript update text
- `ml_algorithms.md`: algorithm notes for manuscript context
- `metrics.md`: metrics references
- `data_pipeline.md`: data pipeline notes
- `diabetes_subgroups.md`: subtype notes for manuscript context
- `ui_requirements.md`: UI requirements for paper alignment

## Cross-Layer Assessment Flow
```
Frontend AssessmentForm
  -> POST /api/v1/users/me/assessments (backend)
  -> backend validation + model call
  -> backend normalizes response to canonical result shape
  -> result saved and returned to frontend
  -> frontend renders backend-provided risk and cluster semantics
```

## Historical Material (Not Primary Navigation)
The following are kept for history and audit trail, but are intentionally excluded from the main map:
- `00-legacy/`
- `03-ml/archives/`
- `08-fixes/`

## Quick Navigation
| Need | Document |
|---|---|
| Understand current assessment contract | `03-ml/assessment-contract.md` |
| Check ML request/response transport | `03-ml/api-contract.md` |
| Confirm active screening feature set | `03-ml/feature-documentation.md` |
| Understand backend assessment handling | `02-guides/backend.md` |
| Understand frontend result rendering boundary | `02-guides/frontend.md` |
