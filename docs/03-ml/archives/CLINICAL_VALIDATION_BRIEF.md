# DIANA ML Model - Clinical Validation Brief

**For: Filipino Healthcare Provider**  
**Date: February 2026**

---

## 1. What This Model Does

Predicts diabetes risk for **postmenopausal women age 45-60** using metabolic biomarkers and lifestyle factors. It is a **screening aid**, not a diagnostic tool.

### Target Population
- Women age 45-60
- Postmenopausal status
- Filipino population (validation pending)

---

## 2. Model Inputs (13 Features)

| Feature | Unit | Clinical Relevance |
|---------|------|-------------------|
| BMI | kg/m² | Obesity indicator |
| Triglycerides | mg/dL | Metabolic health |
| LDL | mg/dL | Cardiovascular risk |
| HDL | mg/dL | Protective lipid |
| Age | years | Risk factor |
| Systolic BP | mmHg | Hypertension |
| Diastolic BP | mmHg | Hypertension |
| BMI Category | 0-3 | Obesity classification |
| TG/HDL Ratio | ratio | Insulin resistance proxy |
| Smoking | 0-2 | Lifestyle risk |
| Physical Activity | 0-2 | Protective factor |
| Alcohol Use | 0-3 | Lifestyle factor |
| Metabolic Syndrome Score | 0-4 | Composite risk |

---

## 3. Model Outputs

### Risk Classification
| Status | Probability Threshold | Clinical Action |
|--------|----------------------|-----------------|
| **Normal** | P(at-risk) < 0.25 | Routine screening |
| **Pre-diabetic** | P(at-risk) 0.25-0.50 | Lifestyle intervention |
| **Diabetic** | P(at-risk) ≥ 0.50 | Confirmatory testing |

### At-Risk Probability
- Sum of P(pre-diabetic) + P(diabetic)
- Range: 0-100%
- Clinical operating point: threshold ≥ 0.50

---

## 4. Performance Metrics

| Metric | Value | Interpretation |
|--------|-------|----------------|
| AUC-ROC | 0.69 | Moderate discrimination |
| Sensitivity (at-risk) | 86% | Good at catching at-risk cases |
| Specificity (at-risk) | 42% | Moderate false positive rate |
| PPV | 63% | ~2/3 positive predictions are true at-risk |

**Note:** AUC 0.69 is typical for clinical models without HbA1c/FBS. This is a screening tool, not a diagnostic test.

---

## 5. Key Limitations

⚠️ **Important for Clinical Use:**

1. **Not a diagnostic test** - Results should be confirmed with standard diagnostics (HbA1c, FBS, OGTT)

2. **Cross-sectional** - Predicts current status, not future incidence

3. **US-derived model** - Trained on NHANES (US population). Filipino population validation recommended.

4. **Moderate accuracy** - 86% sensitivity but 42% specificity. Expect false positives.

5. **Missing factors** - Does not include: family history, diet, fasting duration, other comorbidities

---

## 6. Validation Questions for Reviewer

Please consider:

1. **Feature relevance** - Are these 13 features clinically meaningful for Filipino patients?
2. **Threshold appropriateness** - Are 0.25/0.50 thresholds clinically sensible?
3. **Missing features** - What other clinical factors should be included?
4. **Population applicability** - Any concerns about US-derived model for Filipino women?
5. **Case review** - Would you like to test with retrospective patient cases?

---

## 7. Contact & References

- **Code**: `Ian_ML/service/predict.py` (Flask API)
- **Documentation**: `docs/03-ml/COMPLETE_METHODOLOGY.md`
- **Model artifacts**: `models/clinical_3class/`

---

*This model is intended as a screening aid to support clinical decision-making, not replace it.*
