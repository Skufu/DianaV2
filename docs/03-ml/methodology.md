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
- **Weighted K-Means** with k=4 is used for subtype-oriented grouping (SIRD-like, SIDD-like, MOD-like, MARD-like)
- Clustering requires the cluster feature set defined in runtime constants
- Assessment-level cluster output may be unavailable if required clustering inputs are missing
- **Critical Runtime Gating:** Subtype clustering is performed **only for At-Risk predictions** (predicted_status = "At-Risk"). Normal predictions receive neutral sentinel subtype semantics (risk_cluster="N/A", metabolic_subtype="N/A", empty description and treatment focus) at the ML response boundary, which the backend canonicalizes to blank values at persistence.
- **Expert-Elicited Weighted Distance Metric:** The clustering uses a weighted Euclidean distance metric rather than equal-feature weighting. Feature weights were elicited through single-expert clinical consultation to prioritize biomarkers with stronger pathophysiological relevance to insulin resistance and metabolic dysfunction. The weighted distance is computed post-standardization as: `d(x, c) = sqrt(sum(w_j * (x_j - c_j)^2))` for each sample x and centroid c, where w_j is the expert-specified weight for feature j.

**Expert-Specified Feature Weights (single-expert elicitation):**
- `triglycerides`: 2.0 (lipid dysregulation marker)
- `ldl`: 2.5 (atherogenic risk - highest weight)
- `hdl`: 1.2 (protective lipid factor)
- `bmi`: 1.5 (obesity driver)
- `waist_circumference`: 2.0 (visceral adiposity proxy)
- `age`: 1.0 (baseline weight)

**Expert Elicitation Limitation:** The weight configuration represents single-expert elicitation, not multi-specialist consensus or clinical validation. This is a methodological limitation acknowledged openly—weights reflect one specialist's clinical judgment rather than empirically validated importance. Future work should expand elicitation to a multi-expert Delphi process for more robust weight derivation.

**Heuristic Proxy Context:** The Ahlqvist-inspired subtype labels (SIRD-like, SIDD-like, MOD-like, MARD-like) are heuristic proxy labels derived from clustering biomarker patterns in NHANES data. They should be interpreted as screening stratification tools for identifying dominant metabolic patterns within at-risk populations, not as validated biological subtype diagnoses or definitive treatment prescriptions. These labels inform clinical prioritization but do not replace clinical judgment, confirmatory diagnostic testing, or specialist evaluation. DIANA-generated outward-facing subtype semantics use the "**-like**" suffix (SIRD-like, SIDD-like, MOD-like, MARD-like) to emphasize proxy status.

**Raw-Centroid Label Assignment:** Clusters were assigned Ahlqvist-inspired subtype labels using a deterministic centroid-based algorithm on **inverse-transformed centroids** (raw clinical units), not standardized z-scores. The ranking rules operate on LAP, LDL, and BMI values in their native clinical units (e.g., LAP score, LDL in mg/dL, BMI in kg/m²).

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
