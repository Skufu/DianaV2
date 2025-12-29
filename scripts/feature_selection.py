"""
DIANA Feature Selection Script (Updated with Lifestyle Factors)
Calculates Information Gain for feature importance analysis.

Outputs:
- Entropy of diabetes_status
- IG for each biomarker AND lifestyle factor
- Feature ranking
- Bar chart visualization

Usage: python scripts/feature_selection.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import matplotlib.pyplot as plt

DATA_PATH = Path("data/nhanes/processed/diana_training_data_multi.csv")
OUTPUT_DIR = Path("models/results")
VIZ_DIR = Path("models/visualizations")

# Features to analyze - biomarkers and lifestyle factors
CONTINUOUS_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age', 
                       'systolic', 'diastolic', 'total_cholesterol']
CATEGORICAL_FEATURES = ['smoking_status', 'physical_activity', 'alcohol_use']


def entropy(y):
    """
    Calculate Shannon entropy of a categorical variable.
    H(S) = -sum(p * log2(p))
    """
    if len(y) == 0:
        return 0
    
    value_counts = y.value_counts()
    probabilities = value_counts / len(y)
    
    # Avoid log(0)
    probabilities = probabilities[probabilities > 0]
    
    return -np.sum(probabilities * np.log2(probabilities))


def information_gain_continuous(df, feature, target, n_bins=10):
    """
    Calculate Information Gain of a continuous feature.
    
    IG(S, A) = H(S) - sum((|Sv|/|S|) * H(Sv))
    
    For continuous features, we discretize using equal-width bins.
    """
    # Drop rows with missing values in feature or target
    df_clean = df[[feature, target]].dropna()
    
    if len(df_clean) == 0:
        return 0
    
    # Entropy of target
    H_target = entropy(df_clean[target])
    
    # Discretize the continuous feature
    df_clean['binned'] = pd.cut(df_clean[feature], bins=n_bins, labels=False)
    
    # Calculate weighted entropy after split
    H_conditional = 0
    for bin_val in df_clean['binned'].dropna().unique():
        subset = df_clean[df_clean['binned'] == bin_val][target]
        weight = len(subset) / len(df_clean)
        H_conditional += weight * entropy(subset)
    
    return H_target - H_conditional


def information_gain_categorical(df, feature, target):
    """
    Calculate Information Gain of a categorical feature.
    
    IG(S, A) = H(S) - sum((|Sv|/|S|) * H(Sv))
    
    For categorical features, we use each unique category as a split.
    """
    # Drop rows with missing values in feature or target
    df_clean = df[[feature, target]].dropna()
    
    if len(df_clean) == 0:
        return 0
    
    # Entropy of target
    H_target = entropy(df_clean[target])
    
    # Calculate weighted entropy after split
    H_conditional = 0
    for category in df_clean[feature].unique():
        subset = df_clean[df_clean[feature] == category][target]
        weight = len(subset) / len(df_clean)
        H_conditional += weight * entropy(subset)
    
    return H_target - H_conditional


def create_diabetes_target(df):
    """
    Create diabetes_status target variable based on HbA1c:
    - Normal: HbA1c < 5.7%
    - Prediabetes: 5.7% <= HbA1c < 6.5%
    - Diabetes: HbA1c >= 6.5%
    """
    def classify(hba1c):
        if pd.isna(hba1c):
            return None
        if hba1c < 5.7:
            return 'Normal'
        elif hba1c < 6.5:
            return 'Prediabetes'
        else:
            return 'Diabetes'
    
    return df['hba1c'].apply(classify)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("DIANA Feature Selection (Information Gain)")
    print("Includes Biomarkers + Lifestyle Factors")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Records: {len(df)}")
    
    # Create target variable
    df['diabetes_status'] = create_diabetes_target(df)
    df = df.dropna(subset=['diabetes_status'])
    print(f"   With valid target: {len(df)}")
    
    target = 'diabetes_status'
    
    # Distribution
    print(f"\n[DISTRIBUTION] {target}:")
    print(df[target].value_counts())
    
    # Calculate entropy of target
    print(f"\n[ENTROPY] Calculating entropy of {target}...")
    H_target = entropy(df[target])
    print(f"   H({target}) = {H_target:.4f} bits")
    
    # Calculate IG for continuous features
    print("\n[IG] Calculating Information Gain for CONTINUOUS features...")
    ig_results = {}
    
    for feature in CONTINUOUS_FEATURES:
        if feature in df.columns and feature != 'hba1c':  # Skip hba1c since it defines target
            ig = information_gain_continuous(df, feature, target)
            ig_results[feature] = ig
            print(f"   IG({feature}) = {ig:.4f}")
    
    # Calculate IG for categorical/lifestyle features
    print("\n[IG] Calculating Information Gain for LIFESTYLE features...")
    
    for feature in CATEGORICAL_FEATURES:
        if feature in df.columns:
            ig = information_gain_categorical(df, feature, target)
            ig_results[feature] = ig
            print(f"   IG({feature}) = {ig:.4f}")
    
    # Rank features
    ranked_features = sorted(ig_results.items(), key=lambda x: x[1], reverse=True)
    
    print("\n[RANK] Feature Ranking by Information Gain:")
    for i, (feature, ig) in enumerate(ranked_features, 1):
        category = "Lifestyle" if feature in CATEGORICAL_FEATURES else "Biomarker"
        print(f"   {i}. {feature} ({category}): {ig:.4f}")
    
    # Save results
    results = {
        "entropy": {
            "target": target,
            "value": round(H_target, 4),
            "interpretation": "Uncertainty in diabetes classification before using features"
        },
        "information_gain": {k: round(v, 4) for k, v in ig_results.items()},
        "feature_ranking": [
            {"rank": i+1, "feature": f, "ig": round(ig, 4), 
             "type": "lifestyle" if f in CATEGORICAL_FEATURES else "biomarker"}
            for i, (f, ig) in enumerate(ranked_features)
        ],
        "n_samples": len(df),
        "n_bins_used": 10,
        "lifestyle_features_included": True
    }
    
    output_file = OUTPUT_DIR / "information_gain_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n[SAVE] Results saved to {output_file}")
    
    # Create bar chart with color coding for biomarkers vs lifestyle
    print("\n[VIZ] Creating Information Gain bar chart...")
    
    features = [f for f, _ in ranked_features]
    ig_values = [ig for _, ig in ranked_features]
    
    # Color by feature type
    colors = ['#FF6B6B' if f in CATEGORICAL_FEATURES else '#4ECDC4' for f in features]
    
    fig, ax = plt.subplots(figsize=(12, 8))
    bars = ax.barh(features[::-1], ig_values[::-1], color=colors[::-1])
    
    ax.set_xlabel('Information Gain (bits)', fontsize=12)
    ax.set_title('Feature Importance: Information Gain Analysis\n(Biomarkers + Lifestyle Factors)', fontsize=14)
    ax.set_xlim(0, max(ig_values) * 1.15)
    
    # Add value labels
    for bar, val in zip(bars, ig_values[::-1]):
        ax.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f'{val:.3f}', va='center', fontsize=10)
    
    # Add legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#4ECDC4', label='Biomarker'),
        Patch(facecolor='#FF6B6B', label='Lifestyle')
    ]
    ax.legend(handles=legend_elements, loc='lower right')
    
    plt.tight_layout()
    
    chart_path = VIZ_DIR / "information_gain_chart.png"
    plt.savefig(chart_path, dpi=150, bbox_inches='tight')
    print(f"   Chart saved to {chart_path}")
    
    plt.close()
    
    print("\n[DONE] Feature selection complete!")
    
    return results


if __name__ == "__main__":
    main()
