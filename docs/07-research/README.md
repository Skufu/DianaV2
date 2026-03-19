# DIANA Research Reference

> Purpose: research/manuscript support docs for DIANA V2

## Scope
This folder supports manuscript writing and defense preparation. For runtime implementation truth, use:
- `../03-ml/assessment-contract.md`
- `../03-ml/feature-documentation.md`
- `../03-ml/methodology.md`

## Current Index
| Document | Purpose | Key Content |
|---|---|---|
| `paper-requirements.md` | Paper checklist and requirements | Thesis structure, required figures/tables |
| `manuscript-updates.md` | Ready-to-paste manuscript revisions | Results and discussion updates |
| `methodology-style-workflow.md` | Safe style-transfer workflow for Chapter 3 | SEIRViz-derived tone profile and rewrite prompt pattern |
| `ml_algorithms.md` | Algorithm framing for manuscript | LR, RF, K-means narrative |
| `metrics.md` | Metric definitions and interpretation | AUC, F1, sensitivity and related measures |
| `data_pipeline.md` | Data processing narrative | NHANES pipeline and preparation story |
| `diabetes_subgroups.md` | Subtype narrative support | SIRD, SIDD, MOD, MARD discussion |
| `ui_requirements.md` | UI requirements for research alignment | Dashboard and figure alignment notes |

## Important Alignment Notes
- Active screening model discussion should align with `binary_v2_no_bp` (non-circular screening).
- Do not present HbA1c/FBS as active screening inputs for `binary_v2_no_bp`.
- If manuscript language conflicts with runtime behavior, align wording to `../03-ml/assessment-contract.md`.

## Paper Source Context
- Title: DIANA: A Predictive Model-Based Application Using Selected Blood Biomarkers for Cluster-Based Identification of Type 2 Diabetes Risk in Menopausal Women
- Target population: postmenopausal women aged 45-60
- Development dataset: NHANES
