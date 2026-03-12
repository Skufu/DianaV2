# DIANA Model Weights Validation - Clinical Interview with Doc PaJanel

**Date:** March 12, 2026  
**Purpose:** Validate and potentially adjust expert-elicited feature weights for diabetes subtype clustering  
**Model:** binary_v2_no_bp (Weighted K-Means, K=4 Ahlqvist subtypes)

---

## Current Feature Weights

| Feature | Weight | Clinical Rationale |
|---------|--------|-------------------|
| **LDL** | **2.5** | Highest - SIDD phenotype (atherogenic/lipid-driven). Identifies cardiovascular risk without HOMA2-B/C-peptide. |
| **Triglycerides** | **2.0** | SIRD phenotype marker. Component of LAP formula `(WC - 58) × TG` - validated insulin resistance proxy (Wang et al. 2024). |
| **Waist Circumference** | **2.0** | SIRD phenotype marker. Central obesity > BMI for metabolic risk. LAP formula component. |
| **BMI** | **1.5** | MOD phenotype marker. Obesity-related diabetes indicator. |
| **HDL** | **1.2** | Metabolic syndrome component. Protective lipid marker. |
| **Age** | **1.0** | Baseline. MARD phenotype (mild age-related). Cohort already 45-60 years. |

---

## Interview Questions

### Section 1: Weight Prioritization

**Q1:** The current model weights LDL highest (2.5) for identifying the atherogenic phenotype. In your clinical experience with Filipino postmenopausal women, do you see LDL as the primary cardiovascular risk driver, or should we consider other markers?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

**Q2:** Triglycerides and waist circumference are weighted equally (2.0). Does the LAP formula `(WC - 58) × TG` accurately capture insulin resistance in your patient population, or would you adjust this balance?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

**Q3:** BMI is weighted at 1.5, lower than central obesity markers. Should we consider Asia-Pacific BMI thresholds (≥25 = overweight) to increase its importance?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

### Section 2: Missing Features & Proxies

**Q4:** The model lacks HOMA2-IR, HOMA2-B, and C-peptide (Ahlqvist's primary discriminators). Are there proxy markers in routine labs that could better distinguish SIRD vs SIDD?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

**Q5:** We removed family history of diabetes due to 83% missingness in NHANES. In your clinical practice, how heavily do you weigh family history when assessing diabetes risk in menopausal women?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

### Section 3: Phenotype Validation

**Q6:** We're using LDL as a proxy for the "atherogenic" phenotype (rebranded from SIDD). Does this align with what you observe clinically - patients with high LDL progressing differently than those with high BMI/TG?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

**Q7:** The model identifies 4 clusters: SIRD-like, SIDD-like, MOD-like, MARD-like. Have you observed these distinct metabolic patterns in your menopausal patients? Are there subtypes we're missing?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

### Section 4: Clinical Thresholds

**Q8:** For LAP calculation, we use `(WC - 58) × TG` for women. Is the 58cm threshold appropriate for Filipino women who may have smaller baseline waist measurements?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

**Q9:** The current thresholds identify at-risk patients. Should we adjust for early intervention - catching pre-diabetes earlier in the menopausal transition?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

### Section 5: Population-Specific Considerations

**Q10:** This model was trained on NHANES (US population). What metabolic differences should we expect in Filipino postmenopausal women that might require weight adjustments?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

**Q11:** Filipino women have higher diabetes prevalence at lower BMI compared to Western populations. Should we increase BMI's weight for this demographic?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

### Section 6: Model Limitations & Clinical Context

**Q12:** The model has 72% AUC - good for screening but not diagnosis. What clinical context should we emphasize when presenting results to patients?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

**Q13:** Sensitivity analysis shows waist circumference changes cause the most assignment instability (3.1%). Is this acceptable, or should we reduce waist's weight for more stable classifications?

> **Doctor's Response:**
>
> _[To be filled during interview]_

---

## Proposed Weight Adjustments (Post-Interview)

Fill this section after the interview:

| Feature | Current Weight | Proposed Weight | Rationale |
|---------|---------------|-----------------|-----------|
| LDL | 2.5 | _[TBD]_ | _[Rationale]_ |
| Triglycerides | 2.0 | _[TBD]_ | _[Rationale]_ |
| Waist Circumference | 2.0 | _[TBD]_ | _[Rationale]_ |
| BMI | 1.5 | _[TBD]_ | _[Rationale]_ |
| HDL | 1.2 | _[TBD]_ | _[Rationale]_ |
| Age | 1.0 | _[TBD]_ | _[Rationale]_ |

---

## Post-Interview Action Items

- [ ] Update `Ian_ML/training/clustering.py` with new weights
- [ ] Re-run clustering training: `python Ian_ML/training/clustering.py --k 4`
- [ ] Run sensitivity analysis: `python Ian_ML/training/sensitivity_analysis.py`
- [ ] Update `feature_weights.json` with provenance notes
- [ ] Update thesis methodology section (ch3+4.md) with clinical validation
- [ ] Document weight changes in this file

---

## Technical Notes

### Pipeline Architecture (Retraining Required?)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FULL TRAINING PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────────┐    │
│  │  1. BINARY CLASSIFIER │      │  2. K-MEANS CLUSTERING   │    │
│  │  (Normal vs At-Risk)  │      │  (Subtype Assignment)    │    │
│  │                       │      │                          │    │
│  │  • Logistic Regression│      │  • Weighted K-Means      │    │
│  │  • 9 features         │      │  • Uses FEATURE WEIGHTS  │    │
│  │  • NO weights used    │      │  • K=4 Ahlqvist subtypes │    │
│  │                       │      │                          │    │
│  │  File:                │      │  File:                   │    │
│  │  train_binary_v2_no_bp.py   │  clustering.py           │    │
│  │                       │      │                          │    │
│  │  Output:              │      │  Output:                 │    │
│  │  best_model.joblib    │      │  weighted_kmeans_model.joblib   │
│  │  scaler.joblib        │      │  feature_weights.json    │    │
│  └──────────────────────┘      └──────────────────────────┘    │
│                                                                  │
│  WEIGHT CHANGES ONLY AFFECT STEP 2                              │
│  STEP 1 (Binary Classifier) DOES NOT NEED RETRAINING            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### If Doctor Changes Weights:

**✅ ONLY need to retrain clustering:**
```bash
python Ian_ML/training/clustering.py --k 4
```

**❌ Do NOT need to retrain binary classifier:**
- Binary classifier (Normal vs At-Risk) does NOT use feature weights
- Only clustering uses weights for subtype assignment
- Binary classifier is independent of weight changes

### Retraining Time:

| Step | Command | Time | Affected by Weight Changes? |
|------|---------|------|----------------------------|
| Binary Classifier | `python train_binary_v2_no_bp.py` | ~5-10 min | ❌ NO |
| K-Means Clustering | `python clustering.py --k 4` | ~30 sec | ✅ YES |
| Sensitivity Analysis | `python sensitivity_analysis.py` | ~1-2 min | ✅ YES (optional) |

---

## References

1. Ahlqvist, E., et al. (2018). Novel subgroups of adult-onset diabetes. Lancet Diabetes Endocrinol.
2. Tanabe, H., et al. (2024). Replicating Ahlqvist's diabetes subtypes: challenges without HOMA2. Diabetologia.
3. Wang, X., et al. (2024). Lipid Accumulation Product as a predictor of prediabetes and diabetes. BMC Endocrine Disorders.
4. Weighted K-Means Implementation: `docs/03-ml/weighted-kmeans-implementation-summary.md`

---

## Version History

| Date | Changes | By |
|------|---------|-----|
| 2026-03-12 | Initial questionnaire created | Sisyphus |
| _[Date]_ | Post-interview updates | _[Name]_ |

---

*Document prepared for clinical validation of DIANA diabetes subtype clustering weights.*