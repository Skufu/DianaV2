"""
DIANA K-Means Clustering Training Script
Implements clustering per paper methodology:
- Z-score standardization
- K optimization via elbow + silhouette
- Cluster profiling and labeling

Usage: python scripts/train_clusters.py
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import joblib
import json
from pathlib import Path
import matplotlib.pyplot as plt

DATA_PATH = Path("data/nhanes/processed/diana_dataset_imputed.csv")
MODELS_DIR = Path("models/clinical")  # Save alongside clinical models
VIZ_DIR = Path("models/clinical/visualizations")

# Features for clustering (per paper - Ahlqvist methodology)
# Added age for MARD subtype identification
CLUSTER_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']


def find_optimal_k(X_scaled, k_range=range(2, 7)):
    """
    Find optimal K using elbow method + silhouette scores.
    Per paper: "Several candidate values of k will be examined using 
    the elbow method and silhouette scores"
    """
    results = []
    
    print("[INFO] Testing K values...")
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        wcss = km.inertia_
        sil = silhouette_score(X_scaled, labels)
        results.append({'k': k, 'wcss': wcss, 'silhouette': sil})
        print(f"   K={k}: WCSS={wcss:.1f}, Silhouette={sil:.3f}")
    
    return pd.DataFrame(results)


def plot_optimization(results_df, output_path):
    """Generate elbow and silhouette plots."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    
    # Elbow plot
    ax1.plot(results_df['k'], results_df['wcss'], 'bo-')
    ax1.set_xlabel('Number of Clusters (K)')
    ax1.set_ylabel('Within-Cluster Sum of Squares')
    ax1.set_title('Elbow Method')
    
    # Silhouette plot
    ax2.plot(results_df['k'], results_df['silhouette'], 'go-')
    ax2.set_xlabel('Number of Clusters (K)')
    ax2.set_ylabel('Silhouette Score')
    ax2.set_title('Silhouette Analysis')
    
    plt.tight_layout()
    plt.savefig(output_path)
    print(f"[INFO] Optimization plots saved to: {output_path}")


def profile_clusters(df, labels, features):
    """
    Profile each cluster by mean biomarker values.
    Used for manual labeling as SIDD/SIRD/MOD/MARD-like.
    """
    df_clustered = df.copy()
    df_clustered['cluster'] = labels
    
    print("\n[INFO] Cluster Profiles:")
    print("=" * 60)
    
    profiles = df_clustered.groupby('cluster')[features].mean().round(2)
    print(profiles)
    
    return profiles


def assign_cluster_labels(profiles):
    """
    Assign SIDD/SIRD/MOD/MARD-like labels based on profile characteristics.
    
    Per paper (Ahlqvist criteria):
    - SIDD: High HbA1c/FBS, lower BMI, younger (insulin deficiency pattern)
    - SIRD: High BMI, high TG, low HDL (insulin resistance pattern)
    - MOD: High BMI (>30), moderate HbA1c (obesity-related)
    - MARD: Older age, mild elevations (age-related)
    
    Adapted thresholds for NHANES postmenopausal population.
    """
    labels = {}
    
    for cluster_id in profiles.index:
        p = profiles.loc[cluster_id]
        
        # Order: most specific patterns first
        # 1. SIRD: Metabolic syndrome pattern (high BMI + high TG + low HDL)
        if p['bmi'] > 32 and p['triglycerides'] > 150 and p['hdl'] < 55:
            label = "SIRD-like"
            desc = "Severe Insulin-Resistant Diabetes pattern"
        # 2. High glucose (HbA1c/FBS) - differentiate by BMI
        elif p['hba1c'] > 7.0 or (p['hba1c'] > 6.0 and p['fbs'] > 150):
            if p['bmi'] < 32:
                label = "SIDD-like"
                desc = "Severe Insulin-Deficient Diabetes pattern"
            else:
                label = "SIRD-like"
                desc = "Severe Insulin-Resistant Diabetes pattern"
        # 3. SIDD: Lean with good HDL (insulin-deficient, not resistant)
        elif p['bmi'] < 28 and p['hdl'] > 60:
            label = "SIDD-like"
            desc = "Severe Insulin-Deficient Diabetes pattern"
        # 4. MOD: High BMI without severe glucose elevation
        elif p['bmi'] > 35:
            label = "MOD-like"
            desc = "Mild Obesity-Related Diabetes pattern"
        # 5. MARD: Older, mild metabolic changes
        elif p['age'] > 54:
            label = "MARD-like"
            desc = "Mild Age-Related Diabetes pattern"
        # 6. Moderate obesity
        elif p['bmi'] > 30:
            label = "MOD-like"
            desc = "Mild Obesity-Related Diabetes pattern"
        # 7. Default to MARD
        else:
            label = "MARD-like"
            desc = "Mild Age-Related Diabetes pattern"
        
        labels[int(cluster_id)] = {"label": label, "description": desc}
    
    return labels


def train_clusters():
    """Main training function."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load data
    print(f"[INFO] Loading data from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Records: {len(df)}")
    
    # Select features and drop rows with missing values
    X = df[CLUSTER_FEATURES].dropna()
    print(f"   Complete records for clustering: {len(X)}")
    
    if len(X) < 50:
        print("[ERROR] Insufficient data for clustering (need 50+ records)")
        return
    
    # Z-score standardization (per paper)
    print("\n[INFO] Standardizing features (Z-score)...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Find optimal K - generate plots for documentation
    results = find_optimal_k(X_scaled)
    
    # Plot optimization
    plot_path = VIZ_DIR / "k_optimization.png"
    plot_optimization(results, plot_path)
    
    # Per paper methodology: K=4 to match Ahlqvist T2DM subtypes (SIRD, SIDD, MOD, MARD)
    # Silhouette score is shown for reference but K=4 is FIXED for clinical interpretability
    silhouette_best_k = results.loc[results['silhouette'].idxmax(), 'k']
    best_k = 4  # FIXED per paper methodology
    k4_silhouette = results[results['k'] == 4]['silhouette'].values[0]
    print(f"\n[INFO] Silhouette-optimal K = {int(silhouette_best_k)} (for reference)")
    print(f"[PAPER] Using K = 4 per Ahlqvist methodology (silhouette={k4_silhouette:.3f})")
    
    # Train final model
    print(f"\n[INFO] Training K-Means with K={int(best_k)}...")
    kmeans = KMeans(n_clusters=int(best_k), random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)
    
    # Profile clusters
    profiles = profile_clusters(df.loc[X.index], labels, CLUSTER_FEATURES)
    
    # Assign labels
    cluster_labels = assign_cluster_labels(profiles)
    print("\n[INFO] Cluster Labels:")
    for cid, info in cluster_labels.items():
        print(f"   Cluster {cid}: {info['label']} - {info['description']}")
    
    # Save artifacts
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    
    with open(MODELS_DIR / "cluster_labels.json", 'w') as f:
        json.dump(cluster_labels, f, indent=2)
    
    profiles.to_csv(MODELS_DIR / "cluster_profiles.csv")
    
    # Save clustered data
    df_out = df.loc[X.index].copy()
    df_out['cluster'] = labels
    df_out['cluster_label'] = df_out['cluster'].map(
        lambda x: cluster_labels[x]['label']
    )
    df_out.to_csv("data/nhanes/processed/clustered_data.csv", index=False)
    
    print("\n[SUCCESS] Training complete! Artifacts saved to models/")
    print(f"   - scaler.joblib")
    print(f"   - kmeans_model.joblib")
    print(f"   - cluster_labels.json")
    print(f"   - cluster_profiles.csv")
    print(f"   - k_optimization.png")


if __name__ == "__main__":
    train_clusters()
