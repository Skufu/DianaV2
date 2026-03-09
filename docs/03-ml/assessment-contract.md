# Assessment Result Contract Specification

**Status**: Canonical source of truth for DianaV2 assessment result flow
**Last Updated**: 2026-03-07
**Scope**: Backend contract for assessment validation, prediction, and result encoding

## Backend Result Normalization Boundary and Canonical Result Shape
---
### Normalization Boundary
The backend normalization boundary is defined as the point where the ML server response is processed and transformed by the backend (Go) into the canonical assessment result shape. This occurs in `backend/internal/http/handlers/assessments.go` after receiving the ML prediction and before persisting or emitting the result to the frontend. All normalization, alias resolution, warning mapping, and canonical field shaping are enforced at this boundary. The frontend must treat the backend response as the single source of truth for result shape and field values.

### Canonical Output Fields (Frontend-Facing)
The backend guarantees the following fields in the assessment result returned to the frontend:
- `cluster`: Canonical cluster assignment (SIDD-like, SIRD-like, MOD-like, MARD-like, or blank for neutral). **Neutral sentinel:** The ML service returns `risk_cluster="N/A"` and `metabolic_subtype="N/A"` for Normal predictions; the backend canonicalizes these neutral sentinels to blank string at persistence.
- `risk_score`: Integer 0-100, computed from at-risk probability
- `risk_level`: One of `low`, `medium`, `high`, or `unknown` (see Risk Level Semantics)
- `risk_label`: Display label for risk level
- `predicted_status`: `Normal` or `At-Risk` (binary classification)
- `cluster_description`: Narrative description of cluster/subtype (blank for neutral predictions)
- `treatment_focus`: Recommended clinical focus for assigned cluster (blank for neutral predictions)
- `at_risk_probability`: Float probability (0.0-1.0) of at-risk status
- `model_version`: Exact deployed artifact identifier
- `dataset_hash`: Stable training dataset lineage identifier
- `validation_status`: Canonical warning output (see Warning Payload Schema)
All other fields (notes, metrics) are supplemental and not contract-guaranteed.

**Note on `-like` Subtype Semantics:** DIANA-generated outward-facing subtype fields use the `SIRD-like`, `SIDD-like`, `MOD-like`, `MARD-like` naming convention with `-like` suffix to emphasize heuristic proxy status. These are screening stratification tools for identifying dominant metabolic patterns within at-risk populations, not validated biological subtype diagnoses. The canonical cluster codes for alias resolution remain `SIRD`, `SIDD`, `MOD`, `MARD` internally, but outward-facing display should use the `-like` variants.

**Runtime Gating for Subtype Enrichment:** The ML service enforces that subtype clustering (K-Means prediction) only runs when `predicted_status == "At-Risk"`. Normal predictions return neutral sentinel subtype fields at the ML response boundary, which the backend canonicalizes to blank values at persistence. This gating prevents Normal assessments from carrying subtype cluster semantics in the database.

### Alias Resolution Policy
The backend resolves cluster assignment as follows:
- Prefer `metabolic_subtype` (from ML server)
- If `metabolic_subtype` is empty, fallback to `risk_cluster`
- Both must map to canonical cluster codes (SIDD, SIRD, MOD, MARD)
- If neither is available, backend emits neutral fallback (`cluster = ""`, `risk_level = "unknown"`)

### Warning Mapping
Backend maps ML validation warnings to canonical `validation_status` string:
- Format: `warning:<comma-separated-codes>` or `ok` if none
- Codes are defined in `backend/internal/ml/validation.go` and listed in this doc
- Frontend must parse and display warnings based on backend output; do not recompute or infer from ML server raw response
- During migration, backend ensures all legacy warning codes are mapped to canonical contract codes; mismatches are documented as migration notes

### Migration Posture
- Backend normalization boundary and canonical result shape are authoritative; frontend and ML service must align
- Legacy mismatches (e.g., cluster narrative, risk thresholds, warning codes) are documented in Appendix A: Migration Notes, not treated as contract
- Backend maintains neutral fallback for unknown clusters and SIDD correction as per active constants
- Metadata wiring and drift posture remain as described in prior sections
---
## Overview

This document defines the canonical contract for assessment results flowing through the DianaV2 system. It establishes the authoritative source for age validation, risk level semantics, warning schemas, cluster/subtype meanings, alias rules, and model capability constraints.

**Key Principle**: Backend Go code in `backend/internal/` is the canonical implementation. Frontend and ML service must align with these rules. Discrepancies are bugs.

---

## 1. Age Validation

### Canonical Source
`backend/internal/http/handlers/assessments.go` (lines 182-185, 377-380)

### Specification
- **Valid Range**: 45-60 years (inclusive)
- **Population**: Postmenopausal women only
- **Error Message**: "Age must be between 45-60 years for postmenopausal women. This application is designed for this specific population."

### Backend Implementation
```go
if age < 45 || age > 60 {
    ErrBadRequest(c, "Age must be between 45-60 years for postmenopausal women. This application is designed for this specific population.")
    return
}
```

### Known Conflicts
- **Frontend**: `frontend/src/components/user/AssessmentForm.jsx` currently allows 45-100
- **ML Service**: `Ian_ML/service/predict.py` validates 18-120 (line 287)
- **Migration Path**: Frontend must update to 45-60 to match backend. ML service validation is a safety net but backend is authoritative.

---

## 2. Risk Level Semantics

### Canonical Source
`backend/internal/http/handlers/assessments.go` (lines 88-97)

### Specification
Risk level is computed from `risk_score` (integer 0-100) with these thresholds:

| Risk Score | Risk Level | Display Label |
|------------|------------|---------------|
| < 30 | `low` | Low Risk |
| 30-69 | `medium` | Moderate Risk |
| ≥ 70 | `high` | High Risk |

### Backend Implementation
```go
func calculateRiskLevel(score int) string {
    if score < 30 {
        return "low"
    } else if score < 70 {
        return "medium"
    } else {
        return "high"
    }
}
```

### Result Storage
- `assessment.RiskLevel` stores the canonical string: `low`, `medium`, `high`
- Frontend uses this field directly from backend response
---

## 3. Warning Payload Schema

### Current-State Backend Transport
Backend emits warnings via a single `validation_status` string field:

- **Format**: `warning:<comma-separated-codes>` (e.g., `warning:fbs_prediabetic_range,hba1c_prediabetic,bmi_overweight`)
- **No warnings**: `ok`
- **Source**: Warning codes defined in `backend/internal/ml/validation.go`

**Backend behavior**: The backend ONLY emits `validation_status` string in create responses. Legacy fields `validation_warnings` and `warning` are NOT emitted (see `assessments_test.go` lines 318-323 for assertions).

**Frontend compatibility**: The MLResultModal component accepts `validation_status`, `validation_warnings`, and `warning` for backward compatibility with historical rendering, but current backend responses only include `validation_status`.

### Normalized Warning Contract (Design Target)
The canonical warning contract is a normalized array of warning objects (future target):

```json
warnings: [
  {
    code: "fbs_prediabetic_range",
    category: "Borderline",
    severity: "moderate",
    message: "Fasting blood sugar is in the prediabetic range.",
    source: "backend",
    details: "FBS 110 mg/dL"
  },
  ...
]
```

**Contract rules for future implementation:**
- **Empty state**: `warnings` is an empty array (`[]`). Do NOT use string "ok" or null.
- **Legacy mapping**: `validation_status` string → normalized array (split, map codes)
- **Display rules**: Frontend displays warnings in order of severity. User-friendly messages derived from `code` via mapping table (MLResultModal.jsx `formatFriendlyWarning`).
- **Migration note**: This normalized format is the design target. Current backend uses string transport and frontend parses for display.
---
## 4. Cluster and Subtype Semantics

### Canonical Source
`Ian_ML/common/feature_constants.py` (lines 148-178) - **AHLQVIST_SUBTYPES** constant

### Ahlqvist Subtype Clusters
The clinical model returns metabolic subtype clusters based on Ahlqvist diabetes subtypes. The following definitions are from the active constants:

| Cluster Code | Outward-Facing Display | Full Name | Risk Level | Treatment Focus | Clinical Context |
|--------------|---------------------|-----------|------------|-----------------|------------------|
| **SIDD** | SIDD-like | Atherogenic / Lipid-Driven Diabetes | HIGH | Statin therapy indicated; cardiovascular risk management primary | **Heuristic proxy:** True SIDD identification requires HOMA2-B or C-peptide (unavailable in NHANES). This subtype uses high LDL as a proxy for the atherogenic dyslipidemia phenotype (Tanabe 2024 adaptation). It is a lipid-driven heuristic classification, not an insulin-deficiency diagnosis. |
| **SIRD** | SIRD-like | Severe Insulin-Resistant Diabetes | HIGH | Responds well to insulin sensitizers (metformin) | Heuristic classification based on LAP score and metabolic syndrome patterns |
| **MOD** | MOD-like | Mild Obesity-Related Diabetes | MODERATE | Weight management primary intervention | Heuristic classification based on relative BMI ranking (highest BMI among remaining clusters after SIRD/SIDD assignment). Deterministic centroid-based assignment without absolute BMI threshold. |
| **MARD** | MARD-like | Mild Age-Related Diabetes | LOW | Conservative management, slower progression | **Heuristic residual category:** Cases not clearly aligned with primary metabolic drivers; "mild" reflects metabolic severity within at-risk cohort, not clinical trajectory |

**Note:** Internal canonical cluster codes for alias resolution remain `SIRD`, `SIDD`, `MOD`, `MARD` (without `-like` suffix), but outward-facing display fields (`cluster`, `metabolic_subtype`, `metabolic_subtype_full`) use the `-like` variants to emphasize heuristic proxy status.

### Key Characteristics (from active constants)
- **SIDD** (Atherogenic proxy): High LDL cholesterol, severe dyslipidemia; identified via LDL proxy without HOMA2 (adaptation per Tanabe 2024). This is explicitly a lipid-driven phenotype proxy, not an insulin-deficiency diagnosis.
- **SIRD** (Insulin-Resistant): High BMI, high TG, low HDL (metabolic syndrome pattern)
- **MOD** (Obesity-Related): Highest BMI among remaining clusters after SIRD/SIDD assignment; relative ranking, not absolute threshold
- **MARD** (Age-Related): Older age at diagnosis, milder metabolic dysfunction; residual category for non-aligned metabolic patterns

### Subtype Label Interpretation (Critical Safety Context)
The Ahlqvist-inspired subtype labels (SIRD-like, SIDD-like, MOD-like, MARD-like) are **heuristic proxy labels**, not validated biological subtype diagnoses. They are derived from clustering biomarker patterns in NHANES data and should be interpreted as:
- **Screening stratification tools** for identifying dominant metabolic patterns within at-risk populations
- **Hypothesis-generating indicators** that may inform clinical prioritization, not definitive treatment prescriptions
- **Ahlqvist-inspired classifications** adapted for the available biomarker set (no HOMA2-B or C-peptide)

These subtype labels do **not** replace clinical judgment, confirmatory diagnostic testing, or specialist evaluation. They are intended to support clinical decision-making by highlighting metabolic patterns, not to dictate treatment pathways independently of clinician assessment.

**Note on `-like` Suffix:** The `-like` suffix (e.g., `SIRD-like`, `SIDD-like`) is used in DIANA-generated outward-facing subtype fields to emphasize that these are heuristic proxy phenotypes derived from clustering, not validated Ahlqvist subtypes. Internal canonical codes remain `SIRD`, `SIDD`, `MOD`, `MARD` for alias resolution and data integrity.

### Alias Resolution
The ML service may return both `risk_cluster` and `metabolic_subtype` fields with `-like` suffix (e.g., `SIRD-like`, `SIDD-like`, `MOD-like`, `MARD-like`). Backend resolves these to internal canonical codes:

```go
// Prefer metabolic subtype (SIRD/SIDD/MOD/MARD canonical codes) over risk cluster
cluster := out.MetabolicSubtype
if cluster == "" {
    cluster = out.RiskCluster
}
// Backend strips `-like` suffix if present for canonicalization
// Frontend should preserve `-like` display for outward-facing semantics
```

**Rule**: Use `metabolic_subtype` when available; fall back to `risk_cluster`. Both should map to the same canonical cluster codes (SIRD, SIDD, MOD, MARD) internally, while outward-facing display uses `-like` variants (SIRD-like, SIDD-like, MOD-like, MARD-like).

### Frontend Cluster Info
Frontend `MLResultModal.jsx` cluster definitions must align with active constants (using `-like` display):
- SIDD-like: Atherogenic/lipid-driven profile (HIGH risk) - **NOT** insulin-deficient
- SIRD-like: Insulin resistance profile (HIGH risk)
- MOD-like: Obesity-related profile (MODERATE risk)
- MARD-like: Age-related profile (LOW risk)

**Critical:** Frontend SIDD narrative currently says "might need a little extra help utilizing insulin" - this is **stale and incorrect**. Active constants define SIDD as **atherogenic/lipid-driven** (identified via LDL proxy), not insulin-deficient. Frontend must migrate to reflect lipid-driven phenotype and cardiovascular risk management focus.

**Note on Display:** Frontend should use the `-like` variants (SIDD-like, SIRD-like, MOD-like, MARD-like) for outward-facing display to emphasize heuristic proxy status, while internally resolving to canonical codes (SIDD, SIRD, MOD, MARD) for data integrity.
---

## 5. Model Capability Rules and Active Metadata Wiring

### Canonical Sources
- Runtime metadata endpoint: `Ian_ML/service/server.py` `GET /model/active/metadata`
- Loaded artifact behavior: `Ian_ML/service/predict.py` (`ClinicalPredictor`, `features.json`, cluster artifact loading)
- Shared feature/cluster constants: `Ian_ML/common/feature_constants.py`
- Backend ML metadata client/types: `backend/internal/ml/http_predictor.go`, `backend/internal/ml/types.go`
- Backend config lineage defaults: `backend/internal/config/config.go`

### Active Runtime Metadata vs Stale References
- **Authoritative for frontend gating**: the metadata emitted by the running ML server for the currently loaded model artifacts.
- **Artifact truth**: active `best_model.joblib` + active `features.json` + active cluster artifacts loaded by `ClinicalPredictor`.
- **Persistence truth**: backend assessment rows store the prediction-time snapshot in `model_version` and `dataset_hash`.
- **Non-authoritative for gating**: archived docs/scripts mentioning `clinical_3class` or other historical model names under `docs/03-ml/archives/`, training archives, or legacy model folders unless the active runtime metadata explicitly reports them.
- **Important distinction**: backend `MODEL_VERSION` / `MODEL_DATASET_HASH` env values are configuration inputs and persistence defaults; they do **not** override the ML server's artifact-derived active metadata contract.

### Required `/model/active/metadata` Contract (Definitive Target)

The active metadata response must expose the following **mandatory** fields for downstream frontend gating and contract enforcement:

| Field | Type | Required | Meaning | FE / contract use |
|-------|------|----------|---------|-------------------|
| `model_version` | string | Yes | Exact deployed artifact identifier for the active model. Must be concrete (example: `binary_v2_no_bp`, `binary_v2_bp`), not a vague alias. | Badge/labeling, saved assessment lineage, routing/gating consistency |
| `dataset_hash` | string | Yes | Stable training dataset lineage identifier for the same artifact set as the loaded model. Placeholder values such as `N/A` are **not contract-valid**. | Lineage display, stale-result comparison, contract enforcement |
| `feature_set` | object | Yes | Structured feature manifest for the loaded classifier artifact. | Input/form gating and feature contract verification |
| `feature_set.features` | string[] | Yes | Ordered feature list from the active artifact manifest (`features.json`). | Determine supported inputs and artifact feature order |
| `feature_set.feature_count` | integer | Yes | Count of classifier features in `feature_set.features`. | Sanity checks / compatibility checks |
| `feature_set.source` | string | Yes | Manifest source identifier. Canonical value should indicate artifact origin such as `features.json`. | Distinguish artifact-derived metadata from docs/defaults |
| `cluster_capability` | object | Yes | Whether the active model can emit meaningful cluster/subtype outputs. | Decide whether cluster UI is eligible |
| `cluster_capability.supported` | boolean | Yes | True only when active runtime clustering is actually available. | Primary cluster UI gate |
| `cluster_capability.required_inputs` | string[] | Yes | Inputs required for cluster assignment. Current canonical set: `bmi`, `triglycerides`, `ldl`, `hdl`, `age`, `waist_circumference`. | FE can explain why subtype is unavailable |
| `cluster_capability.output_field` | string | Yes | Canonical cluster field name. Current canonical value: `metabolic_subtype`. | Prevent FE from binding to stale aliases |
| `cluster_capability.alias_field` | string | Yes | Backward-compatible alias field. Current value: `risk_cluster`. | Compatibility only |
| `output_capabilities` | object | Yes | Explicit markers for which result fields downstream clients may safely rely on. | Result-section gating |
| `output_capabilities.predicted_status` | boolean | Yes | Whether `predicted_status` is expected in predictions. | Gate status chips/text |
| `output_capabilities.risk_score` | boolean | Yes | Whether `risk_score` is expected in predictions. | Gate score rendering |
| `output_capabilities.at_risk_probability` | boolean | Yes | Whether `at_risk_probability` is expected in predictions. | Gate probability text |
| `output_capabilities.prediction_confidence` | boolean | Yes | Whether `prediction_confidence` / `confidence_note` are expected. | Gate indeterminate/confident UI |
| `output_capabilities.metabolic_subtype` | boolean | Yes | Whether `metabolic_subtype` is expected when clustering succeeds. | Gate subtype/narrative UI |
| `output_capabilities.risk_label` | boolean | Yes | Whether `risk_label` is expected. | Gate label display |
| `output_capabilities.cluster_description` | boolean | Yes | Whether `cluster_description` is expected. | Gate explanatory copy |
| `output_capabilities.treatment_focus` | boolean | Yes | Whether `treatment_focus` is expected. | Gate guidance chip / summary |

`notes` and `metrics` may remain in the response, but they are **supplemental** and must not be used as the primary frontend gating contract.

### Frontend Gating Derivation Rules
- **Blood pressure gating**: derive BP-form support from `feature_set.features`. If both `systolic` and `diastolic` are present, BP-aware flows may require/show BP inputs. If absent, BP inputs must not be required for that active model.
- **Cluster UI eligibility**: render subtype/cluster-specific UI only when `cluster_capability.supported == true`.
- **Cluster result availability per assessment**: even if the active model supports clustering, the frontend must still treat cluster output as unavailable when the assessment result omits the canonical cluster field or returns an unavailable sentinel such as empty string or `N/A`.
- **Probability UI**: render probability text only when `output_capabilities.at_risk_probability == true` and the result includes `at_risk_probability`.
- **Confidence UI**: render confidence/indeterminate state only when `output_capabilities.prediction_confidence == true`.
- **Cluster narrative binding**: bind to `metabolic_subtype` as canonical. `risk_cluster` is compatibility-only and must not become the primary FE contract again.
- **Do not infer from stale docs**: frontend must not derive gates from archived `clinical_3class` documentation, screenshots, or legacy constant tables.

### How Cluster Capability Is Determined
Active runtime clustering is supported **only** when all of the following are true:

1. `ClinicalPredictor` successfully loads `kmeans_model.joblib`.
2. `cluster_scaler.joblib` is present and its expected feature count matches `CLUSTER_FEATURES`.
3. `cluster_imputer.joblib` is present.
4. `cluster_labels.json` is present so subtype metadata can be resolved.
5. Runtime cluster feature order matches the canonical cluster feature list from `Ian_ML/common/feature_constants.py`:
   - `bmi`
   - `triglycerides`
   - `ldl`
   - `hdl`
   - `age`
   - `waist_circumference`

Assessment-level subtype availability is stricter than model-level support:
- The model may support clustering globally while an individual assessment still lacks a valid cluster because required cluster inputs were absent/unusable.
- Current serving code especially depends on `waist_circumference` for the 6-feature cluster vector; without valid cluster inputs, clustering falls back to unavailable output (`N/A`) and FE must render a neutral state.

### Feature Manifest and Dataset Lineage Rules
- `features.json` is the **authoritative classifier manifest** for active runtime metadata. The active metadata contract should surface it as `feature_set` rather than relying on an unstructured top-level `features` array.
- `Ian_ML/common/feature_constants.py` remains the canonical code constant source, but for active model gating it is a **default/fallback reference**, not proof of the currently loaded artifact shape.
- `dataset_hash` must describe the lineage of the same artifact bundle as `best_model.joblib` and `features.json`.
- `model_version` + `dataset_hash` must travel together as the minimal lineage pair stored on each assessment row.
- Future consumers may compare an assessment's stored `model_version` / `dataset_hash` against active metadata to determine whether a result was produced by an older model generation.

### Current Gaps (Documented, Not Implemented Here)
- Current `/model/active/metadata` returns `model_version`, `features`, `metrics`, `dataset_hash`, and `notes`, but **does not yet expose** structured `feature_set`, `cluster_capability`, or `output_capabilities`.
- Current endpoint derives `model_version` heuristically from directory names and may emit `clinical_v2`; this is weaker than the required concrete artifact/version contract.
- Current endpoint falls back to `dataset_hash: "N/A"`; this is insufficient for lineage enforcement.
- Current backend `ModelMetadata` struct cannot yet express the structured capability contract above.
- Current active metadata endpoint reflects the default active clinical predictor only; it does not yet clearly represent metadata for alternate routed model types such as `binary_v2_bp` or `ada`.
- Current frontend still hardcodes some gating behavior (risk thresholds, cluster narratives, fallback behavior) instead of deriving it from the canonical backend/result contract.

### Binary Model (No BP)
**Canonical**: `binary_v2_no_bp`

#### Input Features
- **Core (Required)**: `bmi`, `triglycerides`, `ldl`, `hdl`, `age`
- **Computed**: Engineered features include ratios, categories, lifestyle encodings
- **Excluded**: HbA1c, FBS (to avoid circular reasoning with diagnosis)

#### Output Capabilities
- **Binary Classification**: `Normal` vs `At-Risk`
- **Risk Score**: 0-100 integer from at-risk probability
- **Clustering**: SIRD/SIDD/MOD/MARD (requires `waist_circumference`)

### Binary Model (With BP)
**Canonical**: `binary_v2_bp`

#### Input Features
- **Core (Required)**: All no-BP features + `systolic`, `diastolic`
- **Clinical Context**: Adds blood pressure for more comprehensive screening
- **Use Case**: When BP measurements are available

### Clustering Requirements
**Canonical**: K-means clustering on 6 features

#### Input Features
- `bmi`, `triglycerides`, `ldl`, `hdl`, `age`, `waist_circumference`
- **Preprocessing**: Requires imputation and scaling (not raw values)

#### Output
- Cluster assignment (SIRD/SIDD/MOD/MARD)
- Risk level derived from cluster characteristics

### Model Type Selection
Backend determines model type via:
1. Request parameter `model_type` (from frontend)
2. Backend config `MODEL_VERSION` (default)
3. Stored `assessment.ModelVersion` (on update)

**Valid Values**: `binary_v2_no_bp`, `binary_v2_bp`, `clinical`, `ada`

**Contract Rule**: `clinical` is a routing alias, not a sufficiently precise frontend gating key. Active metadata should expose the concrete loaded version identifier that produced the assessment/runtime behavior.

---

## 6. Unknown or Unsupported Clusters

### Canonical Behavior
When ML service returns unknown or unsupported cluster values:

```go
// Default to safe neutral state
if cluster == "" {
    return Prediction{}, fmt.Errorf("ml response missing risk cluster")
}
```

### Frontend Fallback
Frontend must render neutral fallback state for unknown clusters:
- **Risk Level**: `unknown` (not `moderate`!)
- **Display**: Generic message: "Cluster information unavailable"
- **Action**: Recommend clinical follow-up without making assumptions

**Unsafe Pattern**: Current frontend fallback to "Moderate Risk" narrative (line 152 in `MLResultModal.jsx`) must be fixed.

---

## 7. Backward Compatibility and Alias Transition

### Current State
- Backend stores `cluster` field (from alias resolution)
- Frontend expects `cluster` field
- ML service returns both `risk_cluster` and `metabolic_subtype`

### Migration Path
1. **Backend**: Continue alias resolution as-is (prefer metabolic_subtype)
2. **Frontend**: Use `cluster` field (already correct)
3. **ML Service**: Maintain dual-field output for compatibility

### Future State
Consider adding explicit `metabolic_subtype` field to `models.Assessment` for clarity, but not breaking existing `cluster` field.

---

## 8. Drift Baseline / Reference Lifecycle

### 8.1 Current Implemented State
The current codebase has **partial drift primitives**, not a complete lineage-safe baseline lifecycle:

- Backend predictor queues a separate non-blocking drift check after successful prediction (`backend/internal/ml/http_predictor.go`)
- Drift checks run in background and do not block the prediction response
- Backend assessments already persist `model_version` and `dataset_hash`

### 8.2 Canonical Runtime Posture
**Default posture: observational and non-blocking.**

Drift monitoring must not block predictions, assessment creation, or persistence unless a future task explicitly introduces a fail-closed policy. In the current and designed default state:

- `/predict` continues even when no usable baseline exists
- backend assessment writes continue with `model_version` and `dataset_hash`
- drift results are advisory metadata for operators, not a prediction gate

### 8.3 Baseline Ownership and Source of Truth
#### Ownership
- **ML/model release owner** owns baseline creation, approval, refresh, and retirement
- **Backend/platform owner** owns the active runtime lineage markers exposed via `MODEL_VERSION` and `MODEL_DATASET_HASH`
- **Runtime drift monitor** only loads, evaluates, and reports against approved baselines; it must not silently redefine them inside the prediction path

#### Canonical baseline source
Each production baseline must come from an **approved reference cohort** tied to the released model lineage. Preferred sources, in order:

1. release-time evaluation/holdout cohort used to validate the model before promotion
2. approved post-deployment reference cohort collected for the same promoted model lineage

Ad hoc manual uploads through `/monitoring/drift/reference` are acceptable only for local development/bootstrap until lineage-aware baseline management is implemented. They are **not** the long-term authoritative production workflow.

### 8.4 Required Baseline Lineage Contract
A usable drift baseline must be tied to the same lineage markers carried by assessments and active model metadata.

#### Required metadata fields
| Field | Requirement | Purpose |
|------|-------------|---------|
| `baseline_id` | Required, immutable | Stable identifier for audit/reference |
| `baseline_version` | Required | Monotonic version of the baseline artifact itself |
| `model_version` | Required | Must match active runtime model version |
| `dataset_hash` | Required when available in backend/runtime | Primary dataset lineage anchor |
| `feature_schema_version` | Required | Prevents comparing incompatible feature sets |
| `source_kind` | Required | e.g. `release_holdout`, `approved_production_window` |
| `created_at` | Required | Baseline creation timestamp |
| `refreshed_at` | Optional | Most recent approved refresh timestamp |
| `stale_after` | Required | Freshness deadline for degraded-state handling |
| `sample_count` | Required | Minimum transparency for reference cohort size |
| `reference_features` | Required | Features actually represented in the baseline |

#### Canonical lineage matching rule
A baseline is considered **matched** only when all applicable lineage markers align:

- `baseline.model_version == active model_version`
- `baseline.dataset_hash == active dataset_hash` when `dataset_hash` is available
- `feature_schema_version` is compatible with the active feature contract

If `dataset_hash` is unavailable at runtime, the system may fall back to `model_version` plus feature schema compatibility, but must report the state as **lineage_incomplete**, not healthy.

### 8.5 Baseline Artifact Shape and Local Storage Design
This task does **not** require implementation, but the local design must support both reference values and lineage metadata.

#### Recommended logical artifact
An approved baseline consists of:

1. **manifest metadata** (ownership, lineage, freshness, source, version)
2. **reference payload** (feature distributions and optional `_predictions` reference array)

#### Recommended local layout
```text
Ian_ML/service/monitoring/baselines/<model_version>/<dataset_hash>/
  manifest.json
  reference_data.json
```

Implementation may use a single JSON envelope instead of two files, but both metadata and reference payload are mandatory for a production-grade baseline.

### 8.6 Initialization Rules
Baseline initialization is required whenever a new model lineage is released locally or promoted operationally.

#### Initialization workflow
1. Train and validate model lineage
2. Assign/promote `model_version`
3. Record immutable `dataset_hash` (or equivalent lineage marker)
4. Generate baseline from approved reference cohort for that exact lineage
5. Persist baseline artifact with metadata and mark it active for that lineage

#### Initialization rule
No lineage should be considered drift-ready until steps 2-5 are complete.

This means:
- a model may still serve predictions without a baseline
- but drift status for that model must be reported as degraded (`missing_reference`), not healthy

### 8.7 Refresh and Versioning Policy
#### Baseline versioning
- `baseline_version` versions the reference artifact, not the model
- refreshing a baseline creates a **new baseline version**; it does not mutate history in place
- older baseline versions should remain available for audit and retrospective analysis

#### Mandatory refresh triggers
A new baseline version is required when any of the following changes:

- `model_version`
- `dataset_hash`
- feature schema required for drift comparison

#### Time-based refresh trigger
For unchanged lineage, a baseline becomes **stale** when `now > stale_after`.

Recommended default policy for local design:
- mark stale after **90 days** unless a tighter operational requirement is chosen later
- refresh from an approved reference cohort, not automatically from request-path traffic

#### Refresh safety rule
Refresh must happen in an explicit operator/training workflow. The prediction path must not silently self-refresh baselines from opportunistic live traffic.

### 8.8 Degraded Runtime Behavior
All degraded states remain **non-blocking by default**.

| State | Trigger | Runtime behavior | Drift interpretation |
|------|---------|------------------|----------------------|
| `missing_reference` | No baseline artifact for active lineage | Prediction continues; return/report degraded monitoring status | No drift conclusion may be claimed |
| `stale_reference` | Baseline exists but `stale_after` has passed | Prediction continues; drift results, if shown, must be marked stale/advisory | Low-confidence / needs refresh |
| `reference_mismatch` | Baseline lineage does not match active `model_version` or `dataset_hash` | Prediction continues; mismatched baseline must not be treated as valid comparator | Drift comparison suppressed or flagged invalid |
| `lineage_incomplete` | Runtime or baseline missing required lineage markers | Prediction continues; report incomplete lineage | Advisory only; not a healthy state |
| `partial_reference` | Some expected features are absent from baseline | Prediction continues; compare only supported features and list skipped ones | Partial coverage only |

#### Safety rules for degraded states
- Never escalate degraded baseline state into automatic prediction failure
- Never present degraded drift status as proof that the model is healthy
- Never compare active predictions against a mismatched lineage and label the result as normal drift monitoring

### 8.9 Assessment and Traceability Link
Drift baselines are tied to the same lineage fields already stored with assessments:

- `Assessment.ModelVersion`
- `Assessment.DatasetHash`

This enables a future operator to answer:

- which model produced the assessment
- which training dataset lineage it came from
- which baseline version was supposed to monitor that lineage

Design requirement for later implementation: drift reports and alerts should eventually include `baseline_id`/`baseline_version` so they can be joined to assessment and model traceability records without ambiguity.

### 8.10 Current Implementation vs Required Design
| Area | Current implementation | Required design contract |
|------|------------------------|--------------------------|
| Reference storage | Raw arrays in local JSON | Versioned baseline artifact with lineage metadata |
| Ownership | Implicit/manual | Explicit ML release owner approval |
| Lineage link | None in baseline file | Match `model_version` + `dataset_hash` (+ feature schema) |
| Refresh | Manual overwrite | Explicit versioned refresh lifecycle |
| Missing/stale/mismatch handling | Mostly undefined | Named degraded states with non-blocking behavior |
| Prediction path behavior | No drift gate | Remains observational/non-blocking by default |

### 8.11 Future Enhancement Boundary
If a later task introduces stronger enforcement, it must do so explicitly and separately from this contract. Any future fail-closed policy must define:

1. which degraded states remain advisory vs blocking
2. who can override blocking behavior
3. how frontend/backend communicate temporary drift enforcement
4. rollout and rollback controls

---

## 9. Implementation Checklist

For any task modifying assessment flow:

- [ ] Age validation: Enforce 45-60 range
- [ ] Risk level: Use backend `calculateRiskLevel()` thresholds
- [ ] Warnings: Use canonical warning codes from `validation.go`
- [ ] Active metadata: treat `/model/active/metadata` as the runtime authority, not archived docs
- [ ] Metadata fields: require `model_version`, `dataset_hash`, `feature_set`, `cluster_capability`, `output_capabilities`
- [ ] Feature manifest: derive active feature set from loaded `features.json`
- [ ] Dataset lineage: do not accept placeholder `dataset_hash` values for enforcement logic
- [ ] Cluster capability: mark supported only when KMeans + cluster scaler + cluster imputer + labels are all active and compatible
- [ ] FE gating: derive BP input support, cluster UI, probability UI, and confidence UI from metadata/result presence
- [ ] Clusters: Prefer `metabolic_subtype`, map to canonical codes
- [ ] Unknown clusters: Render neutral state, not moderate
- [ ] Model type: Validate against valid values
- [ ] Drift: Keep observational unless requested otherwise
- [ ] Drift baseline owner/source: Explicitly defined for the active lineage
- [ ] Drift lineage: Match baseline to `model_version` + `dataset_hash` (or report incomplete lineage)
- [ ] Drift degraded states: Missing, stale, mismatched, or partial baselines stay non-blocking and clearly labeled
- [ ] Drift refresh: New baseline version required on lineage change; stale baselines refreshed explicitly, not silently

---

## 10. References

### Backend
- `backend/internal/http/handlers/assessments.go` - Age validation, risk level calculation
- `backend/internal/ml/validation.go` - Warning codes and formatting
- `backend/internal/ml/http_predictor.go` - Alias resolution, ML client
- `backend/internal/config/config.go` - Active `MODEL_VERSION` and `MODEL_DATASET_HASH` lineage markers
- `backend/internal/models/types.go` - Assessment struct definition

### Frontend
- `frontend/src/components/common/MLResultModal.jsx` - Results display, cluster info
- `frontend/src/components/user/AssessmentForm.jsx` - Age input validation

### ML Service
- `Ian_ML/common/feature_constants.py` - **AHLQVIST_SUBTYPES** constants (canonical source for cluster semantics)
- `Ian_ML/service/predict.py` - ClinicalPredictor, DianaPredictor
- `Ian_ML/service/drift_detection.py` - Drift monitoring
- `Ian_ML/service/server.py` - Drift reference/status endpoints and active model metadata
---

| Date | Change | Impact |
|------|--------|--------|
| 2026-03-07 | Initial canonical specification | Establishes single source of truth |
| 2026-03-07 | Fixed SIDD semantics to match active constants | Corrected from stale "insulin-deficient" to "atherogenic/lipid-driven" phenotype |
| 2026-03-07 | Added drift baseline/reference lifecycle design | Defines ownership, lineage matching, degraded states, and refresh policy without changing runtime behavior |
| 2026-03-07 | Added active metadata/capability wiring contract | Defines required metadata fields for FE gating and lineage enforcement |
---

## Appendix A: Migration Notes

### Age Validation (Priority: HIGH)
- **Issue**: Frontend allows 45-100, backend enforces 45-60
- **Fix**: Update `AssessmentForm.jsx` age validation to match backend
- **Risk**: Users outside 45-60 range will get backend error

### Risk Level Recalculation (Priority: HIGH)
- **Issue**: Frontend recomputes risk level with wrong thresholds
- **Fix**: Remove frontend calculation, use backend `risk_level` field
- **Risk**: Inconsistent risk display between components

### Cluster Narratives (Priority: MEDIUM)
- **Issue**: SIDD narrative is stale and incorrect
  - Contract initially used stale "Severe Insulin-Deficient Diabetes" definition
  - Active constants define SIDD as "Atherogenic / Lipid-Driven Diabetes" (identified via LDL proxy)
  - Frontend narrative says "might need a little extra help utilizing insulin" - wrong phenotype
- **Fix**: Update SIDD description to reflect atherogenic/lipid-driven phenotype and cardiovascular risk management
- **Risk**: Misleading clinical guidance; incorrect treatment focus (statins vs insulin therapy)

### Unknown Cluster Fallback (Priority: MEDIUM)
- **Issue**: Fallback to moderate narrative is unsafe
- **Fix**: Use neutral "information unavailable" message
- **Risk**: Misleading risk assessment for edge cases

### Alias Resolution (Priority: LOW)
- **Issue**: Current approach works but unclear
- **Fix**: Document clearly (already done in this spec)
- **Risk**: Low, existing code is correct
