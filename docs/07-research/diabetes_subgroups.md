# T2DM Subgroups (Clustering Labels)

> This document includes both paper-context taxonomy and DIANA runtime semantics.
> 
> **Important**: DIANA uses "-like" suffixes (SIRD-like, SIDD-like, MOD-like, MARD-like) to indicate these are heuristic proxy classifications derived from available biomarkers, not validated biological subtype diagnoses. True Ahlqvist subtyping requires HOMA2-B and C-peptide biomarkers unavailable in NHANES.

---

## Runtime Cluster Labels (DIANA)

| Label | Full Name | Defining Features |
|-------|-----------|-------------------|
| **SIRD-like** | Severe Insulin-Resistant Diabetes (Proxy) | High BMI, high TG, low HDL; validated LAP score proxy |
| **SIDD-like** | Atherogenic / Lipid-Driven Diabetes (Proxy) | High LDL, severe dyslipidemia pattern; lipid-driven heuristic |
| **MOD-like** | Mild Obesity-Related Diabetes (Proxy) | High BMI, moderate metabolic markers |
| **MARD-like** | Mild Age-Related Diabetes (Proxy) | Older age, mild elevations across markers; residual category |

---

## Cluster Characteristics

### SIRD-like (Severe Insulin-Resistant Diabetes Proxy)
- **Key Indicators**: High BMI, elevated triglycerides, low HDL
- **Assignment**: Maximum LAP = (WC − 58) × TG (Wang et al., 2024)
- **Clinical Implication**: Responds to insulin sensitizers (metformin)

### SIDD-like (Atherogenic / Lipid-Driven Diabetes Proxy)
- **Key Indicators**: High LDL and dyslipidemia profile
- **Assignment**: Maximum LDL among remaining clusters (Tenenbaum et al., 2006)
- **Clinical Implication**: Cardiovascular risk management and lipid-focused intervention
- **Note**: Lipid-driven proxy; true SIDD requires HOMA2-B/C-peptide unavailable in NHANES

### MOD-like (Mild Obesity-Related Diabetes Proxy)
- **Key Indicators**: High BMI, moderate metabolic markers
- **Assignment**: Maximum BMI among remaining clusters
- **Clinical Implication**: Weight management focus

### MARD-like (Mild Age-Related Diabetes Proxy)
- **Key Indicators**: Oldest age at diagnosis, mild dysfunction
- **Assignment**: Residual cluster (heuristic category)
- **Clinical Implication**: Conservative management

---

## Paper Taxonomy (Original Ahlqvist Context)

The paper also mentions these labels in Table 4:

| Label | Full Name |
|-------|-----------|
| **SOIRD** | Severe Obesity-Related and Insulin-Resistant Diabetes |
| **SIDD** | Severe Insulin-Deficient Diabetes |
| **MARD** | Mild Age-Associated Diabetes Mellitus |
| **MIDD** | Mild Insulin-Deficient Diabetes |

> **Important**: Use this table only when discussing paper taxonomy. Runtime behavior should follow `../03-ml/assessment-contract.md`.

## Runtime vs Paper Naming

- **Runtime semantic authority**: `../03-ml/assessment-contract.md`
- **Paper-context naming**: Ahlqvist-derived labels and table variants in manuscript references
- **DIANA adaptation**: Runtime SIDD is intentionally represented as an atherogenic/lipid-driven phenotype

---

## Implementation in Codebase (Verified Results)

```python
# Ian_ML/training/clustering.py - assign_ahlqvist_labels()
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
