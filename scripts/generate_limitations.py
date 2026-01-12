"""
Generate Limitations Summary for DIANA Thesis.

Documents 5-6 key limitations of the DIANA model with specific
metrics and evidence from experimental results.

Usage: python scripts/generate_limitations.py
Output: models/clinical/results/limitations_summary.md
"""

import json
from pathlib import Path

# Paths
RESULTS_DIR = Path("models/clinical/results")
BEST_MODEL_REPORT = RESULTS_DIR / "best_model_report.json"
CONFIDENCE_INTERVALS = RESULTS_DIR / "confidence_intervals.json"
PER_CLASS_METRICS = RESULTS_DIR / "per_class_metrics_summary.json"
OUTPUT_FILE = RESULTS_DIR / "limitations_summary.md"


def main():
    """Generate limitations summary."""
    print("="*70)
    print("DIANA THESIS - Limitations Summary Generator")
    print("="*70)
    print("\nTask: Document 5-6 key limitations with specific metrics")

    # Load data sources
    print("\n" + "="*70)
    print("STEP 1: Loading Model Performance Data")
    print("="*70)

    with open(BEST_MODEL_REPORT, 'r') as f:
        model_report = json.load(f)

    with open(CONFIDENCE_INTERVALS, 'r') as f:
        ci_data = json.load(f)

    with open(PER_CLASS_METRICS, 'r') as f:
        class_metrics_data = json.load(f)

    metrics = model_report['metrics']
    diabetic_metrics = class_metrics_data['per_class_metrics']['Diabetic']

    print(f"\n   Model: {model_report['best_model']}")
    print(f"   AUC-ROC: {metrics['auc_roc']:.4f}")
    print(f"   Diabetic Recall: {diabetic_metrics['Recall']:.2%}")
    print(f"   Overfit Gap: {metrics['overfit_gap']:.4f}")
    print(f"   Brier Score: {metrics['brier_score']:.4f}")

    # Generate limitations
    print("\n" + "="*70)
    print("STEP 2: Generating Limitations")
    print("="*70)

    limitations = generate_limitations(metrics, diabetic_metrics, ci_data, class_metrics_data)

    # Generate markdown
    print("\n" + "="*70)
    print("STEP 3: Creating Markdown Output")
    print("="*70)

    markdown = generate_limitations_markdown(limitations, metrics, diabetic_metrics, ci_data)

    # Save output
    print("\n" + "="*70)
    print("STEP 4: Saving Limitations Summary")
    print("="*70)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(markdown)

    print(f"\n[SUCCESS] Limitations summary saved to {OUTPUT_FILE}")

    # Print summary
    print("\n" + "="*70)
    print("LIMITATIONS SUMMARY")
    print("="*70)

    for i, lim in enumerate(limitations, 1):
        print(f"\n   {i}. {lim['title']}")
        print(f"      Severity: {lim['severity']}")

    print(f"\n   Total limitations documented: {len(limitations)}")

    return limitations


def generate_limitations(metrics, diabetic_metrics, ci_data, class_metrics_data):
    """Generate list of limitations with evidence."""
    limitations = []

    # Limitation 1: Moderate Discriminative Ability
    limitations.append({
        'title': 'Moderate Discriminative Ability (AUC = 0.6732)',
        'description': (
            f"The model achieves an AUC-ROC of {metrics['auc_roc']:.4f}, indicating moderate "
            f"discriminative ability between diabetic and non-diabetic patients. While this exceeds "
            f"random guessing (AUC = 0.50), it falls short of the >0.80 threshold "
            f"typically required for clinical adoption in diagnostic tools."
        ),
        'evidence': {
            'AUC-ROC': f"{metrics['auc_roc']:.4f}",
            '95% CI': f"[{ci_data['models']['XGBoost']['ci_lower']:.4f}, "
                      f"{ci_data['models']['XGBoost']['ci_upper']:.4f}]",
            'CI Width': f"{ci_data['models']['XGBoost']['ci_width']:.4f}",
            'Clinical Threshold': "> 0.80 typically required for clinical adoption"
        },
        'severity': 'HIGH',
        'implication': (
            "The model may generate false positives and false negatives at rates "
            "clinically unacceptable for definitive diagnosis. Should be used only "
            "as a screening tool, not as a diagnostic replacement."
        ),
        'mitigation': [
            "Use as screening tool only, not diagnostic replacement",
            "Combine with clinical judgment and traditional risk factors",
            "Consider adding novel biomarkers (e.g., adiponectin, inflammatory markers)",
            "External validation on diverse populations to assess generalizability"
        ]
    })

    # Limitation 2: Low Diabetic Recall (Sensitivity)
    limitations.append({
        'title': f'Low Diabetic Recall (Sensitivity = {diabetic_metrics["Recall"]:.2%})',
        'description': (
            f"The model correctly identifies only {diabetic_metrics['Recall']:.1%} of actual "
            f"diabetic cases, missing approximately {(1 - diabetic_metrics['Recall']):.1%} of "
            f"diabetic patients. In a screening context, missing diabetic cases represents "
            f"a critical failure since delayed diagnosis leads to worse outcomes."
        ),
        'evidence': {
            'Diabetic Recall': f"{diabetic_metrics['Recall']:.4f}",
            'Diabetic Precision': f"{diabetic_metrics['Precision']:.4f}",
            'True Positives': f"{diabetic_metrics['True_Positives']}",
            'False Negatives': f"{diabetic_metrics['False_Negatives']}",
            'Clinical Standard': "Sensitivity > 80% typically required for screening tools"
        },
        'severity': 'CRITICAL',
        'implication': (
            "Approximately 60% of diabetic patients would be incorrectly classified as "
            "non-diabetic, delaying necessary intervention and potentially allowing "
            "disease progression before diagnosis."
        ),
        'mitigation': [
            "Lower classification threshold to improve sensitivity",
            "Develop separate high-sensitivity model for screening use",
            "Combine with direct HbA1c testing for positive predictions",
            "Implement sequential screening: DIANA first, then confirm with HbA1c"
        ]
    })

    # Limitation 3: Significant Overfitting
    limitations.append({
        'title': f'Significant Overfitting (Overfit Gap = {metrics["overfit_gap"]:.4f})',
        'description': (
            f"The model shows a large overfitting gap of {metrics['overfit_gap']:.4f} between "
            f"training accuracy ({metrics['train_accuracy']:.2%}) and test accuracy "
            f"({metrics['accuracy']:.2%}). This suggests the model memorizes training "
            f"data patterns rather than learning generalizable features, potentially reducing "
            f"performance on new patient populations."
        ),
        'evidence': {
            'Training Accuracy': f"{metrics['train_accuracy']:.4f}",
            'Test Accuracy': f"{metrics['accuracy']:.4f}",
            'Overfit Gap': f"{metrics['overfit_gap']:.4f}",
            'Best Overfit Gap': "Logistic Regression: 0.1233 (much better)",
            'Clinical Threshold': "Gap < 0.20 typically acceptable"
        },
        'severity': 'HIGH',
        'implication': (
            "The model may perform worse in clinical practice than reported test metrics, "
            "especially when applied to different populations or clinical settings. "
            "The 0.4011 gap is substantial and suggests regularization issues."
        ),
        'mitigation': [
            "Implement stronger regularization (higher L1/L2 penalties)",
            "Reduce tree depth in XGBoost (currently max_depth=4)",
            "Increase min_child_weight to prevent over-complex trees",
            "Apply dropout or feature subsampling during training",
            "Use cross-validation for hyperparameter tuning with early stopping"
        ]
    })

    # Limitation 4: Confusion Matrix Analysis - Pre-diabetic Misclassification
    limitations.append({
        'title': 'High Pre-diabetic Misclassification Rate',
        'description': (
            "Analysis of confusion matrix reveals systematic misclassification patterns. "
            "Pre-diabetic cases are particularly challenging, with only 34.1% recall "
            "and 43.1% precision. Many pre-diabetic patients are incorrectly "
            "classified as Normal (38/82, 46.3%) or Diabetic (16/82, 19.5%), "
            "missing early intervention opportunities."
        ),
        'evidence': {
            'Pre-diabetic Recall': f"{class_metrics_data['per_class_metrics']['Pre-diabetic']['Recall']:.4f}",
            'Pre-diabetic Precision': f"{class_metrics_data['per_class_metrics']['Pre-diabetic']['Precision']:.4f}",
            'Pre-diabetic F1': f"{class_metrics_data['per_class_metrics']['Pre-diabetic']['F1_Score']:.4f}",
            'Misclassified as Normal': "38/82 cases (46.3%)",
            'Misclassified as Diabetic': "16/82 cases (19.5%)",
            'Correctly Classified': "28/82 cases (34.1%)"
        },
        'severity': 'MODERATE',
        'implication': (
            "The model struggles to identify the pre-diabetic window, which is "
            "the most critical stage for diabetes prevention. Missing pre-diabetic "
            "patients loses the opportunity for lifestyle intervention that could prevent "
            "progression to overt diabetes."
        ),
        'mitigation': [
            "Develop separate pre-diabetic detection model with threshold optimization",
            "Add intermediate risk labels (low, moderate, high pre-diabetic risk)",
            "Incorporate trend data (HbA1c trajectory) for better classification",
            "Combine with family history and genetic risk factors"
        ]
    })

    # Limitation 5: Feature Limitations - Exclusion of Diagnostic Biomarkers
    limitations.append({
        'title': 'Feature Limitations - Exclusion of HbA1c and Fasting Glucose',
        'description': (
            "The model intentionally excludes HbA1c and fasting glucose (FBS) from "
            "features to avoid circular reasoning with the target variable. While this creates "
            "a clinically useful screening tool, it inherently limits discriminative ability "
            "since these are the strongest predictive biomarkers. The model relies on "
            "surrogate markers (lipids, BMI, blood pressure) with weaker association "
            "to diabetes status."
        ),
        'evidence': {
            'Excluded Features': ['HbA1c', 'Fasting Glucose'],
            'Included Features': ['BMI', 'Triglycerides', 'LDL', 'HDL', 'Age', 'BP', 'Lifestyle'],
            'Rationale': 'Avoid circular reasoning (HbA1c used to create target labels)',
            'Trade-off': 'Screening utility vs. diagnostic accuracy'
        },
        'severity': 'MODERATE',
        'implication': (
            "The model cannot achieve high AUC without the most predictive biomarkers. "
            "This is a fundamental limitation of the non-circular approach, though "
            "clinically justified. The model serves as an early screening tool "
            "rather than a definitive diagnostic."
        ),
        'mitigation': [
            "Accept moderate AUC as acceptable for screening purpose",
            "Position model as 'pre-HbA1c screening' to manage expectations",
            "Combine with inexpensive point-of-care tests (e.g., random glucose)",
            "Develop two-stage screening: DIANA first, then confirmatory biomarker panel"
        ]
    })

    # Limitation 6: Single-Source Data and Lack of External Validation
    limitations.append({
        'title': 'Single-Source Data and Limited External Validation',
        'description': (
            "The model is trained exclusively on NHANES data (US population, "
            "2011-2020 cycles) with only Leave-One-Cycle-Out temporal validation. "
            "No external validation on independent datasets, geographic populations, or "
            "clinical settings has been performed. This raises concerns about generalizability "
            "and potential dataset-specific biases."
        ),
        'evidence': {
            'Training Data': 'NHANES 2011-2020 (US population only)',
            'Sample Size': '1,376 postmenopausal women',
            'Validation Method': 'Leave-One-Cycle-Out temporal validation',
            'External Validation': 'Not performed',
            'Geographic Scope': 'United States only',
            'Clinical Validation': 'None (retrospective analysis only)'
        },
        'severity': 'HIGH',
        'implication': (
            "Model performance may degrade when applied to non-US populations, different "
            "ethnic groups, or clinical practice settings not represented in NHANES. "
            "Without external validation, reported metrics may not generalize to "
            "real-world deployment."
        ),
        'mitigation': [
            "Validate on international datasets (e.g., UK Biobank, European cohorts)",
            "Prospective clinical trial to assess real-world performance",
            "Diversity analysis: test model performance across subgroups",
            "Continuous monitoring: track model drift in production",
            "Geographic calibration: adjust thresholds for regional differences"
        ]
    })

    return limitations


def generate_limitations_markdown(limitations, metrics, diabetic_metrics, ci_data):
    """Generate markdown formatted limitations."""
    md = f"""# DIANA Model Limitations Summary
### Evidence-Based Analysis of Model Constraints and Performance Gaps

**Model**: XGBoost Classifier
**AUC-ROC**: {metrics['auc_roc']:.4f} (95% CI: [{ci_data['models']['XGBoost']['ci_lower']:.4f}, {ci_data['models']['XGBoost']['ci_upper']:.4f}])
**Training Date**: 2025-01-13
**Reference**: ml/k4-clusters branch, DianaV2 repository

---

## Executive Summary

The DIANA model achieves **moderate discriminative ability** (AUC = 0.6732) for diabetes risk stratification in postmenopausal women. However, **six critical limitations** must be acknowledged for clinical deployment:

1. **CRITICAL**: Low diabetic recall (40.6%) - 60% of diabetic cases missed
2. **HIGH**: Significant overfitting (gap = 0.4011) - May not generalize
3. **HIGH**: Moderate AUC (0.6732) - Below clinical adoption threshold (>0.80)
4. **MODERATE**: Pre-diabetic misclassification - Misses critical intervention window
5. **MODERATE**: Feature limitations - Excludes strongest biomarkers (HbA1c, FBS)
6. **HIGH**: No external validation - Single US population (NHANES)

**Clinical Positioning**: Use as **screening tool only**, not diagnostic replacement. Combine with clinical judgment and confirm with HbA1c testing.

---

"""

    for i, lim in enumerate(limitations, 1):
        md += f"""## Limitation {i}: {lim['title']}

**Severity**: {lim['severity']}

### Description

{lim['description']}

### Evidence

| Metric | Value | Interpretation |
|---------|-------|--------------|
"""

        for key, value in lim['evidence'].items():
            md += f"| **{key}** | `{value}` |\n"

        md += f"""
### Clinical Implication

{lim['implication']}

### Mitigation Strategies

{''.join(f'- {m}' for m in lim['mitigation'])}

---

"""

    md += """## Quantitative Summary of Limitations

| Limitation | Severity | Key Metric | Acceptable Range | Current Value |
|-----------|-----------|-------------|---------------|
| Low Diabetic Recall | CRITICAL | Sensitivity > 80% | 40.6% |
| Significant Overfitting | HIGH | Gap < 0.20 | 0.4011 |
| Moderate AUC | HIGH | AUC > 0.80 | 0.6732 |
| Pre-diabetic Misclassification | MODERATE | F1 > 0.50 | 0.3810 |
| Feature Limitations | MODERATE | N/A | N/A |
| No External Validation | HIGH | Required | Not performed |

---

## Clinical Deployment Recommendations

Based on these limitations, the following deployment approach is recommended:

### Screening Tool (Not Diagnostic)

- **DO**: Use as preliminary risk assessment tool
- **DO NOT**: Use as replacement for HbA1c or fasting glucose testing
- **DO**: Combine with clinical judgment and patient history
- **DO**: Confirm positive predictions with diagnostic testing

### Risk-Based Testing Protocol

1. **Low Risk (Score < 40)**: Annual screening
2. **Moderate Risk (Score 40-70)**: Semi-annual screening
3. **High Risk (Score > 70)**: Immediate diagnostic evaluation

### Continuous Quality Monitoring

- Track false positive rate in clinical practice
- Monitor for performance drift over time
- Recalibrate thresholds annually
- Collect real-world outcomes for external validation

---

## Future Research Directions

To address these limitations, future work should focus on:

1. **Feature Engineering**: Novel biomarkers (adiponectin, inflammatory markers)
2. **Model Regularization**: Address overfitting through stronger regularization
3. **External Validation**: Multi-center prospective trials
4. **Threshold Optimization**: Separate high-sensitivity model for screening
5. **Subgroup Analysis**: Evaluate performance across ethnic and age groups
6. **Clinical Integration**: Study model impact on clinical workflows and outcomes

---

## Conclusion

The DIANA model represents a **valuable screening tool** for diabetes risk assessment in postmenopausal women, but **clear limitations** prevent adoption as a definitive diagnostic. The model's strength lies in early identification of high-risk patients using readily available clinical biomarkers, enabling targeted HbA1c testing and timely intervention.

**Clinical Value**: Moderate (AUC 0.6732, NPV 89.6%)
**Safety Considerations**: Low diabetic recall (40.6%) requires confirmatory testing
**Deployment Strategy**: Screening tool with mandatory HbA1c confirmation

*Generated automatically for DIANA Thesis*
"""

    return md


if __name__ == "__main__":
    results = main()
