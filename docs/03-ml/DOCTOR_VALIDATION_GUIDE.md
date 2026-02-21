# DIANA Clinical Model - Doctor Validation Guide

> Version: `clinical_3class`  
> Last updated: 2026-02-21  
> Purpose: safe, evidence-based doctor validation protocol

---

## Current Readiness Position

Doctor validation is **allowed in study mode** with strict guardrails:

- use `train_binary_v2_no_bp.py` artifacts as the evidence source,
- use `run_validation.py` for prediction runs (defaults to the binary_v2_no_bp screening model),
- treat outputs as screening support only (not diagnosis).

---

## Model Scope

The clinical model predicts diabetes risk **without HbA1c/FBS as features** to reduce circularity at inference time. The primary mode for validation is the **binary_v2_no_bp screening model** (Normal vs At-Risk).

### Inputs

Required base inputs:

- BMI
- triglycerides
- LDL
- HDL
- age
- systolic
- diastolic

Optional lifestyle:

- smoking
- activity
- alcohol

The predictor computes engineered features internally for the 16-feature model contract.

### Outputs

- `predicted_status` (Normal / Pre-diabetic / Diabetic)
- `risk_score` (0-100)
- `risk_cluster` (Low / Low-Moderate / Moderate / High Risk)
- probabilities (`probability`, `at_risk_probability`)

---

## Verified Performance Snapshot

Source: `models/clinical_3class/results/best_model_report.json`

- Best model: Logistic Regression
- Validation method: Nested LOGO (outer) + GroupKFold pipeline CV (inner)
- AUC-ROC (weighted OVR): `0.6942`
- Recall by class:
  - Normal: `0.1791`
  - Pre-diabetic: `0.4726`
  - Diabetic: `0.7292`
- Decision thresholds:
  - Pre-diabetic: `0.30`
  - Diabetic: `0.20`

Interpretation: tuned for high at-risk capture; false positives are expected.

### Binary Model Evaluation (At-Risk vs Normal)

Source: `models/binary_v2_no_bp/results/best_model_report.json`

- **Best model:** Logistic Regression (Threshold: 0.49)
- **Validation method:** Nested LOGO (outer) + GroupKFold pipeline CV (inner)
- **AUC-ROC:** `0.726`
- **Sensitivity:** `0.713`
- **Specificity:** `0.620`
- **NPV:** `0.654`

#### February 2026 Specificity Optimization

The original binary_v2_no_bp screening model threshold (0.31) created too many false positives (specificity 0.308). We performed a targeted optimization to rebalance the screening tradeoff:

1. **Rebalanced objective function**: weighted specificity higher in the threshold search (0.30 vs 0.25) while keeping sensitivity as primary constraint (0.35).
2. **Raised screening validity floor**: from `specificity >= 0.30` to `>= 0.40`.
3. **Broadened regularization search**: Expanded Logistic Regression `C` parameter grid (`[0.01, 3.0]`).
4. **Introduced tree ensemble**: Added LightGBM to the pipeline competition.

**Results:** Specificity improved by 101% (`0.308 -> 0.620`) while maintaining valid sensitivity (`0.713`). The false positive rate dropped from 69% to 38%, making the model significantly more viable for clinical triage without overwhelming resources. Logistic Regression won the cross-validated pipeline competition.

---

## Scientific Caveats You Must State

1. **Training population** is US NHANES; local generalization is not guaranteed.
2. **Label construction** in `Ian_ML/training/data_processing.py` uses DIQ010 self-report with HbA1c override, not purely independent adjudication.
3. **Study cohort policy** remains postmenopausal women age 45-60.
4. **Clinical role** is triage/screening support, not diagnostic replacement.

---

## Required Validation Workflow

### 1) Prepare and refresh artifacts

```bash
bash scripts/dev/retrain-binary_v2_no_bp.sh
```

### 2) Verify clinical model defensibility artifacts are consistent

```bash
python scripts/thesis/generate_defensibility_outputs.py
```

This script now validates artifact integrity and does not generate synthetic metrics.

### 3) Run doctor batch validation

```bash
python scripts/validation/run_validation.py --input validation_data.csv --output predictions.csv
```

### 4) Compare to ground truth

Compute:

- sensitivity
- specificity
- PPV
- NPV
- confusion matrix

Recommended: stratify review by age band, risk score band, and clinic context.

---

## Local Study Dataset Requirements

Each record should include:

- required model inputs,
- confirmatory labs (HbA1c/FBS) for clinician review,
- clinician-assigned diagnosis or adjudicated status.

Suggested minimum for initial signal: 50-100 records.  
For deployment-level confidence, use a larger and multi-site sample.

---

## Operational Path Checks

Primary serving path:

- `backend/internal/http/handlers/assessments.go`
- `backend/internal/ml/http_predictor.go`
- `Ian_ML/service/server.py` (`/predict?model_type=clinical`)
- `Ian_ML/service/predict.py` (`ClinicalPredictor`)

Age guardrail in backend assessment flow is enforced at `45-60` to match the target study population.

---

## Not Allowed for Scientific Claims

- Using quick/synthetic artifact scripts as if they were validation evidence.
- Claiming diagnostic performance based only on internal NHANES evaluation.
- Deploying for autonomous decision-making without clinician oversight.

---

## Decision Criteria After Doctor Validation

Move forward only if all are met:

1. Sensitivity and false-positive load are acceptable for clinic workflow.
2. Clinicians judge outputs as interpretable and actionable.
3. No harmful subgroup pattern appears in local data.
4. Governance and escalation pathway are defined for uncertain predictions.

If not met, keep in research mode and retrain/recalibrate with local data.
