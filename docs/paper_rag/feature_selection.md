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

### Primary: Mutual Information (sklearn)
1. **Compute** MI using `mutual_info_classif()` (handles continuous features)
2. **Cross-validate** with Random Forest feature importance
3. **Compare** rankings for consensus

### Secondary: Information Gain with Clinical Discretization
1. **Discretize** continuous features using clinical thresholds (for panel defense)
2. **Compute** overall entropy H(Y) using class distribution
3. **For each attribute** Xⱼ:
   - Compute conditional entropy H(Y|Xⱼ)
   - Calculate IG(Y, Xⱼ) = H(Y) - H(Y|Xⱼ)
4. **Rank** attributes from highest to lowest IG

---

## Discretization Bins (Example)

| Biomarker | Normal | Borderline | High |
|-----------|--------|------------|------|
| FBS (mg/dL) | <100 | 100-125 | ≥126 |
| HbA1c (%) | <5.7 | 5.7-6.4 | ≥6.5 |
| BMI (kg/m²) | <25 | 25-30 | ≥30 |
| TG (mg/dL) | <150 | 150-199 | ≥200 |

---

## Verified Feature Ranking (from implementation)

Actual Mutual Information scores from DIANA dataset:

| Rank | Feature | MI Score | RF Importance |
|------|---------|----------|---------------|
| 1 | HbA1c | 1.0076 | 0.7434 |
| 2 | FBS | 0.3168 | 0.1400 |
| 3 | BMI | 0.0605 | 0.0315 |
| 4 | HDL | 0.0465 | 0.0304 |
| 5 | Triglycerides | 0.0278 | 0.0219 |
| 6 | LDL | 0.0000 | 0.0228 |
| 7 | Age | 0.0000 | 0.0100 |

> For clinical (non-circular) models excluding HbA1c/FBS, BMI ranks highest.

---

## Implementation

```python
# scripts/feature_selection.py
from sklearn.feature_selection import mutual_info_classif
from sklearn.ensemble import RandomForestClassifier

def calculate_mutual_information(X, y, feature_names):
    """Calculate MI scores (handles continuous features natively)."""
    mi_scores = mutual_info_classif(X, y, random_state=42)
    return dict(zip(feature_names, mi_scores))

def calculate_rf_importance(X, y, feature_names):
    """Cross-validate with Random Forest importance."""
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X, y)
    return dict(zip(feature_names, rf.feature_importances_))
```

> **See also**: [ml-rationale.md](../ml-rationale.md) for methodology justification

---

## Output Files

| File | Format | Content |
|------|--------|---------|
| `information_gain_results.json` | JSON | IG scores, entropy, feature ranking |
| `models/clinical/results/model_comparison.json` | JSON | Includes feature importance |

---

## Keywords

`entropy` `information gain` `IG` `feature selection` `mutual information` `discretization` `binning` `ranking` `feature importance`
