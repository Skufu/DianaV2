"""
Calculate 95% Confidence Intervals for AUC of all 7 models.

Uses actual AUC values from model_comparison.csv and calculates
synthetic confidence intervals based on standard error formulas.

Usage: python scripts/calculate_confidence_intervals.py
Output: models/clinical/results/confidence_intervals.json
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path

# Paths
RESULTS_DIR = Path("models/clinical/results")
OUTPUT_FILE = RESULTS_DIR / "confidence_intervals.json"
MODEL_COMPARISON_FILE = RESULTS_DIR / "model_comparison.csv"

# Confidence level
CONFIDENCE_LEVEL = 0.95
Z_SCORE = 1.96  # For 95% CI


def calculate_auc_ci(auc, n_positive, n_negative, alpha=0.05):
    """
    Calculate confidence interval for AUC using Hanley-McNeil method.

    Reference: Hanley, J. A., & McNeil, B. J. (1982). The meaning and
    use of the area under a receiver operating characteristic (ROC) curve.
    Radiology, 143(1), 29-36.

    Args:
        auc: Observed AUC value
        n_positive: Number of positive cases
        n_negative: Number of negative cases
        alpha: Significance level (default 0.05 for 95% CI)

    Returns:
        Dictionary with ci_lower, ci_upper, se, and method
    """
    Q1 = auc / (2 - auc)
    Q2 = (2 * auc**2) / (1 + auc)

    se_auc = np.sqrt((auc * (1 - auc) + (n_positive - 1) * (Q1 - auc**2) + (n_negative - 1) * (Q2 - auc**2)) / (n_positive * n_negative))

    z_alpha = Z_SCORE

    ci_lower = auc - z_alpha * se_auc
    ci_upper = auc + z_alpha * se_auc

    # Clamp to [0, 1]
    ci_lower = max(0, min(1, ci_lower))
    ci_upper = max(0, min(1, ci_upper))

    return {
        'mean_auc': float(auc),
        'ci_lower': float(ci_lower),
        'ci_upper': float(ci_upper),
        'ci_width': float(ci_upper - ci_lower),
        'standard_error': float(se_auc),
        'method': 'Hanley-McNeil asymptotic method',
        'n_positive': int(n_positive),
        'n_negative': int(n_negative),
        'n_total': int(n_positive + n_negative)
    }


def main():
    """Calculate 95% CI for all 7 models."""
    print("="*70)
    print("DIANA THESIS - Confidence Interval Calculator")
    print("="*70)
    print("\nTask: Calculate 95% CI for AUC of all 7 models")
    print(f"Method: Hanley-McNeil asymptotic method for AUC confidence intervals")
    print(f"Confidence level: {CONFIDENCE_LEVEL * 100}%")

    # Load model comparison data
    print("\n" + "="*70)
    print("STEP 1: Loading Model Comparison Data")
    print("="*70)

    if not MODEL_COMPARISON_FILE.exists():
        print(f"\n[ERROR] Model comparison file not found: {MODEL_COMPARISON_FILE}")
        return None

    df_comparison = pd.read_csv(MODEL_COMPARISON_FILE)
    print(f"\n[INFO] Loaded {len(df_comparison)} models from {MODEL_COMPARISON_FILE}")

    # Load best model report for class distribution
    print("\n" + "="*70)
    print("STEP 2: Loading Best Model Report")
    print("="*70)

    best_model_report_file = RESULTS_DIR / "best_model_report.json"
    if best_model_report_file.exists():
        with open(best_model_report_file, 'r') as f:
            best_report = json.load(f)

        # Extract class distribution from confusion matrix
        confusion_matrix = best_report.get('confusion_matrix', [[0, 0, 0], [0, 0, 0], [0, 0, 0]])

        # Calculate class counts (row sums)
        class_counts = [sum(row) for row in confusion_matrix]

        # For binary AUC calculation, combine Normal and Pre-diabetic as "negative",
        # Diabetic as "positive"
        n_positive = class_counts[2]  # Diabetic
        n_negative = class_counts[0] + class_counts[1]  # Normal + Pre-diabetic

        print(f"\n   Class distribution from confusion matrix:")
        print(f"   - Normal: {class_counts[0]}")
        print(f"   - Pre-diabetic: {class_counts[1]}")
        print(f"   - Diabetic: {class_counts[2]}")
        print(f"\n   For AUC calculation (Diabetic vs Non-Diabetic):")
        print(f"   - Positive (Diabetic): {n_positive}")
        print(f"   - Negative (Normal + Pre-diabetic): {n_negative}")
    else:
        # Default estimates if report not available
        print(f"\n[WARNING] Best model report not found, using default estimates")
        print(f"         based on sample size of ~276 test samples")
        n_positive = 40  # Approximate diabetic cases
        n_negative = 236  # Approximate non-diabetic cases

    # Calculate CIs for each model
    print("\n" + "="*70)
    print("STEP 3: Calculating Confidence Intervals")
    print("="*70)

    results = {
        'methodology': 'Hanley-McNeil asymptotic method for AUC-ROC confidence intervals',
        'confidence_settings': {
            'confidence_level': CONFIDENCE_LEVEL,
            'z_score': Z_SCORE,
            'reference': 'Hanley & McNeil (1982), Radiology 143(1):29-36'
        },
        'sample_info': {
            'n_positive': int(n_positive),
            'n_negative': int(n_negative),
            'n_total': int(n_positive + n_negative),
            'note': 'Positive = Diabetic, Negative = Normal + Pre-diabetic'
        },
        'models': {}
    }

    print(f"\n{'Model':<25} {'AUC':<8} {'SE':<8} {'95% CI':<15} {'Width':<8}")
    print("-"*70)

    for _, row in df_comparison.iterrows():
        model_name = row['Model']
        auc = row['AUC-ROC']

        # Calculate CI
        ci_result = calculate_auc_ci(auc, n_positive, n_negative)
        ci_result['status'] = 'success'
        ci_result['accuracy'] = float(row['Accuracy'])
        ci_result['f1_score'] = float(row['F1-Score'])
        ci_result['recall'] = float(row['Recall'])
        ci_result['precision'] = float(row['Precision'])
        ci_result['brier_score'] = float(row['Brier'])

        results['models'][model_name] = ci_result

        ci_str = f"[{ci_result['ci_lower']:.4f}, {ci_result['ci_upper']:.4f}]"
        print(f"{model_name:<25} {auc:.4f}   {ci_result['standard_error']:.4f}  {ci_str:<15} {ci_result['ci_width']:.4f}")

    # Save results
    print("\n" + "="*70)
    print("STEP 4: Saving Results")
    print("="*70)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n[SUCCESS] Results saved to {OUTPUT_FILE}")

    # Print summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    best_model = max(results['models'].items(), key=lambda x: x[1]['mean_auc'])
    print(f"\n   Best performing model: {best_model[0]}")
    print(f"   Best AUC: {best_model[1]['mean_auc']:.4f}")
    print(f"   Best CI: [{best_model[1]['ci_lower']:.4f}, {best_model[1]['ci_upper']:.4f}]")

    # Calculate statistics
    ci_widths = [m['ci_width'] for m in results['models'].values()]
    mean_ci_width = np.mean(ci_widths)
    print(f"\n   Mean CI width across all models: {mean_ci_width:.4f}")

    print(f"\n   Successfully processed: {len(results['models'])}/{len(results['models'])} models")

    return results


if __name__ == "__main__":
    results = main()
