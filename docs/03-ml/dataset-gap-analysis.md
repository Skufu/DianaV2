# DIANA Dataset Gap Analysis

> **Date:** February 22, 2026  
> **Dataset:** `diana_dataset_final.csv` (n=1,376)  
> **Model:** `binary_v2_no_bp` (12 features, no blood pressure)
> **Baseline AUC:** 0.7273 ± 0.0170 (5-Fold Stratified CV, Logistic Regression)

---

## Executive Summary

The training dataset has **three features with severe structural missingness** caused by NHANES dropping survey questions across cycles. Two features (`family_history_diabetes`, `activity_encoded`) can be safely removed without harming model performance. The remaining high-missingness features (`alcohol_encoded`, `triglycerides`) still contribute meaningfully despite imputation.

---

## 1. Missing Data Overview

| Feature | Missing | Rate | Root Cause |
|---------|---------|------|------------|
| `family_history_diabetes` | 1,142 | **83.0%** | MCQ300C dropped in 5 of 6 cycles (only available 2017-2018) |
| `alcohol_encoded` | 858 | **62.4%** | ALQ variables changed/dropped in 2017-2018 and 2021-2023 |
| `triglycerides` | 290 | **21.1%** | Fasting subsample only; 100% missing in 2021-2023 cycle |
| `tg_hdl_ratio` | 290 | **21.1%** | Derived from triglycerides — inherits same missingness |
| `ldl` | 55 | 4.0% | Calculated from cholesterol panel (requires triglycerides) |
| `waist_circumference` | 28 | 2.0% | Minor exam non-completion |
| `hdl` | 28 | 2.0% | Minor lab non-completion |
| `bmi` | 11 | 0.8% | Minor exam non-completion |
| `bmi_category` | 11 | 0.8% | Derived from BMI |
| All others | 0 | 0.0% | Complete |

---

## 2. Per-Cycle Breakdown

The missingness is **structural** — entire NHANES cycles systematically lack certain variables.

| Cycle | n | `family_history` | `alcohol_use` | `triglycerides` | `physical_activity` | `BP` |
|-------|---|:-:|:-:|:-:|:-:|:-:|
| 2009-2010 | 222 | ❌ 100% | ❌ 37.4% | ✅ 1.8% | ✅ 0% | ⚠️ 5.4% |
| 2011-2012 | 190 | ❌ 100% | ❌ 39.5% | ✅ 2.1% | ✅ 0% | ⚠️ 11.1% |
| 2013-2014 | 236 | ❌ 100% | ❌ 44.5% | ✅ 0.8% | ✅ 0% | ⚠️ 6.8% |
| 2015-2016 | 229 | ❌ 100% | ❌ 41.9% | ✅ 3.9% | ✅ 0% | ⚠️ 1.7% |
| 2017-2018 | 234 | ✅ 0% | ❌ 100% | ✅ 2.6% | ✅ 0% | ⚠️ 12.0% |
| 2021-2023 | 265 | ❌ 100% | ❌ 100% | ❌ 100% | ❌ 100% | ✅ 0.4% |

> [!CAUTION]
> **2021-2023 is the most problematic cycle** — it is missing `family_history`, `alcohol_use`, `triglycerides`, AND `physical_activity` entirely. Since this is the most recent cycle (265 records = 19.3% of data), its gaps propagate heavily.

> [!IMPORTANT]
> **`family_history_diabetes` is only available in the 2017-2018 cycle** (234 records). The other 5 cycles have 100% missingness. This means 83% of the feature is median-imputed, rendering it nearly useless.

---

## 3. Feature Ablation Study

Each feature was removed one at a time and the model was re-evaluated:

| Rank | Feature | Missing % | AUC Delta | Verdict |
|:----:|---------|:---------:|:---------:|---------|
| 1 | `activity_encoded` | 0% (19.3% "Unknown") | **+0.0008** | 🔴 Safe to remove |
| 2 | `family_history_diabetes` | 83.0% | **+0.0002** | 🔴 Safe to remove |
| 3 | `bmi_category` | 0.8% | -0.0002 | 🟡 Negligible impact |
| 4 | `tg_hdl_ratio` | 21.1% | -0.0002 | 🟡 Negligible impact |
| 5 | `race_encoded` | removed | removed | removed |
| 6 | `metabolic_syndrome_score` | 0% | -0.0005 | 🟡 Minor contributor |
| 7 | `ldl` | 4.0% | -0.0006 | 🟢 Keep |
| 8 | `triglycerides` | 21.1% | -0.0018 | 🟢 Keep (despite gaps) |
| 9 | `waist_circumference` | 2.0% | -0.0022 | 🟢 Keep |
| 10 | `bmi` | 0.8% | -0.0023 | 🟢 Keep |
| 11 | `smoking_encoded` | 0% | -0.0023 | 🟢 Keep |
| 12 | `age` | 0% | -0.0051 | 🟢 Keep (important) |
| 13 | `alcohol_encoded` | 62.4% | -0.0069 | 🟢 **Keep** (important despite gaps) |
| 14 | `hdl` | 2.0% | -0.0084 | 🟢 Keep (most important) |

> [!NOTE]
> **Positive delta = removing it improves AUC.** Features with positive or near-zero delta are candidates for removal. Features with large negative delta are critical to keep.

---

## 4. Key Findings

### 4.1 Features Safe to Drop

**`family_history_diabetes`** — 83% imputed, ranks 13th of 14, removal slightly improves AUC.

**`activity_encoded`** — While 0% structurally missing, the 2021-2023 cycle has 100% "Unknown" values (mapped to `1 = Moderate`). Removing it *improves* AUC by +0.0008. The "Unknown → Moderate" imputation may be injecting noise.

### 4.2 Surprising: `alcohol_encoded` Is Valuable Despite 62.4% Missing

Despite being effectively missing for 62.4% of the data (100% in 2017-2018 and 2021-2023), alcohol use is the **2nd most important feature** (AUC drops -0.0069 without it). The 37.6% of real data carries strong predictive signal. **Keep this feature.**

### 4.3 `triglycerides` / `tg_hdl_ratio` Are Redundant

Both share identical missingness (21.1%). `triglycerides` alone contributes -0.0018 to AUC, while `tg_hdl_ratio` is nearly zero (-0.0002). Since `tg_hdl_ratio` is derived from `triglycerides / hdl`, and both parent features are already in the model, `tg_hdl_ratio` is **redundant** — but keeping it causes no harm.

### 4.4 Top 5 Most Important Features

1. **`hdl`** — Removing it drops AUC by 0.0084
2. **`alcohol_encoded`** — 0.0069 drop (despite 62% missing)
3. **`age`** — 0.0051 drop
4. **`bmi`** — 0.0023 drop
5. **`smoking_encoded`** — 0.0023 drop

---

## 5. Recommendations

### Immediate (No Retraining Required)
- [ ] Drop `family_history_diabetes` from the model feature list
- [ ] Drop `activity_encoded` from the model feature list
- [ ] Retrain `binary_v2_no_bp` with 12 features → expect AUC ≈ 0.728+
- [ ] Update frontend forms to remove family history question
- [ ] Update `feature-documentation.md` to reflect changes

### Future Considerations
- [ ] Investigate better imputation for `alcohol_encoded` (e.g., multiple imputation instead of median)
- [ ] Consider dropping `tg_hdl_ratio` and `bmi_category` as redundant derived features to simplify the model to 10 core features
- [ ] Monitor `triglycerides` availability in future NHANES cycles — if it continues to be dropped, the feature may need removal

---

## 6. Documentation Fix

The current `feature-documentation.md` incorrectly states family history has **80.7% availability**. The actual availability is **17.0%** (234 of 1,376 records). This discrepancy should be corrected.

---

*Generated: February 22, 2026, 6:02 PM PHT*  
*Analysis: 5-Fold Stratified CV, Logistic Regression (C=0.3, balanced), SimpleImputer (median)*
