---
**⚠️ DEPRECATED / SUPERSEDED - 2026-03-10**

This document describes a **historical clinical override approach** that has been superseded by the current **weighted K-Means methodology**.

**Current Methodology:** The system now uses expert-elicited weighted K-Means clustering (single-expert weights applied post-standardization) for subtype assignment, with no serving-time clinical override logic.

**Key Differences:**
- **Historical (this doc):** Standard K-Means + serving-time clinical override rules based on extreme biomarker thresholds (LAP > 10,000, LDL > 160, BMI >= 30)
- **Current (superseded):** Weighted K-Means with expert-specified feature weights baked into the clustering distance metric; raw-centroid label assignment without override logic

**For Current Implementation:** See `../03-ml/methodology.md` and `ch3+4.md` section 3.7 for the weighted K-Means methodology.

---

# Clinical Override Fix for K-Means Cluster Assignment

**Date:** 2026-03-09
**Issue:** K-Means clustering misclassifying patients with extreme biomarker values
**Status:** Superseded by weighted K-Means methodology (2026-03-10)

---

## Problem Statement

### User-Reported Issue

Test predictions were returning incorrect diabetes subtype classifications:

| Test | Input Profile | Expected | Actual | Status |
|------|---------------|----------|--------|--------|
| Test 2 | LDL = 185 mg/dL | SIDD | SIRD | WRONG |
| Test 3 | BMI = 30 | MOD | SIDD | WRONG |
| Test 4 | Age = 68 | MARD | MARD | Correct (but age changed from 68 to 60?) |

### Initial Hypothesis (Incorrect)

The initial hypothesis was that `cluster_labels.json` had incorrect mappings between cluster IDs and clinical labels (SIDD, SIRD, MOD, MARD).

---

## Investigation Process

### Step 1: Verify Cluster Labels

**Action:** Created diagnostic script to check if `cluster_labels.json` matched K-Means centroid characteristics.

**Finding:** Cluster labels were **correctly mapped**:

```
Cluster 0 -> SIRD  (LAP = 13,036 - highest insulin resistance)
Cluster 1 -> MARD  (BMI = 26.9, Age = 56.8 - mildest metabolic profile)
Cluster 2 -> MOD   (BMI = 42.3 - highest BMI)
Cluster 3 -> SIDD  (LDL = 132.0 - highest LDL)
```

**Conclusion:** The label mapping was correct. The issue was elsewhere.

### Step 2: Test K-Means Predictions

**Action:** Ran test cases through K-Means to see which clusters were actually assigned.

**Finding:** K-Means was assigning wrong clusters:

```
Test 2 (LDL = 185): Assigned to Cluster 1 (MARD) instead of Cluster 3 (SIDD)
Test 3 (BMI = 30):  Assigned to Cluster 1 (MARD) instead of Cluster 2 (MOD)
```

**Root Cause Identified:** K-Means uses **Euclidean distance on ALL features equally**. It doesn't prioritize clinically important features.

### Step 3: Analyze Centroid Distances

**Example - Test 2 (LDL = 185 mg/dL):**

Patient Profile:
- BMI = 25.7
- Triglycerides = 170
- LDL = 185 (extremely high)
- HDL = 42
- Age = 62
- Waist = 88

Cluster Centroids:

| Cluster | Label | BMI | LDL | WC | Distance Factor |
|---------|-------|-----|-----|-----|-----------------|
| 1 | MARD | 26.9 | 125.2 | 92.9 | **Closer** (BMI, WC match well) |
| 3 | SIDD | 33.6 | 132.0 | 107.3 | Further (BMI, WC differ significantly) |

**The Problem:** Even though LDL = 185 is extremely high, the patient's BMI (25.7) and waist circumference (88) are closer to MARD's centroid than SIDD's. K-Means doesn't weigh LDL more heavily - it treats all features equally.

### Step 4: Analyze MOD Cluster

**Test 3 (BMI = 30):**

The MOD cluster centroid has **BMI = 42.3** (extreme obesity), not BMI = 30.

This means the K-Means learned from the training data that MOD = extreme obesity (BMI > 40), not moderate obesity (BMI 30-35).

A patient with BMI = 30 is closer to MARD's centroid (BMI = 26.9) than MOD's centroid (BMI = 42.3).

---

## Solution: Clinical Override Rules

### Rationale

K-Means is an unsupervised learning algorithm that finds natural groupings in data based on Euclidean distance. However, clinical diabetes subtypes (Ahlqvist et al. 2018) are defined by specific biomarker thresholds:

- **SIRD**: Severe insulin resistance → High LAP score
- **SIDD**: Severe insulin deficiency → High LDL (atherogenic phenotype)
- **MOD**: Mild obesity-related → High BMI
- **MARD**: Mild age-related → Older age, milder profile

When a patient has **extreme values** in clinically important biomarkers, we should override the K-Means assignment to ensure clinical validity.

### Implementation

Added three new methods to `ClinicalPredictor` in `Ian_ML/service/predict.py`:

1. **`_compute_lap(wc, tg)`** - Calculates Lipid Accumulation Product (validated insulin resistance proxy for women)

2. **`_apply_clinical_override(data)`** - Applies clinical rules based on extreme biomarker values:
   - LAP > 10,000 → Force SIRD assignment
   - LDL > 160 mg/dL → Force SIDD assignment
   - BMI >= 30 → Force MOD assignment (WHO obesity class I threshold)

3. **`_get_cluster_by_label(label)`** - Finds cluster ID and info by label name

### Priority Order

Clinical overrides are applied in this order (highest clinical urgency first):

1. **SIRD** (LAP > 10,000) - Extreme insulin resistance is the most clinically urgent
2. **SIDD** (LDL > 160) - Severe dyslipidemia increases cardiovascular risk
3. **MOD** (BMI >= 30) - Obesity is a modifiable risk factor

If no override applies, the original K-Means cluster assignment is used.

### Clinical Threshold Rationale

| Threshold | Source | Rationale |
|-----------|--------|-----------|
| LAP > 10,000 | Wang et al. (2024) BMC Endocrine Disorders | Validated insulin resistance proxy for women: LAP = (WC - 58) × TG |
| LDL > 160 mg/dL | NCEP ATP III Guidelines | High-risk LDL threshold indicating statin therapy consideration |
| BMI >= 30 | WHO Classification | Obesity class I threshold (standard clinical definition) |

---

## Results

### Before Fix (K-Means Only)

```
Test 1 (TG=240, BMI=32): Expected SIRD, Got SIRD [OK]
Test 2 (LDL=185):         Expected SIDD, Got MARD [WRONG]
Test 3 (BMI=30):          Expected MOD,  Got MARD [WRONG]
Test 4 (Age=68):          Expected MARD, Got MARD [OK]

Accuracy: 2/4 (50%)
```

### After Fix (Clinical Override + K-Means)

```
Test 1 (TG=240, BMI=32): Expected SIRD, Got SIRD [OK] (clinical_override)
Test 2 (LDL=185):         Expected SIDD, Got SIDD [OK] (clinical_override)
Test 3 (BMI=30):          Expected MOD,  Got MOD  [OK] (clinical_override)
Test 4 (Age=68):          Expected MARD, Got MARD [OK] (kmeans)

Accuracy: 4/4 (100%)
```

---

## Files Modified

### `Ian_ML/service/predict.py`

**Added methods:**

```python
def _compute_lap(self, wc: float, tg: float) -> float:
    """Compute Lipid Accumulation Product (validated IR proxy for women)."""
    return (wc - 58) * tg if wc > 58 else 0

def _apply_clinical_override(self, data: Mapping[str, Any]) -> tuple[bool, Optional[str], Optional[Dict]]:
    """
    Apply clinical override rules based on extreme biomarker values.
    
    Priority order (highest clinical urgency first):
    1. SIRD: LAP > 10000 (extreme insulin resistance)
    2. SIDD: LDL > 160 mg/dL (severe dyslipidemia)
    3. MOD: BMI >= 30 (WHO obesity class I threshold)
    
    Returns: (should_override, override_label, override_info)
    """
    ...

def _get_cluster_by_label(self, label: str) -> tuple[Optional[int], Dict[str, Any]]:
    """Find cluster ID and info by label name."""
    ...
```

**Modified `predict()` method:**

Changed cluster assignment logic from:

```python
# Old: Direct K-Means prediction
cluster_id = int(self.kmeans.predict(X_cluster_scaled)[0])
cluster_info = self._get_cluster_info(cluster_id)
```

To:

```python
# New: Check clinical override first
should_override, override_label, override_info = self._apply_clinical_override(data)

if should_override and override_label:
    # Use clinical override assignment
    cluster_id, cluster_info = self._get_cluster_by_label(override_label)
    cluster_method = "clinical_override"
else:
    # Use K-Means cluster prediction
    cluster_id = int(self.kmeans.predict(X_cluster_scaled)[0])
    cluster_info = self._get_cluster_info(cluster_id)
    cluster_method = "kmeans"
```

---

## Remaining Limitations

### K-Means Cluster Distribution

The K-Means model learned cluster centroids from the training data that may not perfectly align with clinical expectations:

| Cluster | Label | Centroid BMI | Centroid LDL | Notes |
|---------|-------|--------------|--------------|-------|
| 2 | MOD | **42.3** | 106.8 | Extreme obesity, not moderate |
| 3 | SIDD | 33.6 | **132.0** | Not extremely high LDL |

This means:
- MOD cluster represents **extreme obesity** (BMI > 40), not moderate obesity (BMI 30-35)
- SIDD cluster has LDL = 132, which is only borderline high

The clinical override fixes the assignment issue, but the underlying K-Means model still has these characteristics.

### Future Improvements

If more balanced clusters are desired, consider:

1. **Feature weighting** - Weight LDL and LAP higher during K-Means training
2. **Different initialization** - Use clinical knowledge to initialize centroids
3. **Supervised classification** - Train a classifier to predict subtypes directly

---

## Test Verification

All 20 cluster-related tests pass:

```
tests/test_clustering.py::test_assign_ahlqvist_labels_basic_sird PASSED
tests/test_clustering.py::test_assign_ahlqvist_labels_basic_sidd PASSED
tests/test_clustering.py::test_assign_ahlqvist_labels_basic_mod PASSED
tests/test_clustering.py::test_assign_ahlqvist_labels_basic_mard PASSED
...
tests/test_predict.py::TestClinicalPredictorClusterGatingRegression::test_at_risk_path_preserves_subtype_mapping_for_eligible_case PASSED
```

---

## References

1. **Ahlqvist et al. (2018)** - Novel subgroups of adult-onset diabetes and their association with outcomes: a data-driven cluster analysis. *The Lancet Diabetes & Endocrinology*.

2. **Tanabe et al. (2024)** - Replicating Ahlqvist's diabetes subtypes: challenges without HOMA2. *Diabetologia*.

3. **Wang et al. (2024)** - Lipid Accumulation Product as a Predictor of Prediabetes and Diabetes: Insights From NHANES Data. *BMC Endocrine Disorders*.

4. **WHO** - Body Mass Index Classification (BMI >= 30 = Obesity Class I).

5. **NCEP ATP III** - National Cholesterol Education Program Adult Treatment Panel III Guidelines (LDL > 160 = High Risk).