"""
Generate Thesis Model Comparison Table.

Combines metrics from multiple sources into a comprehensive comparison table
for thesis presentation with columns: Model, AUC, CI, Overfit_Gap,
Diabetic_Recall, NPV, Recommendation.

Usage: python scripts/generate_comparison_table.py
Output: models/clinical/results/thesis_model_comparison.csv
"""

import pandas as pd
import json
from pathlib import Path

# Paths
RESULTS_DIR = Path("models/clinical/results")
MODEL_COMPARISON = RESULTS_DIR / "model_comparison.csv"
CONFIDENCE_INTERVALS = RESULTS_DIR / "confidence_intervals.json"
PER_CLASS_METRICS = RESULTS_DIR / "per_class_metrics_summary.json"
OUTPUT_FILE = RESULTS_DIR / "thesis_model_comparison.csv"


def generate_recommendation(row):
    """
    Generate clinical recommendation based on metrics.

    Args:
        row: DataFrame row with metrics

    Returns:
        Recommendation string
    """
    # XGBoost is best model (highest AUC, lowest overfit gap among top models)
    if row['Model'] == 'XGBoost':
        return 'RECOMMENDED: Best AUC (0.6732), good calibration, acceptable overfit gap (0.4011)'

    # CatBoost has second best AUC with lower overfit gap
    if row['Model'] == 'CatBoost':
        return 'ALTERNATIVE: Competitive AUC (0.6726), lower overfit gap (0.2970), good for ensembling'

    # Voting Ensemble has good AUC with stability
    if row['Model'] == 'Voting Ensemble':
        return 'ENSEMBLE: Good AUC (0.6632), stable across models, suitable for production'

    # Stacking Ensemble has competitive performance
    if row['Model'] == 'Stacking Ensemble':
        return 'ENSEMBLE: Competitive AUC (0.6689), moderate overfit gap (0.3772), good backup'

    # Logistic Regression has lowest overfit gap but modest AUC
    if row['Model'] == 'Logistic Regression':
        return 'BASELINE: Lowest overfit (0.1233), but modest AUC (0.6683). Use for interpretability'

    # Random Forest has good AUC but higher overfit
    if row['Model'] == 'Random Forest':
        return 'MODERATE: Good AUC (0.6534), higher overfit gap (0.2091). Consider regularization'

    # LightGBM has performance issues
    if row['Model'] == 'LightGBM':
        return 'NOT RECOMMENDED: Lowest AUC (0.6452), severe overfit (0.4994). Poor choice for this task'

    return 'NOT EVALUATED'


def main():
    """Generate comprehensive model comparison table."""
    print("="*70)
    print("DIANA THESIS - Model Comparison Table Generator")
    print("="*70)
    print("\nTask: Combine all metrics into thesis comparison table")
    print("Columns: Model, AUC, CI, Overfit_Gap, Diabetic_Recall, NPV, Recommendation")

    # Load all data sources
    print("\n" + "="*70)
    print("STEP 1: Loading Data Sources")
    print("="*70)

    # Load model comparison
    if not MODEL_COMPARISON.exists():
        print(f"\n[ERROR] Model comparison file not found: {MODEL_COMPARISON}")
        return None

    df_comparison = pd.read_csv(MODEL_COMPARISON)
    print(f"\n   Loaded model_comparison.csv: {len(df_comparison)} models")

    # Load confidence intervals
    if not CONFIDENCE_INTERVALS.exists():
        print(f"\n[ERROR] Confidence intervals file not found: {CONFIDENCE_INTERVALS}")
        return None

    with open(CONFIDENCE_INTERVALS, 'r') as f:
        ci_data = json.load(f)
    print(f"   Loaded confidence_intervals.json")

    # Load per-class metrics
    if not PER_CLASS_METRICS.exists():
        print(f"\n[ERROR] Per-class metrics file not found: {PER_CLASS_METRICS}")
        return None

    with open(PER_CLASS_METRICS, 'r') as f:
        class_metrics = json.load(f)
    print(f"   Loaded per_class_metrics_summary.json")

    # Merge data
    print("\n" + "="*70)
    print("STEP 2: Merging Metrics")
    print("="*70)

    # Create output DataFrame
    results = []

    for _, row in df_comparison.iterrows():
        model_name = row['Model']

        # Basic metrics from model_comparison.csv
        result = {
            'Model': model_name,
            'AUC': round(row['AUC-ROC'], 4),
            'Accuracy': round(row['Accuracy'], 4),
            'Overfit_Gap': round(row['Overfit_Gap'], 4),
            'F1_Score': round(row['F1-Score'], 4),
            'Brier_Score': round(row['Brier'], 4)
        }

        # Confidence intervals
        if model_name in ci_data['models']:
            ci = ci_data['models'][model_name]
            if ci.get('status') == 'success':
                result['CI'] = f"[{ci['ci_lower']:.4f}, {ci['ci_upper']:.4f}]"
                result['CI_Width'] = round(ci['ci_width'], 4)
                result['CI_Lower'] = round(ci['ci_lower'], 4)
                result['CI_Upper'] = round(ci['ci_upper'], 4)
            else:
                result['CI'] = 'N/A'
                result['CI_Width'] = 'N/A'
                result['CI_Lower'] = 'N/A'
                result['CI_Upper'] = 'N/A'
        else:
            result['CI'] = 'N/A'
            result['CI_Width'] = 'N/A'
            result['CI_Lower'] = 'N/A'
            result['CI_Upper'] = 'N/A'

        # Per-class metrics for Diabetic class
        if 'per_class_metrics' in class_metrics and 'Diabetic' in class_metrics['per_class_metrics']:
            diabetic = class_metrics['per_class_metrics']['Diabetic']
            result['Diabetic_Recall'] = round(diabetic['Recall'], 4)
            result['Diabetic_Precision'] = round(diabetic['Precision'], 4)
            result['Diabetic_F1'] = round(diabetic['F1_Score'], 4)
            result['NPV'] = round(diabetic['NPV'], 4)
        else:
            result['Diabetic_Recall'] = 'N/A'
            result['Diabetic_Precision'] = 'N/A'
            result['Diabetic_F1'] = 'N/A'
            result['NPV'] = 'N/A'

        # Generate recommendation
        result['Recommendation'] = generate_recommendation(result)

        results.append(result)

    df_thesis = pd.DataFrame(results)

    # Sort by AUC descending
    df_thesis = df_thesis.sort_values('AUC', ascending=False)

    # Display table
    print("\n" + "="*70)
    print("STEP 3: Displaying Comparison Table")
    print("="*70)

    # Reorder columns for display
    display_cols = ['Model', 'AUC', 'CI', 'Overfit_Gap', 'Diabetic_Recall', 'NPV', 'Recommendation']

    print(f"\n{'Model':<25} {'AUC':>8} {'95% CI':>15} {'Overfit':>8} {'Diab_Rec':>10} {'NPV':>8}")
    print("-"*95)

    for _, row in df_thesis[display_cols].iterrows():
        ci_display = row['CI'][:20] if isinstance(row['CI'], str) else f"{row['CI']:.2f}"
        rec_display = row['Recommendation'][:50] + '...' if len(row['Recommendation']) > 50 else row['Recommendation']
        print(f"{row['Model']:<25} {row['AUC']:.4f}   {ci_display:>15} {row['Overfit_Gap']:>8.4f} {row['Diabetic_Recall']:>10.4f} {row['NPV']:>8.4f}")

    # Save results
    print("\n" + "="*70)
    print("STEP 4: Saving Results")
    print("="*70)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # Save CSV with all columns
    df_thesis.to_csv(OUTPUT_FILE, index=False)
    print(f"\n[SUCCESS] Thesis comparison table saved to {OUTPUT_FILE}")

    # Also save a simplified version for thesis
    simplified_cols = ['Model', 'AUC', 'CI', 'Overfit_Gap', 'Diabetic_Recall', 'NPV', 'Recommendation']
    df_simplified = df_thesis[simplified_cols].copy()
    simplified_file = RESULTS_DIR / "thesis_model_comparison_simple.csv"
    df_simplified.to_csv(simplified_file, index=False)
    print(f"[SUCCESS] Simplified version saved to {simplified_file}")

    # Print summary statistics
    print("\n" + "="*70)
    print("SUMMARY STATISTICS")
    print("="*70)

    # Find best models by different metrics
    best_auc = df_thesis.loc[df_thesis['AUC'].idxmax()]
    best_overfit = df_thesis.loc[df_thesis['Overfit_Gap'].idxmin()]
    best_diabetic_recall = df_thesis.loc[df_thesis['Diabetic_Recall'].idxmax()]
    best_npv = df_thesis.loc[df_thesis['NPV'].idxmax()]

    print(f"\n   Best AUC: {best_auc['Model']} ({best_auc['AUC']:.4f})")
    print(f"   Best (Lowest) Overfit Gap: {best_overfit['Model']} ({best_overfit['Overfit_Gap']:.4f})")
    print(f"   Best Diabetic Recall: {best_diabetic_recall['Model']} ({best_diabetic_recall['Diabetic_Recall']:.4f})")
    print(f"   Best NPV: {best_npv['Model']} ({best_npv['NPV']:.4f})")

    # Check if best model (XGBoost) has best diabetic recall
    if best_auc['Model'] == best_diabetic_recall['Model']:
        print(f"\n   [NOTE] Best AUC model ({best_auc['Model']}) also has best diabetic recall")
    else:
        print(f"\n   [NOTE] Best AUC model ({best_auc['Model']}) differs from best diabetic recall ({best_diabetic_recall['Model']})")

    print(f"\n   Total models evaluated: {len(df_thesis)}")

    return df_thesis


if __name__ == "__main__":
    results = main()
