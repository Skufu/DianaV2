"""
DIANA Model Evaluation & Visualization Script
Generates cluster visualizations and evaluation metrics.

Usage: python scripts/evaluate_clusters.py
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_samples, silhouette_score
import joblib
from pathlib import Path

MODELS_DIR = Path("models")
DATA_PATH = Path("data/nhanes/processed/clustered_data.csv")
OUTPUT_DIR = Path("models/visualizations")


def plot_cluster_pca(df, features):
    """Plot clusters in 2D using PCA."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    X = df[features].dropna()
    labels = df.loc[X.index, 'cluster']
    
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X)
    
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(X_pca[:, 0], X_pca[:, 1], c=labels, cmap='viridis', alpha=0.6)
    plt.colorbar(scatter, label='Cluster')
    plt.xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.1%} variance)')
    plt.ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.1%} variance)')
    plt.title('Cluster Distribution (PCA)')
    plt.savefig(OUTPUT_DIR / "cluster_pca.png", dpi=150)
    print(f"✅ Saved: {OUTPUT_DIR / 'cluster_pca.png'}")


def plot_cluster_profiles(profiles_path):
    """Create radar/bar charts for cluster profiles."""
    profiles = pd.read_csv(profiles_path, index_col=0)
    
    fig, ax = plt.subplots(figsize=(12, 6))
    profiles.T.plot(kind='bar', ax=ax)
    plt.title('Cluster Biomarker Profiles')
    plt.xlabel('Biomarker')
    plt.ylabel('Mean Value (standardized)')
    plt.legend(title='Cluster', bbox_to_anchor=(1.02, 1))
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "cluster_profiles_bar.png", dpi=150)
    print(f"✅ Saved: {OUTPUT_DIR / 'cluster_profiles_bar.png'}")


def generate_report():
    """Generate evaluation summary."""
    print("=" * 60)
    print("DIANA Model Evaluation Report")
    print("=" * 60)
    
    # Load data
    df = pd.read_csv(DATA_PATH)
    print(f"\n📊 Dataset: {len(df)} records")
    
    # Cluster distribution
    print("\n📈 Cluster Distribution:")
    print(df['cluster_label'].value_counts())
    
    # Load and display profiles
    profiles = pd.read_csv(MODELS_DIR / "cluster_profiles.csv", index_col=0)
    print("\n📋 Cluster Profiles (mean biomarkers):")
    print(profiles.round(2))
    
    # Generate visualizations
    features = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
    plot_cluster_pca(df, features)
    plot_cluster_profiles(MODELS_DIR / "cluster_profiles.csv")
    
    print("\n✅ Evaluation complete!")


if __name__ == "__main__":
    generate_report()
