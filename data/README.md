# Data Directory - NHANES Dataset Files

> **Purpose**: Raw and processed NHANES biomarker data for ML training  
> **Source**: CDC National Health and Nutrition Examination Survey

---

## Directory Structure

```
data/
└── nhanes/                       # NHANES dataset files
    ├── processed/                # Processed CSV datasets (e.g., diana_training_data_multi.csv)
    └── raw/                      # Downloaded XPT files (SAS Transport format)
```

---

## NHANES Files Reference

| File Pattern | Description | Key Variables |
|--------------|-------------|---------------|
| `GHB_*.XPT` | Glycohemoglobin (HbA1c) | `LBXGH` (HbA1c %) |
| `GLU_*.XPT` | Fasting Glucose | `LBXGLU` (mg/dL) |
| `BMX_*.XPT` | Body Measurements | `BMXBMI` (BMI) |
| `TRIGLY_*.XPT` | Triglycerides & LDL | `LBXTR` (Triglycerides), `LBDLDL` (LDL) |
| `HDL_*.XPT` | HDL Cholesterol | `LBDHDD` (mg/dL) |
| `TCHOL_*.XPT` | Total Cholesterol | `LBXTC` (mg/dL) |
| `BPX_*.XPT` | Blood Pressure | `BPXSY1`, `BPXDI1` |
| `DEMO_*.XPT` | Demographics | `RIDAGEYR` (age), `RIAGENDR` (sex) |
| `SMQ_*.XPT` | Smoking Questionnaire | Smoking status |
| `ALQ_*.XPT` | Alcohol Use | Alcohol consumption |
| `PAQ_*.XPT` | Physical Activity | Activity level |
| `RHQ_*.XPT` | Reproductive Health | `RHQ031` (Menopause status) |
| `DIQ_*.XPT` | Diabetes Questionnaire | `DIQ010` (Self-reported) |

---

## NHANES Cycle Naming

| Suffix | Years | Cycle |
|--------|-------|-------|
| `_F` | 2009-2010 | Cycle F |
| `_G` | 2011-2012 | Cycle G |
| `_H` | 2013-2014 | Cycle H |
| `_I` | 2015-2016 | Cycle I |
| `_J` | 2017-2018 | Cycle J |
| `_L` | 2021-2023 | Cycle L (Post-pandemic) |

> **Note**: Cycle K (2019-2020) was suspended due to COVID-19.

---

## Processing Pipeline

1. **Download**: 
   - Python: `scripts/data/download_nhanes_multi.py`
   - Python: `scripts/data/download_lifestyle_data.py`
2. **Process**: `scripts/data/process_nhanes_multi.py`
   - Merges biomarker files across multiple cycles (F-L)
   - Filters postmenopausal women (age 45-60, female, no period in 12 mo)
   - Derives lifestyle features (smoking, alcohol, activity)
3. **Clean and Label**: `Ian_ML/training/data_processing.py`
   - Creates diabetes labels using self-reported diagnosis (DIQ010) with ADA HbA1c overrides
   - Removes outliers and performs data quality checks
4. **Impute**: `scripts/data/impute_missing_data.py`
   - Fills missing values (KNN for continuous, mode for lifestyle)
5. **Output**: `data/nhanes/processed/diana_dataset_final.csv` and `diana_dataset_imputed.csv`

---

## Key Variables for ML

| Variable | Source File | Range | Units |
|----------|-------------|-------|-------|
| `hba1c` | GHB_*.XPT | 4.0-15.0 | % |
| `fbs` | GLU_*.XPT | 60-400 | mg/dL |
| `bmi` | BMX_*.XPT | 15-60 | kg/m² |
| `triglycerides` | TRIGLY_*.XPT | 30-1500 | mg/dL |
| `hdl` | HDL_*.XPT | 20-150 | mg/dL |
| `ldl` | TRIGLY_*.XPT | 40-300 | mg/dL |
| `total_cholesterol`| TCHOL_*.XPT | 100-400 | mg/dL |
| `age` | DEMO_*.XPT | 45-85 | years |

---

## Diabetes Classification (Self-Reported + ADA Criteria)

Primary labels are derived from self-reported diagnosis (`DIQ010`), with clinical overrides using ADA HbA1c criteria to correct undiagnosed or misreported cases:

| Label | Criteria |
|-------|----------|
| Normal | No self-reported diabetes AND HbA1c < 5.7% |
| Pre-diabetic | Self-reported borderline OR HbA1c 5.7% - 6.4% |
| Diabetic | Self-reported diabetes OR HbA1c >= 6.5% |

---

## Search Keywords

`NHANES` `CDC` `biomarkers` `HbA1c` `fasting glucose` `BMI` `triglycerides` `HDL` `LDL` `cholesterol` `demographics` `postmenopausal` `diabetes` `ADA criteria` `DIQ010` `XPT` `SAS format` `training data` `processed data` `lifestyle`
