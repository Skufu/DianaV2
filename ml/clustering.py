"""
DIANA Clinical Clustering Script (K=4 Ahlqvist Subtype Classification)
K-Means clustering for T2DM subtype identification per Ahlqvist et al. (2018).

Clusters: SIRD, SIDD, MOD, MARD (4 recognized T2DM subtypes)
Features: All biomarkers (standardized)

Also generates K=2 through K=6 analysis for thesis documentation.

Usage: python ml/clustering.py [--k 4]
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
import argparse
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

# All features for clustering (including diagnostic for subtype profiling)
ALL_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']
# Clinical features only (non-circular)
CLINICAL_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

# Ahlqvist et al. T2DM Subtype definitions
AHLQVIST_SUBTYPES = {
    'SIRD': {
        'full_name': 'Severe Insulin-Resistant Diabetes',
        'characteristics': 'High BMI, high TG, low HDL (metabolic syndrome pattern)',
        'clinical_implication': 'Responds well to insulin sensitizers (metformin)',
        'risk_level': 'HIGH'
    },
    'SIDD': {
        'full_name': 'Severe Insulin-Deficient Diabetes',
        'characteristics': 'Highest HbA1c, lower BMI, younger onset',
        'clinical_implication': 'May need early insulin therapy',
        'risk_level': 'HIGH'
    },
    'MOD': {
        'full_name': 'Mild Obesity-Related Diabetes',
        'characteristics': 'High BMI (>30), moderate HbA1c elevation',
        'clinical_implication': 'Weight management primary intervention',
        'risk_level': 'MODERATE'
    },
    'MARD': {
        'full_name': 'Mild Age-Related Diabetes',
        'characteristics': 'Older age at diagnosis, mild metabolic dysfunction',
        'clinical_implication': 'Conservative management, slower progression',
        'risk_level': 'LOW'
    }
}


def analyze_k_range(X_scaled, k_range=(2, 7)):
    """Test multiple K values and return metrics for optimal selection."""
    results = []
    print("[ANALYZE] Testing K values for optimal cluster count...")
    
    for k in range(k_range[0], k_range[1]):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        wcss = km.inertia_
        results.append({
            'k': k, 
            'silhouette': round(sil, 4), 
            'wcss': round(wcss, 2),
            'labels': labels,
            'model': km
        })
        print(f"   K={k}: Silhouette={sil:.4f}, WCSS={wcss:.1f}")
    
    return results


def assign_ahlqvist_labels(cluster_centers, feature_names, k=4):
    """
    Assign Ahlqvist subtype labels to clusters based on centroid characteristics.
    Uses ranking to ensure correct relative assignment (e.g. Highest HbA1c -> SIDD).
    
    Logic based on Ahlqvist et al (2018):
    1. SIDD (Severe Insulin-Deficient): Highest HbA1c / FBS
    2. SIRD (Severe Insulin-Resistant): Highest BMI / TG (of remaining)
    3. MOD (Mild Obesity-Related): Highest BMI (of remaining)
    4. MARD (Mild Age-Related): Remaining (typically lowest metabolic risk)
    """
    centers_df = pd.DataFrame(cluster_centers, columns=feature_names)
    available_clusters = list(range(k))
    final_labels = {}
    
    # 1. Identify SIDD: Highest HbA1c (primary def: insulin deficiency -> hyperglycemia)
    # If HbA1c missing, use FBS
    glucose_metric = 'hba1c' if 'hba1c' in centers_df.columns else 'fbs'
    if glucose_metric in centers_df.columns:
        sidd_id = centers_df.loc[available_clusters, glucose_metric].idxmax()
        final_labels[sidd_id] = 'SIDD'
        available_clusters.remove(sidd_id)
    else:
        # Fallback if no glucose metrics (unlikely in this dataset)
        print("[WARN] No glucose metrics found for SIDD identification!")
    
    # If we have run out of clusters (shouldn't happen with k=4), stop
    if not available_clusters:
        return final_labels
        
    # 2. Identify SIRD: Highest Insulin Resistance markers (TG, BMI, Low HDL)
    # Using simple proxy: BMI + TG - HDL (standardized)
    # Note: SIRD has HIGHEST residency/BMI usually, but SIDD is distinct by glucose.
    # SIRD vs MOD: SIRD has higher metabolic derangement than just obesity.
    
    # We score the remaining for SIRD characteristics
    sird_scores = {}
    for cid in available_clusters:
        c = centers_df.iloc[cid]
        # High BMI + High TG - High HDL
        score = c.get('bmi', 0) + c.get('triglycerides', 0) - c.get('hdl', 0)
        sird_scores[cid] = score
        
    sird_id = max(sird_scores, key=sird_scores.get)
    final_labels[sird_id] = 'SIRD'
    available_clusters.remove(sird_id)
    
    if not available_clusters:
        return final_labels

    # 3. Identify MOD: Highest BMI of the remaining
    # MOD is "Mild Obesity-Related", so it's obese but less metabolic derangement than SIRD
    mod_scores = {}
    for cid in available_clusters:
        mod_scores[cid] = centers_df.iloc[cid].get('bmi', 0)
        
    mod_id = max(mod_scores, key=mod_scores.get)
    final_labels[mod_id] = 'MOD'
    available_clusters.remove(mod_id)
    
    if not available_clusters:
        return final_labels

    # 4. Identify MARD: The last one
    # Typically lowest BMI/risk, mostly driven by Age
    mard_id = available_clusters[0]
    final_labels[mard_id] = 'MARD'
    
    return final_labels


def create_cluster_profiles(df, cluster_labels, features, label_map):
    """Create detailed cluster profiles with statistics."""
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
            'medians': {},
            'info': AHLQVIST_SUBTYPES.get(label, {})
        }
        
        for feat in features:
            if feat in cluster_data.columns:
                profile['means'][feat] = round(cluster_data[feat].mean(), 2)
                profile['medians'][feat] = round(cluster_data[feat].median(), 2)
        
        profiles[label] = profile
    
    return profiles


def plot_k_optimization(k_results, selected_k, output_path):
    """Create elbow method and silhouette analysis plots."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    k_vals = [r['k'] for r in k_results]
    wcss_vals = [r['wcss'] for r in k_results]
    sil_vals = [r['silhouette'] for r in k_results]
    
    # Elbow plot
    ax1.plot(k_vals, wcss_vals, 'bo-', markersize=10, linewidth=2)
    ax1.axvline(x=selected_k, color='r', linestyle='--', linewidth=2, label=f'Selected K={selected_k}')
    ax1.set_xlabel('Number of Clusters (K)', fontsize=12)
    ax1.set_ylabel('Within-Cluster Sum of Squares (WCSS)', fontsize=12)
    ax1.set_title('Elbow Method for Optimal K', fontsize=14)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_xticks(k_vals)
    
    # Silhouette plot
    colors = ['red' if k == selected_k else 'green' for k in k_vals]
    bars = ax2.bar(k_vals, sil_vals, color=colors, edgecolor='black')
    ax2.axhline(y=sil_vals[selected_k-2], color='red', linestyle='--', alpha=0.5)
    ax2.set_xlabel('Number of Clusters (K)', fontsize=12)
    ax2.set_ylabel('Silhouette Score', fontsize=12)
    ax2.set_title('Silhouette Analysis for Optimal K', fontsize=14)
    ax2.set_xticks(k_vals)
    ax2.grid(True, alpha=0.3, axis='y')
    
    # Add value labels
    for bar, val in zip(bars, sil_vals):
        ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f'{val:.3f}', ha='center', va='bottom', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   K-optimization plot saved to {output_path}")


def plot_cluster_heatmap(profiles, features, output_path):
    """Create heatmap of cluster centroid values."""
    # Build matrix of mean values
    labels = list(profiles.keys())
    data = []
    for label in labels:
        row = [profiles[label]['means'].get(f, 0) for f in features]
        data.append(row)
    
    df_heat = pd.DataFrame(data, index=labels, columns=features)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.heatmap(df_heat, annot=True, fmt='.1f', cmap='RdYlGn_r',
                ax=ax, cbar_kws={'label': 'Mean Value'})
    ax.set_title('T2DM Subtype Cluster Profiles (Ahlqvist Classification)', fontsize=14)
    ax.set_xlabel('Biomarker', fontsize=12)
    ax.set_ylabel('Cluster (Subtype)', fontsize=12)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   Heatmap saved to {output_path}")


def plot_cluster_scatter(X_scaled, cluster_labels, label_map, output_path):
    """Create PCA scatter plot of clusters."""
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Color palette for subtypes
    colors = {
        'SIRD': '#e74c3c',   # Red - high risk
        'SIDD': '#c0392b',   # Dark red - high risk
        'MOD': '#f39c12',    # Orange - moderate
        'MARD': '#27ae60',   # Green - low risk
    }
    
    for cid in np.unique(cluster_labels):
        mask = cluster_labels == cid
        label = label_map.get(cid, f'Cluster-{cid}')
        color = colors.get(label, '#3498db')
        ax.scatter(X_pca[mask, 0], X_pca[mask, 1],
                  c=color, label=label, alpha=0.6, s=50)
    
    ax.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)', fontsize=12)
    ax.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)', fontsize=12)
    ax.set_title('T2DM Subtype Clusters (PCA Projection)', fontsize=14)
    ax.legend(title='Subtype')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   PCA scatter saved to {output_path}")


def plot_cluster_distribution(profiles, output_path):
    """Create bar chart of cluster sizes."""
    labels = list(profiles.keys())
    counts = [profiles[l]['count'] for l in labels]
    percentages = [profiles[l]['percentage'] for l in labels]
    
    # Order by count descending
    order = sorted(range(len(counts)), key=lambda i: counts[i], reverse=True)
    labels = [labels[i] for i in order]
    counts = [counts[i] for i in order]
    percentages = [percentages[i] for i in order]
    
    colors = {
        'SIRD': '#e74c3c', 'SIDD': '#c0392b',
        'MOD': '#f39c12', 'MARD': '#27ae60'
    }
    bar_colors = [colors.get(l, '#3498db') for l in labels]
    
    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(labels, counts, color=bar_colors, edgecolor='black')
    
    ax.set_xlabel('T2DM Subtype', fontsize=12)
    ax.set_ylabel('Number of Patients', fontsize=12)
    ax.set_title('Distribution of T2DM Subtypes in Menopausal Population', fontsize=14)
    
    # Add count and percentage labels
    for bar, count, pct in zip(bars, counts, percentages):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
                f'{count}\n({pct:.1f}%)', ha='center', va='bottom', fontsize=11)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   Distribution chart saved to {output_path}")


def main(k=4):
    """Main clustering pipeline."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print(f"DIANA T2DM Subtype Clustering (K={k})")
    print("Based on Ahlqvist et al. (2018) Classification")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total records: {len(df)}")
    
    # Determine which features to use
    available_features = [f for f in ALL_FEATURES if f in df.columns]
    print(f"   Available features: {available_features}")
    
    # Prepare data
    df_clean = df.dropna(subset=available_features)
    X = df_clean[available_features].values
    print(f"   Complete records: {len(X)}")
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # =============================================
    # K RANGE ANALYSIS (for thesis documentation)
    # =============================================
    print("\n" + "=" * 60)
    print("K RANGE ANALYSIS (K=2 to K=6)")
    print("=" * 60)
    
    k_results = analyze_k_range(X_scaled, k_range=(2, 7))
    
    # Find optimal by silhouette
    best_sil_idx = max(range(len(k_results)), key=lambda i: k_results[i]['silhouette'])
    best_sil_k = k_results[best_sil_idx]['k']
    print(f"\n[RESULT] Optimal K by silhouette: {best_sil_k} (score: {k_results[best_sil_idx]['silhouette']:.4f})")
    
    if best_sil_k != k:
        print(f"[NOTE] Using K={k} per Ahlqvist literature (silhouette: {k_results[k-2]['silhouette']:.4f})")
    
    # =============================================
    # FINAL CLUSTERING WITH SELECTED K
    # =============================================
    print("\n" + "=" * 60)
    print(f"FINAL CLUSTERING (K={k})")
    print("=" * 60)
    
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    
    final_silhouette = silhouette_score(X_scaled, cluster_labels)
    print(f"   Silhouette Score: {final_silhouette:.4f}")
    
    # Assign Ahlqvist subtype labels
    label_map = assign_ahlqvist_labels(kmeans.cluster_centers_, available_features, k)
    print(f"\n[LABELS] Cluster assignments:")
    for cid, label in label_map.items():
        count = (cluster_labels == cid).sum()
        print(f"   Cluster {cid} -> {label}: n={count}")
    
    # Create detailed profiles
    profiles = create_cluster_profiles(df_clean, cluster_labels, available_features, label_map)
    
    print("\n[PROFILES] Cluster characteristics:")
    for label, profile in profiles.items():
        print(f"\n   {label} ({profile['info'].get('full_name', 'Unknown')}):")
        print(f"      Count: {profile['count']} ({profile['percentage']}%)")
        print(f"      Risk: {profile['info'].get('risk_level', 'UNKNOWN')}")
        print(f"      Means: BMI={profile['means'].get('bmi', 'N/A')}, "
              f"HbA1c={profile['means'].get('hba1c', 'N/A')}, "
              f"TG={profile['means'].get('triglycerides', 'N/A')}")
    
    # =============================================
    # SAVE ARTIFACTS
    # =============================================
    print("\n" + "=" * 60)
    print("SAVING ARTIFACTS")
    print("=" * 60)
    
    # Save models
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    joblib.dump(scaler, MODELS_DIR / "cluster_scaler.joblib")
    print("   Saved kmeans_model.joblib and cluster_scaler.joblib")
    
    # Save cluster labels mapping
    cluster_labels_json = {
        str(cid): {
            'label': label,
            **AHLQVIST_SUBTYPES.get(label, {})
        }
        for cid, label in label_map.items()
    }
    with open(MODELS_DIR / "cluster_labels.json", 'w') as f:
        json.dump(cluster_labels_json, f, indent=2)
    print("   Saved cluster_labels.json")
    
    # Save full analysis results
    cluster_analysis = {
        "methodology": "K-Means clustering with Ahlqvist et al. (2018) subtype classification",
        "features_used": available_features,
        "n_samples": len(X),
        "k_selected": k,
        "k_optimal_by_silhouette": best_sil_k,
        "silhouette_score": round(final_silhouette, 4),
        "k_range_analysis": [
            {"k": r['k'], "silhouette": r['silhouette'], "wcss": r['wcss']}
            for r in k_results
        ],
        "cluster_profiles": profiles,
        "note": f"K={k} selected to match Ahlqvist literature. "
                f"Silhouette analysis suggested K={best_sil_k}. "
                "This may indicate menopausal population-specific clustering patterns."
    }
    
    with open(RESULTS_DIR / "cluster_analysis.json", 'w') as f:
        json.dump(cluster_analysis, f, indent=2, default=str)
    print("   Saved cluster_analysis.json")
    
    # Save cluster profiles CSV
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
    print("   Saved cluster_profiles.csv")
    
    # =============================================
    # VISUALIZATIONS
    # =============================================
    print("\n" + "=" * 60)
    print("GENERATING VISUALIZATIONS")
    print("=" * 60)
    
    plot_k_optimization(k_results, k, VIZ_DIR / "k_optimization.png")
    plot_cluster_heatmap(profiles, available_features, VIZ_DIR / "cluster_heatmap.png")
    plot_cluster_scatter(X_scaled, cluster_labels, label_map, VIZ_DIR / "cluster_scatter.png")
    plot_cluster_distribution(profiles, VIZ_DIR / "cluster_distribution.png")
    
    print("\n[DONE] Clustering complete!")
    
    return cluster_analysis


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='DIANA T2DM Subtype Clustering')
    parser.add_argument('--k', type=int, default=4, 
                        help='Number of clusters (default: 4 for Ahlqvist subtypes)')
    args = parser.parse_args()
    
    main(k=args.k)
