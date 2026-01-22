# DIANA Paper RAG Reference

> **Purpose**: Token-efficient reference documents for AI-assisted development aligned with the research paper.

## Quick Index

| Document | Purpose | Key Content |
|----------|---------|-------------|
| [biomarkers.md](biomarkers.md) | Blood & non-blood biomarkers | FBS, HbA1c, TG, LDL, HDL, TC, BMI, Age |
| [diabetes_subgroups.md](diabetes_subgroups.md) | T2DM cluster classification | SIDD, SIRD, MOD, MARD definitions |
| [ml_algorithms.md](ml_algorithms.md) | ML model requirements | LR, RF, XGBoost, K-Means specs |
| [feature_selection.md](feature_selection.md) | Entropy & Information Gain | IG formulas, feature ranking |
| [data_pipeline.md](data_pipeline.md) | Data processing steps | NHANES → Training data flow |
| [metrics.md](metrics.md) | Evaluation metrics | Accuracy, F1, AUC-ROC thresholds |
| [ui_requirements.md](ui_requirements.md) | Application interface | Dashboard, Analytics, Visualization |
| [codebase_alignment.md](codebase_alignment.md) | Paper ↔ Code mapping | What's implemented vs needed |

---

## Usage for AI

1. **Finding specific requirements**: Search this folder for keywords
2. **Quick reference**: Each file is self-contained and concise
3. **Code changes**: Always check `codebase_alignment.md` first

## Paper Source

- **Title**: DIANA: A Predictive Model-Based Application Using Selected Blood Biomarkers for Cluster-Based Identification of Type 2 Diabetes Risk in Menopausal Women
- **Population**: Postmenopausal women aged 45-60 years
- **Data Source**: NHANES (development), Philippine hospital records (target)

---

## Search Keywords

`DIANA` `diabetes` `menopausal` `postmenopausal` `biomarkers` `HbA1c` `FBS` `lipid` `K-Means` `clustering` `SIDD` `SIRD` `MARD` `MOD` `Random Forest` `XGBoost` `Information Gain` `entropy` `AUC-ROC` `risk prediction` `NHANES`
