# DIANA ML Methodology

## Purpose
This document summarizes the active ML methodology used in DIANA V2.

Canonical implementation contract and result semantics are defined in:
- `assessment-contract.md`
- `api-contract.md`
- `feature-documentation.md`

## Method Framing
DIANA uses two model contexts:

1. **Non-circular screening** (`binary_v2_no_bp`): operational screening path
2. **ADA-oriented reference/diagnostic context** (`ada`): includes diagnostic glucose markers

The operational focus is the non-circular screening path.

## Population And Data Strategy
- Development cohort: NHANES postmenopausal women
- Population constraints: female, age 45-60, postmenopausal context
- Objective: maintain a deployable screening pipeline while local target datasets are still evolving

## Labeling Vs Screening Inputs
Critical distinction:
- HbA1c and FBS are used in diagnostic/labeling contexts
- HbA1c and FBS are not active screening inputs for `binary_v2_no_bp`

This separation prevents circular prediction logic in screening mode.

## Active Screening Feature Set
The active no-BP screening model uses a 12-feature contract:
- Core biomarkers/demographics: `bmi`, `triglycerides`, `ldl`, `hdl`, `age`
- Engineered features: `bmi_category`, `tg_hdl_ratio`, `metabolic_syndrome_score`
- Lifestyle encodings: `smoking_encoded`, `activity_encoded`, `alcohol_encoded`
- Additional clinical variable: `waist_circumference`

For feature definitions and derivation details, use `feature-documentation.md`.

## Training And Evaluation Strategy
- Candidate classifiers: Logistic Regression and Random Forest
- Class imbalance approach: class weighting and threshold strategy (no synthetic oversampling in active no-BP path)
- Validation strategy: nested LOGO (outer) plus GroupKFold (inner)
- Primary model selection metric: AUC-ROC
- Secondary criteria: F1 and interpretability

## Current Performance Position
- Non-circular screening performance around AUC ~0.72 is treated as acceptable for this use case
- Clinical objective is sensitivity-aware screening, not replacement of diagnostic testing

## Clustering Methodology
- K-means with k=4 is used for subtype-oriented grouping (SIDD, SIRD, MOD, MARD)
- Clustering requires the cluster feature set defined in runtime constants
- Assessment-level cluster output may be unavailable if required clustering inputs are missing

Cluster semantics and frontend/backend expectations are canonicalized in `assessment-contract.md`.

## Reproducibility Notes
- Keep random seeds fixed for comparability across retraining runs
- Keep training/evaluation artifacts versioned with model lineage metadata
- Ensure docs and runtime metadata stay aligned when model artifacts change

## Related References
- `assessment-contract.md`
- `api-contract.md`
- `feature-documentation.md`
- `../07-research/manuscript-updates.md`
- `../07-research/paper-requirements.md`
