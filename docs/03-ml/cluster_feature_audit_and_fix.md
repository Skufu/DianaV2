# ML Audit & Clustering Fix: Learnings and Implementation

## Overview
This document summarizes the changes made to align the clustering model with the non-circular clinical predictor (`ClinicalPredictor`). The goal was to remove HbA1c and FBS—which are *diagnostic* criteria—from the input features to avoid circular reasoning, while retaining the ability to identify metabolic subtypes (Ahlqvist-like clusters).

## Key Learnings

### 1. The "Circular Reasoning" Trap
Previously, the K-Means model (`train_clusters.py`) was trained on **7 features**: `['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']`. 
However, the `ClinicalPredictor` (`predict.py`) was designed to be **non-circular**, explicitly excluding `hba1c` and `fbs`.
This created a **critical mismatch at runtime**:
- **Training:** Model learns patterns based heavily on Glucose/HbA1c.
- **Inference:** Predictor feeds it a vector without Glucose/HbA1c (or the wrong vector entirely).
- **Result:** Clustering failed silently or produced nonsense.

**Lesson:** Training and inference *must* share the exact same feature schema. Removing features from one requires retraining the other.

### 2. Identifying Subtypes Without the Diagnosis
Ahlqvist subtypes (SIRD, SIDD, MOD, MARD) are originally defined partly by HbA1c/HOMA-B (insulin secretion). Without HbA1c, we cannot directly identify **Severe Insulin-Deficient Diabetes (SIDD)** or distinguish it perfectly from **Severe Insulin-Resistant Diabetes (SIRD)**.

**Solution:** Use metabolic **proxies** derived from the remaining lipids/BMI features:
- **SIRD Proxy:** Insulin Resistance Composite = `BMI + (TG/50) - (HDL/10)`
  - Rationale: High BMI + specific dyslipidemia pattern correlates with resistance.
- **SIDD Proxy:** Metabolic Derangement = `TG / HDL Ratio`
  - Rationale: Extremely high ratio suggests severe metabolic dysfunction distinct from simple obesity.

## Architecture Changes

### Before (Broken)
```mermaid
graph TD
    subgraph Training
        A[All Features (inc. HbA1c, FBS)] --> B(K-Means Training k=7)
        B --> C{Cluster Interpretation}
        C -->|Uses HbA1c| D[SIRD/SIDD Labels]
    end
    
    subgraph Inference
        E[Patient Data (No HbA1c/FBS)] --> F(ClinicalPredictor)
        F -->|13 Features| G{K-Means Predict}
        G -.->|Feature Mismatch!| H[Crash / Nonsense]
    end
```

### After (Fixed)
```mermaid
graph TD
    subgraph Training
        A[Clinical Features Only (BMI, TG, LDL, HDL, Age)] --> B(K-Means Training k=5)
        B --> C{Proxy-Based Labeling}
        C -->|IR Composite| D[SIRD]
        C -->|TG/HDL Ratio| E[SIDD]
    end
    
    subgraph Inference
        F[Patient Data] --> G(ClinicalPredictor)
        G -->|Extract 5 Features| H{K-Means Predict}
        H --> I[Cluster ID]
        I --> J[Lookup Label + Risk Level]
    end
```

## Implementation Details

### 1. Comparison of Feature Sets

| Component | Features Used | Status |
| :--- | :--- | :--- |
| **Classifier** | 13 features (BMI, Lipids, Age, BP + Engineered) | Unchanged (Non-circular) |
| **Clustering (Old)** | 7 features (Inc. **HbA1c, FBS**) | ❌ **Removed** |
| **Clustering (New)** | 5 features (**BMI, TG, LDL, HDL, Age**) | ✅ **Aligned** |

### 2. File Changes

#### `scripts/train/train_clusters.py`
- **Updated `CLUSTER_FEATURES`**: Removed `hba1c`, `fbs`.
- **Updated Label Logic**: Implemented proxy-based identification for subtypes.
- **Dual Output**: Returns both Ahlqvist subtype (`SIRD`) AND Risk Level (`HIGH`).

#### `Ian_ML/service/predict.py`
- **Explicit Constants**: Added `CLUSTER_FEATURES` list.
- **Vector Separation**: `_build_cluster_vector()` extracts *only* the 5 clustering features from the input.
- **Robust Loading**: Checks feature counts of loaded models against `len(CLUSTER_FEATURES)` (5) instead of `len(CLINICAL_FEATURES)` (13).
- **Batch Fix**: `/predict/batch` now defaults to the clinical model.

#### `Ian_ML/training/clustering.py`
- **Cleaned Up**: Removed legacy references to `hba1c` in profiling/reporting.

#### `frontend/src/components/common/ClusterRecommendations.jsx`
- **Updated Text**: Descriptions no longer reference HbA1c levels, focusing on the metabolic patterns the model actually sees (e.g., "High TG/HDL ratio").

## Next Steps
1.  **Retrain**: Run `python scripts/train/train_clusters.py` to regenerate `kmeans_model.joblib` compatible with the new code.
2.  **Verify**: Test the `/predict` endpoint to ensure cluster fields are populated correctly.
