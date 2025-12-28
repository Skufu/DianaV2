"""
DIANA Clustering Script
K-Means clustering for risk stratification.

Outputs:
- 3 clusters: Low/Moderate/High Risk
- Cluster analysis JSON
- Heatmap, scatter plot, distribution chart

Usage: python scripts/clustering.py
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
MODELS_DIR = Path("models")
RESULTS_DIR = Path("models/results")
VIZ_DIR = Path("models/visualizations")

# Features for clustering
FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("DIANA K-Means Clustering")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    
    # Prepare features
    X = df[FEATURES].dropna()
    df_clean = df.loc[X.index].copy()
    print(f"   Records: {len(X)}")
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Test K values for documentation
    print("\n[OPT] Testing K values...")
    k_results = []
    for k in range(2, 7):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        wcss = km.inertia_
        k_results.append({'k': k, 'silhouette': sil, 'wcss': wcss})
        print(f"   K={k}: Silhouette={sil:.3f}")
    
    # Per paper: Use K=3 for Low/Moderate/High Risk
    K = 3
    print(f"\n[CLUSTER] Using K={K} per research methodology (Low/Moderate/High Risk)")
    
    kmeans = KMeans(n_clusters=K, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    
    df_clean['cluster'] = cluster_labels
    
    # Calculate cluster profiles
    print("\n[PROFILE] Cluster characteristics:")
    profiles = df_clean.groupby('cluster')[FEATURES].mean().round(2)
    print(profiles)
    
    # Label clusters based on risk (using HbA1c and FBS means)
    cluster_means = profiles[['hba1c', 'fbs']].mean(axis=1)
    sorted_clusters = cluster_means.sort_values().index.tolist()
    
    risk_labels = {
        sorted_clusters[0]: {"label": "Low Risk", "color": "green"},
        sorted_clusters[1]: {"label": "Moderate Risk", "color": "orange"},
        sorted_clusters[2]: {"label": "High Risk", "color": "red"}
    }
    
    print("\n[LABEL] Risk cluster assignments:")
    for cid in range(K):
        info = risk_labels[cid]
        mean_hba1c = profiles.loc[cid, 'hba1c']
        mean_fbs = profiles.loc[cid, 'fbs']
        count = (cluster_labels == cid).sum()
        print(f"   Cluster {cid} -> {info['label']}: n={count}, HbA1c={mean_hba1c}, FBS={mean_fbs}")
    
    df_clean['risk_cluster'] = df_clean['cluster'].map(lambda x: risk_labels[x]['label'])
    
    # Save cluster analysis
    cluster_analysis = {
        "n_clusters": K,
        "silhouette_score": round(silhouette_score(X_scaled, cluster_labels), 4),
        "cluster_sizes": {
            risk_labels[i]['label']: int((cluster_labels == i).sum())
            for i in range(K)
        },
        "cluster_profiles": {
            risk_labels[i]['label']: {
                feat: round(profiles.loc[i, feat], 2)
                for feat in FEATURES
            }
            for i in range(K)
        },
        "k_optimization": k_results
    }
    
    with open(RESULTS_DIR / "cluster_analysis.json", 'w') as f:
        json.dump(cluster_analysis, f, indent=2)
    print(f"\n[SAVE] Cluster analysis saved to {RESULTS_DIR / 'cluster_analysis.json'}")
    
    # Save K-means model
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    print(f"   K-means model saved")
    
    # Save clustered data
    df_clean.to_csv("data/nhanes/processed/diana_clustered_final.csv", index=False)
    print(f"   Clustered data saved")
    
    # =====================
    # VISUALIZATIONS
    # =====================
    print("\n[VIZ] Generating visualizations...")
    
    # 1. Cluster Heatmap
    fig, ax = plt.subplots(figsize=(12, 6))
    
    # Normalize for heatmap
    profiles_normalized = (profiles - profiles.min()) / (profiles.max() - profiles.min())
    
    # Reorder by risk level
    ordered_profiles = profiles.loc[[sorted_clusters[0], sorted_clusters[1], sorted_clusters[2]]]
    ordered_labels = [risk_labels[c]['label'] for c in [sorted_clusters[0], sorted_clusters[1], sorted_clusters[2]]]
    
    sns.heatmap(ordered_profiles, annot=True, fmt='.1f', cmap='RdYlGn_r',
                yticklabels=ordered_labels, ax=ax, cbar_kws={'label': 'Value'})
    ax.set_title('Cluster Centroid Heatmap', fontsize=14)
    ax.set_xlabel('Biomarker', fontsize=12)
    ax.set_ylabel('Risk Cluster', fontsize=12)
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "cluster_heatmap.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("   Heatmap saved")
    
    # 2. PCA Scatter Plot
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    
    fig, ax = plt.subplots(figsize=(10, 8))
    colors = {0: '#27ae60', 1: '#f39c12', 2: '#e74c3c'}  # Green, Orange, Red
    
    for cid in range(K):
        mask = cluster_labels == cid
        label = risk_labels[cid]['label']
        ax.scatter(X_pca[mask, 0], X_pca[mask, 1], 
                  c=colors[sorted_clusters.index(cid)], label=label, alpha=0.6, s=50)
    
    ax.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)', fontsize=12)
    ax.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)', fontsize=12)
    ax.set_title('Patient Risk Clusters (PCA)', fontsize=14)
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
    ax.set_title('Cluster Distribution', fontsize=14)
    
    # Add count labels on bars
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
    ax1.set_title('Elbow Method')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2.plot(k_vals, sil_vals, 'go-', markersize=8)
    ax2.axvline(x=3, color='r', linestyle='--', label='Selected K=3')
    ax2.set_xlabel('Number of Clusters (K)')
    ax2.set_ylabel('Silhouette Score')
    ax2.set_title('Silhouette Analysis')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "k_optimization.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("   K-optimization plot saved")
    
    print("\n[DONE] Clustering complete!")
    
    return cluster_analysis


if __name__ == "__main__":
    main()
