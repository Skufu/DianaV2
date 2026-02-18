"""
DIANA K-Means Clustering Training Script
Implements clustering per paper methodology:
- Z-score standardization
- K optimization via elbow + silhouette
- Cluster profiling and labeling (Ahlqvist-like subtypes + risk levels)

Note: Clusters use only non-circular clinical biomarkers (no HbA1c/FBS)
to be consistent with the ClinicalPredictor. Ahlqvist subtype assignment
uses proxy metrics since HbA1c is not available.

Usage: python scripts/train/train_clusters.py
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

DATA_PATH = Path("data/nhanes/processed/diana_dataset_final.csv")
MODELS_DIR = Path("models/clinical_v2")  # Save to clinical_v2
VIZ_DIR = Path("models/clinical_v2/visualizations")

# Features for clustering — non-circular clinical biomarkers only
# No HbA1c/FBS to avoid circular reasoning with diabetes diagnosis
CLUSTER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']


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
    Used for Ahlqvist-like subtype assignment.
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
    Assign Ahlqvist-like subtype labels AND risk levels based on profile characteristics.
    Uses proxy metrics since HbA1c/FBS are excluded from clustering.
    
    Subtype assignment strategy (without HbA1c):
    1. SIRD: Highest insulin resistance proxy (BMI + TG/50 - HDL/10)
       → Severe Insulin-Resistant Diabetes
    2. SIDD: Highest TG/HDL ratio among remaining (metabolic derangement proxy)
       → Severe Insulin-Deficient Diabetes  
    3. MOD:  Highest BMI among remaining (Mild Obesity-Related)
    4. MARD: Remaining cluster (typically oldest, mildest — Mild Age-Related)
    
    Risk level mapping:
    - SIRD → HIGH (severe metabolic dysfunction)
    - SIDD → HIGH (severe metabolic derangement)
    - MOD  → MODERATE (obesity-driven, manageable)
    - MARD → LOW (mild, age-related)
    
    Note: Without HbA1c, SIDD identification is approximate. We use TG/HDL ratio
    as a proxy for metabolic derangement rather than insulin deficiency directly.
    """
    available_ids = list(profiles.index)
    labels = {}
    
    # 1. SIRD: Highest insulin resistance composite score
    #    BMI (obesity) + TG/50 (dyslipidemia) - HDL/10 (protective factor inverted)
    ir_scores = {}
    for cid in available_ids:
        p = profiles.loc[cid]
        ir_scores[cid] = p['bmi'] + (p['triglycerides'] / 50) - (p['hdl'] / 10)
    
    sird_id = max(ir_scores, key=ir_scores.get)
    labels[str(int(sird_id))] = {
        "label": "SIRD",
        "subtype": "SIRD",
        "subtype_full": "Severe Insulin-Resistant Diabetes",
        "risk_level": "HIGH",
        "risk_label": "High Risk",
        "description": "High BMI, high triglycerides, low HDL — insulin resistance pattern",
        "treatment_focus": "Weight management, insulin sensitizers (metformin), cardiovascular monitoring"
    }
    available_ids.remove(sird_id)
    
    # 2. SIDD: Highest TG/HDL ratio among remaining (metabolic derangement proxy)
    #    Without HbA1c, we use TG/HDL as a proxy for metabolic dysfunction
    tg_hdl_scores = {}
    for cid in available_ids:
        p = profiles.loc[cid]
        tg_hdl_scores[cid] = p['triglycerides'] / max(p['hdl'], 1)
    
    sidd_id = max(tg_hdl_scores, key=tg_hdl_scores.get)
    labels[str(int(sidd_id))] = {
        "label": "SIDD",
        "subtype": "SIDD",
        "subtype_full": "Severe Insulin-Deficient Diabetes",
        "risk_level": "HIGH",
        "risk_label": "High Risk",
        "description": "High TG/HDL ratio — metabolic derangement pattern (proxy for insulin deficiency)",
        "treatment_focus": "Blood glucose monitoring, consider insulin therapy, monitor for complications"
    }
    available_ids.remove(sidd_id)
    
    # 3. MOD: Highest BMI among remaining
    mod_id = profiles.loc[available_ids, 'bmi'].idxmax()
    labels[str(int(mod_id))] = {
        "label": "MOD",
        "subtype": "MOD",
        "subtype_full": "Mild Obesity-Related Diabetes",
        "risk_level": "MODERATE",
        "risk_label": "Moderate Risk",
        "description": "Elevated BMI with moderate metabolic markers — obesity-driven pattern",
        "treatment_focus": "Weight loss (5-10%), healthy eating, moderate exercise, lipid monitoring"
    }
    available_ids.remove(mod_id)
    
    # 4. MARD: The remaining cluster (typically oldest, mildest values)
    mard_id = available_ids[0]
    labels[str(int(mard_id))] = {
        "label": "MARD",
        "subtype": "MARD",
        "subtype_full": "Mild Age-Related Diabetes",
        "risk_level": "LOW",
        "risk_label": "Low Risk",
        "description": "Older age with mild metabolic values — age-related pattern",
        "treatment_focus": "Regular health checkups, lifestyle management, cardiovascular screening"
    }
    
    return labels


def compute_cluster_statistics(df, labels_array, cluster_labels, features):
    """Compute additional statistics per cluster for the analysis report."""
    df_work = df.copy()
    df_work['cluster'] = labels_array
    
    stats = {}
    for cluster_id_str, label_info in cluster_labels.items():
        cluster_id = int(cluster_id_str)
        mask = df_work['cluster'] == cluster_id
        cluster_df = df_work[mask]
        
        # Compute diabetic/pre-diabetic rates if diabetes_label exists
        diabetic_rate = 0.0
        pre_diabetic_rate = 0.0
        if 'diabetes_label' in cluster_df.columns:
            label_counts = cluster_df['diabetes_label'].value_counts(normalize=True)
            diabetic_rate = float(label_counts.get(2, label_counts.get('Diabetic', 0)))
            pre_diabetic_rate = float(label_counts.get(1, label_counts.get('Pre-diabetic', 0)))
        
        risk_score = diabetic_rate + (0.5 * pre_diabetic_rate)
        
        stats[cluster_id_str] = {
            **label_info,
            "size": int(mask.sum()),
            "diabetic_rate": round(diabetic_rate, 4),
            "pre_diabetic_rate": round(pre_diabetic_rate, 4),
            "risk_score": round(risk_score, 4),
        }
    
    return stats


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
    print(f"   Features: {CLUSTER_FEATURES}")
    
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
    
    # Assign Ahlqvist-like labels with both subtype and risk level
    cluster_labels = assign_cluster_labels(profiles)
    print("\n[INFO] Cluster Labels:")
    for cid, info in cluster_labels.items():
        print(f"   Cluster {cid}: {info['label']} ({info['risk_label']}) - {info['description']}")
    
    # Compute additional statistics
    cluster_stats = compute_cluster_statistics(df.loc[X.index], labels, cluster_labels, CLUSTER_FEATURES)
    
    # Save artifacts
    joblib.dump(scaler, MODELS_DIR / "cluster_scaler.joblib")
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    
    # Save cluster labels (with both subtype and risk level schemas)
    with open(MODELS_DIR / "cluster_labels.json", 'w') as f:
        json.dump(cluster_stats, f, indent=2)
    
    profiles.to_csv(MODELS_DIR / "cluster_profiles.csv")
    
    # Save clustered data
    df_out = df.loc[X.index].copy()
    df_out['cluster'] = labels
    df_out['cluster_label'] = df_out['cluster'].map(
        lambda x: cluster_labels[str(x)]['label']
    )
    df_out['risk_level'] = df_out['cluster'].map(
        lambda x: cluster_labels[str(x)]['risk_level']
    )
    df_out.to_csv("data/nhanes/processed/clustered_data.csv", index=False)
    
    print("\n[SUCCESS] Training complete! Artifacts saved to models/clinical_v2/")
    print(f"   - cluster_scaler.joblib (fitted on {len(CLUSTER_FEATURES)} features: {CLUSTER_FEATURES})")
    print(f"   - kmeans_model.joblib (K={best_k})")
    print(f"   - cluster_labels.json (with subtypes + risk levels)")
    print(f"   - cluster_profiles.csv")
    print(f"   - k_optimization.png")


if __name__ == "__main__":
    train_clusters()

