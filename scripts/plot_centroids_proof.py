import os
import sys
import joblib
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Constants
CLUSTER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
MODELS_DIR = PROJECT_ROOT / "models/binary_v2_no_bp"
RESULTS_DIR = MODELS_DIR / "results"
OUTPUT_DIR = PROJECT_ROOT / "docs/07-research/analysis"

def main():
    print("=" * 70)
    print("GENERATING CLUSTERING PROOF VISUALIZATION")
    print("=" * 70)
    
    # 1. Load trained model artifacts
    kmeans_path = MODELS_DIR / "weighted_kmeans_model.joblib"
    scaler_path = MODELS_DIR / "cluster_scaler.joblib"
    cluster_labels_path = MODELS_DIR / "cluster_labels.json"
    
    if not kmeans_path.exists() or not scaler_path.exists():
        print("ERROR: Model artifacts not found!")
        sys.exit(1)
        
    kmeans = joblib.load(kmeans_path)
    scaler = joblib.load(scaler_path)
    
    # Load mapped labels if available for legend reference
    label_map = {}
    if cluster_labels_path.exists():
        with open(cluster_labels_path) as f:
            c_info = json.load(f)
            label_map = {int(k): v["label"] for k, v in c_info.items()}
    
    # 2. Extract Standardized & Clinical Centroids
    std_centers = kmeans.cluster_centers_
    clinical_centers = scaler.inverse_transform(std_centers)
    
    n_clusters = kmeans.n_clusters
    print(f"Loaded model with K={n_clusters} clusters.")
    
    # Create DataFrames
    df_std = pd.DataFrame(std_centers, columns=CLUSTER_FEATURES, index=[f"C{i}" for i in range(n_clusters)])
    df_clinical = pd.DataFrame(clinical_centers, columns=CLUSTER_FEATURES, index=[f"C{i}" for i in range(n_clusters)])
    
    print("\nStandardized Centroids (Z-Scores):")
    print(df_std.round(4))
    
    print("\nClinical Centroids (Raw Units):")
    print(df_clinical.round(2))
    
    # 3. Plotting
    sns.set_theme(style="whitegrid")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
    
    # A. Heatmap of Standardized Centroids (Z-Scores)
    # Highlight feature deviation from mean
    sns.heatmap(
        df_std, 
        annot=df_clinical.round(1), # Annotate with clinical raw values for clarity!
        fmt='', 
        cmap="RdBu_r", 
        center=0, 
        cbar_kws={'label': 'Standardized Deviation (Z-score)'},
        ax=ax1,
        annot_kws={"size": 11, "weight": "bold"}
    )
    
    # Add mapping descriptions in y-labels if available
    y_labels = []
    for i in range(n_clusters):
        lbl = label_map.get(i, "Unknown")
        y_labels.append(f"Centroid C{i}\n({lbl}-like)")
    ax1.set_yticklabels(y_labels, rotation=0, fontsize=11, fontweight='bold')
    ax1.set_xticklabels([f.upper() for f in CLUSTER_FEATURES], rotation=30, ha='right', fontsize=11)
    ax1.set_title("Standardized Centroids Heatmap\n(Annotations show raw clinical units)", fontsize=13, fontweight='bold', pad=15)
    
    # B. Grouped Bar Chart of Standardized Deviations
    df_std_melted = df_std.reset_index().rename(columns={'index': 'Centroid'}).melt(
        id_vars='Centroid', 
        var_name='Feature', 
        value_name='Z-score'
    )
    
    # Beautiful vibrant custom palette
    palette = {
        'C0': '#ff7f0e', # Orange
        'C1': '#ffbb78', # Light orange
        'C2': '#1f77b4', # Blue
        'C3': '#aec7e8'  # Light blue
    }
    
    # Map the actual colors based on mapping for academic paper consistency
    colors_by_centroid = {}
    for i in range(n_clusters):
        lbl = label_map.get(i, "")
        if lbl == 'SIRD':
            colors_by_centroid[f"C{i}"] = '#e74c3c' # Red
        elif lbl == 'SIDD':
            colors_by_centroid[f"C{i}"] = '#c0392b' # Dark Red
        elif lbl == 'MOD':
            colors_by_centroid[f"C{i}"] = '#f39c12'  # Orange
        elif lbl == 'MARD':
            colors_by_centroid[f"C{i}"] = '#27ae60' # Green
        else:
            colors_by_centroid[f"C{i}"] = sns.color_palette("Set2")[i]
            
    sns.barplot(
        x='Feature', 
        y='Z-score', 
        hue='Centroid', 
        data=df_std_melted, 
        palette=colors_by_centroid,
        edgecolor='black',
        ax=ax2
    )
    
    ax2.axhline(0, color='black', linewidth=0.8, linestyle='--')
    ax2.set_xlabel('Clinical Biomarkers', fontsize=12, fontweight='bold')
    ax2.set_ylabel('Deviation from Mean (Z-score)', fontsize=12, fontweight='bold')
    ax2.set_xticks(np.arange(len(CLUSTER_FEATURES)))
    ax2.set_xticklabels([f.upper() for f in CLUSTER_FEATURES], rotation=30, ha='right', fontsize=11)
    
    # Set legend labels with mapped names
    legend_labels = []
    for i in range(n_clusters):
        lbl = label_map.get(i, "Unknown")
        legend_labels.append(f"C{i} ({lbl}-like)")
    
    handles, labels = ax2.get_legend_handles_labels()
    ax2.legend(handles, legend_labels, title="Centroids (Subtype mapping)", loc='upper right', fontsize=10, title_fontsize=11)
    ax2.set_title("Centroid Biomarker Profiles\n(Comparison of Standardized Deviations)", fontsize=13, fontweight='bold', pad=15)
    
    plt.suptitle("DIANA Cluster Centroids (C0 - C3) Proof of Clustering", fontsize=16, fontweight='bold', y=0.98)
    plt.tight_layout()
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "centroids_proof.png"
    plt.savefig(output_path, dpi=180, bbox_inches='tight')
    print(f"\nSaved proof of clustering chart to: {output_path}")
    print("=" * 70)

if __name__ == '__main__':
    main()
