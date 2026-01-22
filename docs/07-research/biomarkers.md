# Biomarkers Reference

> Paper-defined biomarkers for T2DM risk prediction in menopausal women (45-60 years)

---

## Blood Biomarkers (Required)

| Biomarker | Full Name | Unit | Normal | Pre-diabetic | Diabetic |
|-----------|-----------|------|--------|--------------|----------|
| **FBS** | Fasting Blood Sugar | mg/dL | <100 | 100-125 | ≥126 |
| **HbA1c** | Hemoglobin A1c | % | <5.7 | 5.7-6.4 | ≥6.5 |
| **TG** | Triglycerides | mg/dL | - | - | - |
| **LDL-C** | Low-Density Lipoprotein | mg/dL | - | - | - |
| **HDL-C** | High-Density Lipoprotein | mg/dL | - | - | - |
| **TC** | Total Cholesterol | mg/dL | - | - | - |

> **Diabetes Classification**: HbA1c is the PRIMARY classifier per ADA guidelines.

> **TC Exclusion Note**: Total Cholesterol was collected but excluded from the predictive model because TC ≈ LDL + HDL + TG/5 (Friedewald equation), introducing multicollinearity. LDL and HDL are retained as separate features for actionable clinical insights.

---

## Non-Blood Features

| Feature | Type | Unit | Notes |
|---------|------|------|-------|
| **Age** | Continuous | years | 45-60 range per paper |
| **BMI** | Continuous | kg/m² | Weight/(Height²) |
| **Menopausal Status** | Categorical | - | Postmenopausal only |
| **Family History** | Binary | Yes/No | Diabetes in parents/siblings |

---

## Lifestyle Factors (Optional)

| Factor | Type | Values | NHANES Var |
|--------|------|--------|------------|
| **Smoking** | Binary | 0=No, 1=Yes | SMQ020 |
| **Physical Activity** | Binary | 0=No, 1=Yes | PAQ710 |
| **Alcohol Use** | Binary | 0=No, 1=Yes | ALQ101 |

> These are contextual features; not always available in hospital records.

---

## Feature Sets in Codebase

| Model Type | Features | TC Included? | File |
|------------|----------|--------------|------|
| **ADA Predictor** | HbA1c, FBS, BMI, TG, LDL, HDL, Age | ❌ No | `ml/predict.py` |
| **Clinical Predictor** | BMI, TG, LDL, HDL, Age | ❌ No | `ml/predict.py` |
| **K-Means Clustering** | BMI, TG, LDL, HDL, Age | ❌ No | `ml/clustering.py` |

---

## NHANES Variable Mapping

| Biomarker | NHANES Variable | Dataset |
|-----------|-----------------|---------|
| FBS | LBXGLU | GLU |
| HbA1c | LBXGH | GHB |
| TG | LBXTR | TRIGLY |
| LDL | LBDLDL | TCHOL |
| HDL | LBDHDD | HDL |
| TC | LBXTC | TCHOL |
| BMI | BMXBMI | BMX |
| Age | RIDAGEYR | DEMO |

---

## Keywords

`FBS` `HbA1c` `HBA1C` `glucose` `triglycerides` `LDL` `HDL` `cholesterol` `BMI` `age` `lipid profile` `biomarker` `NHANES` `ADA` `menopausal`
