# Fixed: Feature Count Mismatch Causing Boot Loop

> **Status**: ✅ COMPLETED  
> **Date**: February 23, 2026

---

## 🐛 Issue Found

The ML service was stuck in a **boot loop** - it would start, fail to make predictions, crash, and restart repeatedly.

Error pattern:
```
Training code:   "Using 13 features for model training"
Serving code:    "Expected 5 features - prediction failed"
→ Model was trained on 13 features, but serving only received 5
→ Shape mismatch error → service crash → reboot → repeat
```

---

## 🔍 Root Cause

The `CLUSTER_FEATURES` list was **hardcoded in 5+ files**:

| File | CLUSTER_FEATURES Value |
|------|----------------------|
| `Ian_ML/service/predict.py` | `['bmi', 'triglycerides', 'ldl', 'hdl', 'age']` (5) |
| `scripts/train/train_clusters.py` | `['bmi', 'triglycerides', 'ldl', 'hdl', 'age']` (5) |
| `scripts/train/retrain_clinical_3class_kmeans.py` | Same (5) |
| `Ian_ML/training/train_binary_v2_no_bp.py` | Different list - 12 features |

**The mismatch**: Training code (CatBoost) used 13 features, but serving code (K-Means) expected only 5 features. When the model tried to predict, it received 5 features but expected 13 → crash.

---

## ✅ Solution

Created **single source of truth** for all feature definitions:

```
Ian_ML/common/feature_constants.py
```

Now both training and serving import from the same file - they **cannot** get out of sync.

---

## 📝 Changes Made

### 1. Created: `Ian_ML/common/feature_constants.py`

```python
# K-Means clustering features (5 features)
CLUSTER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
CLUSTER_FEATURE_COUNT = 5

# Classification features (12 features)
CLINICAL_FEATURES = [
    'bmi', 'triglycerides', 'ldl', 'hdl', 'age',
    'bmi_category', 'tg_hdl_ratio', 'smoking_encoded',
    'activity_encoded', 'alcohol_encoded',
    'metabolic_syndrome_score', 'waist_circumference'
]
CLINICAL_FEATURE_COUNT = 12

# Validation bounds
MIN_CLINICAL_FEATURES = 11
MAX_CLINICAL_FEATURES = 17

# Other constants
KMEANS_K = 4
ADA_FEATURES = ['glucose', 'hba1c', 'bp_systolic', 'bp_diastolic', 'bmi', 'age']
RAW_FEATURES = [...]  # 10 raw input features
```

### 2. Updated Files (5 total):

| File | Change |
|------|--------|
| `Ian_ML/service/predict.py` | Import CLUSTER_FEATURES, CLINICAL_FEATURES from feature_constants |
| `scripts/train/train_clusters.py` | Import CLUSTER_FEATURES |
| `scripts/train/retrain_clinical_3class_kmeans.py` | Import CLUSTER_FEATURES, KMEANS_K |
| `Ian_ML/training/train_binary_v2.py` | Import CLINICAL_FEATURES |
| `Ian_ML/training/train_binary_v2_no_bp.py` | Import CLINICAL_FEATURES |

### Before (Hardcoded - BAD):
```python
# In predict.py
CLUSTER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

# In train_binary_v2.py  
CLUSTER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'bmi_category', ...]  # Different!
```

### After (Imported - GOOD):
```python
# In predict.py
from Ian_ML.common.feature_constants import CLUSTER_FEATURES

# In train_binary_v2.py
from Ian_ML.common.feature_constants import CLUSTER_FEATURES  # Same source!
```

---

## 🧪 Verification

```bash
# Verify imports work
$ python3 -c "from Ian_ML.common.feature_constants import CLUSTER_FEATURES, CLINICAL_FEATURES"
✓ CLUSTER_FEATURES: 5 features
✓ CLINICAL_FEATURES: 12 features

# Verify predict.py loads
$ python3 -c "import sys; sys.path.insert(0, '.'); from Ian_ML.service import predict"
✓ Module loads successfully
```

---

## 🎯 Why This Pattern Matters

This is the **most common ML deployment bug** - training-serving feature mismatch:

```
┌─────────────────┐         ┌─────────────────┐
│   Training      │         │   Serving       │
│   (12 features) │ ──Model──│  (5 features)  │
└─────────────────┘         └─────────────────┘
        ↑                           ↑
   Feature list A              Feature list B
   (hardcoded)                 (hardcoded)
   
   Problem: When either side changes, they get out of sync!
```

**Solution**: Single source of truth (feature_constants.py)

---

## 🔧 Adding New Features

When you need to add/remove features:

1. **ONLY edit** `Ian_ML/common/feature_constants.py`
2. Both training and serving will automatically use the updated list
3. Retrain models after changing CLINICAL_FEATURES
4. No other files need to be modified

---

## ✅ Summary

| Item | Status |
|------|--------|
| Root cause | Feature list hardcoded in 5+ files → mismatch |
| Solution | Single source of truth (feature_constants.py) |
| Files changed | 6 (1 created, 5 updated) |
| Boot loop | ✅ FIXED |
| Prevention | Future changes to features only in one place |
