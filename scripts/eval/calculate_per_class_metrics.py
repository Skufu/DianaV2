"""
Calculate Per-Class Metrics for Diabetes Classification.

Computes precision, recall, F1-score, and Negative Predictive Value (NPV)
for all 3 classes (Normal, Pre-diabetic, Diabetic) from confusion matrix.

Usage: python scripts/calculate_per_class_metrics.py
Output: models/clinical/results/per_class_metrics.csv
"""

import pandas as pd
import json
from pathlib import Path

# Paths
RESULTS_DIR = Path("models/clinical/results")
BEST_MODEL_REPORT = RESULTS_DIR / "best_model_report.json"
OUTPUT_FILE = RESULTS_DIR / "per_class_metrics.csv"


def calculate_metrics_from_confusion_matrix(cm, class_names):
    """
    Calculate precision, recall, F1, NPV for each class from confusion matrix.

    Args:
        cm: Confusion matrix (n_classes x n_classes)
        class_names: List of class names

    Returns:
        DataFrame with per-class metrics
    """
    n_classes = cm.shape[0]
    results = []

    for i in range(n_classes):
        class_name = class_names[i]

        # Extract values for this class (one-vs-rest approach)
        tp = cm[i, i]  # True Positive: correctly predicted as this class
        fp = cm[:, i].sum() - tp  # False Positive: predicted as this class but not actually
        fn = cm[i, :].sum() - tp  # False Negative: actual this class but predicted otherwise
        tn = cm.sum() - tp - fp - fn  # True Negative: neither actual nor predicted as this class

        # Calculate metrics
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        npv = tn / (tn + fn) if (tn + fn) > 0 else 0

        # F1-score
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

        # Support (number of actual samples)
        support = cm[i, :].sum()

        results.append({
            'Class': class_name,
            'Class_Index': i,
            'True_Positives': int(tp),
            'False_Positives': int(fp),
            'False_Negatives': int(fn),
            'True_Negatives': int(tn),
            'Support': int(support),
            'Precision': round(precision, 4),
            'Recall': round(recall, 4),
            'F1_Score': round(f1, 4),
            'NPV': round(npv, 4)
        })

    return pd.DataFrame(results)


def main():
    """Calculate and save per-class metrics."""
    print("="*70)
    print("DIANA THESIS - Per-Class Metrics Calculator")
    print("="*70)
    print("\nTask: Calculate precision/recall/F1/NPV for 3 classes")
    print("Source: Confusion matrix from best_model_report.json")

    # Load best model report
    print("\n" + "="*70)
    print("STEP 1: Loading Best Model Report")
    print("="*70)

    if not BEST_MODEL_REPORT.exists():
        print(f"\n[ERROR] Best model report not found: {BEST_MODEL_REPORT}")
        return None

    with open(BEST_MODEL_REPORT, 'r') as f:
        report = json.load(f)

    print(f"\n   Best Model: {report['best_model']}")
    print(f"   AUC-ROC: {report['metrics']['auc_roc']}")
    print(f"   Overall Accuracy: {report['metrics']['accuracy']}")

    # Extract confusion matrix
    cm = None
    if 'confusion_matrix' in report:
        cm = report['confusion_matrix']
        print(f"\n   Confusion Matrix loaded")
    else:
        print(f"\n[ERROR] Confusion matrix not found in report")
        return None

    # Convert to numpy array
    cm = pd.DataFrame(cm).values

    # Display confusion matrix
    print(f"\n   Confusion Matrix:")
    print(f"   {'':>15} {'Pred_Norm':>12} {'Pred_Pre':>12} {'Pred_Diab':>12}")
    print(f"   {'-'*54}")
    print(f"   {'Act_Normal':>15} {cm[0,0]:>12} {cm[0,1]:>12} {cm[0,2]:>12}")
    print(f"   {'Act_Pre-diab':>15} {cm[1,0]:>12} {cm[1,1]:>12} {cm[1,2]:>12}")
    print(f"   {'Act_Diabetic':>15} {cm[2,0]:>12} {cm[2,1]:>12} {cm[2,2]:>12}")

    # Calculate metrics
    print("\n" + "="*70)
    print("STEP 2: Calculating Per-Class Metrics")
    print("="*70)

    class_names = ['Normal', 'Pre-diabetic', 'Diabetic']
    df_metrics = calculate_metrics_from_confusion_matrix(cm, class_names)

    # Display metrics
    print(f"\n   {'Class':<15} {'Prec':>8} {'Recall':>8} {'F1':>8} {'NPV':>8} {'Support':>10}")
    print(f"   {'-'*65}")

    for _, row in df_metrics.iterrows():
        print(f"   {row['Class']:<15} {row['Precision']:>8.4f} {row['Recall']:>8.4f} {row['F1_Score']:>8.4f} {row['NPV']:>8.4f} {row['Support']:>10}")

    # Calculate macro and weighted averages
    print(f"\n   {'-'*65}")
    print(f"   {'Macro Average':<15} {df_metrics['Precision'].mean():>8.4f} {df_metrics['Recall'].mean():>8.4f} {df_metrics['F1_Score'].mean():>8.4f} {df_metrics['NPV'].mean():>8.4f} {'-':>10}")

    weighted_prec = (df_metrics['Precision'] * df_metrics['Support']).sum() / df_metrics['Support'].sum()
    weighted_recall = (df_metrics['Recall'] * df_metrics['Support']).sum() / df_metrics['Support'].sum()
    weighted_f1 = (df_metrics['F1_Score'] * df_metrics['Support']).sum() / df_metrics['Support'].sum()
    weighted_npv = (df_metrics['NPV'] * (df_metrics['Support'].sum() - df_metrics['Support'])).sum() / (df_metrics['Support'].sum() * 2 - df_metrics['Support'].sum())

    print(f"   {'Weighted Avg':<15} {weighted_prec:>8.4f} {weighted_recall:>8.4f} {weighted_f1:>8.4f} {weighted_npv:>8.4f} {df_metrics['Support'].sum():>10}")

    # Save results
    print("\n" + "="*70)
    print("STEP 3: Saving Results")
    print("="*70)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # Save detailed CSV
    df_metrics.to_csv(OUTPUT_FILE, index=False)
    print(f"\n[SUCCESS] Per-class metrics saved to {OUTPUT_FILE}")

    # Also save a summary JSON
    summary_file = RESULTS_DIR / "per_class_metrics_summary.json"
    summary = {
        'model': report['best_model'],
        'overall_metrics': {
            'accuracy': report['metrics']['accuracy'],
            'auc_roc': report['metrics']['auc_roc'],
            'f1_score': report['metrics']['f1_score'],
            'recall': report['metrics']['recall'],
            'precision': report['metrics']['precision']
        },
        'per_class_metrics': df_metrics.set_index('Class').to_dict(orient='index'),
        'class_names': class_names,
        'confusion_matrix': cm.tolist()
    }

    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"[SUCCESS] Summary saved to {summary_file}")

    # Print key insights
    print("\n" + "="*70)
    print("KEY INSIGHTS")
    print("="*70)

    best_precision = df_metrics.loc[df_metrics['Precision'].idxmax(), 'Class']
    best_recall = df_metrics.loc[df_metrics['Recall'].idxmax(), 'Class']
    best_f1 = df_metrics.loc[df_metrics['F1_Score'].idxmax(), 'Class']
    best_npv = df_metrics.loc[df_metrics['NPV'].idxmax(), 'Class']

    print(f"\n   Best Precision: {best_precision} ({df_metrics.loc[df_metrics['Precision'].idxmax(), 'Precision']:.4f})")
    print(f"   Best Recall: {best_recall} ({df_metrics.loc[df_metrics['Recall'].idxmax(), 'Recall']:.4f})")
    print(f"   Best F1-Score: {best_f1} ({df_metrics.loc[df_metrics['F1_Score'].idxmax(), 'F1_Score']:.4f})")
    print(f"   Best NPV: {best_npv} ({df_metrics.loc[df_metrics['NPV'].idxmax(), 'NPV']:.4f})")

    # Diabetic class metrics (most important clinically)
    diabetic_metrics = df_metrics[df_metrics['Class'] == 'Diabetic'].iloc[0]
    print(f"\n   Diabetic Class (clinically most important):")
    print(f"   - Recall (Sensitivity): {diabetic_metrics['Recall']:.2%}")
    print(f"   - Precision: {diabetic_metrics['Precision']:.2%}")
    print(f"   - F1-Score: {diabetic_metrics['F1_Score']:.4f}")
    print(f"   - NPV: {diabetic_metrics['NPV']:.2%}")

    return df_metrics


if __name__ == "__main__":
    results = main()
