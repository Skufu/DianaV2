# DIANA Clinical Model - Doctor Validation Status

> **Status**: CONDITIONAL READY  
> **Model**: `models/binary_v2_no_bp`  
> **Date**: 2026-02-23  
> **Scope**: Screening support only (not diagnostic use)

---

## Go/No-Go Verdict

The system is usable for a supervised doctor-validation study **if you follow the validated pipeline only**:

- Use artifacts from `Ian_ML/training/train_binary_v2_no_bp.py`
- Use serving path `backend -> /predict?model_type=binary_v2_no_bp -> Ian_ML/service/predict.py`
- Use validation runner `scripts/validation/run_validation.py`

Do **not** treat synthetic or hardcoded artifact generation as evidence. The artifact scripts have been hardened to avoid this.

---

## Evidence Snapshot (from `models/binary_v2_no_bp/results/best_model_report.json`)

- **Best model**: Logistic Regression
- **Validation method**: Nested LOGO (outer) + GroupKFold Pipeline CV (inner)
- **AUC-ROC**: `0.7200`
- **Accuracy**: `0.6642`
- **Sensitivity (At-Risk Recall)**: `0.7452`
- **Specificity**: `0.5717`
- **Decision threshold**: `0.4567` (Mean Optimized Threshold)
- **Population in current training set**:
  - `n=1376`
  - Age `45-60`
  - Cycles `2009-2010` to `2021-2023`

---

## Critical Scientific Guardrails

1. **Intended use**: risk screening and triage only; not a diagnostic substitute.
2. **Cohort shift risk**: trained on US NHANES; local external validation is mandatory before deployment claims.
3. **Label construction caveat**: `Ian_ML/training/data_processing.py` derives labels using DIQ010 self-report plus HbA1c override, not purely laboratory-only adjudication.
4. **Specificity trade-off**: thresholding is tuned for at-risk recall, so false positives are expected.

---

## Required Validation Flow

1. Regenerate model artifacts:

```bash
bash scripts/dev/retrain-clinical.sh
```

2. Verify defensibility artifact consistency:

```bash
python scripts/thesis/generate_defensibility_outputs.py
```

3. Run doctor validation batch:

```bash
python scripts/validation/run_validation.py --input your_patients.csv --output predictions.csv
```

4. Compare against clinician/ground-truth labels (sensitivity, specificity, PPV, NPV, confusion matrix).

---

## Operational Notes

- Backend assessment creation/update now consistently enforces the study population age band `45-60`.
- Required serving features (13 total, no BP, no family history):
  - BMI, triglycerides, LDL, HDL, age, waist circumference
  - optional: smoking, activity, alcohol

---

## Recommendation

Proceed with **doctor validation study mode**, not production rollout.  
Success criteria should include:

- stable performance on local cohort,
- acceptable false-positive burden for clinic workflow,
- clinician agreement on actionability.
