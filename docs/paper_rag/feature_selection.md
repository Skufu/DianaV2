# Feature Selection Reference

> Entropy and Information Gain (IG) methodology per paper

---

## Purpose

Identify which biomarkers contribute most to predicting T2DM risk among menopausal women.

---

## Formulas

### Entropy

```
H(Y) = -Σ p(c) × log₂(p(c))
       c∈C
```

Where:
- `Y` = class label (Non-Diabetic, Pre-diabetic, Diabetic)
- `C` = set of possible classes
- `p(c)` = proportion of records in class `c`

### Conditional Entropy

```
H(Y|X) = Σ p(v) × H(Y|X=v)
         v∈V
```

Where:
- `X` = feature attribute
- `V` = discrete values/bins of X
- `p(v)` = proportion of records with X=v

### Information Gain

```
IG(Y, X) = H(Y) - H(Y|X)
```

**Interpretation**: Higher IG = feature provides more discriminatory power.

---

## Feature Selection Process

1. **Discretize** continuous features into clinically meaningful bins
2. **Compute** overall entropy H(Y) using class distribution
3. **For each attribute** Xⱼ:
   - Compute conditional entropy H(Y|Xⱼ)
   - Calculate IG(Y, Xⱼ) = H(Y) - H(Y|Xⱼ)
4. **Rank** attributes from highest to lowest IG
5. **Select** top-ranking features for model training

---

## Discretization Bins (Example)

| Biomarker | Normal | Borderline | High |
|-----------|--------|------------|------|
| FBS (mg/dL) | <100 | 100-125 | ≥126 |
| HbA1c (%) | <5.7 | 5.7-6.4 | ≥6.5 |
| BMI (kg/m²) | <25 | 25-30 | ≥30 |
| TG (mg/dL) | <150 | 150-199 | ≥200 |

---

## Expected IG Ranking (from paper)

Based on ADA definitions, expected high-importance features:
1. **HbA1c** (defines label directly)
2. **FBS** (secondary diagnostic criteria)
3. **BMI** (metabolic indicator)
4. **Lipid profile** (TG, LDL, HDL)
5. **Age**

> For clinical (non-circular) models excluding HbA1c/FBS, BMI typically ranks highest.

---

## Implementation

```python
# scripts/feature_selection.py
from sklearn.feature_selection import mutual_info_classif

def calculate_information_gain(X, y):
    """Rank features by mutual information (equivalent to IG)."""
    ig_scores = mutual_info_classif(X, y, discrete_features=False)
    return dict(zip(X.columns, ig_scores))
```

---

## Output Files

| File | Format | Content |
|------|--------|---------|
| `information_gain_results.json` | JSON | IG scores, entropy, feature ranking |
| `models/clinical/results/model_comparison.json` | JSON | Includes feature importance |

---

## Keywords

`entropy` `information gain` `IG` `feature selection` `mutual information` `discretization` `binning` `ranking` `feature importance`
