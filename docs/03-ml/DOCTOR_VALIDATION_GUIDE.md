# DIANA Clinical Model - Doctor Validation Guide

> Version: `binary_v2_no_bp`
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

The screening model predicts diabetes risk **without HbA1c/FBS as features** to reduce circularity at inference time. The primary mode for validation is the **binary_v2_no_bp screening model** (Normal vs At‑Risk).

### Inputs

Required base inputs:

 - BMI
 - triglycerides
 - LDL
 - HDL
 - age
 - waist_circumference

Optional lifestyle:

- smoking
- activity
- alcohol

The predictor computes engineered features internally for the 13‑feature screening contract.

### Outputs

- `predicted_status` (Normal / At‑Risk)
- `risk_score` (0-100)
- `risk_cluster` (Low / Low-Moderate / Moderate / High Risk)
- probabilities (`probability`)

---

## Verified Performance Snapshot

Source: `models/binary_v2_no_bp/results/best_model_report.json`

- Best model: Logistic Regression
- Validation method: Nested LOGO (outer) + GroupKFold pipeline CV (inner)
- AUC-ROC: `0.7267`
- Sensitivity: `0.7112`
- Specificity: `0.6293`
- Decision threshold (At‑Risk): `0.478`

Interpretation: tuned for high at‑risk capture; false positives are expected.

### Binary Model Evaluation (At‑Risk vs Normal)

Source: `models/binary_v2_no_bp/results/best_model_report.json`

- **Best model:** Logistic Regression (Threshold: 0.478)
- **Validation method:** Nested LOGO (outer) + GroupKFold pipeline CV (inner)
- **AUC-ROC:** `0.7267`
- **Sensitivity:** `0.7112`
- **Specificity:** `0.6293`
- **NPV:** `0.6558`

#### February 2026 Specificity Optimization

The current binary_v2_no_bp screening model uses a calibrated threshold (0.478) to balance sensitivity and specificity for screening:

1. **Threshold selection**: prioritize at‑risk recall while preserving usable specificity.
2. **Model selection**: compare Logistic Regression and Random Forest; select best by LOGO AUC.

**Results:** Sensitivity (`0.7112`) with specificity (`0.6293`) is acceptable for screening; Logistic Regression won the cross‑validated pipeline competition.

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
bash scripts/dev/retrain-binary.sh
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
- `Ian_ML/service/server.py` (`/predict?model_type=binary_v2_no_bp`)
- `Ian_ML/service/predict.py` (`BinaryV2NoBPPredictor`)

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
