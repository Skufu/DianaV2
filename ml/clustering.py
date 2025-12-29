"""
DIANA Clinical Clustering Script (Non-Circular)
K-Means clustering WITHOUT HbA1c/FBS to avoid circular risk stratification.

Features: BMI, Triglycerides, LDL, HDL, Age
Purpose: Group patients by metabolic profile, not by glucose metrics.

Usage: python scripts/clustering_v2.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score

DATA_PATH = Path("data/nhanes/processed/diana_dataset_final.csv")
MODELS_DIR = Path("models/clinical")
RESULTS_DIR = Path("models/clinical/results")
VIZ_DIR = Path("models/clinical/visualizations")

# Clinical features - NO HbA1c, NO FBS
CLINICAL_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("DIANA Clinical Clustering (Non-Circular)")
    print("Features: BMI, TG, LDL, HDL, Age (NO HbA1c, NO FBS)")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    
    # Prepare features
    df_clean = df.dropna(subset=CLINICAL_FEATURES)
    X = df_clean[CLINICAL_FEATURES].values
    print(f"   Records: {len(X)}")
    print(f"   Features: {CLINICAL_FEATURES}")
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Test K values
    print("\n[OPT] Testing K values...")
    k_results = []
    for k in range(2, 7):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        wcss = km.inertia_
        k_results.append({'k': k, 'silhouette': sil, 'wcss': wcss})
        print(f"   K={k}: Silhouette={sil:.3f}")
    
    # Find best K by silhouette (but prefer K=3 for interpretability)
    best_sil_k = max(k_results, key=lambda x: x['silhouette'])['k']
    print(f"\n   Best silhouette at K={best_sil_k}")
    
    # Use K=3 for Low/Moderate/High Risk (clinical interpretability)
    K = 3
    print(f"[CLUSTER] Using K={K} for clinical interpretability")
    
    kmeans = KMeans(n_clusters=K, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    
    df_clean = df_clean.copy()
    df_clean['cluster'] = cluster_labels
    
    # Calculate cluster profiles
    print("\n[PROFILE] Cluster characteristics:")
    profiles = df_clean.groupby('cluster')[CLINICAL_FEATURES].mean().round(2)
    print(profiles)
    
    # Label clusters based on metabolic risk
    # Use BMI + triglycerides as primary indicators (cardiometabolic risk)
    cluster_risk = profiles[['bmi', 'triglycerides']].mean(axis=1)
    sorted_clusters = cluster_risk.sort_values().index.tolist()
    
    risk_labels = {
        sorted_clusters[0]: {"label": "Low Risk", "color": "green"},
        sorted_clusters[1]: {"label": "Moderate Risk", "color": "orange"},
        sorted_clusters[2]: {"label": "High Risk", "color": "red"}
    }
    
    print("\n[LABEL] Risk cluster assignments (by metabolic profile):")
    for cid in range(K):
        info = risk_labels[cid]
        mean_bmi = profiles.loc[cid, 'bmi']
        mean_tg = profiles.loc[cid, 'triglycerides']
        count = (cluster_labels == cid).sum()
        print(f"   Cluster {cid} -> {info['label']}: n={count}, BMI={mean_bmi}, TG={mean_tg}")
    
    df_clean['risk_cluster'] = df_clean['cluster'].map(lambda x: risk_labels[x]['label'])
    
    # Compare clusters to actual diabetes status
    print("\n[VALIDATE] Cluster vs Diabetes Status:")
    cross_tab = pd.crosstab(df_clean['risk_cluster'], df_clean['diabetes_status'])
    print(cross_tab)
    
    # Save cluster analysis
    cluster_analysis = {
        "model_type": "clinical",
        "features": CLINICAL_FEATURES,
        "note": "Clusters based on metabolic profile (BMI, lipids), not glucose",
        "n_clusters": K,
        "silhouette_score": round(silhouette_score(X_scaled, cluster_labels), 4),
        "cluster_sizes": {
            risk_labels[i]['label']: int((cluster_labels == i).sum())
            for i in range(K)
        },
        "cluster_profiles": {
            risk_labels[i]['label']: {
                feat: round(profiles.loc[i, feat], 2)
                for feat in CLINICAL_FEATURES
            }
            for i in range(K)
        },
        "k_optimization": k_results
    }
    
    with open(RESULTS_DIR / "cluster_analysis.json", 'w') as f:
        json.dump(cluster_analysis, f, indent=2)
    print(f"\n[SAVE] Cluster analysis saved to {RESULTS_DIR / 'cluster_analysis.json'}")
    
    # Save K-means model and scaler
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    joblib.dump(scaler, MODELS_DIR / "cluster_scaler.joblib")
    print(f"   K-means model saved")
    
    # =====================
    # VISUALIZATIONS
    # =====================
    print("\n[VIZ] Generating visualizations...")
    
    # 1. Cluster Heatmap
    fig, ax = plt.subplots(figsize=(10, 5))
    
    ordered_profiles = profiles.loc[[sorted_clusters[0], sorted_clusters[1], sorted_clusters[2]]]
    ordered_labels = [risk_labels[c]['label'] for c in sorted_clusters]
    
    sns.heatmap(ordered_profiles, annot=True, fmt='.1f', cmap='RdYlGn_r',
                yticklabels=ordered_labels, ax=ax, cbar_kws={'label': 'Value'})
    ax.set_title('Clinical Cluster Profiles (Metabolic Features)', fontsize=14)
    ax.set_xlabel('Feature', fontsize=12)
    ax.set_ylabel('Risk Cluster', fontsize=12)
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "cluster_heatmap.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("   Heatmap saved")
    
    # 2. PCA Scatter Plot
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    
    fig, ax = plt.subplots(figsize=(10, 8))
    colors_map = ['#27ae60', '#f39c12', '#e74c3c']
    
    for cid in range(K):
        mask = cluster_labels == cid
        label = risk_labels[cid]['label']
        color_idx = sorted_clusters.index(cid)
        ax.scatter(X_pca[mask, 0], X_pca[mask, 1], 
                  c=colors_map[color_idx], label=label, alpha=0.6, s=50)
    
    ax.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)', fontsize=12)
    ax.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)', fontsize=12)
    ax.set_title('Clinical Risk Clusters (Metabolic PCA)', fontsize=14)
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "cluster_scatter.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("   Scatter plot saved")
    
    # 3. Distribution Bar Chart
    fig, ax = plt.subplots(figsize=(8, 6))
    
    cluster_counts = df_clean['risk_cluster'].value_counts()
    order = ['Low Risk', 'Moderate Risk', 'High Risk']
    counts = [cluster_counts.get(r, 0) for r in order]
    colors = ['#27ae60', '#f39c12', '#e74c3c']
    
    bars = ax.bar(order, counts, color=colors)
    ax.set_xlabel('Risk Cluster', fontsize=12)
    ax.set_ylabel('Number of Patients', fontsize=12)
    ax.set_title('Clinical Cluster Distribution', fontsize=14)
    
    for bar, count in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
                str(count), ha='center', va='bottom', fontsize=12)
    
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "cluster_distribution.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("   Distribution chart saved")
    
    # 4. K-optimization plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    k_vals = [r['k'] for r in k_results]
    wcss_vals = [r['wcss'] for r in k_results]
    sil_vals = [r['silhouette'] for r in k_results]
    
    ax1.plot(k_vals, wcss_vals, 'bo-', markersize=8)
    ax1.axvline(x=3, color='r', linestyle='--', label='Selected K=3')
    ax1.set_xlabel('Number of Clusters (K)')
    ax1.set_ylabel('Within-Cluster Sum of Squares')
    ax1.set_title('Elbow Method (Clinical)')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2.plot(k_vals, sil_vals, 'go-', markersize=8)
    ax2.axvline(x=3, color='r', linestyle='--', label='Selected K=3')
    ax2.set_xlabel('Number of Clusters (K)')
    ax2.set_ylabel('Silhouette Score')
    ax2.set_title('Silhouette Analysis (Clinical)')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "k_optimization.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("   K-optimization plot saved")
    
    print("\n[DONE] Clinical clustering complete!")
    
    return cluster_analysis


if __name__ == "__main__":
    main()
