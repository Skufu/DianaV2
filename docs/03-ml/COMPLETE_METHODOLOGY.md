# DIANA ML System - Complete Methodology (Code-Aligned)

## 1. Scope and Objective

### 1.1 Primary Objective
Build a non-circular clinical ML model that predicts diabetes status class:
- `0`: Normal
- `1`: Pre-diabetic
- `2`: Diabetic

for postmenopausal women (age 45-60), using metabolic/lifestyle predictors and excluding HbA1c/FBS from model inputs.

### 1.2 Design Summary
- **Design**: Retrospective cross-sectional ML modeling
- **Source**: NHANES multi-cycle extraction
- **Cycles used**: 2009-2010, 2011-2012, 2013-2014, 2015-2016, 2017-2018, 2021-2023
- **Final N**: 1,376 rows
- **Class counts**: Normal 642, Pre-diabetic 457, Diabetic 277

---

## 2. Data Pipeline

### 2.1 Upstream processing
Data is processed in sequence:
1. `scripts/data/process_nhanes_multi.py`
2. `Ian_ML/training/data_processing.py`
3. `scripts/data/impute_missing_data.py`
4. `Ian_ML/training/train_binary_v2_no_bp.py`

### 2.2 Inclusion logic
- Female participants
- Age 45-60
- Postmenopausal (`RHQ031 == 2`)
- Required biomarker presence for cohort construction

### 2.3 Labeling logic (implemented)
Labeling is created in `Ian_ML/training/data_processing.py` with an ADA safety override:

```python
if hba1c >= 6.5:
    label = "Diabetic"
elif DIQ010 == 1:
    label = "Diabetic"
elif DIQ010 == 3:
    label = "Pre-diabetic"
elif DIQ010 == 2:
    label = "Pre-diabetic" if hba1c >= 5.7 else "Normal"
else:
    label = None
```

Rows with missing final label are dropped before training.

### 2.4 Missing data handling
Two stages are used:
- **Dataset-level imputation** (`scripts/data/impute_missing_data.py`)
  - Continuous: KNN imputation
  - Categorical: mode imputation
- **Training-time leakage-safe preprocessing** (`Ian_ML/training/train_binary_v2_no_bp.py`)
  - `SimpleImputer(strategy="median")` inside CV pipeline
  - `StandardScaler()` inside CV pipeline

---

## 3. Feature Set

### 3.1 Deployed feature contract (13 features)
From `models/binary_v2_no_bp/features.json`:
1. `bmi`
2. `triglycerides`
3. `ldl`
4. `hdl`
5. `age`
6. `bmi_category`
7. `tg_hdl_ratio`
8. `smoking_encoded`
9. `activity_encoded`
10. `alcohol_encoded`
11. `metabolic_syndrome_score`
12. `waist_circumference`
13. `race_encoded`

### 3.2 Feature engineering rules
Implemented in `Ian_ML/training/train_binary_v2_no_bp.py` / `Ian_ML/service/predict.py`:
- BMI bins: `<18.5`, `18.5-24.9`, `25-29.9`, `>=30`
- `tg_hdl_ratio = triglycerides / hdl`
- Lifestyle encoding maps for smoking/activity/alcohol
- Metabolic syndrome score = count of:
  - TG > 150
  - HDL < 50
  - BMI >= 30

### 3.3 Feature selection provenance
Feature-selection analyses (correlation/LASSO/RFECV) are documented in:
- `Ian_ML/training/feature_selection_analysis.py`
- `models/binary_v2_no_bp/results/feature_selection_analysis.csv`

The production/deployed v2 model uses the fixed 13-feature contract above.

---

## 4. Model Development

### 4.1 Candidate models in current training
From `Ian_ML/training/train_binary_v2_no_bp.py`:
- Logistic Regression
- Random Forest

### 4.2 Validation strategy
- **Outer loop**: Leave-One-Group-Out (group = NHANES cycle)
- **Inner loop**: GroupKFold grid search
- **Scoring**: `roc_auc`
- **Bootstrap CIs**: class-level CI diagnostics

This is implemented as nested group-aware CV to reduce leakage and optimistic bias.

### 4.3 Class imbalance handling
No SMOTE/Tomek in `train_binary_v2_no_bp.py`.
Imbalance mitigation is primarily via:
- group-aware CV
- model choice/hyperparameters
- threshold optimization for at-risk recall

### 4.4 Threshold optimization
Threshold tuning is learned from OOF probabilities and then persisted:
- `at_risk`: 0.4567

Prediction rule at inference:
1. Start with logistic regression probability
2. If `P(at_risk) >= threshold`, predict At‑Risk

---

## 5. Current Performance (Latest Artifacts)

From `models/binary_v2_no_bp/results/best_model_report.json`:
- **Best model**: Logistic Regression
- **AUC-ROC**: 0.7200
- **Accuracy**: 0.6642
- **Sensitivity**: 0.7452
- **Specificity**: 0.5717
- **F1**: 0.7031

---

## 6. Clustering

K-means defensibility from `models/binary_v2_no_bp/results/k_comparison.json`:
- K=2: silhouette 0.1659, CH 291.13, DB 2.039
- K=4: silhouette 0.1570, CH 209.75, DB 1.847

Positioning:
- Primary unsupervised compactness result: K=2
- Clinical interpretability mapping: K=4

Runtime cluster labels are persisted in:
- `models/binary_v2_no_bp/cluster_labels.json`
- `models/binary_v2_no_bp/results/cluster_analysis.json`

---

## 7. Inference and Serving Behavior

### 7.1 Python inference (`binary_v2_no_bp`)
Current inference in `Ian_ML/service/predict.py`:
- Uses the 13-feature contract
- Applies imputer + scaler + classifier artifacts
- Applies learned at‑risk threshold
- Returns:
  - `predicted_status`
  - `probability` (at‑risk probability)
  - `risk_score` (0-100 based on probability)

### 7.2 Backend integration
Go backend uses:
- `backend/internal/ml/http_predictor.go`
- Calls Python endpoint with `model_type=binary_v2_no_bp`
- Fails request on ML errors (no silent fallback inside HTTP predictor)
- Mock predictor is only used when `MODEL_URL` is intentionally unset in router config

---

## 8. Limitations

- Cross-sectional dataset (not longitudinal incidence prediction)
- US population only; external validation still required
- Moderate discrimination (screening support, not stand-alone diagnosis)
- Cluster separation remains weak-to-moderate by silhouette

---

## 9. Reproducibility

### 9.1 Key code files
- `Ian_ML/training/data_processing.py`
- `scripts/data/impute_missing_data.py`
- `Ian_ML/training/train_binary_v2_no_bp.py`
- `Ian_ML/service/predict.py`
- `backend/internal/ml/http_predictor.go`

### 9.2 Environment
From `Ian_ML/requirements.txt`:
- `scikit-learn>=1.4.0`
- `pandas>=2.2.0`
- `numpy>=1.26.3`
- `xgboost>=2.0.3`
- `lightgbm>=4.3.0`
- `flask>=3.0.1`

### 9.3 Randomness control
Training and clustering use fixed seeds (`random_state=42`) where supported.

---

## 10. Current Defensibility Status

- Methodology is now aligned to implemented label logic and deployed inference flow.
- The key previous mismatch (diabetic-range HbA1c label leakage into pre-diabetic class) is corrected.
- Documentation now matches the current artifacts under `models/binary_v2_no_bp/results/`.

*Document Version: 2.0*  
*Last Updated: 2026-02-15*
