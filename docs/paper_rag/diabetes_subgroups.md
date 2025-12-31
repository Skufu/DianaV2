# T2DM Subgroups (Clustering Labels)

> Based on Ahlqvist et al. (2018) classification adapted for DIANA

---

## Primary Cluster Labels

| Label | Full Name | Defining Features |
|-------|-----------|-------------------|
| **SIRD** | Severe Insulin-Resistant Diabetes | High BMI, high HOMA-IR, high TG, low HDL |
| **SIDD** | Severe Insulin-Deficient Diabetes | High HbA1c, low HOMA-β, moderate BMI |
| **MOD** | Mild Obesity-Related Diabetes | High BMI (>30), moderate HbA1c |
| **MARD** | Mild Age-Related Diabetes | Older age (>55), mild elevations across markers |

---

## Cluster Characteristics

### SIRD (Severe Insulin-Resistant Diabetes)
- **Key Indicators**: High BMI, elevated triglycerides, low HDL
- **Age Profile**: Often younger onset
- **Clinical Implication**: Responds to insulin sensitizers (metformin)

### SIDD (Severe Insulin-Deficient Diabetes)
- **Key Indicators**: Highest HbA1c, lowest beta-cell function
- **Age Profile**: Variable
- **Clinical Implication**: May need early insulin

### MOD (Mild Obesity-Related Diabetes)
- **Key Indicators**: BMI >30, moderate glucose elevation
- **Age Profile**: Middle-aged
- **Clinical Implication**: Weight management focus

### MARD (Mild Age-Related Diabetes)
- **Key Indicators**: Oldest age at diagnosis, mild dysfunction
- **Age Profile**: >55 years typically
- **Clinical Implication**: Conservative management

---

## Paper's Cluster Labels (Alternative)

The paper also mentions these labels in Table 4:

| Label | Full Name |
|-------|-----------|
| **SOIRD** | Severe Obesity-Related and Insulin-Resistant Diabetes |
| **SIDD** | Severe Insulin-Deficient Diabetes |
| **MARD** | Mild Age-Associated Diabetes Mellitus |
| **MIDD** | Mild Insulin-Deficient Diabetes |

> **Note**: Both classification schemes are valid. The codebase currently uses SIRD, SIDD, MOD, MARD.

---

## Implementation in Codebase

```python
# scripts/train_enhanced.py - assign_cluster_labels()
CLUSTER_LABELS = {
    0: 'MARD',  # Mild Age-Related
    1: 'MOD',   # Mild Obesity-Related
    2: 'SIDD',  # Severe Insulin-Deficient
    3: 'SIRD'   # Severe Insulin-Resistant
}
```

---

## K-Means Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **K** | 4 | Matches 4 clinical subtypes |
| **Method** | K-Means | Per paper methodology |
| **Features** | All biomarkers (standardized) | Equal weighting |
| **Validation** | Elbow + Silhouette | Optimal K confirmation |

---

## Keywords

`SIRD` `SIDD` `MARD` `MOD` `SOIRD` `MIDD` `cluster` `subgroup` `subtype` `Ahlqvist` `insulin resistance` `insulin deficient` `obesity` `age-related` `K-Means` `K=4`
