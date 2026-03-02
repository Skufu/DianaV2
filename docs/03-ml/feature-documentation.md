# DIANA Model Features Documentation

## Overview

The DIANA v2 screening model (binary_v2_no_bp) uses **12 features** derived from NHANES data across 6 cycles (2009-2023). Features are categorized into three groups:

1. **Original Metabolic Biomarkers** (5) - Direct measurements from NHANES lab/exam data
2. **Derived/Engineered Features** (6) - Calculated from raw biomarkers and lifestyle questionnaires
3. **Enrichment Features** (1) - Additional clinical variables

---

## 1. Original Metabolic Biomarkers (5)

These are direct laboratory or examination measurements from NHANES:

| Feature | NHANES Source | Description | Clinical Range |
|---------|--------------|-------------|----------------|
| `bmi` | BMXWT / BMXHT | Body Mass Index (kg/m²) | 15-60 |
| `triglycerides` | TRIGLY | Fasting triglycerides (mg/dL) | 20-800 |
| `ldl` | TCHOL, HDL, TRIGLY | LDL cholesterol calculated (mg/dL) | 20-300 |
| `hdl` | HDL | HDL cholesterol (mg/dL) | 10-120 |
| `age` | RIDAGEYR | Age in years at screening | 45-60 (filtered) |

**Note:** HbA1c and Fasting Blood Sugar (FBS) are excluded from features to avoid circularity - they are used only for ground-truth labeling per ADA criteria.

---

## 2. Derived/Engineered Features (6)

These features are calculated through feature engineering in `train_binary_v2_no_bp.py`:

### 2.1 BMI Category (`bmi_category`)

**Derivation:**
```python
df["bmi_category"] = pd.cut(
    df["bmi"], 
    bins=[0, 18.5, 23, 25, 100], 
    labels=[0, 1, 2, 3]
)
```

**Mapping (Philippine / Asia-Pacific WHO Standard):**
| BMI Range | Category | Value |
|-----------|----------|-------|
| < 18.5 | Underweight | 0 |
| 18.5 - 22.9 | Normal | 1 |
| 23.0 - 24.9 | Overweight | 2 |
| ≥ 25.0 | Obese | 3 |

> **Note:** Uses WHO Asia-Pacific guidelines recommended for Filipino populations. Asian populations face higher metabolic risk at lower BMI levels compared to Western populations.

**Clinical Rationale:** Non-linear BMI risk capture - obesity is a major diabetes risk factor.

---

### 2.2 TG/HDL Ratio (`tg_hdl_ratio`)

**Derivation:**
```python
df["tg_hdl_ratio"] = df["triglycerides"] / df["hdl"].replace(0, np.nan)
```

**Clinical Rationale:** 
- Validated surrogate marker for **insulin resistance**
- Higher ratio indicates atherogenic dyslipidemia
- Strong predictor of metabolic syndrome and diabetes risk
- Reference: Gaziano et al. - TG/HDL ratio predicts cardiovascular risk

---

### 2.3 Smoking Status Encoded (`smoking_encoded`)

**Raw NHANES Variables:**
- `SMQ020`: Ever smoked 100+ cigarettes? (1=Yes, 2=No)
- `SMQ040`: Current smoking status (1=Daily, 2=Sometimes, 3=Not at all)

**Derivation:**
```python
smoking_map = {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
df["smoking_encoded"] = df["smoking_status"].map(smoking_map)
```

**Classification Logic:**
| SMQ020 | SMQ040 | Classification |
|--------|--------|----------------|
| 2 (No) | Any | Never (0) |
| 1 (Yes) | 1 or 2 | Current (2) |
| 1 (Yes) | 3 | Former (1) |
| Missing | Any | Unknown (1) |

**Clinical Rationale:** Smoking increases insulin resistance and diabetes risk. Former smokers may have residual risk but lower than current.

---

### 2.4 Physical Activity Encoded (`activity_encoded`)

**Raw NHANES Variables:**
- `PAQ605`: Vigorous work activity (1=Yes, 2=No)
- `PAQ620`: Moderate work activity (1=Yes, 2=No)
- `PAQ635`: Walk or bicycle (1=Yes, 2=No)
- `PAQ650`: Vigorous recreational activity (1=Yes, 2=No)
- `PAQ665`: Moderate recreational activity (1=Yes, 2=No)

**Derivation:**
```python
activity_map = {"Sedentary": 0, "Moderate": 1, "Active": 2, "Unknown": 1}
df["activity_encoded"] = df["physical_activity"].map(activity_map)
```

**Classification Logic:**
| Condition | Classification |
|-----------|----------------|
| PAQ605=1 OR PAQ650=1 (Any vigorous) | Active (2) |
| PAQ620=1 OR PAQ635=1 OR PAQ665=1 (Moderate only) | Moderate (1) |
| All activity variables = 2 (No) | Sedentary (0) |
| Missing values | Unknown (1) |

**Clinical Rationale:** Physical activity improves insulin sensitivity. Vigorous activity has greater metabolic benefit.

---

### 2.5 Alcohol Use Encoded (`alcohol_encoded`)

**Raw NHANES Variables:**
- `ALQ101`: Had 12+ drinks in past year? (1=Yes, 2=No)
- `ALQ120Q`: How often drink? (number)
- `ALQ120U`: Frequency unit (1=Week, 2=Month, 3=Year)
- `ALQ130`: Average drinks per occasion

**Derivation:**
```python
alcohol_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3, "Unknown": 1}
df["alcohol_encoded"] = df["alcohol_use"].map(alcohol_map)
```

**Classification Logic:**
| ALQ101 | Weekly Drinks | Classification |
|--------|---------------|----------------|
| 2 (No) | 0 | None (0) |
| 1 (Yes) | ≤ 3 | Light (1) |
| 1 (Yes) | 4-7 | Moderate (2) |
| 1 (Yes) | > 7 | Heavy (3) |

**Weekly drinks calculation:**
- Per week: `ALQ120Q × ALQ130`
- Per month: `(ALQ120Q × ALQ130) / 4`
- Per year: `(ALQ120Q × ALQ130) / 52`

**Clinical Rationale:** Based on CDC guidelines for women (>7 drinks/week = heavy). Moderate alcohol may have protective effects; heavy use increases risk.

---

### 2.6 Metabolic Syndrome Score (`metabolic_syndrome_score`)

**Derivation:**
```python
metabolic_criteria = pd.DataFrame({
    "high_tg": df["triglycerides"] > 150,
    "low_hdl": df["hdl"] < 50,
    "high_bmi": df["bmi"] >= 25,
    "high_waist": df["waist_circumference"] >= 80,
})
df["metabolic_syndrome_score"] = metabolic_criteria.sum(axis=1)
```

**ATP III Criteria Used (adapted for no‑BP model):**
| Criterion | Threshold | Points |
|-----------|-----------|--------|
| Elevated triglycerides | ≥ 150 mg/dL | 1 |
| Reduced HDL | < 50 mg/dL (women) | 1 |
| Elevated BMI | ≥ 25 kg/m² (PH Asia-Pacific WHO) | 1 |
| Elevated waist circumference | ≥ 80 cm (women) | 1 |

**Clinical Rationale:** Metabolic syndrome is a cluster of conditions that increases diabetes risk. Score range: 0-4 (≥3 criteria = metabolic syndrome indicator in this dataset).

---

## 3. Enrichment Features (1)

### 3.1 Waist Circumference (`waist_circumference`)

**NHANES Source:** `BMXWAIST` - Waist circumference (cm)

**Availability:** 98.0% (1,348/1,376 records)

**Clinical Rationale:** Central obesity indicator more predictive of metabolic risk than BMI alone. Used in metabolic syndrome criteria.

---

### 3.2 Race/Ethnicity Encoded (`race_encoded`) — removed
Race/ethnicity is no longer used in the binary_v2_no_bp screening model. It was removed to simplify inputs and reduce demographic leakage.

---

### 3.3 [REMOVED] Family History of Diabetes (`family_history_diabetes`)

*Note: This feature was removed during the V2 upgrade due to severe missingness (83%) in recent NHANES cycles, as detailed in the `dataset-gap-analysis.md`. Model performance slightly improved upon its removal.*

---

## Feature Engineering Pipeline

```
Raw NHANES Data (XPT files)
    ↓
Data Processing (process_nhanes_multi.py)
    - Download & merge cycle files
    - Derive lifestyle features (smoking, activity, alcohol)
    - Filter: Female, Age 45-60, Postmenopausal
    - Output: diana_training_data_multi.csv
    ↓
Data Cleaning (data_processing.py)
    - Add diabetes labels (ADA criteria)
    - Detect outliers
    - Output: diana_dataset_final.csv
    ↓
Feature Engineering (train_binary_v2_no_bp.py::engineer_features_reduced)
    - Create derived features (bmi_category, tg_hdl_ratio, etc.)
    - Encode categorical variables
    - Calculate metabolic syndrome score
    ↓
Model Training (train_binary_v2_no_bp.py)
    - SimpleImputer (median) inside CV pipeline
    - StandardScaler
    - Logistic Regression / Random Forest
```

---

## Feature Statistics (n=1,376)

### Missing Data Rates
| Feature | Missing | Rate |
|---------|---------|------|
| waist_circumference | 28 | 2.0% |
| race_encoded | removed | removed |
| All others (from NHANES core) | < 55 | < 4% |

### Data Imputation
- **Strategy:** SimpleImputer with median (continuous), mode (categorical)
- **Location:** Inside CV pipeline (leakage-safe)
- **Handled automatically:** Yes

---

## Feature Importance

Based on mutual information and clinical literature:

| Rank | Feature | Rationale |
|------|---------|-----------|
| 1 | `bmi` / `bmi_category` | Strongest single predictor |
| 2 | `age` | Age 45-60 = postmenopausal cohort |
| 3 | `tg_hdl_ratio` | Insulin resistance surrogate |
| 4 | `metabolic_syndrome_score` | Composite risk indicator |
| 5 | `race_encoded` | removed |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | Original | 6 metabolic features only |
| v2.0 | Current | Binary_v2_no_bp 12‑feature contract |
| v2.1 | Planned | CRP (removed - not available all cycles) |

---

## References

1. **ATP III Metabolic Syndrome Criteria** - NIH/NCEP
2. **ADA Diabetes Classification** - American Diabetes Association 2024
3. **Gaziano JM et al.** - Triglyceride/HDL ratio as insulin resistance marker
4. **NHANES Documentation** - CDC/NCHS data documentation

---

*Generated: February 21, 2026*
*Model Version: binary_v2_no_bp*
*Dataset: diana_dataset_final.csv (n=1,376)*
*BMI Standard: Philippine (Asia-Pacific WHO)*

---

## Future Enhancements (Doctor-Recommended)

The following features were discussed with clinical advisors and documented for potential future inclusion:

| Feature | Clinical Rationale | Priority | Status |
|---------|-------------------|----------|--------|
| SGPT (ALT) | Liver enzyme marker — elevated levels may indicate fatty liver disease associated with insulin resistance | Optional | Not required per doctor's feedback |
| Creatinine | Kidney function marker — elevated levels may indicate diabetic nephropathy risk | Optional | Not required per doctor's feedback |

> **Note:** The doctor confirmed these are not required for diabetes risk assessment but could be useful supplementary markers in future versions.

*Last Updated: February 21, 2026, 11:00 PM PHT*
