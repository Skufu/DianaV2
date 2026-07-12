import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_samples, silhouette_score
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Constants
CLUSTER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
DATA_PATH = PROJECT_ROOT / "data/nhanes/processed/diana_dataset_final.csv"
MODELS_DIR = PROJECT_ROOT / "models/binary_v2_no_bp"
RESULTS_DIR = MODELS_DIR / "results"

def generate_visual_proof():
    print("[1] Loading cohort data and models...")
    df = pd.read_csv(DATA_PATH)
    
    # Filter to at-risk patients
    df_clean = df.dropna(subset=["cycle"]).copy()
    df_clean["at_risk"] = (df_clean["diabetes_label"] >= 1).astype(int)
    at_risk_df = df_clean[df_clean["at_risk"] == 1].copy()
    
    # Extract feature matrix and clean NaNs
    X = at_risk_df[CLUSTER_FEATURES].dropna()
    
    # Load model and scaler
    kmeans = joblib.load(MODELS_DIR / "weighted_kmeans_model.joblib")
    scaler = joblib.load(MODELS_DIR / "cluster_scaler.joblib")
    imputer = joblib.load(MODELS_DIR / "cluster_imputer.joblib")
    
    # Preprocess
    X_imputed = imputer.transform(X.values)
    X_scaled = scaler.transform(X_imputed)
    labels = kmeans.predict(X_scaled)
    
    # Load labels mapping for clean legend naming
    with open(MODELS_DIR / "cluster_labels.json") as f:
        labels_json = json.load(f)
    label_map = {int(k): f"C{k} ({v['label']}-like)" for k, v in labels_json.items()}
    mapped_labels = [label_map[l] for l in labels]
    
    # Setup plot grid
    fig, axes = plt.subplots(1, 3, figsize=(20, 6))
    
    # ----------------------------------------------------
    # PANEL A: PCA 2D Scatter Plot with Decision Regions
    # ----------------------------------------------------
    print("[2] Computing PCA decision regions...")
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    centroids_pca = pca.transform(kmeans.cluster_centers_)
    
    # Create meshgrid to plot decision boundary in PCA space
    x_min, x_max = X_pca[:, 0].min() - 1, X_pca[:, 0].max() + 1
    y_min, y_max = X_pca[:, 1].min() - 1, X_pca[:, 1].max() + 1
    xx, yy = np.meshgrid(np.arange(x_min, x_max, 0.05), np.arange(y_min, y_max, 0.05))
    
    # We must predict in the high-dimensional space. To do that, we reconstruct from PCA space.
    mesh_points_2d = np.c_[xx.ravel(), yy.ravel()]
    mesh_points_high_dim = pca.inverse_transform(mesh_points_2d)
    mesh_labels = kmeans.predict(mesh_points_high_dim)
    mesh_labels = mesh_labels.reshape(xx.shape)
    
    # Plot decision boundaries
    axes[0].contourf(xx, yy, mesh_labels, alpha=0.15, cmap='coolwarm')
    
    # Plot scatter
    scatter_df = pd.DataFrame({
        'PC1': X_pca[:, 0],
        'PC2': X_pca[:, 1],
        'Subtype': mapped_labels
    })
    
    colors = {}
    for k, v in labels_json.items():
        lbl = f"C{k} ({v['label']}-like)"
        sub = v['label']
        if sub == 'SIRD':
            colors[lbl] = '#ff7f0e'
        elif sub == 'SIDD':
            colors[lbl] = '#ffbb78'
        elif sub == 'MOD':
            colors[lbl] = '#1f77b4'
        else:
            colors[lbl] = '#aec7e8'
    sns.scatterplot(
        data=scatter_df, x='PC1', y='PC2', hue='Subtype', 
        palette=colors, alpha=0.75, ax=axes[0], s=40, edgecolor='none'
    )
    
    # Mark centroids
    for idx, (cx, cy) in enumerate(centroids_pca):
        lbl = label_map[idx]
        axes[0].scatter(cx, cy, marker='*', s=350, color=colors[lbl], edgecolor='black', linewidth=1.5, label=f'{lbl} Centroid')
        
    axes[0].set_title("A. Unsupervised Voronoi Regions (PCA Space)\n(Geometric partitioning based on distance only)", fontsize=12, fontweight='bold')
    axes[0].set_xlabel(f"Principal Component 1 ({pca.explained_variance_ratio_[0]:.1%} var)")
    axes[0].set_ylabel(f"Principal Component 2 ({pca.explained_variance_ratio_[1]:.1%} var)")
    axes[0].legend(loc='upper right', bbox_to_anchor=(1.0, 1.0), fontsize=9)
    axes[0].grid(True, alpha=0.2)
    
    # ----------------------------------------------------
    # PANEL B: Pairwise Biomarkers (No Hard Box Cutoffs)
    # ----------------------------------------------------
    print("[3] Generating pairwise scatter plot...")
    # Plotting BMI vs Triglycerides
    plot_df = pd.DataFrame({
        'BMI': X['bmi'],
        'Triglycerides': X['triglycerides'],
        'Subtype': mapped_labels
    })
    
    sns.scatterplot(
        data=plot_df, x='BMI', y='Triglycerides', hue='Subtype',
        palette=colors, alpha=0.75, ax=axes[1], s=40, edgecolor='none'
    )
    
    axes[1].set_title("B. Biomarker Distribution (BMI vs Triglycerides)\n(Note the overlapping/diagonal boundaries - no box rules)", fontsize=12, fontweight='bold')
    axes[1].set_xlabel("Body Mass Index (BMI, kg/m²)")
    axes[1].set_ylabel("Triglycerides (mg/dL)")
    axes[1].set_yscale('log')  # Triglycerides are skewed, log scale helps visual structure
    axes[1].legend(title='Subtype', fontsize=9)
    axes[1].grid(True, alpha=0.2)
    
    # ----------------------------------------------------
    # PANEL C: Silhouette Quality Analysis
    # ----------------------------------------------------
    print("[4] Generating Silhouette analysis plot...")
    sample_silhouette_values = silhouette_samples(X_scaled, labels)
    overall_silhouette_score = silhouette_score(X_scaled, labels)
    
    y_lower = 10
    for idx in range(kmeans.n_clusters):
        lbl = label_map[idx]
        ith_cluster_silhouette_values = sample_silhouette_values[labels == idx]
        ith_cluster_silhouette_values.sort()
        
        size_cluster_i = ith_cluster_silhouette_values.shape[0]
        y_upper = y_lower + size_cluster_i
        
        color = colors[lbl]
        axes[2].fill_betweenx(
            np.arange(y_lower, y_upper),
            0, ith_cluster_silhouette_values,
            facecolor=color, edgecolor=color, alpha=0.7
        )
        
        axes[2].text(-0.05, y_lower + 0.5 * size_cluster_i, lbl)
        y_lower = y_upper + 10  # 10 for the gaps
        
    axes[2].set_title(f"C. Silhouette Mathematical Cohesion (K=4)\n(Overall Avg Score = {overall_silhouette_score:.4f})", fontsize=12, fontweight='bold')
    axes[2].set_xlabel("Silhouette Coefficient Value")
    axes[2].set_ylabel("Cluster/Patient Sorted index")
    axes[2].axvline(x=overall_silhouette_score, color="red", linestyle="--", label='Avg Silhouette')
    axes[2].legend(loc='lower right', fontsize=9)
    axes[2].set_yticks([])  # Clear the y-axis labels
    axes[2].set_xlim([-0.1, 1.0])
    axes[2].grid(True, alpha=0.2)
    
    plt.tight_layout()
    plot_out = RESULTS_DIR / "clustering_mathematical_proofs.png"
    plt.savefig(plot_out, dpi=180)
    print(f"[SUCCESS] Saved multi-panel proof to: {plot_out}")

if __name__ == "__main__":
    generate_proof = True
    try:
        generate_visual_proof()
    except Exception as e:
        print(f"Error generating visual proof: {e}")
        import traceback
        traceback.print_exc()
