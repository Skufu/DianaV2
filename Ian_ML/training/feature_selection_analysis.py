"""
DIANA Feature Selection Analysis

This script analyzes the current feature set and identifies:
1. Highly correlated features (>0.9 correlation with base features)
2. Features with low predictive power (LASSO selection)
3. Optimal feature subset via Recursive Feature Elimination

Usage: python Ian_ML/training/feature_selection_analysis.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LassoCV, LogisticRegression
from sklearn.feature_selection import RFECV, mutual_info_classif
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from Ian_ML.common.paths import CLINICAL_MODELS_DIR, NHANES_PROCESSED_ROOT
import warnings
warnings.filterwarnings('ignore')

# Load training data
DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"

def load_and_engineer_features():
    """Load data and apply same feature engineering as train.py"""
    df = pd.read_csv(DATA_PATH)
    
    # Base features from train_v2.py (13-feature set)
    # Reusing the existing REDUCED_FEATURES list logic manually here
    # 13 features: bmi, triglycerides, ldl, hdl, age, systolic, diastolic, 
    # bmi_category, tg_hdl_ratio, smoking_encoded, activity_encoded, alcohol_encoded, metabolic_syndrome_score
    
    # Apply feature engineering (matches train_v2.py)
    df = df.copy()
    
    # BMI category
    df['bmi_category'] = pd.cut(df['bmi'], bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]).astype(float)
    
    # Lipid ratios
    df['tg_hdl_ratio'] = df['triglycerides'] / df['hdl'].replace(0, np.nan)
    
    # Metabolic syndrome score
    metabolic_criteria = pd.DataFrame({
        'high_tg': df['triglycerides'] > 150,
        'low_hdl': df['hdl'] < 50,
        'high_bp': df['systolic'] >= 130,
        'high_bmi': df['bmi'] >= 30,
    })
    df['metabolic_syndrome_score'] = metabolic_criteria.sum(axis=1)
    
    # Lifestyle encoding
    smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    if 'smoking_status' in df.columns:
        df['smoking_encoded'] = df['smoking_status'].map(smoking_map)
    
    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    if 'physical_activity' in df.columns:
        df['activity_encoded'] = df['physical_activity'].map(activity_map)
    
    alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}
    if 'alcohol_use' in df.columns:
        df['alcohol_encoded'] = df['alcohol_use'].map(alcohol_map)
    
    # Define the 13 features from V2 baseline
    reduced_features = [
        "bmi",
        "triglycerides",
        "ldl",
        "hdl",
        "age",
        "systolic",
        "diastolic",
        "bmi_category",
        "tg_hdl_ratio",
        "smoking_encoded",
        "activity_encoded",
        "alcohol_encoded",
        "metabolic_syndrome_score",
    ]
    
    # Clean data (minimal dropna for target only)
    df_clean = df.dropna(subset=['diabetes_label'])
    
    # Handle missing features with imputation (consistent with Pipeline)
    from sklearn.impute import SimpleImputer
    imputer = SimpleImputer(strategy='median')
    X_raw = df_clean[reduced_features]
    X_imputed = pd.DataFrame(imputer.fit_transform(X_raw), columns=reduced_features)
    
    y = df_clean['diabetes_label'].values.astype(int)
    
    print(f"Dataset: {len(X_imputed)} samples, {len(reduced_features)} features")
    print(f"Features: {reduced_features}")
    print(f"\nClass distribution: {dict(zip(['Normal', 'Pre-diabetic', 'Diabetic'], np.bincount(y)))}")
    
    return X_imputed, y, reduced_features


def analyze_correlations(X, feature_names, threshold=0.9):
    """Identify highly correlated feature pairs"""
    print("\n" + "="*70)
    print("CORRELATION ANALYSIS (threshold > {:.1f})".format(threshold))
    print("="*70)
    
    corr_matrix = X.corr().abs()
    
    # Find highly correlated pairs
    high_corr_pairs = []
    for i in range(len(feature_names)):
        for j in range(i+1, len(feature_names)):
            if corr_matrix.iloc[i, j] > threshold:
                high_corr_pairs.append((
                    feature_names[i], 
                    feature_names[j], 
                    corr_matrix.iloc[i, j]
                ))
    
    if high_corr_pairs:
        print("\n⚠️  HIGHLY CORRELATED FEATURE PAIRS (consider removing one):")
        for feat1, feat2, corr in sorted(high_corr_pairs, key=lambda x: x[2], reverse=True):
            print(f"   {feat1} <-> {feat2}: r={corr:.3f}")
    else:
        print("\n✓ No highly correlated pairs found (all < {:.1f})".format(threshold))
    
    return high_corr_pairs


def lasso_feature_selection(X, y, feature_names):
    """Use LASSO to select features with non-zero coefficients"""
    print("\n" + "="*70)
    print("LASSO FEATURE SELECTION")
    print("="*70)
    
    # Standardize for LASSO
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # LASSO with cross-validation
    lasso = LassoCV(cv=5, random_state=42, max_iter=2000)
    lasso.fit(X_scaled, y)
    
    # Get feature importance
    feature_importance = pd.DataFrame({
        'Feature': feature_names,
        'Coefficient': lasso.coef_,
        'Abs_Coefficient': np.abs(lasso.coef_)
    }).sort_values('Abs_Coefficient', ascending=False)
    
    selected = feature_importance[feature_importance['Abs_Coefficient'] > 0]['Feature'].tolist()
    
    print(f"\nLASSO selected {len(selected)}/{len(feature_names)} features (alpha={lasso.alpha_:.4f}):")
    print("\n   Top 10 features by coefficient magnitude:")
    for _, row in feature_importance.head(10).iterrows():
        marker = "✓" if row['Abs_Coefficient'] > 0 else "✗"
        print(f"   {marker} {row['Feature']:25} coef={row['Coefficient']:8.4f}")
    
    if len(feature_importance) > 10:
        print(f"   ... and {len(feature_importance)-10} more")
    
    print(f"\n   Features ZEROED out by LASSO: {len(feature_names) - len(selected)}")
    zeroed = feature_importance[feature_importance['Abs_Coefficient'] == 0]['Feature'].tolist()
    if zeroed:
        for feat in zeroed:
            print(f"      - {feat}")
    
    return selected, feature_importance


def recursive_feature_elimination(X, y, feature_names):
    """Use RFECV to find optimal feature subset"""
    print("\n" + "="*70)
    print("RECURSIVE FEATURE ELIMINATION (RFECV)")
    print("="*70)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Use Logistic Regression as base estimator
    estimator = LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced')
    
    # RFECV with cross-validation
    rfecv = RFECV(
        estimator=estimator,
        step=1,
        cv=StratifiedKFold(5),
        scoring='roc_auc_ovr_weighted',
        n_jobs=-1,
        min_features_to_select=5
    )
    
    rfecv.fit(X_scaled, y)
    
    selected_features = [feature_names[i] for i in range(len(feature_names)) if rfecv.support_[i]]
    
    print(f"\nOptimal number of features: {rfecv.n_features_}")
    print(f"Cross-validation scores by feature count:")
    
    for i, score in enumerate(rfecv.cv_results_['mean_test_score']):
        n_features = len(feature_names) - i
        marker = "✓" if n_features == rfecv.n_features_ else " "
        print(f"   {marker} {n_features:2d} features: AUC={score:.4f}")
    
    print(f"\nSelected features:")
    for feat in selected_features:
        print(f"   ✓ {feat}")
    
    return selected_features, rfecv


def mutual_information_analysis(X, y, feature_names):
    """Compute mutual information scores"""
    print("\n" + "="*70)
    print("MUTUAL INFORMATION ANALYSIS")
    print("="*70)
    
    mi_scores = mutual_info_classif(X, y, random_state=42)
    
    mi_df = pd.DataFrame({
        'Feature': feature_names,
        'MI_Score': mi_scores
    }).sort_values('MI_Score', ascending=False)
    
    print("\n   Feature importance (Mutual Information):")
    for _, row in mi_df.head(15).iterrows():
        bar = "█" * int(row['MI_Score'] * 100)
        print(f"   {row['Feature']:25} {row['MI_Score']:.4f} {bar}")
    
    return mi_df


def random_forest_importance(X, y, feature_names):
    """Get Random Forest feature importance"""
    print("\n" + "="*70)
    print("RANDOM FOREST FEATURE IMPORTANCE")
    print("="*70)
    
    rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf.fit(X, y)
    
    importance_df = pd.DataFrame({
        'Feature': feature_names,
        'Importance': rf.feature_importances_
    }).sort_values('Importance', ascending=False)
    
    print("\n   Top 15 features by RF importance:")
    for _, row in importance_df.head(15).iterrows():
        bar = "█" * int(row['Importance'] * 200)
        print(f"   {row['Feature']:25} {row['Importance']:.4f} {bar}")
    
    return importance_df


def generate_recommendations(high_corr, lasso_selected, rfe_selected, mi_df, rf_df, all_features):
    """Generate feature reduction recommendations"""
    print("\n" + "="*70)
    print("RECOMMENDATIONS")
    print("="*70)
    
    recommendations = []
    
    # Remove highly correlated features
    if high_corr:
        to_remove = set()
        for feat1, feat2, corr in high_corr:
            # Remove the engineered feature, keep the base
            if feat1 in ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']:
                to_remove.add(feat2)
            elif feat2 in ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']:
                to_remove.add(feat1)
            else:
                to_remove.add(feat2)  # Arbitrary if both engineered
        
        recommendations.extend(list(to_remove))
        print(f"\n1. REMOVE HIGHLY CORRELATED ({len(to_remove)} features):")
        for feat in to_remove:
            print(f"   - {feat}")
    
    # Features zeroed by LASSO
    lasso_zeroed = set(all_features) - set(lasso_selected)
    if lasso_zeroed:
        recommendations.extend(list(lasso_zeroed))
        print(f"\n2. REMOVE ZEROED BY LASSO ({len(lasso_zeroed)} features):")
        for feat in lasso_zeroed:
            print(f"   - {feat}")
    
    # Consensus features (selected by both LASSO and RFE)
    consensus = set(lasso_selected) & set(rfe_selected)
    print(f"\n3. CONSENSUS FEATURES (selected by both methods): {len(consensus)}")
    for feat in sorted(consensus):
        print(f"   ✓ {feat}")
    
    # Create reduced feature set
    reduced_features = list(consensus)
    
    print(f"\n4. PROPOSED REDUCED FEATURE SET ({len(reduced_features)} features):")
    print(f"   {reduced_features}")
    
    print("\n5. PERFORMANCE COMPARISON NEEDED:")
    print("   - Train with ALL features (current): baseline")
    print("   - Train with REDUCED features: compare AUC")
    print("   - If reduced features perform within 0.02 AUC, use reduced set")
    
    return reduced_features


def main():
    print("="*70)
    print("DIANA FEATURE SELECTION ANALYSIS")
    print("="*70)
    
    # Load data
    X, y, feature_names = load_and_engineer_features()
    
    # Run analyses
    high_corr = analyze_correlations(X, feature_names, threshold=0.9)
    lasso_selected, lasso_df = lasso_feature_selection(X, y, feature_names)
    rfe_selected, rfecv = recursive_feature_elimination(X, y, feature_names)
    mi_df = mutual_information_analysis(X, y, feature_names)
    rf_df = random_forest_importance(X, y, feature_names)
    
    # Generate recommendations
    reduced_features = generate_recommendations(
        high_corr, lasso_selected, rfe_selected, mi_df, rf_df, feature_names
    )
    
    # Save results
    from Ian_ML.common.paths import CLINICAL_V2_MODELS_DIR
    output_dir = CLINICAL_V2_MODELS_DIR / "experiments" / "feature_selection"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save feature rankings
    summary = pd.DataFrame({
        'Feature': feature_names,
        'LASSO_Coef': [lasso_df[lasso_df['Feature']==f]['Coefficient'].values[0] for f in feature_names],
        'LASSO_Selected': [f in lasso_selected for f in feature_names],
        'RFE_Selected': [f in rfe_selected for f in feature_names],
        'MI_Score': [mi_df[mi_df['Feature']==f]['MI_Score'].values[0] for f in feature_names],
        'RF_Importance': [rf_df[rf_df['Feature']==f]['Importance'].values[0] for f in feature_names],
    })
    summary['Consensus'] = summary['LASSO_Selected'] & summary['RFE_Selected']
    summary = summary.sort_values('MI_Score', ascending=False)
    
    summary.to_csv(output_dir / "feature_selection_analysis.csv", index=False)
    print(f"\n✓ Saved analysis to {output_dir / 'feature_selection_analysis.csv'}")
    
    # Save reduced feature list
    with open(output_dir / "reduced_features.json", 'w') as f:
        import json
        json.dump({
            'original_features': feature_names,
            'n_original': len(feature_names),
            'reduced_features': reduced_features,
            'n_reduced': len(reduced_features),
            'reduction_ratio': len(reduced_features) / len(feature_names)
        }, f, indent=2)
    print(f"✓ Saved reduced feature list to {output_dir / 'reduced_features.json'}")
    
    print("\n" + "="*70)
    print("NEXT STEPS:")
    print("="*70)
    print("1. Review feature_selection_analysis.csv")
    print("2. Update train.py to use reduced_features.json")
    print("3. Retrain models with reduced feature set")
    print("4. Compare performance (should be similar or better)")


if __name__ == "__main__":
    main()
