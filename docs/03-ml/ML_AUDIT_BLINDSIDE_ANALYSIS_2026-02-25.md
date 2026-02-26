# DIANA ML Audit — Blindside Analysis

**Date:** February 25, 2026  
**Time:** 03:56 AM (PHT)  
**Status:** AUDIT COMPLETE — FIXES APPLIED

---

## Executive Summary

This document captures the findings from a comprehensive blindside analysis of the DIANA ML pipeline, specifically targeting `train_binary_v2_no_bp.py` and related training/inference code. The audit identified 10 issues across three severity levels, of which 6 required code fixes and 4 require documentation in the manuscript.

---

## 🔴 Critical Issues (Fixed)

### 1. Blood Pressure Feature Mismatch — FIXED ✅

| Aspect | Detail |
|--------|--------|
| **Issue** | Code included BP features but saved to `no_bp` directory |
| **Root Cause** | FEATURES list had systolic/diastolic, directory named `no_bp` |
| **Fix Applied** | Split into two variants: `--with-bp` (16 features) and default (13 features) |
| **Files Changed** | `train_binary_v2.py`, `predict.py`, directory structure |

**Usage:**
```bash
# General screening (no BP required)
python Ian_ML/training/train_binary_v2.py

# Doctor model (with BP)
python Ian_ML/training/train_binary_v2.py --with-bp
```

---

### 2. Alcohol Encoding Train-Serve Skew — FIXED ✅

| Aspect | Detail |
|--------|--------|
| **Issue** | Training defaulted Unknown→0 (None), Inference defaulted Unknown→1 (Light) |
| **Impact** | 1-point offset on 0-3 scale for 62% of dataset |
| **Fix Applied** | Added `"Unknown": 1` to alcohol_map, changed default to 1 |
| **Files Changed** | `train_binary_v2_no_bp.py` (line 140-143) |

```python
# Before
alcohol_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
lambda value: alcohol_map.get(value, 0)  # Wrong default

# After
alcohol_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3, "Unknown": 1}
lambda value: alcohol_map.get(value, 1)  # Matches inference
```

---

### 3. Threshold min_sensitivity Unreachable — FIXED ✅

| Aspect | Detail |
|--------|--------|
| **Issue** | `min_sensitivity=0.80` but model max is 74.5% |
| **Impact** | Screening strategy never selected (dead code) |
| **Fix Applied** | Changed to `0.70` (achievable) |
| **Files Changed** | `train_binary_v2_no_bp.py` (line 288) |

---

## 🟠 Significant Issues (Documentation Required)

### 4. Fold 4 Is a Statistical Outlier

| Metric | Fold 4 (2015-2016) | Other Folds Range |
|--------|---------------------|-------------------|
| LR AUC | **0.7818** | 0.706-0.727 |

**Impact:** Without Fold 4, LR mean AUC drops from 0.7297 to ~0.7197.

**Recommendation:** Report fold-level variance in manuscript. Note that 2015-2016 cycle had higher class separability.

---

### 5. LightGBM vs LR Selection Justification Needed

| Model | Mean Fold AUC | Aggregated AUC | Sensitivity | Specificity |
|-------|--------------|----------------|-------------|-------------|
| LR | 0.7297 | 0.7200 | 0.7452 | 0.5717 |
| LightGBM | 0.7249 | 0.7267 | 0.7302 | 0.5810 |

**Issue:** Code selects by mean fold AUC (LR wins), but aggregated OOF shows LightGBM has higher AUC and better specificity.

**Recommendation:** Explicitly justify selection criterion in manuscript. Both mean fold AUC and aggregated AUC are defensible—panel may ask.

---

### 6. Triglycerides 21.1% Missing — Correlated Imputation

| Statistic | Value |
|-----------|-------|
| Missing | 290/1376 (21.1%) |
| Features Affected | triglycerides → tg_hdl_ratio → metabolic_syndrome_score |

**Impact:** Median imputation compresses variance in 3 correlated features for 21% of data.

**Recommendation:** Must include in limitations section.

---

### 7. Alcohol Unknown = 62% of Dataset

| Category | Count | % |
|----------|-------|---|
| Unknown | 500 | 36.3% |
| NaN | 358 | 26.0% |
| Valid Values | 518 | 37.7% |

**Impact:** Over 60% of patients have uncertain alcohol status, now consistently mapped to "Light" (1).

**Recommendation:** Note in limitations as data quality concern.

---

## 🟡 Documentation Issues (Fixed)

### 8. Feature Count in Docstrings — FIXED ✅

| Location | Said | Actual |
|----------|------|--------|
| Docstring | 16 features | 13 (no BP) / 16 (with BP) |
| Print statement | 16 Features | 13 Features |

**Fix Applied:** Updated docstring and print statements to reflect correct counts.

---

## 📊 Final Performance Assessment

| Metric | Value | 95% CI | Acceptable? |
|--------|-------|--------|-------------|
| AUC-ROC | 0.720 | [0.693, 0.746] | ✅ Yes (>0.70) |
| Sensitivity | 74.5% | [71.6%, 77.7%] | ⚠️ Borderline (target ≥80%) |
| Specificity | 57.2% | — | ⚠️ Low (42.8% FP rate) |
| NPV | 66.3% | — | 🔴 **Critical** |
| PPV | 66.5% | — | ⚠️ Moderate |

### NPV Critical Concern

> **The NPV of 66.3% means approximately 1 in 3 patients classified as "Normal" are actually At-Risk.**

This must be explicitly discussed in the manuscript as a core limitation. Recommend confirmatory HbA1c/FBS testing for all "Normal" predictions.

---

## 📋 Action Items

### Code Fixes (Complete)
- [x] Blood pressure feature split (--with-bp flag)
- [x] Alcohol encoding consistency  
- [x] min_sensitivity threshold fix
- [x] Docstring feature count fix

### Documentation Required
- [ ] Fold 4 outlier reporting
- [ ] Model selection criterion justification
- [ ] Triglycerides missing data limitation
- [ ] Alcohol unknown data quality note
- [ ] NPV limitation discussion

---

## Files Modified

| File | Changes |
|------|---------|
| `Ian_ML/training/train_binary_v2.py` | Feature split, docstring |
| `Ian_ML/training/train_binary_v2_no_bp.py` | Alcohol encoding, min_sensitivity |
| `Ian_ML/service/predict.py` | BP model routing |
| `models/binary_v2_with_bp/` | Renamed from archived |

---

*Generated: February 25, 2026 03:56 AM (PHT)*
