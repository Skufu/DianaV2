#!/usr/bin/env python3
"""
Retrain K-Means Clustering Model with 13 Features

This script retrains the K-means clustering model using the optimized
13-feature set instead of the original 7 features.

Usage: python scripts/train/retrain_clustering.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
import warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
import matplotlib.pyplot as plt

# Paths
DATA_PATH = Path("data/nhanes/processed/diana_dataset_imputed.csv")
MODELS_DIR = Path("models/clinical")
RESULTS_DIR = MODELS_DIR / "results"
VIZ_DIR = MODELS_DIR / "visualizations"

# 13 optimized features
FEATURES = [
    'bmi', 'triglycerides', 'ldl', 'hdl', 'age',
    'systolic', 'diastolic',
    'bmi_category', 'tg_hdl_ratio',
    'smoking_encoded', 'activity_encoded', 'alcohol_encoded',
    'metabolic_syndrome_score'
]

# Ahlqvist subtype definitions (for reference)
AHLQVIST_SUBTYPES = {
    'SIRD': {
        'full_name': 'Severe Insulin-Resistant Diabetes',
        'characteristics': 'High BMI, high TG, low HDL',
        'risk_level': 'HIGH'
    },
    'SIDD': {
        'full_name': 'Severe Insulin-Deficient Diabetes',
        'characteristics': 'Highest HbA1c, lower BMI',
        'risk_level': 'HIGH'
    },
    'MOD': {
        'full_name': 'Mild Obesity-Related Diabetes',
        'characteristics': 'High BMI, moderate HbA1c',
        'risk_level': 'MODERATE'
    },
    'MARD': {
        'full_name': 'Mild Age-Related Diabetes',
        'characteristics': 'Older age, mild metabolic dysfunction',
        'risk_level': 'LOW'
    }
}


def engineer_features(df):
    """Create engineered features"""
    df = df.copy()
    
    # BMI category
    df['bmi_category'] = pd.cut(df['bmi'], bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]).astype(float)
    
    # TG/HDL ratio
    df['tg_hdl_ratio'] = df['triglycerides'] / df['hdl'].replace(0, np.nan)
    
    # Lifestyle encoding
    smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    df['smoking_encoded'] = df['smoking_status'].map(smoking_map) if 'smoking_status' in df.columns else 1
    
    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    df['activity_encoded'] = df['physical_activity'].map(activity_map) if 'physical_activity' in df.columns else 1
    
    alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}
    df['alcohol_encoded'] = df['alcohol_use'].map(alcohol_map) if 'alcohol_use' in df.columns else 1
    
    # Metabolic syndrome score
    metabolic_criteria = pd.DataFrame({
        'high_tg': df['triglycerides'] > 150,
        'low_hdl': df['hdl'] < 50,
        'high_bp': df['systolic'] >= 130,
        'high_bmi': df['bmi'] >= 30,
    })
    df['metabolic_syndrome_score'] = metabolic_criteria.sum(axis=1)
    
    return df


def assign_ahlqvist_labels(cluster_centers, feature_names):
    """
    Assign Ahlqvist subtype labels based on centroid characteristics.
    """
    centers_df = pd.DataFrame(cluster_centers, columns=feature_names)
    available_clusters = list(range(len(cluster_centers)))
    final_labels = {}
    
    # Get feature indices
    bmi_idx = feature_names.index('bmi') if 'bmi' in feature_names else None
    tg_idx = feature_names.index('triglycerides') if 'triglycerides' in feature_names else None
    hdl_idx = feature_names.index('hdl') if 'hdl' in feature_names else None
    age_idx = feature_names.index('age') if 'age' in feature_names else None
    
    # 1. SIDD: Highest metabolic dysfunction (using metabolic_syndrome_score)
    if 'metabolic_syndrome_score' in feature_names:
        score_idx = feature_names.index('metabolic_syndrome_score')
        sidd_id = centers_df.loc[available_clusters].iloc[:, score_idx].idxmax()
    elif bmi_idx is not None and tg_idx is not None and hdl_idx is not None:
        # Fallback: use BMI + TG - HDL as proxy
        scores = {}
        for cid in available_clusters:
            scores[cid] = centers_df.iloc[cid, bmi_idx] + centers_df.iloc[cid, tg_idx] - centers_df.iloc[cid, hdl_idx]
        sidd_id = max(scores, key=scores.get)
    else:
        sidd_id = available_clusters[0]
    
    final_labels[sidd_id] = 'SIDD'
    available_clusters.remove(sidd_id)
    
    if not available_clusters:
        return final_labels
    
    # 2. SIRD: Highest BMI (insulin resistance marker)
    if bmi_idx is not None:
        sird_id = centers_df.loc[available_clusters].iloc[:, bmi_idx].idxmax()
    else:
        sird_id = available_clusters[0]
    
    final_labels[sird_id] = 'SIRD'
    available_clusters.remove(sird_id)
    
    if not available_clusters:
        return final_labels
    
    # 3. MOD: Highest TG/HDL ratio (of remaining)
    if 'tg_hdl_ratio' in feature_names:
        tg_hdl_idx = feature_names.index('tg_hdl_ratio')
        mod_id = centers_df.loc[available_clusters].iloc[:, tg_hdl_idx].idxmax()
    elif tg_idx is not None and hdl_idx is not None:
        scores = {}
        for cid in available_clusters:
            scores[cid] = centers_df.iloc[cid, tg_idx] / max(centers_df.iloc[cid, hdl_idx], 1)
        mod_id = max(scores, key=scores.get)
    else:
        mod_id = available_clusters[0]
    
    final_labels[mod_id] = 'MOD'
    available_clusters.remove(mod_id)
    
    if not available_clusters:
        return final_labels
    
    # 4. MARD: Remaining (typically oldest, lowest risk)
    if age_idx is not None:
        mard_id = centers_df.loc[available_clusters].iloc[:, age_idx].idxmax()
    else:
        mard_id = available_clusters[0]
    
    final_labels[mard_id] = 'MARD'
    
    return final_labels


def create_cluster_profiles(df, cluster_labels, features, label_map):
    """Create detailed cluster profiles"""
    df = df.copy()
    df['cluster_id'] = cluster_labels
    df['cluster_label'] = df['cluster_id'].map(label_map)
    
    profiles = {}
    for cid, label in label_map.items():
        cluster_data = df[df['cluster_id'] == cid]
        profile = {
            'label': label,
            'count': int(len(cluster_data)),
            'percentage': round(len(cluster_data) / len(df) * 100, 1),
            'means': {},
            'info': AHLQVIST_SUBTYPES.get(label, {})
        }
        
        for feat in features:
            if feat in cluster_data.columns:
                profile['means'][feat] = round(cluster_data[feat].mean(), 2)
        
        profiles[label] = profile
    
    return profiles


def main():
    print("="*70)
    print("K-MEANS CLUSTERING RETRAINING (13 Features)")
    print("="*70)
    
    # Create directories
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load data
    print(f"\n[LOAD] Loading data from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Records: {len(df)}")
    
    # Engineer features
    print("\n[FEATURES] Engineering 13 features...")
    df = engineer_features(df)
    
    # Prepare data
    df_clean = df.dropna(subset=FEATURES)
    X = df_clean[FEATURES].values
    
    print(f"   Complete records: {len(X)}")
    print(f"   Features: {len(FEATURES)}")
    
    # Standardize
    print("\n[SCALE] Standardizing features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Test multiple K values
    print("\n[K-ANALYSIS] Testing K=2 to K=6...")
    k_results = []
    for k in range(2, 7):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        k_results.append({'k': k, 'silhouette': sil, 'model': km, 'labels': labels})
        print(f"   K={k}: Silhouette={sil:.4f}")
    
    # Find optimal K
    best_idx = max(range(len(k_results)), key=lambda i: k_results[i]['silhouette'])
    best_k = k_results[best_idx]['k']
    print(f"\n[RESULT] Optimal K by silhouette: {best_k} (score: {k_results[best_idx]['silhouette']:.4f})")
    
    # Use K=4 for clinical alignment
    k = 4
    print(f"\n[CLUSTERING] Using K={k} (Ahlqvist subtypes)...")
    
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    
    final_silhouette = silhouette_score(X_scaled, cluster_labels)
    print(f"   Silhouette Score: {final_silhouette:.4f}")
    
    # Assign labels
    label_map = assign_ahlqvist_labels(kmeans.cluster_centers_, FEATURES)
    print(f"\n[LABELS] Cluster assignments:")
    for cid, label in label_map.items():
        count = (cluster_labels == cid).sum()
        print(f"   Cluster {cid} -> {label}: n={count}")
    
    # Create profiles
    profiles = create_cluster_profiles(df_clean, cluster_labels, FEATURES, label_map)
    
    print("\n[PROFILES] Cluster characteristics:")
    for label, profile in profiles.items():
        print(f"\n   {label} ({profile['info'].get('full_name', 'Unknown')}):")
        print(f"      Count: {profile['count']} ({profile['percentage']}%)")
        print(f"      Risk: {profile['info'].get('risk_level', 'UNKNOWN')}")
        print(f"      BMI: {profile['means'].get('bmi', 'N/A')}")
        print(f"      TG/HDL: {profile['means'].get('tg_hdl_ratio', 'N/A')}")
    
    # Save models
    print("\n[SAVE] Saving models...")
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    joblib.dump(scaler, MODELS_DIR / "cluster_scaler.joblib")
    print(f"   ✓ Saved kmeans_model.joblib")
    print(f"   ✓ Saved cluster_scaler.joblib")
    
    # Save labels
    cluster_labels_json = {
        str(cid): {
            'label': label,
            **AHLQVIST_SUBTYPES.get(label, {})
        }
        for cid, label in label_map.items()
    }
    with open(MODELS_DIR / "cluster_labels.json", 'w') as f:
        json.dump(cluster_labels_json, f, indent=2)
    print(f"   ✓ Saved cluster_labels.json")
    
    # Save analysis
    cluster_analysis = {
        "methodology": "K-Means clustering with Ahlqvist subtype classification (13 features)",
        "features_used": FEATURES,
        "n_samples": len(X),
        "k_selected": k,
        "silhouette_score": round(final_silhouette, 4),
        "k_range_analysis": [
            {"k": r['k'], "silhouette": round(r['silhouette'], 4)}
            for r in k_results
        ],
        "cluster_profiles": profiles,
        "note": "Retrained with optimized 13-feature set"
    }
    
    with open(RESULTS_DIR / "cluster_analysis.json", 'w') as f:
        json.dump(cluster_analysis, f, indent=2, default=str)
    print(f"   ✓ Saved cluster_analysis.json")
    
    # Save profiles CSV
    profiles_df = pd.DataFrame([
        {
            'Subtype': label,
            'Count': profiles[label]['count'],
            'Percentage': profiles[label]['percentage'],
            **profiles[label]['means']
        }
        for label in profiles
    ])
    profiles_df.to_csv(RESULTS_DIR / "cluster_profiles.csv", index=False)
    print(f"   ✓ Saved cluster_profiles.csv")
    
    print("\n" + "="*70)
    print("CLUSTERING COMPLETE")
    print("="*70)
    print(f"\n✓ K-means model retrained with {len(FEATURES)} features")
    print(f"✓ Silhouette score: {final_silhouette:.4f}")
    print(f"✓ {k} clusters assigned (SIRD, SIDD, MOD, MARD)")
    print(f"✓ All artifacts saved to {MODELS_DIR}")
    print("\nYou can now test clustering with: python scripts/eval/test_predictor.py")


if __name__ == "__main__":
    main()
