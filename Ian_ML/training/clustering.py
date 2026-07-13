# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportCallIssue=false, reportIndexIssue=false, reportMissingTypeArgument=false, reportAttributeAccessIssue=false
"""
DIANA weighted metabolic-profile clustering (legacy-serving K=4).

Weighted K-Means assigns operational-label-positive records to raw centroids.
The SIRD/SIDD/MOD/MARD strings are retained only for API compatibility; the
defensible display names are descriptive proxy profiles, not validated diabetes
subtypes. This script also generates a K=2 through K=6 sensitivity analysis.

Usage: python Ian_ML/training/clustering.py [--k 4]
"""

import pandas as pd
import numpy as np
import json
import joblib
import argparse
import os
from pathlib import Path
from collections.abc import Mapping, Sequence
from typing import Any, cast
from numpy.typing import NDArray
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score

try:
    from Ian_ML.common.paths import MODELS_ROOT, NHANES_PROCESSED_ROOT, REPO_ROOT
    from Ian_ML.common.feature_constants import CLUSTER_FEATURES, AHLQVIST_SUBTYPES
    from Ian_ML.common.weighted_kmeans import WeightedKMeans
except ModuleNotFoundError:
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from Ian_ML.common.paths import MODELS_ROOT, NHANES_PROCESSED_ROOT, REPO_ROOT
    from Ian_ML.common.feature_constants import CLUSTER_FEATURES, AHLQVIST_SUBTYPES
    from Ian_ML.common.weighted_kmeans import WeightedKMeans

FloatArray = NDArray[np.float64]
IntArray = NDArray[np.int64]

DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
_models_dir_override = os.environ.get("DIANA_MODEL_OUTPUT_DIR")
if _models_dir_override:
    MODELS_DIR = Path(_models_dir_override).expanduser()
    if not MODELS_DIR.is_absolute():
        MODELS_DIR = REPO_ROOT / MODELS_DIR
else:
    MODELS_DIR = MODELS_ROOT / "binary_v2_no_bp"
RESULTS_DIR = MODELS_DIR / "results"
VIZ_DIR = MODELS_DIR / "visualizations"

# All features for clustering — imported from feature_constants.py (single source of truth)
# Never hardcode feature lists here; see feature_constants.py Bug History.
ALL_FEATURES = CLUSTER_FEATURES
CLINICAL_FEATURES = CLUSTER_FEATURES

# Expert-elicited, domain-informed feature weights.
# Order must follow CLUSTER_FEATURES exactly when converted to a vector.
EXPERT_FEATURE_WEIGHTS = {
    'bmi': 1.5,
    'triglycerides': 2.0,
    'ldl': 2.5,
    'hdl': 1.2,
    'age': 1.0,
    'waist_circumference': 2.0,
}

PROFILE_DISPLAY_LABELS = {
    "SIRD": "TG-waist dominant\n(SIRD-like legacy alias)",
    "SIDD": "LDL-dominant\n(SIDD-like legacy alias)",
    "MOD": "Obesity-dominant\n(MOD-like legacy alias)",
    "MARD": "Lower-burden residual\n(MARD-like legacy alias)",
}

# Ahlqvist et al. T2DM Subtype definitions — imported from feature_constants.py
# (single source of truth; do not redefine here)


def build_feature_weight_vector(feature_names: Sequence[str]) -> list[float]:
    """Build ordered weight vector matching the exact feature ordering."""
    missing = [f for f in feature_names if f not in EXPERT_FEATURE_WEIGHTS]
    if missing:
        raise ValueError(f"Missing expert feature weights for: {missing}")
    return [float(EXPERT_FEATURE_WEIGHTS[f]) for f in feature_names]


def analyze_k_range(
    X_scaled: FloatArray,
    feature_weights: Sequence[float],
    k_range: tuple[int, int] = (2, 7),
) -> list[dict[str, Any]]:
    """Test K values and score them in the same weighted geometry used for fitting."""
    results: list[dict[str, Any]] = []
    # WeightedKMeans minimizes sum_j w_j * (x_j - c_j)^2. Standard cluster
    # metrics must therefore see x_j * sqrt(w_j); scoring raw X_scaled would
    # silently evaluate a different, unweighted distance function.
    X_metric = X_scaled * np.sqrt(np.asarray(feature_weights, dtype=float))
    print("[ANALYZE] Testing K values for optimal cluster count...")
    
    for k in range(k_range[0], k_range[1]):
        km = WeightedKMeans(
            n_clusters=k,
            weights=feature_weights,
            random_state=42,
            n_init=10,
        )
        labels = km.fit(X_scaled).labels_
        if labels is None:
            raise RuntimeError("WeightedKMeans returned no labels during K-range analysis.")
        sil = silhouette_score(X_metric, labels)
        dbi = davies_bouldin_score(X_metric, labels)
        chi = calinski_harabasz_score(X_metric, labels)
        if km.inertia_ is None:
            raise RuntimeError("WeightedKMeans returned no inertia during K-range analysis.")
        wcss = float(km.inertia_)
        results.append({
            'k': k, 
            'silhouette': round(sil, 4), 
            'dbi': round(dbi, 4),
            'chi': round(chi, 4),
            'wcss': round(wcss, 2),
            'labels': labels,
            'model': km
        })
        print(f"   K={k}: Silhouette={sil:.4f}, DBI={dbi:.4f}, CHI={chi:.4f}, WCSS={wcss:.1f}")
    
    return results


def assign_ahlqvist_labels(
    cluster_centers: FloatArray,
    feature_names: Sequence[str],
    k: int = 4,
) -> dict[int, str]:
    """
    Map fixed centroids to legacy aliases using a deterministic naming waterfall.

    These strings are retained for API compatibility. They are descriptive
    proxy-profile aliases, not validated Ahlqvist biological subtypes.

    LIMITATION (AHLQVIST-INSPIRED ADAPTATION): DIANA lacks HOMA2-B, HOMA2-IR, 
    and C-peptide, which are the primary discriminators for SIDD vs SIRD in 
    Ahlqvist et al. (2018). As demonstrated by Tanabe et al. (2024), true replication 
    is extremely difficult without HOMA2. Therefore, this is framed as an "Ahlqvist-inspired" 
    pragmatic adaptation.

    DIANA assignment strategy:
    1. SIRD legacy alias: highest LAP-style TG-waist ranking score.
       The implementation uses TG in mg/dL, so the score is for centroid
       ordering and is not a conventional clinical LAP magnitude.
    2. SIDD legacy alias: highest LDL among the remaining centroids.
    3. MOD legacy alias: highest BMI among the remaining centroids.
    4. MARD legacy alias: the final residual centroid.
    """
    centers_df = pd.DataFrame(cast(Any, cluster_centers), columns=cast(Any, list(feature_names)))
    available_clusters: list[int] = list(range(k))
    final_labels: dict[int, str] = {}
    
    # 1. Identify SIRD: Highest LAP score (validated insulin resistance proxy)
    # LAP = (WC - 58) * TG for women — validated in 2024 NHANES study
    # Reference: Wang et al. (2024) "Lipid Accumulation Product as a Predictor of
    # Prediabetes and Diabetes: Insights From NHANES Data" Journal of Diabetes Research
    ir_scores: dict[int, float] = {}
    for cid in available_clusters:
        c = centers_df.iloc[cid]
        waist = float(c.get('waist_circumference', 0.0))
        tg = float(c.get('triglycerides', 0.0))
        # LAP formula for women: (WC - 58) * TG
        # WC in cm, TG in mg/dL
        ir_scores[cid] = (waist - 58) * tg
    
    sird_id = max(ir_scores, key=lambda cid: ir_scores[cid])
    final_labels[sird_id] = 'SIRD'
    available_clusters.remove(sird_id)
    
    if not available_clusters:
        return final_labels
    
    # 2. Identify Atherogenic/Lipid-Driven phenotype: Highest LDL among remaining
    # This identifies the lipid-driven diabetes subtype without requiring
    # beta-cell function tests (HOMA2-B/C-peptide). Rebranded from SIDD
    # to reflect that we're identifying atherogenic dyslipidemia, not true insulin deficiency.
    # We use high LDL as a proxy.
    ldl_scores: dict[int, float] = {}
    for cid in available_clusters:
        c = centers_df.iloc[cid]
        ldl_scores[cid] = float(c.get('ldl', 0.0))
    
    sidd_id = max(ldl_scores, key=lambda cid: float(ldl_scores[cid]))
    final_labels[sidd_id] = 'SIDD'  # Keep code name for API compatibility
    available_clusters.remove(sidd_id)
    
    if not available_clusters:
        return final_labels

    # 3. Identify MOD: Highest BMI of the remaining
    mod_scores: dict[int, float] = {}
    for cid in available_clusters:
        mod_scores[cid] = float(centers_df.iloc[cid].get('bmi', 0.0))
        
    mod_id = max(mod_scores, key=lambda cid: mod_scores[cid])
    final_labels[mod_id] = 'MOD'
    available_clusters.remove(mod_id)
    
    if not available_clusters:
        return final_labels

    # 4. Identify MARD: The last one
    mard_id = available_clusters[0]
    final_labels[mard_id] = 'MARD'
    
    return final_labels


def create_cluster_profiles(
    df: pd.DataFrame,
    cluster_labels: IntArray,
    features: Sequence[str],
    label_map: Mapping[int, str],
) -> dict[str, dict[str, Any]]:
    """Create detailed cluster profiles with statistics."""
    df = df.copy()
    df['cluster_id'] = cluster_labels
    label_lookup = {int(cid): lbl for cid, lbl in label_map.items()}
    df['cluster_label'] = cast(Any, df['cluster_id']).map(cast(Any, label_lookup))
    
    profiles: dict[str, dict[str, Any]] = {}
    for cid, label in label_map.items():
        cluster_data = df[df['cluster_id'] == cid]
        means: dict[str, float] = {}
        medians: dict[str, float] = {}
        profile: dict[str, Any] = {
            'label': label,
            'count': int(len(cluster_data)),
            'percentage': round(len(cluster_data) / len(df) * 100, 1),
            'means': means,
            'medians': medians,
            'info': AHLQVIST_SUBTYPES.get(label, {})
        }
        
        for feat in features:
            if feat in cluster_data.columns:
                feature_series = cast(Any, cluster_data[feat])
                means[feat] = round(float(feature_series.mean()), 2)
                medians[feat] = round(float(feature_series.median()), 2)
        
        profiles[label] = profile
    
    return profiles


def plot_k_optimization(k_results: Sequence[Mapping[str, Any]], selected_k: int, output_path: str | Any):
    """Create K-sensitivity plots without implying that serving K is optimal."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    k_vals = [r['k'] for r in k_results]
    wcss_vals = [r['wcss'] for r in k_results]
    sil_vals = [r['silhouette'] for r in k_results]
    
    # Elbow plot
    ax1.plot(k_vals, wcss_vals, 'bo-', markersize=10, linewidth=2)
    ax1.axvline(x=selected_k, color='r', linestyle='--', linewidth=2, label=f'Serving design K={selected_k}')
    ax1.set_xlabel('Number of Clusters (K)', fontsize=12)
    ax1.set_ylabel('Within-Cluster Sum of Squares (WCSS)', fontsize=12)
    ax1.set_title('K Sensitivity: Weighted Inertia', fontsize=14)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_xticks(k_vals)
    
    # Silhouette plot
    colors = ['red' if k == selected_k else 'green' for k in k_vals]
    bars = ax2.bar(k_vals, sil_vals, color=colors, edgecolor='black')
    ax2.axhline(y=sil_vals[selected_k-2], color='red', linestyle='--', alpha=0.5)
    ax2.set_xlabel('Number of Clusters (K)', fontsize=12)
    ax2.set_ylabel('Silhouette Score', fontsize=12)
    ax2.set_title('K Sensitivity: Silhouette', fontsize=14)
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


def plot_cluster_heatmap(
    profiles: Mapping[str, Mapping[str, Any]],
    features: Sequence[str],
    output_path: str | Any,
):
    """Color feature-wise standardized centroids and annotate raw-unit centers."""
    # Build matrix of mean values
    labels: list[str] = list(profiles.keys())
    data: list[list[float]] = []
    for label in labels:
        means = cast(dict[str, float], profiles[label].get('means', {}))
        row = [float(means.get(f, 0.0)) for f in features]
        data.append(row)
    
    display_labels = [PROFILE_DISPLAY_LABELS.get(label, label) for label in labels]
    df_raw = pd.DataFrame(
        cast(Any, data),
        index=cast(Any, display_labels),
        columns=cast(Any, list(features)),
    )
    feature_sd = df_raw.std(axis=0, ddof=0).replace(0.0, 1.0)
    df_standardized = (df_raw - df_raw.mean(axis=0)) / feature_sd
    raw_annotations = df_raw.round(1).astype(str)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.heatmap(
        df_standardized,
        annot=raw_annotations,
        fmt='',
        center=0,
        cmap='RdBu_r',
        ax=ax,
        cbar_kws={'label': 'Centroid deviation (SD from four-centroid mean)'},
    )
    ax.set_title('Operational-Positive Metabolic-Profile Centroids', fontsize=14)
    ax.set_xlabel('Feature (annotations are raw clinical units)', fontsize=12)
    ax.set_ylabel('Descriptive profile', fontsize=12)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   Heatmap saved to {output_path}")


def plot_cluster_scatter(
    X_scaled: FloatArray,
    cluster_labels: IntArray,
    label_map: Mapping[int, str],
    output_path: str | Any,
):
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
        legacy_label = label_map.get(cid, f'Cluster-{cid}')
        display_label = PROFILE_DISPLAY_LABELS.get(legacy_label, legacy_label).replace("\n", " ")
        color = colors.get(legacy_label, '#3498db')
        ax.scatter(X_pca[mask, 0], X_pca[mask, 1],
                  c=color, label=display_label, alpha=0.6, s=50)
    
    ax.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)', fontsize=12)
    ax.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)', fontsize=12)
    ax.set_title('Operational-Positive Metabolic Profiles (PCA Projection)', fontsize=14)
    ax.legend(title='Descriptive profile')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   PCA scatter saved to {output_path}")


def plot_cluster_distribution(profiles: Mapping[str, Mapping[str, Any]], output_path: str | Any):
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
    display_labels = [PROFILE_DISPLAY_LABELS.get(label, label) for label in labels]
    bars = ax.bar(display_labels, counts, color=bar_colors, edgecolor='black')
    
    ax.set_xlabel('Descriptive centroid profile', fontsize=12)
    ax.set_ylabel('Operational-label-positive records', fontsize=12)
    ax.set_title('Profile Distribution in the Operational No-Period Cohort', fontsize=14)
    ax.set_ylim(0, max(counts) * 1.22)
    
    # Add count and percentage labels
    for bar, count, pct in zip(bars, counts, percentages):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
                f'{count}\n({pct:.1f}%)', ha='center', va='bottom', fontsize=11)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   Distribution chart saved to {output_path}")


def main(k: int = 4):
    """Main clustering pipeline."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print(f"DIANA Weighted Metabolic-Profile Clustering (K={k})")
    print("Legacy Ahlqvist-inspired aliases retained for API compatibility")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total records: {len(df)}")
    
    # Determine which features to use
    available_features = [f for f in ALL_FEATURES if f in df.columns]
    print(f"   Available features: {available_features}")

    # Align with active binary_v2_no_bp subtype methodology:
    # fit subtype clustering on At-Risk population only (pre-diabetic + diabetic).
    if 'diabetes_label' not in df.columns:
        raise ValueError("Missing required column 'diabetes_label' for at-risk-only subtype clustering.")
    at_risk_mask = df['diabetes_label'] >= 1
    df_at_risk = df.loc[at_risk_mask].copy()
    print(f"   At-risk records (diabetes_label >= 1): {len(df_at_risk)} / {len(df)}")
    
    # Prepare data on at-risk subset.
    # Previously, dropna() was called before imputation, which biased the median
    # towards the healthy, complete-case population. Now we impute first.
    X_at_risk = df_at_risk[available_features].values
    print(f"   At-risk total records: {len(X_at_risk)}")

    # Fit imputer on ALL at-risk records to properly capture population medians.
    # This prevents inference bias when new patients have missing values.
    imputer = SimpleImputer(strategy='median')
    X_imputed = imputer.fit_transform(X_at_risk)

    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # We use the full imputed at-risk dataset for clustering and profiling
    df_clean = df_at_risk.copy()
    df_clean[available_features] = X_imputed
    X = X_imputed

    # Build ordered expert feature weight vector (post-standardization distance metric).
    feature_weights = build_feature_weight_vector(available_features)
    
    # =============================================
    # K RANGE ANALYSIS (for thesis documentation)
    # =============================================
    print("\n" + "=" * 60)
    print("K RANGE ANALYSIS (K=2 to K=6)")
    print("=" * 60)
    
    k_results = analyze_k_range(X_scaled, feature_weights=feature_weights, k_range=(2, 7))
    
    # Find optimal by silhouette
    best_sil_idx = max(range(len(k_results)), key=lambda i: k_results[i]['silhouette'])
    best_sil_k = k_results[best_sil_idx]['k']
    print(f"\n[RESULT] Optimal K by silhouette: {best_sil_k} (score: {k_results[best_sil_idx]['silhouette']:.4f})")
    
    if best_sil_k != k:
        print(
            f"[NOTE] Using theory-informed serving K={k}; it is not the silhouette leader "
            f"(silhouette: {k_results[k-2]['silhouette']:.4f})"
        )
    
    # =============================================
    # FINAL CLUSTERING WITH SELECTED K
    # =============================================
    print("\n" + "=" * 60)
    print(f"FINAL CLUSTERING (K={k})")
    print("=" * 60)
    
    kmeans = WeightedKMeans(
        n_clusters=k,
        weights=feature_weights,
        random_state=42,
        n_init=10,
    )
    cluster_labels = kmeans.fit(X_scaled).labels_
    if cluster_labels is None:
        raise RuntimeError("WeightedKMeans returned no labels for final clustering.")
    
    X_metric = X_scaled * np.sqrt(np.asarray(feature_weights, dtype=float))
    final_silhouette = silhouette_score(X_metric, cluster_labels)
    final_dbi = davies_bouldin_score(X_metric, cluster_labels)
    final_chi = calinski_harabasz_score(X_metric, cluster_labels)
    print(f"   Silhouette Score: {final_silhouette:.4f}")
    print(f"   Davies-Bouldin Index: {final_dbi:.4f}")
    print(f"   Calinski-Harabasz Index: {final_chi:.4f}")
    
    # Assign Ahlqvist subtype labels using raw (inverse-transformed) centroids.
    # Weighted K-Means fitting remains on standardized data.
    if kmeans.cluster_centers_ is None:
        raise RuntimeError("WeightedKMeans returned no cluster centers for label assignment.")
    raw_cluster_centers = scaler.inverse_transform(kmeans.cluster_centers_)
    label_map = assign_ahlqvist_labels(raw_cluster_centers, available_features, k)
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
              f"HDL={profile['means'].get('hdl', 'N/A')}, "
              f"TG={profile['means'].get('triglycerides', 'N/A')}")
    
    # =============================================
    # SAVE ARTIFACTS
    # =============================================
    print("\n" + "=" * 60)
    print("SAVING ARTIFACTS")
    print("=" * 60)
    
    # Save models and preprocessing artifacts
    joblib.dump(kmeans, MODELS_DIR / "weighted_kmeans_model.joblib")
    joblib.dump(scaler, MODELS_DIR / "cluster_scaler.joblib")
    joblib.dump(imputer, MODELS_DIR / "cluster_imputer.joblib")
    print("   Saved weighted_kmeans_model.joblib, cluster_scaler.joblib, and cluster_imputer.joblib")

    # Save feature weights metadata
    weights_payload = {
        "method": "expert-elicited weighted euclidean distance after standardization",
        "feature_order": available_features,
        "weights": {feature: float(EXPERT_FEATURE_WEIGHTS[feature]) for feature in available_features},
        "weight_vector": [float(w) for w in feature_weights],
        "k": int(k),
    }
    with open(MODELS_DIR / "feature_weights.json", 'w') as f:
        json.dump(weights_payload, f, indent=2)
    print("   Saved feature_weights.json")
    
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
        "methodology": "Weighted K-Means metabolic-profile clustering with post-hoc legacy aliases",
         "features_used": available_features,
         "feature_weights": {feature: float(EXPERT_FEATURE_WEIGHTS[feature]) for feature in available_features},
         "n_samples": len(X),
        "k_selected": k,
        "k_optimal_by_silhouette": best_sil_k,
        "silhouette_score": round(final_silhouette, 4),
        "davies_bouldin_index": round(final_dbi, 4),
        "calinski_harabasz_index": round(final_chi, 4),
        "k_range_analysis": [
            {"k": r['k'], "silhouette": r['silhouette'], "dbi": r['dbi'], "chi": r['chi'], "wcss": r['wcss']}
            for r in k_results
        ],
        "cluster_profiles": profiles,
        "note": f"K={k} is a theory-informed serving design; it is not uniquely optimal. "
                f"Silhouette analysis suggested the coarser K={best_sil_k}. "
                "No menopause-specific or biological-subtype claim is supported."
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
