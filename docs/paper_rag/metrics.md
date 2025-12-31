# Evaluation Metrics Reference

> Model performance requirements per paper

---

## Required Metrics

| Metric | Formula | Purpose |
|--------|---------|---------|
| **Accuracy** | (TP+TN) / Total | Overall correctness |
| **Precision** | TP / (TP+FP) | Positive prediction accuracy |
| **Recall** | TP / (TP+FN) | Sensitivity, catch all at-risk |
| **F1-Score** | 2×TP / (2×TP+FP+FN) | Balance precision/recall |
| **AUC-ROC** | Area under ROC curve | Discrimination ability |
| **Classification Error** | 1 - Accuracy | Proportion wrong |

---

## Target Thresholds

| Metric | Target | Notes |
|--------|--------|-------|
| **AUC-ROC** | > 0.80 | Minimum for clinical use |
| **AUC-ROC (ADA model)** | ~1.0 | Expected when HbA1c is feature |
| **High AUC-ROC** | > 0.95 | Indicates excellent discrimination |

---

## Model Comparison Process

1. Compare LR, RF, XGBoost on test set
2. **Primary**: Select by highest AUC-ROC
3. **Secondary**: Consider F1-Score
4. **Tertiary**: Clinical interpretability
5. Document in `best_model_report.json`

---

## Formulas

```
Accuracy = Σ(TP + TN) / Σ(TP + TN + FP + FN)

Precision = ΣTP / Σ(TP + FP)

Recall = ΣTP / Σ(TP + FN)

F1 = Σ(2×TP) / Σ(2×TP + FP + FN)

AUC = Σ(i=1 to n-1) [(Xi+1 - Xi) × (Yi + Yi+1) / 2]
```

---

## Confusion Matrix

|  | Predicted Normal | Predicted Pre-diabetic | Predicted Diabetic |
|--|------------------|------------------------|-------------------|
| **Actual Normal** | TN | FP | FP |
| **Actual Pre-diabetic** | FN | TP | - |
| **Actual Diabetic** | FN | - | TP |

> For multiclass, use macro/weighted averages.

---

## Cross-Validation

| Parameter | Value |
|-----------|-------|
| Method | K-Fold |
| K | 5 |
| Scope | Within 70% training set |
| Purpose | Hyperparameter tuning, model selection |

---

## Risk Probability Output

| Range | Category | Clinical Action |
|-------|----------|-----------------|
| 0-33% | Low Risk | Routine monitoring |
| 34-66% | Moderate Risk | Enhanced screening |
| 67-100% | High Risk | Priority intervention |

---

## Output Files

| File | Content |
|------|---------|
| `model_comparison.csv` | All models, all metrics |
| `best_model_report.json` | Selected model + justification |
| `roc_curve.png` | ROC visualization |
| `confusion_matrix.png` | Classification matrix |

---

## Keywords

`accuracy` `precision` `recall` `sensitivity` `specificity` `F1` `AUC` `ROC` `confusion matrix` `metrics` `evaluation` `performance` `cross-validation`
