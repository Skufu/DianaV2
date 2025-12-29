# Data Directory - NHANES Dataset Files

> **Purpose**: Raw and processed NHANES biomarker data for ML training  
> **Source**: CDC National Health and Nutrition Examination Survey

---

## Directory Structure

```
data/
└── nhanes/                       # NHANES dataset files
    ├── raw/                      # Downloaded XPT files (if present)
    └── *.XPT                     # NHANES data files in SAS Transport format
```

---

## NHANES Files Reference

| File Pattern | Description | Key Variables |
|--------------|-------------|---------------|
| `GHB_*.XPT` | Glycohemoglobin (HbA1c) | `LBXGH` (HbA1c %) |
| `GLU_*.XPT` | Fasting Glucose | `LBXGLU` (mg/dL) |
| `BMX_*.XPT` | Body Measurements | `BMXBMI` (BMI) |
| `TRIGLY_*.XPT` | Triglycerides | `LBXTR` (mg/dL) |
| `HDL_*.XPT` | HDL Cholesterol | `LBDHDD` (mg/dL) |
| `TCHOL_*.XPT` | Total Cholesterol/LDL | `LBXTC`, `LBDLDL` |
| `DEMO_*.XPT` | Demographics | `RIDAGEYR` (age), `RIAGENDR` (sex) |
| `SMQ_*.XPT` | Smoking Questionnaire | Smoking status |
| `ALQ_*.XPT` | Alcohol Use | Alcohol consumption |
| `PAQ_*.XPT` | Physical Activity | Activity level |

---

## NHANES Cycle Naming

| Suffix | Years | Cycle |
|--------|-------|-------|
| `_H` | 2013-2014 | Cycle H |
| `_I` | 2015-2016 | Cycle I |
| `_J` | 2017-2018 | Cycle J |
| `_K` | 2017-2020 | Pre-pandemic |

---

## Processing Pipeline

1. **Download**: `scripts/download_nhanes.sh` or `scripts/download_nhanes_multi.py`
2. **Process**: `scripts/process_nhanes_multi.py` 
   - Merges biomarker files
   - Filters postmenopausal women (age >= 45, female)
   - Creates diabetes labels per ADA criteria
3. **Output**: `data/nhanes/processed_nhanes_data.csv`

---

## Key Variables for ML

| Variable | Source File | Range | Units |
|----------|-------------|-------|-------|
| `hba1c` | GHB_*.XPT | 4.0-15.0 | % |
| `fbs` | GLU_*.XPT | 60-400 | mg/dL |
| `bmi` | BMX_*.XPT | 15-60 | kg/m² |
| `triglycerides` | TRIGLY_*.XPT | 30-1500 | mg/dL |
| `hdl` | HDL_*.XPT | 20-150 | mg/dL |
| `ldl` | TCHOL_*.XPT | 40-300 | mg/dL |
| `age` | DEMO_*.XPT | 45-85 | years |

---

## Diabetes Classification (ADA Criteria)

| Label | HbA1c Threshold | Description |
|-------|-----------------|-------------|
| Normal | < 5.7% | No diabetes |
| Pre-diabetic | 5.7% - 6.4% | Increased risk |
| Diabetic | >= 6.5% | Type 2 diabetes |

---

## Search Keywords

`NHANES` `CDC` `biomarkers` `HbA1c` `fasting glucose` `BMI` `triglycerides` `HDL` `LDL` `cholesterol` `demographics` `postmenopausal` `diabetes` `ADA criteria` `XPT` `SAS format` `training data` `processed data`
