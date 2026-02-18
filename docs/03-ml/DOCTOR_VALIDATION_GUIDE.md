# DIANA Clinical Model - Doctor Validation Guide

> Version: `clinical_v2`  
> Last updated: 2026-02-18  
> Purpose: safe, evidence-based doctor validation protocol

---

## Current Readiness Position

Doctor validation is **allowed in study mode** with strict guardrails:

- use `train_v2.py` artifacts as the evidence source,
- use `run_validation.py` for prediction runs,
- treat outputs as screening support only (not diagnosis).

---

## Model Scope

The clinical model predicts diabetes risk **without HbA1c/FBS as features** to reduce circularity at inference time.

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

The predictor computes engineered features internally for the 13-feature model contract.

### Outputs

- `predicted_status` (Normal / Pre-diabetic / Diabetic)
- `risk_score` (0-100)
- `risk_cluster` (Low / Low-Moderate / Moderate / High Risk)
- probabilities (`probability`, `at_risk_probability`)

---

## Verified Performance Snapshot

Source: `models/clinical_v2/results/best_model_report.json`

- Best model: Logistic Regression
- Validation method: Nested LOGO (outer) + GroupKFold pipeline CV (inner)
- AUC-ROC (weighted OVR): `0.6964`
- Recall by class:
  - Normal: `0.1573`
  - Pre-diabetic: `0.5295`
  - Diabetic: `0.7112`
- Decision thresholds:
  - Pre-diabetic: `0.25`
  - Diabetic: `0.35`

Interpretation: tuned for high at-risk capture; false positives are expected.

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
bash scripts/dev/retrain-all.sh
```

### 2) Verify defensibility artifacts are consistent

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
