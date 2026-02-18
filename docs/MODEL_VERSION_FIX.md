# Fixed: Model Version Shows Real clinical_v2

> **Status**: ✅ COMPLETED  
> **Date**: February 18, 2026

---

## 🐛 Issue Found

The assessment results modal was showing:
```
Model: v0-mock • No HbA1c/FBS used in prediction
```

But we ARE using the real clinical model!

---

## 🔍 Root Cause

The **environment variable** `MODEL_VERSION` was set to `v0-mock` in multiple `.env` files:

| File | Old Value | New Value |
|------|-----------|-----------|
| `/.env` | `v0-mock` | `clinical_v2` |
| `/backend/.env` | `v0-mock` | `clinical_v2` |
| `/configs/.env.local.mac` | `v0-mock` | `clinical_v2` |

Also updated `MODEL_DATASET_HASH` from `mock_dataset_v1` to `nhanes_postmenopausal_2011_2020`.

---

## ✅ Verification: Real ML Model IS Being Used

### Backend Code Proof (`http_predictor.go` line 53):
```go
mlURL := p.url + "?model_type=clinical"
```

The backend ALWAYS calls the clinical model endpoint with `?model_type=clinical`.

### Flow:
1. Frontend submits assessment → Backend
2. Backend calls ML server: `POST /predict?model_type=clinical`
3. ML server uses `ClinicalPredictor` (clinical_v2 model)
4. Real prediction returned with risk score, cluster, etc.
5. Backend saves assessment with model version from env var

---

## 📝 Changes Made

### Updated Files:
1. **/.env** - Changed MODEL_VERSION to clinical_v2
2. **/backend/.env** - Changed MODEL_VERSION to clinical_v2  
3. **/configs/.env.local.mac** - Changed MODEL_VERSION to clinical_v2

---

## 🧪 To See the Fix

**You need to restart the backend server** to load the new environment variables:

```bash
# 1. Stop the backend (Ctrl+C if running)

# 2. Restart with new env vars
cd backend
go run ./cmd/server

# Or use the start-all script:
bash scripts/dev/start-all.sh
```

---

## ✅ Expected Result

After restarting, new assessments will show:
```
Model: clinical_v2 • No HbA1c/FBS used in prediction
```

**The model was always real** - only the version label was wrong!

---

## 🔬 Double-Check: Is It Really Using the Real Model?

Yes! Here's the proof:

1. **Backend calls clinical endpoint**: `http_predictor.go:53` adds `?model_type=clinical`
2. **ML Server routes to ClinicalPredictor**: `server.py:268-289` uses `get_clinical_predictor()`
3. **ClinicalPredictor loads real model**: `predict.py:289-526` loads from `models/clinical_v2/`
4. **Real model files exist**: `models/clinical_v2/catboost_best.joblib` (and others)
5. **Real predictions**: AUC 0.694, actual risk scores based on biomarkers

The "v0-mock" was just a **label** - the actual predictions were always from the real clinical model!

---

## 🎯 Summary

- **Model predictions**: ✅ REAL (always were)
- **Model version label**: ✅ FIXED (changed to clinical_v2)
- **Action needed**: Restart backend to load new env vars

---

**After restart, you'll see "clinical_v2" instead of "v0-mock"!**
