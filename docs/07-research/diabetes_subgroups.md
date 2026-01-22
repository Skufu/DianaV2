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

## Implementation in Codebase (Verified Results)

```python
# scripts/train_clusters.py - assign_cluster_labels()
# Uses rank-based assignment:
#   1. SIDD = Highest HbA1c
#   2. SIRD = Highest metabolic risk (BMI + TG - HDL)
#   3. MOD  = Highest BMI remaining
#   4. MARD = Last remaining (healthiest)

# Verified Results (n=1,376):
CLUSTER_RESULTS = {
    0: {'label': 'MOD-like',  'n': 370,  'pct': '26.9%', 'key': 'BMI=29.58, TG=176.37'},
    1: {'label': 'MARD-like', 'n': 505,  'pct': '36.7%', 'key': 'BMI=25.74, HDL=72.98'},
    2: {'label': 'SIRD-like', 'n': 404,  'pct': '29.4%', 'key': 'BMI=38.28, TG=114.68'},
    3: {'label': 'SIDD-like', 'n': 97,   'pct': '7.1%',  'key': 'HbA1c=9.24%, FBS=223.78'},
}
```

---

## K-Means Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **K** | 4 | Matches 4 clinical subtypes |
| **Method** | K-Means | Per paper methodology |
| **Features** | All biomarkers (standardized) | Equal weighting |
| **Validation** | Elbow + Silhouette | Reference only (K=4 enforced) |

---

## Keywords

`SIRD` `SIDD` `MARD` `MOD` `SOIRD` `MIDD` `cluster` `subgroup` `subtype` `Ahlqvist` `insulin resistance` `insulin deficient` `obesity` `age-related` `K-Means` `K=4`
