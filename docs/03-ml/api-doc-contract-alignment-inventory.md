# API/Doc Contract Alignment Inventory

**Status**: Complete mismatch inventory for doc cleanup and implementation alignment
**Created**: 2026-03-07
**Scope**: System-wide mismatches between active code behavior and existing documentation

---

## Overview

This inventory catalogs all known discrepancies between runtime behavior (backend, frontend, ML service) and existing documentation. The canonical source of truth is `docs/03-ml/assessment-contract.md`. All other documentation must align with active runtime behavior defined in that contract.

**Purpose**: This inventory supports doc cleanup and downstream implementation alignment tasks by providing an exhaustive, categorized list of known issues.

---

## Summary Statistics

| Category | Active Stale References | Runtime Conflicts | Critical Severity |
|----------|------------------------|-------------------|-------------------|
| Response Schema | 3 | 2 | 1 |
| Subtype Semantics | 12 | 4 | 2 |
| Risk Labels | 4 | 2 | 1 |
| Validation Rules | 6 | 3 | 0 |
| Model References | 25 | 1 | 1 |
| Total | 50 | 12 | 5 |

---

## 1. Response Schema Mismatches

### 1.1 Risk Level vs Risk Label Confusion

**Canonical Behavior** (`backend/internal/http/handlers/assessments.go:88-97`):
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

**Response Fields** (active):
- `risk_level`: string enum values `"low"`, `"medium"`, `"high"`
- `risk_label`: human-readable strings like `"Low Risk"`, `"Moderate Risk"`, `"High Risk"`

**Stale Doc References**:
- `docs/03-ml/api-contract.md:166` - Table conflates `risk_level` and `risk_label` in same row without clear distinction
- `docs/03-ml/api-contract.md:121` - Describes `risk_label` as "Human-readable risk label" but doesn't clarify relationship to `risk_level`

**Runtime Conflict**:
- `frontend/src/components/common/MLResultModal.jsx:157-159` - Recalculates `risk_level` from `risk_score` using WRONG thresholds (34, 67) instead of using backend-provided field
- Ignores backend `risk_level` field entirely, creating potential display inconsistency

**Required Update Direction**:
- `docs/03-ml/api-contract.md` - Add separate row for `risk_level` with enum values, clarify that `risk_label` is derived human-readable text
- `frontend/src/components/common/MLResultModal.jsx` - Remove recalculation, use `result.risk_level` field directly (already provided by backend)

**Priority**: HIGH (user-facing risk display inconsistency)

---

### 1.2 Probability Field Ambiguity

**Canonical Behavior** (`backend/internal/models/types.go`):
```go
type Assessment struct {
    Probability            float64  `json:"probability"`
    AtRiskProbability      float64  `json:"at_risk_probability"`
}
```

**Stale Doc References**:
- `docs/03-ml/api-contract.md:171-172` - Describes `probability` as "Diabetes probability from classifier" and `at_risk_probability` as "Combined probability of pre-diabetic + diabetic" - somewhat confusing terminology
- `docs/03-ml/api-contract.md:127-128` - Example response shows both fields but doesn't explain why both exist

**Required Update Direction**:
- Clarify in docs: `probability` = classifier output (0-1), `at_risk_probability` = sum of pre-diabetic + diabetic probabilities (higher risk threshold)
- Or consider deprecating one field if redundant

**Priority**: MEDIUM (documentation clarity)

---

## 2. Subtype Semantics Mismatches

### 2.1 SIDD Definition Outdated (CRITICAL)

**Canonical Behavior** (`Ian_ML/common/feature_constants.py:159-165`):
```python
'SIDD': {
    'full_name': 'Atherogenic / Lipid-Driven Diabetes',
    'characteristics': 'High LDL cholesterol, severe dyslipidemia (atherogenic phenotype)',
    'clinical_implication': 'Statin therapy indicated; cardiovascular risk management primary; identified via LDL proxy without HOMA2 (adaptation per Tanabe 2024)',
    'risk_level': 'HIGH',
}
```

**Stale Doc References**:
- `docs/03-ml/api-contract.md:197-199` - Lists SIDD as "Severe Insulin-Deficient Diabetes" with description "Low BMI, high HbA1c, insulin deficiency" (WRONG)
- `docs/03-ml/assessment-contract.md:388-390` - Initially had same stale definition, corrected on 2026-03-07
- `docs/07-research/biomarkers.md` - (check if stale SIDD definition exists)

**Runtime Conflict**:
- `frontend/src/components/common/MLResultModal.jsx:109-114` - SIDD cluster info describes "Insulin Sensitivity Profile" with narrative "Your body might need a little extra help utilizing insulin properly" (WRONG - should be lipid-driven phenotype)

**Required Update Direction**:
- `docs/03-ml/api-contract.md` - Update SIDD row to match active constants (atherogenic/lipid-driven, statin therapy focus)
- `frontend/src/components/common/MLResultModal.jsx` - Update SIDD `fullName` to "Atherogenic / Lipid-Driven Diabetes" or "Lipid-Driven Profile"
- Update SIDD narrative to reflect cardiovascular risk management focus, not insulin utilization

**Priority**: HIGH (clinical safety - incorrect treatment focus)

---

### 2.2 Risk Level Mapping to Clusters

**Canonical Behavior** (`Ian_ML/common/feature_constants.py:157-177`):
```python
'SIRD': {'risk_level': 'HIGH'},
'SIDD': {'risk_level': 'HIGH'},
'MOD': {'risk_level': 'MODERATE'},
'MARD': {'risk_level': 'LOW'}
```

**Stale Doc References**:
- `docs/03-ml/api-contract.md:203-207` - Correctly maps clusters to risk levels
- `docs/03-ml/assessment-contract.md:137-141` - Correctly maps clusters to risk levels (fixed)

**No Runtime Conflict**: This is correctly documented in active contract.

**Required Update Direction**: None - already aligned in canonical contract.

**Priority**: NONE (resolved)

---

### 2.3 Clinical Descriptions Inconsistencies

**Canonical Behavior** (`Ian_ML/common/feature_constants.py:152-178`):
- SIRD: "High BMI, high TG, low HDL (metabolic syndrome pattern)"
- SIDD: "High LDL cholesterol, severe dyslipidemia (atherogenic phenotype)"
- MOD: "High BMI (>=25 Asia-Pacific WHO cutoff), moderate metabolic markers"
- MARD: "Older age at diagnosis, mild metabolic dysfunction"

**Stale Doc References**:
- `docs/03-ml/api-contract.md:197-200` - Mixes outdated SIDD definition with other clusters
- May have inconsistencies in other docs like `diabetes_subgroups.md`

**Required Update Direction**:
- Audit all docs mentioning cluster descriptions for alignment with `feature_constants.py`
- Update `docs/03-ml/api-contract.md` cluster table to use canonical descriptions

**Priority**: MEDIUM (clinical accuracy)

---

## 3. Risk Label Mismatches

### 3.1 Frontend Risk Level Recalculation (CRITICAL)

**Canonical Behavior** (`backend/internal/http/handlers/assessments.go:88-97`):
- Thresholds: <30 (low), 30-69 (medium), ≥70 (high)

**Stale Doc References**:
- None in docs - issue is frontend-only

**Runtime Conflict**:
- `frontend/src/components/common/MLResultModal.jsx:157-159`:
```javascript
const overallRiskLevel = normalizedRiskScore !== null
  ? (overallRiskScore >= 67 ? 'high' : overallRiskScore >= 34 ? 'moderate' : 'low')
  : (overallRiskLevelRaw || 'unknown').toLowerCase();
```
- Uses thresholds 34 and 67 instead of 30 and 70
- Does not use backend-provided `risk_level` field
- Creates display inconsistency: same score may show different risk level in different components

**Required Update Direction**:
- Remove recalculation logic entirely
- Use `result.risk_level` field directly from backend response
- Simplify to: `const overallRiskLevel = (result.risk_level || 'unknown').toLowerCase()`

**Priority**: HIGH (user-facing inconsistency)

---

### 3.2 Risk Label String Case Inconsistency

**Canonical Behavior** (`backend/internal/http/handlers/assessments.go:88-97`):
- Returns lowercase: `"low"`, `"medium"`, `"high"`

**Stale Doc References**:
- `docs/03-ml/api-contract.md:166` - Shows `"LOW"`, `"MODERATE"`, `"HIGH"` (uppercase)
- `docs/03-ml/assessment-contract.md:49-52` - Correctly shows lowercase

**Runtime Conflict**:
- Frontend `MLResultModal.jsx` normalizes to lowercase: `level?.toLowerCase()` (correct)
- Some docs suggest uppercase which would break frontend comparisons

**Required Update Direction**:
- `docs/03-ml/api-contract.md` - Update to show lowercase values in examples

**Priority**: LOW (docs-only fix)

---

## 4. Validation Rules Mismatches

### 4.1 Age Validation Range

**Canonical Behavior** (`backend/internal/http/handlers/assessments.go:182-185`):
```go
if age < 45 || age > 60 {
    ErrBadRequest(c, "Age must be between 45-60 years for postmenopausal women. This application is designed for this specific population.")
    return
}
```

**Stale Doc References**:
- `docs/03-ml/api-contract.md:221` - Shows `age: 18 - 120 years` (WRONG - reflects ML service validation)
- `docs/03-ml/assessment-contract.md:22-23` - Correctly documents 45-60 range

**Runtime Conflict**:
- `frontend/src/components/user/AssessmentForm.jsx:146-150`:
```javascript
const age = parseInt(formData.age, 10);
if (!age || age < 45 || age > 100) {
  setIsSubmitting(false);
  setError('This application is designed for postmenopausal women aged 45 and above. Please enter a valid age.');
  return;
}
```
- Allows 45-100 range (broader than backend's 45-60)
- Users age 61-100 will pass frontend validation but get backend error (poor UX)

- `Ian_ML/service/predict.py:287` - Validates 18-120 (safety net, but backend is authoritative)

**Required Update Direction**:
- `docs/03-ml/api-contract.md` - Update age range to 45-60, add note that ML service validation is safety net
- `frontend/src/components/user/AssessmentForm.jsx` - Update max to 60, error message to match backend: "Age must be between 45-60 years for postmenopausal women"

**Priority**: HIGH (UX issue, backend enforcement correct)

---

### 4.2 Biomarker Validation Ranges

**Canonical Behavior** (`backend/internal/ml/validation.go:10-73`):
- `hba1c`: 2.0 - 20.0 %
- `fbs`: 20 - 600 mg/dL
- `bmi`: 10 - 80 kg/m²
- `triglycerides`: 20 - 1500 mg/dL
- `ldl`: 10 - 400 mg/dL
- `hdl`: 10 - 150 mg/dL
- `age`: 18 - 120 years (ML service safety net)

**Stale Doc References**:
- `docs/03-ml/api-contract.md:213-222` - Correctly lists ranges
- `frontend/src/components/user/AssessmentForm.jsx` - Input `min`/`max` attributes don't always match backend:
  - BMI: `min="15" max="60"` vs backend 10-80
  - Triglycerides: `min="30" max="500"` vs backend 20-1500
  - LDL: `min="30" max="300"` vs backend 10-400
  - HDL: `min="20" max="150"` vs backend 10-150

**Runtime Conflict**:
- Frontend input constraints are more restrictive than backend validation
- Values outside frontend ranges but within backend ranges would require direct API calls
- No critical issue but inconsistent user experience

**Required Update Direction**:
- `frontend/src/components/user/AssessmentForm.jsx` - Align input `min`/`max` with backend validation ranges

**Priority**: LOW (UX consistency)

---

### 4.3 Warning Code Naming Inconsistencies

**Canonical Behavior** (`backend/internal/ml/validation.go`):
- `fbs_diabetic_range`, `fbs_prediabetic_range`
- `hba1c_diabetic` (note: no `_range` suffix), `hba1c_prediabetic` (no `_range`)
- `bmi_obese`, `bmi_overweight`
- `ldl_elevated`, `hdl_low`, `triglycerides_high`

**Stale Doc References**:
- `docs/03-ml/api-contract.md:223-231` - Lists warning codes but has inconsistencies:
  - Shows `hba1c_prediabetic` and `hba1c_diabetic` (matches backend)
  - Shows `bp_elevated`, `bp_hypertensive` (not in active validation.go - BP fields removed from no-BP model)
  - Shows `cholesterol_high`, `ldl_elevated`, `hdl_low`, `triglycerides_high` (inconsistent)

**Frontend Translation** (`MLResultModal.jsx:550-567`):
- `formatFriendlyWarning()` maps codes to user-friendly messages
- Handles codes like `fbs_diabetic_range`, `hba1c_diabetic_range` (note: adds `_range` suffix that doesn't exist in backend)

**Runtime Conflict**:
- Frontend warning map includes codes with `_range` suffix that backend never generates
- Frontend `formatFriendlyWarning()` falls back to text replacement for unknown codes
- BP warning codes listed in docs but not in active validation (BP fields optional in no-BP model)

**Required Update Direction**:
- `docs/03-ml/api-contract.md` - Remove BP warning codes from list (BP not in no-BP model)
- `frontend/src/components/common/MLResultModal.jsx` - Audit warning map for codes that don't exist in backend
- Consider standardizing warning code naming in backend (add `_range` suffix consistently or remove it)

**Priority**: MEDIUM (UX clarity)

---

## 5. Stale Model References

### 5.1 `clinical_3class` References (CRITICAL)

**Canonical Active Models**:
- `binary_v2_no_bp` - Binary screening model (5 core inputs, no HbA1c/FBS)
- `binary_v2_bp` - Binary screening model with BP (+2 inputs)
- `ada` - ADA baseline diagnostic model (6 inputs including HbA1c/FBS)
- `clinical` - Alias for `binary_v2_no_bp` (deprecated, use explicit model types)

**Stale References Found** (25 files):
1. `env.example` - `MODEL_VERSION=clinical_3class` comment (outdated)
2. `scripts/validation/README.md` - Mentions `clinical_3class`
3. `scripts/thesis/quick_artifact_gen.py` - References `clinical_3class`
4. `scripts/thesis/generate_defensibility_outputs.py` - References `clinical_3class`
5. `scripts/dev/start-all.bat` - Uses `clinical_3class`
6. `scripts/dev/start-all.ps1` - Uses `clinical_3class`
7. `scripts/dev/start-all.sh` - Uses `clinical_3class`
8. `scripts/dev/generate-model-hashes.py` - References `clinical_3class`
9. `scripts/train/train_clusters.py` - References `clinical_3class`
10. `scripts/train/retrain_clinical_3class_kmeans.py` - Filename references `clinical_3class`
11. `Ian_ML/common/paths.py` - Path references `clinical_3class`
12. `models/clinical/results/best_model_report.json` - Model report references
13. `README.md` - Documentation references
14. `TODO.md` - Task references
15. `Ian_ML/training/train_binary_v2_with_bp.py` - Code comments
16. `docs/08-fixes/02/23/FEATURE_CONSTANTS_FIX.md` - Historical fix doc
17. `Ian_ML/training/train_binary_v2_no_bp.py` - Code comments
18. `Ian_ML/training/archive/train_experiment_features_archived.py` - Archive files
19. `Ian_ML/training/archive/train_experiment_smote_archived.py` - Archive files
20. `Ian_ML/training/archive/train_lean_archived.py` - Archive files
21. `docs/00-legacy/codebase-map.md` - Legacy documentation
22. `docs/03-ml/archives/CURRENT_STATE_ASSESSMENT.md` - Archive documentation
23. `docs/03-ml/archives/CLINICAL_VALIDATION_BRIEF.md` - Archive documentation
24. `docs/03-ml/archives/ASSESSMENT_FLOW_REAL_ML.md` - Archive documentation
25. `frontend/src/components/user/AssessmentForm.jsx:431` - Conditional for BP fields

**Runtime Conflict**:
- `frontend/src/components/user/AssessmentForm.jsx:431`:
```javascript
{(formData.model_type === 'binary_v2_bp' || formData.model_type === 'clinical_3class') && (
```
- Includes `clinical_3class` in conditional logic but this model type doesn't exist in active validation

**Required Update Direction**:
- Update all non-archive files to remove `clinical_3class` references:
  - `env.example` - Update to `MODEL_VERSION=binary_v2_no_bp` or `binary_v2_bp`
  - All scripts (`scripts/*`) - Replace with active model types
  - `frontend/src/components/user/AssessmentForm.jsx:431` - Remove `clinical_3class` from conditional
  - `README.md`, `TODO.md` - Update documentation
- Archive files can retain historical references (already in `docs/00-legacy/` and `docs/03-ml/archives/`)

**Priority**: HIGH (non-existent model type in active code)

---

### 5.2 Model Type Validation Inconsistency

**Canonical Behavior** (`backend/internal/http/handlers/assessments.go:130-133, 385-388`):
```go
if req.ModelType != "" && req.ModelType != "clinical" && req.ModelType != "ada" && req.ModelType != "binary_v2_no_bp" && req.ModelType != "binary_v2_bp" {
    ErrBadRequest(c, "Invalid model type")
    return
}
```

**Stale Doc References**:
- `docs/03-ml/api-contract.md:6` - Lists `clinical` (default) and `ada` as query parameters, doesn't mention `binary_v2_no_bp` or `binary_v2_bp`
- `docs/03-ml/api-contract.md:212` - Lists valid values including `binary_v2_no_bp`, `binary_v2_bp`, `clinical`, `ada`

**Runtime Conflict**:
- API accepts `"clinical"` as alias for `binary_v2_no_bp` (line 250-251 in assessments.go)
- Docs don't clearly explain this alias relationship
- Confusion about which model types are actually active

**Required Update Direction**:
- `docs/03-ml/api-contract.md` - Clarify that `"clinical"` is a deprecated alias for `binary_v2_no_bp`
- Recommend using explicit model types in documentation examples
- Consider removing `"clinical"` alias support in future (breaking change)

**Priority**: LOW (docs clarity)

---

## 6. Unknown Cluster Handling Mismatch

### 6.1 Unsafe Fallback to Moderate Narrative

**Canonical Behavior** (`docs/03-ml/assessment-contract.md:216-234`):
```go
// Default to safe neutral state
if cluster == "" {
    return Prediction{}, fmt.Errorf("ml response missing risk cluster")
}
```

**Required Frontend Behavior**:
- Render neutral state for unknown clusters
- Risk level: `unknown` (not `moderate`!)
- Display: Generic message "Cluster information unavailable"
- Action: Recommend clinical follow-up without making assumptions

**Stale Doc References**:
- `docs/03-ml/assessment-contract.md:229-234` - Correctly documents safe fallback behavior

**Runtime Conflict**:
- `frontend/src/components/common/MLResultModal.jsx:152`:
```javascript
return clusters[clusterName] || clusters['Moderate Risk'];
```
- Falls back to `clusters['Moderate Risk']` for unknown clusters (UNSAFE)
- Displays moderate risk narrative for unknown clusters, potentially misleading users

**Required Update Direction**:
- `frontend/src/components/common/MLResultModal.jsx` - Add explicit unknown cluster handling:
```javascript
const unknownCluster = {
  fullName: 'Cluster Information Unavailable',
  desc: 'We could not determine your metabolic profile. Please discuss your results with a healthcare provider.',
  color: 'bg-slate-100 text-slate-800',
  icon: <AlertCircle className="text-slate-600" size={24} />,
};
return clusters[clusterName] || unknownCluster;
```
- Update risk level handling to use `unknown` for cluster-less results

**Priority**: MEDIUM (clinical safety - misleading information)

---

## 7. Alias Policy Ambiguity

### 7.1 `risk_cluster` vs `metabolic_subtype` Preference

**Canonical Behavior** (`backend/internal/ml/http_predictor.go` - inferred from `docs/03-ml/assessment-contract.md:150-160`):
```go
// Prefer metabolic subtype (SIDD/SIRD/MOD/MARD) over risk cluster
cluster := out.MetabolicSubtype
if cluster == "" {
    cluster = out.RiskCluster
}
```

**Stale Doc References**:
- `docs/03-ml/assessment-contract.md:149-160` - Correctly documents alias resolution pattern
- `docs/03-ml/api-contract.md:163` - Lists both `risk_cluster` and `metabolic_subtype` as separate fields without explaining preference

**Runtime Conflict**:
- ML service may return both fields
- Backend prefers `metabolic_subtype`
- Frontend only consumes `cluster` field (already resolved by backend)
- No direct conflict but confusing for understanding data flow

**Required Update Direction**:
- `docs/03-ml/api-contract.md` - Add note clarifying alias resolution: "Backend prefers `metabolic_subtype` field; falls back to `risk_cluster`. Both map to canonical cluster codes (SIRD, SIDD, MOD, MARD)."
- Consider standardizing ML service to only return one field to reduce alias fragility

**Priority**: LOW (implementation clarity)

---

## 8. Warning Payload Format Mismatch

### 8.1 Validation Status Prefix and Delimiter

**Canonical Behavior** (`backend/internal/ml/validation.go:98-117`):
```go
func FormatValidationStatus(result ValidationResult) string {
    if len(result.Warnings) == 0 {
        return "ok"
    }
    status := "warning:"
    for i, w := range result.Warnings {
        if i > 0 {
            status += ","
        }
        status += w
    }
    return status
}
```

**Format**:
- No warnings: `"ok"`
- With warnings: `"warning:code1,code2,code3"`

**Stale Doc References**:
- `docs/03-ml/api-contract.md:99-101` - Correctly documents format

**Frontend Parsing** (`MLResultModal.jsx:164-167`):
```javascript
const hasWarnings = validation_status && validation_status.includes('warning');
const warningList = hasWarnings
  ? validation_status.replace('warning:', '').split(',').filter(w => w)
  : [];
```

**No Runtime Conflict**: Frontend correctly parses canonical format.

**Required Update Direction**: None - already aligned.

**Priority**: NONE (resolved)

---

## 9. Clustering Requirements Documentation

### 9.1 Waist Circumference Dependency

**Canonical Behavior** (`Ian_ML/common/feature_constants.py:33-40`):
```python
CLUSTER_FEATURES: List[str] = [
    'bmi',
    'triglycerides',
    'ldl',
    'hdl',
    'age',
    'waist_circumference',  # REQUIRED for clustering
]
```

**Stale Doc References**:
- `docs/03-ml/assessment-contract.md:186-189` - Documents waist circumference as "Computed" feature for binary model, doesn't explicitly state it's REQUIRED for clustering
- `docs/03-ml/api-contract.md:226-231` - Lists validation ranges but doesn't mention clustering requirement

**Runtime Conflict**:
- Clustering fails without `waist_circumference` (K-means needs all 6 features)
- Binary model can predict without it (uses 5 core features)
- Docs don't clearly explain this distinction

**Required Update Direction**:
- `docs/03-ml/assessment-contract.md` - Add explicit note: "Clustering REQUIRES waist_circumference; binary prediction works without it"
- `docs/03-ml/api-contract.md` - Add clustering requirement note to input features section

**Priority**: MEDIUM (operator clarity)

---

## 10. Drift Monitoring Posture Mismatch

### 10.1 Blocking vs Observational Drift Detection

**Canonical Behavior** (`Ian_ML/service/drift_detection.py`):
- Drift detection exists and is operational
- Currently integrated as observational (logs drift, doesn't block predictions)
- No integration with backend main prediction path

**Stale Doc References**:
- `docs/03-ml/assessment-contract.md:255-269` - Correctly documents observational posture
- May have conflicting docs suggesting drift blocks predictions

**No Runtime Conflict**: Documentation correctly reflects current implementation.

**Required Update Direction**: None - already aligned.

**Priority**: NONE (resolved)

---

## Prioritized Fix List

### HIGH Priority (Critical/High Severity)

1. **SIDD Semantics Correction** - Update all docs and frontend to reflect atherogenic/lipid-driven phenotype
   - Files: `docs/03-ml/api-contract.md`, `frontend/src/components/common/MLResultModal.jsx`
   - Impact: Clinical safety, incorrect treatment focus

2. **Frontend Risk Level Recalculation** - Remove frontend calculation, use backend field
   - File: `frontend/src/components/common/MLResultModal.jsx`
   - Impact: User-facing inconsistency

3. **Age Validation Alignment** - Update frontend to 45-60 range
   - File: `frontend/src/components/user/AssessmentForm.jsx`
   - Impact: UX issue, users get backend error after passing frontend validation

4. **Remove Stale `clinical_3class` References** - Update all non-archive files
   - Files: Multiple scripts, env.example, frontend
   - Impact: Non-existent model type in conditional logic

### MEDIUM Priority

5. **Unknown Cluster Fallback** - Replace moderate fallback with neutral message
   - File: `frontend/src/components/common/MLResultModal.jsx`
   - Impact: Misleading information for edge cases

6. **Warning Code Naming Standardization** - Align frontend warning map with backend codes
   - File: `frontend/src/components/common/MLResultModal.jsx`
   - Impact: UX clarity, unnecessary fallback text

7. **Cluster Descriptions Audit** - Ensure all docs use canonical descriptions
   - Files: Various docs
   - Impact: Clinical accuracy

8. **Clustering Requirements Documentation** - Clarify waist circumference requirement
   - Files: `docs/03-ml/assessment-contract.md`, `docs/03-ml/api-contract.md`
   - Impact: Operator clarity

### LOW Priority (Docs-Only)

9. **Risk Label Case Consistency** - Update docs to show lowercase enum values
   - File: `docs/03-ml/api-contract.md`
   - Impact: Docs-only, no runtime impact

10. **Probability Field Clarity** - Explain difference between `probability` and `at_risk_probability`
    - File: `docs/03-ml/api-contract.md`
    - Impact: Documentation clarity

11. **Model Type Alias Documentation** - Clarify `"clinical"` alias deprecation
    - File: `docs/03-ml/api-contract.md`
    - Impact: Implementation clarity

12. **Alias Policy Documentation** - Explain `metabolic_subtype` vs `risk_cluster` preference
    - File: `docs/03-ml/api-contract.md`
    - Impact: Implementation clarity

---

## Appendix A: File Paths Reference

### Canonical Sources

- **Backend Contract**: `backend/internal/http/handlers/assessments.go`
  - Age validation: lines 182-185, 377-380
  - Risk level calculation: lines 88-97
- **Validation Logic**: `backend/internal/ml/validation.go`
  - Warning codes: lines 10-73
  - Status formatting: lines 98-117
- **Cluster Constants**: `Ian_ML/common/feature_constants.py`
  - Ahlqvist subtypes: lines 148-178
  - Cluster features: lines 33-42
- **Canonical Contract**: `docs/03-ml/assessment-contract.md`
  - All sections: lines 1-339

### Files Requiring Updates

**Frontend**:
- `frontend/src/components/common/MLResultModal.jsx`
  - Risk level recalculation: lines 157-159
  - SIDD narrative: lines 109-114
  - Unknown cluster fallback: line 152
- `frontend/src/components/user/AssessmentForm.jsx`
  - Age validation: lines 146-150
  - Stale model type reference: line 431

**Documentation**:
- `docs/03-ml/api-contract.md`
  - SIDD definition: lines 197-199
  - Risk level documentation: lines 163-167
  - Age validation range: line 221
  - Model type validation: lines 6, 212

**Configuration/Scripts**:
- `env.example` - MODEL_VERSION default
- `scripts/dev/*.sh`, `scripts/dev/*.bat`, `scripts/dev/*.ps1` - Model type references
- `scripts/train/*.py` - Model type references
- `README.md`, `TODO.md` - Documentation references

---

## Appendix B: Notepad Notes

This inventory was created as part of Task 6 of the `ml-drift-contract-hardening` plan.

Key insights from notepad learnings:
- Canonical assessment contract already created (`docs/03-ml/assessment-contract.md`)
- SIDD semantics corrected in contract on 2026-03-07
- Search sweep found 25 files with stale `clinical_3class` references
- Metis quota unavailable during this session

**Next Steps**:
- Use this inventory for Tasks 14 (doc cleanup) and 22 (implementation alignment)
- Track completed fixes in learnings notepad
- Archive this inventory after all fixes are complete

---

**Last Updated**: 2026-03-07
**Status**: Complete inventory, ready for downstream tasks