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
python scripts/download_nhanes_multi.py
python scripts/download_lifestyle_data.py
```

**Output**: `data/nhanes/*.XPT`

### 2. Process and Merge
```bash
python scripts/process_nhanes_multi.py
```

**Output**: `data/nhanes/processed/diana_training_data_multi.csv`

### 3. Key Processing Functions

| Function | Purpose |
|----------|---------|
| `load_and_merge_nhanes()` | Merge XPT files by SEQN |
| `filter_postmenopausal()` | Women 45-60, RHQ031=2 |
| `create_diabetes_labels()` | Apply ADA HbA1c thresholds |
| `derive_lifestyle_features()` | Create smoking/activity vars |

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

```python
def create_diabetes_labels(df):
    """Apply ADA HbA1c thresholds (PRIMARY)."""
    conditions = [
        df['hba1c'] < 5.7,      # Normal
        df['hba1c'] < 6.5,      # Pre-diabetic
        df['hba1c'] >= 6.5      # Diabetic
    ]
    labels = ['Normal', 'Pre-diabetic', 'Diabetic']
    df['diabetes_status'] = np.select(conditions, labels)
    return df
```

---

## File Locations

| Stage | Path |
|-------|------|
| Raw NHANES | `data/nhanes/*.XPT` |
| Processed | `data/nhanes/processed/diana_training_data_multi.csv` |
| Trained Models | `models/*.joblib` |
| Clinical Models | `models/clinical/*.joblib` |
| Visualizations | `models/clinical/visualizations/` |
| Results | `models/clinical/results/` |

---

## Keywords

`NHANES` `data pipeline` `processing` `download` `filter` `menopausal transition` `perimenopause` `postmenopause` `diabetes label` `ADA thresholds` `XPT` `CSV` `merge`
