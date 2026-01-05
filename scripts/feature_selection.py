"""
DIANA Feature Selection Script (Enhanced with Mutual Information)
Calculates feature importance using both Mutual Information and Information Gain.

Methods:
1. Mutual Information (sklearn) - handles continuous features natively
2. Information Gain with clinical discretization - for panel defense

Outputs:
- Entropy of diabetes_status
- MI/IG scores for each biomarker AND lifestyle factor
- Feature ranking
- Cross-validation with Random Forest importance
- Bar chart visualization

Usage: python scripts/feature_selection.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import matplotlib.pyplot as plt
from sklearn.feature_selection import mutual_info_classif
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

DATA_PATH = Path("data/nhanes/processed/diana_dataset_final.csv")
OUTPUT_DIR = Path("models/results")
VIZ_DIR = Path("models/visualizations")

# Features to analyze - biomarkers and lifestyle factors
BIOMARKER_FEATURES = ['fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']
CLINICAL_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']
LIFESTYLE_FEATURES = ['smoking_status', 'physical_activity', 'alcohol_use']

# Clinical thresholds for discretization (for IG calculation and defense)
CLINICAL_THRESHOLDS = {
    'hba1c': [5.7, 6.5],      # Normal < 5.7, Pre-diabetic 5.7-6.4, Diabetic >= 6.5
    'fbs': [100, 126],         # Normal < 100, Pre-diabetic 100-125, Diabetic >= 126
    'bmi': [25, 30],           # Normal < 25, Overweight 25-29.9, Obese >= 30
    'triglycerides': [150, 200],  # Normal < 150, Borderline 150-199, High >= 200
    'ldl': [100, 160],         # Optimal < 100, Near optimal/Borderline, High
    'hdl': [40, 60],           # Low < 40, Normal 40-59, High >= 60 (higher is better)
    'age': [50, 55],           # Younger < 50, Middle 50-54, Older >= 55
}


def entropy(y):
    """
    Calculate Shannon entropy of a categorical variable.
    H(S) = -sum(p * log2(p))
    """
    if len(y) == 0:
        return 0
    
    value_counts = pd.Series(y).value_counts()
    probabilities = value_counts / len(y)
    
    # Avoid log(0)
    probabilities = probabilities[probabilities > 0]
    
    return -np.sum(probabilities * np.log2(probabilities))


def calculate_mutual_information(X, y, feature_names):
    """
    Calculate Mutual Information using sklearn's k-NN estimator.
    This handles continuous features without discretization.
    
    MI is mathematically equivalent to IG for discrete variables.
    """
    mi_scores = mutual_info_classif(X, y, discrete_features=False, random_state=42)
    return dict(zip(feature_names, mi_scores))


def discretize_clinical(df, feature):
    """
    Discretize a continuous feature using clinical thresholds.
    Returns discretized values for IG calculation.
    """
    if feature not in CLINICAL_THRESHOLDS:
        # Fall back to quartiles for features without clinical thresholds
        return pd.qcut(df[feature], q=4, labels=False, duplicates='drop')
    
    thresholds = CLINICAL_THRESHOLDS[feature]
    bins = [-np.inf] + thresholds + [np.inf]
    labels = list(range(len(bins) - 1))
    
    return pd.cut(df[feature], bins=bins, labels=labels)


def information_gain_clinical(df, feature, target):
    """
    Calculate Information Gain using clinical discretization thresholds.
    
    IG(S, A) = H(S) - H(S|A)
    """
    df_clean = df[[feature, target]].dropna()
    
    if len(df_clean) == 0:
        return 0
    
    # Entropy of target
    H_target = entropy(df_clean[target])
    
    # Discretize using clinical thresholds
    df_clean = df_clean.copy()
    df_clean['binned'] = discretize_clinical(df_clean, feature)
    
    # Calculate weighted entropy after split
    H_conditional = 0
    for bin_val in df_clean['binned'].dropna().unique():
        subset = df_clean[df_clean['binned'] == bin_val][target]
        weight = len(subset) / len(df_clean)
        H_conditional += weight * entropy(subset)
    
    return H_target - H_conditional


def calculate_rf_importance(X, y, feature_names):
    """
    Calculate feature importance using Random Forest.
    Cross-validates with MI/IG results.
    """
    rf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    rf.fit(X, y)
    return dict(zip(feature_names, rf.feature_importances_))


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("DIANA Feature Selection (Mutual Information + Information Gain)")
    print("Thesis-Ready Feature Importance Analysis")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total records: {len(df)}")
    
    # Determine target column
    target = 'diabetes_label' if 'diabetes_label' in df.columns else 'diabetes_status'
    
    if target not in df.columns:
        print("[ERROR] No diabetes target column found")
        return None
    
    df = df.dropna(subset=[target])
    print(f"   With valid target: {len(df)}")
    
    # Encode target if string
    if df[target].dtype == 'object':
        le = LabelEncoder()
        y = le.fit_transform(df[target])
        class_names = le.classes_
    else:
        y = df[target].values
        class_names = ['Normal', 'Pre-diabetic', 'Diabetic']
    
    # Distribution
    print(f"\n[DISTRIBUTION] {target}:")
    for i, name in enumerate(class_names):
        count = (y == i).sum()
        print(f"   {name}: {count} ({count/len(y)*100:.1f}%)")
    
    # Calculate entropy of target
    print(f"\n[ENTROPY] Calculating entropy of {target}...")
    H_target = entropy(y)
    print(f"   H({target}) = {H_target:.4f} bits")
    
    # Identify available features
    available_biomarkers = [f for f in BIOMARKER_FEATURES if f in df.columns]
    available_clinical = [f for f in CLINICAL_FEATURES if f in df.columns]
    available_lifestyle = [f for f in LIFESTYLE_FEATURES if f in df.columns]
    
    print(f"\n[FEATURES] Available:")
    print(f"   Biomarkers (no HbA1c): {available_biomarkers}")
    print(f"   Clinical (with HbA1c): {available_clinical}")
    print(f"   Lifestyle: {available_lifestyle}")
    
    # =============================================
    # METHOD 1: MUTUAL INFORMATION (sklearn)
    # =============================================
    print("\n" + "=" * 60)
    print("METHOD 1: MUTUAL INFORMATION (scikit-learn)")
    print("Handles continuous features without discretization")
    print("=" * 60)
    
    # Prepare features - use clinical features for MI
    X_clinical = df[available_clinical].dropna()
    y_clinical = y[X_clinical.index]
    
    mi_scores = calculate_mutual_information(
        X_clinical.values, 
        y_clinical, 
        available_clinical
    )
    
    # Sort by MI score
    mi_ranked = sorted(mi_scores.items(), key=lambda x: x[1], reverse=True)
    
    print("\n[MI RANKING] Features by Mutual Information:")
    for i, (feature, score) in enumerate(mi_ranked, 1):
        print(f"   {i}. {feature}: {score:.4f}")
    
    # =============================================
    # METHOD 2: INFORMATION GAIN (Clinical Discretization)
    # =============================================
    print("\n" + "=" * 60)
    print("METHOD 2: INFORMATION GAIN (Clinical Thresholds)")
    print("Uses ADA/clinical cutoffs for discretization")
    print("=" * 60)
    
    ig_scores = {}
    for feature in available_clinical:
        if feature != 'hba1c':  # Skip hba1c for non-circular IG
            ig = information_gain_clinical(df, feature, target)
            ig_scores[feature] = ig
            print(f"   IG({feature}) = {ig:.4f}")
    
    # =============================================
    # METHOD 3: RANDOM FOREST IMPORTANCE
    # =============================================
    print("\n" + "=" * 60)
    print("METHOD 3: RANDOM FOREST IMPORTANCE")
    print("Cross-validation of feature importance")
    print("=" * 60)
    
    rf_importance = calculate_rf_importance(
        X_clinical.values, 
        y_clinical, 
        available_clinical
    )
    
    rf_ranked = sorted(rf_importance.items(), key=lambda x: x[1], reverse=True)
    
    print("\n[RF RANKING] Features by Random Forest Importance:")
    for i, (feature, score) in enumerate(rf_ranked, 1):
        print(f"   {i}. {feature}: {score:.4f}")
    
    # =============================================
    # COMBINED RESULTS
    # =============================================
    print("\n" + "=" * 60)
    print("COMBINED RANKING CONSENSUS")
    print("=" * 60)
    
    # Create combined ranking table
    ranking_df = pd.DataFrame({
        'Feature': available_clinical,
        'MI_Score': [mi_scores.get(f, 0) for f in available_clinical],
        'MI_Rank': [list(dict(mi_ranked).keys()).index(f) + 1 for f in available_clinical],
        'RF_Score': [rf_importance.get(f, 0) for f in available_clinical],
        'RF_Rank': [list(dict(rf_ranked).keys()).index(f) + 1 for f in available_clinical],
    })
    ranking_df['Avg_Rank'] = (ranking_df['MI_Rank'] + ranking_df['RF_Rank']) / 2
    ranking_df = ranking_df.sort_values('Avg_Rank')
    
    print("\n[CONSENSUS RANKING]")
    print(ranking_df.to_string(index=False))
    
    # =============================================
    # SAVE RESULTS
    # =============================================
    results = {
        "entropy": {
            "target": target,
            "value": round(H_target, 4),
            "interpretation": "Uncertainty in diabetes classification before using features"
        },
        "mutual_information": {
            "method": "sklearn.mutual_info_classif (k-NN estimator)",
            "scores": {k: round(v, 4) for k, v in mi_scores.items()},
            "ranking": [
                {"rank": i+1, "feature": f, "score": round(s, 4)}
                for i, (f, s) in enumerate(mi_ranked)
            ]
        },
        "information_gain_clinical": {
            "method": "Discretization with clinical thresholds",
            "thresholds_used": CLINICAL_THRESHOLDS,
            "scores": {k: round(v, 4) for k, v in ig_scores.items()}
        },
        "random_forest_importance": {
            "method": "RandomForest(n_estimators=100, max_depth=10)",
            "scores": {k: round(v, 4) for k, v in rf_importance.items()},
            "ranking": [
                {"rank": i+1, "feature": f, "score": round(s, 4)}
                for i, (f, s) in enumerate(rf_ranked)
            ]
        },
        "consensus_ranking": ranking_df.to_dict('records'),
        "n_samples": len(X_clinical),
        "note": "HbA1c excluded from IG calculation to avoid circularity (defines target)"
    }
    
    output_file = OUTPUT_DIR / "information_gain_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n[SAVE] Results saved to {output_file}")
    
    # =============================================
    # VISUALIZATION
    # =============================================
    print("\n[VIZ] Creating feature importance visualization...")
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Plot 1: Mutual Information
    ax1 = axes[0]
    features_mi = [f for f, _ in mi_ranked]
    scores_mi = [s for _, s in mi_ranked]
    colors_mi = ['#e74c3c' if f == 'hba1c' else '#3498db' for f in features_mi]
    
    bars1 = ax1.barh(features_mi[::-1], scores_mi[::-1], color=colors_mi[::-1])
    ax1.set_xlabel('Mutual Information Score', fontsize=12)
    ax1.set_title('Feature Importance: Mutual Information', fontsize=14)
    ax1.set_xlim(0, max(scores_mi) * 1.15)
    
    for bar, val in zip(bars1, scores_mi[::-1]):
        ax1.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f'{val:.3f}', va='center', fontsize=10)
    
    # Plot 2: Random Forest Importance
    ax2 = axes[1]
    features_rf = [f for f, _ in rf_ranked]
    scores_rf = [s for _, s in rf_ranked]
    colors_rf = ['#e74c3c' if f == 'hba1c' else '#27ae60' for f in features_rf]
    
    bars2 = ax2.barh(features_rf[::-1], scores_rf[::-1], color=colors_rf[::-1])
    ax2.set_xlabel('Random Forest Importance', fontsize=12)
    ax2.set_title('Feature Importance: Random Forest', fontsize=14)
    ax2.set_xlim(0, max(scores_rf) * 1.15)
    
    for bar, val in zip(bars2, scores_rf[::-1]):
        ax2.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f'{val:.3f}', va='center', fontsize=10)
    
    # Add legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#e74c3c', label='HbA1c (defines target)'),
        Patch(facecolor='#3498db', label='Biomarker (MI)'),
        Patch(facecolor='#27ae60', label='Biomarker (RF)')
    ]
    fig.legend(handles=legend_elements, loc='lower center', ncol=3, bbox_to_anchor=(0.5, -0.02))
    
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.12)
    
    chart_path = VIZ_DIR / "feature_importance_comparison.png"
    plt.savefig(chart_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   Chart saved to {chart_path}")
    
    # Single MI chart for thesis
    fig2, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(features_mi[::-1], scores_mi[::-1], color='#4ECDC4')
    ax.set_xlabel('Mutual Information Score (bits)', fontsize=12)
    ax.set_title('Feature Importance by Mutual Information\n(Higher = More Predictive of Diabetes Status)', fontsize=14)
    ax.set_xlim(0, max(scores_mi) * 1.15)
    
    for bar, val in zip(bars, scores_mi[::-1]):
        ax.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f'{val:.3f}', va='center', fontsize=10)
    
    plt.tight_layout()
    mi_chart_path = VIZ_DIR / "information_gain_chart.png"
    plt.savefig(mi_chart_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   MI chart saved to {mi_chart_path}")
    
    print("\n[DONE] Feature selection complete!")
    
    return results


if __name__ == "__main__":
    main()
