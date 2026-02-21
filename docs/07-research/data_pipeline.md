# Data Pipeline Reference

> NHANES data processing for model training (Menopausal Transition focus)

---

## Pipeline Overview

```
NHANES XPT Files → Download → Process → Clean → Split → Train
```

---

## Data Sources

### NHANES (Development Data)
- **Cycles**: 2009-2023 (6 cycles)
- **Records**: ~1,376 postmenopausal women
- **Age Range**: 45-60 years

### Philippine Hospital Data (Target)
- **Status**: Pending collection
- **Target**: 1,000-2,000 de-identified records
- **Action**: Swap data source when available

---

## Processing Steps

### 1. Download NHANES Data
```bash
python scripts/data/download_nhanes_multi.py
python scripts/data/download_lifestyle_data.py
```

**Output**: `data/nhanes/raw/*.XPT`

### 2. Process and Merge
```bash
python scripts/data/process_nhanes_multi.py
python scripts/data/impute_missing_data.py
```

**Output**: `data/nhanes/processed/diana_training_data_multi.csv`
**Cleaned Output**: `data/nhanes/processed/diana_dataset_imputed.csv`

### 3. Key Processing Functions

| Function | Purpose |
|----------|---------|
| `load_xpt()` | Load individual NHANES .XPT files |
| `process_cycle()` | Process single NHANES cycle (merge all files) |
| `derive_smoking_status()` | Create smoking status variable |
| `derive_physical_activity()` | Create physical activity variable |
| `derive_alcohol_use()` | Create alcohol use variable |
| `derive_race_ethnicity()` | Harmonize race/ethnicity across NHANES cycles |
| `derive_family_history_diabetes()` | Create binary family history of diabetes |

---

## Inclusion Criteria

| Criterion | Value | NHANES Filter |
|-----------|-------|---------------|
| Sex | Female | RIAGENDR=2 |
| Age | 45-60 years | RIDAGEYR between 45-60 |
| Menopausal Status | Menopausal Transition | RHQ031=2 (No regular period in 12mo) |
| Required Biomarkers | FBS + HbA1c | Non-null LBXGLU, LBXGH |

---

## Data Quality Rules

| Field | Completeness Required | Missing Data Rule |
|-------|----------------------|-------------------|
| FBS | Required | Exclude if missing |
| HbA1c | Required | Exclude if missing |
| BMI | Required | Exclude if missing |
| Age | Required | Exclude if missing |
| Lipids (TG, LDL, HDL) | 70%+ | Retain if core complete |
| Lifestyle factors | Optional | Use when available |

---

## Label Generation

**Note**: The pipeline saves raw data including HbA1c and self-reported diabetes (DIQ010). Diabetes labels are NOT derived in this script - they are created downstream in the ML training pipeline.

```python
# Output includes:
# - hba1c: Laboratory HbA1c values (LBXGH)
# - DIQ010: Self-reported diabetes diagnosis (0=No, 1=Yes)
#
# Diabetes status labels (Normal/Pre-diabetic/Diabetic) are derived
# from HbA1c thresholds during model training:
#   - Normal: hba1c < 5.7
#   - Pre-diabetic: 5.7 <= hba1c < 6.5
#   - Diabetic: hba1c >= 6.5
```

---

## Enrichment Features

The pipeline includes additional biomarkers beyond core diabetes indicators:

| Feature | Source Variable | Description |
|---------|---------------|-------------|
| Waist Circumference | BMXWAIST | Central adiposity measure |
| Fasting Insulin | LBXIN | Fasting serum insulin |
| C-Reactive Protein | LBXCRP | Inflammation marker |
| Family History Diabetes | MCQ300C | Binary (1=Yes, 0=No) |
| Race/Ethnicity | RIDRETH1/RIDRETH3 | Harmonized 6-category |

**Note**: Family history (MCQ300C) was dropped in 2021-2023 cycle.

---

## File Locations

| Stage | Path |
|-------|------|
| Raw NHANES | `data/nhanes/raw/*.XPT` |
| Processed | `data/nhanes/processed/diana_training_data_multi.csv` |
| Cleaned/Imputed | `data/nhanes/processed/diana_dataset_imputed.csv` |
| Clustered | `data/nhanes/processed/diana_clustered_final.csv` |
| Trained Models | `models/clinical_3class/*.joblib` |
| Clinical Models | `models/clinical_3class/*.joblib` |
| Visualizations | `models/clinical_3class/visualizations/` |
| Results | `models/clinical_3class/results/` |

---

## Keywords

`NHANES` `data pipeline` `processing` `download` `filter` `menopausal transition` `perimenopause` `postmenopause` `diabetes label` `ADA thresholds` `XPT` `CSV` `merge`
