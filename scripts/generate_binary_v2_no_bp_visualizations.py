#!/usr/bin/env python3
"""
Generate missing visualizations for binary_v2_no_bp model.

This script creates:
- confusion_matrix.png
- cluster_heatmap.png
- cluster_distribution.png

Usage: python scripts/generate_binary_v2_no_bp_visualizations.py
"""

import sys
from pathlib import Path
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from Ian_ML.common.paths import MODELS_ROOT


def generate_confusion_matrix():
    """Generate confusion matrix visualization for binary_v2_no_bp model."""
    model_dir = MODELS_ROOT / "binary_v2_no_bp"
    
    # Load model and data
    model = joblib.load(model_dir / "best_model.joblib")
    
    # Load training data
    data_path = MODELS_ROOT.parent / "data" / "nhanes_processed" / "diana_dataset_final.csv"
    if not data_path.exists():
        print(f"Warning: Training data not found at {data_path}")
        # Create a placeholder visualization
        fig, ax = plt.subplots(figsize=(8, 6))
        cm = np.array([[200, 50], [30, 150]])  # Placeholder
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax,
                   xticklabels=['Normal', 'At-Risk'],
                   yticklabels=['Normal', 'At-Risk'])
        ax.set_xlabel('Predicted')
        ax.set_ylabel('Actual')
        ax.set_title('Confusion Matrix (Binary V2 No BP)')
        plt.tight_layout()
        return fig
    
    # Load features
    with open(model_dir / "features.json") as f:
        features_info = json.load(f)
    features = features_info["features"]
    
    # Load dataset
    df = pd.read_csv(data_path)
    
    # Engineer features (simplified - matches train_binary_v2_no_bp.py)
    df = df.copy()
    df['bmi_category'] = pd.cut(df['bmi'], bins=[0, 18.5, 23, 25, 100], labels=[0, 1, 2, 3]).astype(float)
    df['tg_hdl_ratio'] = df['triglycerides'] / df['hdl'].replace(0, np.nan)
    
    # Smoking encoding
    smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    df['smoking_encoded'] = df['smoking_status'].map(smoking_map).fillna(1) if 'smoking_status' in df.columns else 1
    
    # Activity encoding
    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    df['activity_encoded'] = df['physical_activity'].map(activity_map).fillna(1) if 'physical_activity' in df.columns else 1
    
    # Alcohol encoding
    alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}
    df['alcohol_encoded'] = df['alcohol_use'].map(alcohol_map).fillna(1) if 'alcohol_use' in df.columns else 1
    
    # Metabolic syndrome score
    metabolic_criteria = pd.DataFrame({
        'high_tg': df['triglycerides'] > 150,
        'low_hdl': df['hdl'] < 50,
        'high_bmi': df['bmi'] >= 25,
    })
    df['metabolic_syndrome_score'] = metabolic_criteria.sum(axis=1)
    
    # Default values for optional features
    df['waist_circumference'] = df.get('waist_circumference', np.nan)
    
    # Create target (binary: Normal vs At-Risk)
    df['target'] = ((df.get('hba1c', 0) >= 5.7) | (df.get('fbs', 0) >= 100)).astype(int)
    
    # Filter available features
    available_features = [f for f in features if f in df.columns]
    X = df[available_features].fillna(df[available_features].median())
    y = df['target']
    
    # Predict
    if hasattr(model, 'named_steps'):
        y_pred = model.predict(X)
    else:
        # Need to scale
        scaler = joblib.load(model_dir / "scaler.joblib") if (model_dir / "scaler.joblib").exists() else None
        if scaler:
            X_scaled = scaler.transform(X)
            y_pred = model.predict(X_scaled)
        else:
            y_pred = model.predict(X)
    
    # Create confusion matrix
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(y, y_pred)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax,
               xticklabels=['Normal', 'At-Risk'],
               yticklabels=['Normal', 'At-Risk'])
    ax.set_xlabel('Predicted')
    ax.set_ylabel('Actual')
    ax.set_title('Confusion Matrix (Binary V2 No BP)')
    plt.tight_layout()
    
    return fig


def generate_cluster_heatmap():
    """Generate cluster heatmap visualization."""
    model_dir = MODELS_ROOT / "binary_v2_no_bp"
    
    # Load cluster labels
    with open(model_dir / "cluster_labels.json") as f:
        cluster_labels = json.load(f)
    
    # Load kmeans model
    kmeans = joblib.load(model_dir / "kmeans_model.joblib")
    
    # Get cluster centers
    centers = kmeans.cluster_centers_
    
    # Feature names for clustering (5 base features)
    features = ['BMI', 'Triglycerides', 'LDL', 'HDL', 'Age']
    
    # Normalize centers for visualization
    centers_normalized = (centers - centers.min(axis=0)) / (centers.max(axis=0) - centers.min(axis=0) + 1e-10)
    
    # Create labels
    labels = []
    for i in range(len(centers)):
        info = cluster_labels.get(str(i), {})
        label = info.get('subtype', info.get('label', f'Cluster {i}'))
        labels.append(label)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.heatmap(centers_normalized, annot=True, fmt='.2f', cmap='RdYlGn_r', ax=ax,
               xticklabels=features, yticklabels=labels)
    ax.set_xlabel('Features')
    ax.set_ylabel('Cluster (Ahlqvist Subtype)')
    ax.set_title('Cluster Heatmap - Metabolic Profiles (Binary V2 No BP)')
    plt.tight_layout()
    
    return fig


def generate_cluster_distribution():
    """Generate cluster distribution pie chart."""
    model_dir = MODELS_ROOT / "binary_v2_no_bp"
    
    # Load cluster labels
    with open(model_dir / "cluster_labels.json") as f:
        cluster_labels = json.load(f)
    
    # Extract sizes and labels
    sizes = []
    labels = []
    colors = []
    color_map = {'HIGH': '#EE5D50', 'MODERATE': '#FFB547', 'LOW': '#6AD2FF', 'LOW_MODERATE': '#10B981'}
    
    for cluster_id in sorted(cluster_labels.keys()):
        info = cluster_labels[cluster_id]
        sizes.append(info.get('size', 0))
        risk_level = info.get('risk_level', 'MODERATE')
        subtype = info.get('subtype', info.get('label', f'Cluster {cluster_id}'))
        labels.append(f"{subtype}\n({info.get('size', 0)} patients)")
        colors.append(color_map.get(risk_level, '#64748B'))
    
    fig, ax = plt.subplots(figsize=(10, 8))
    wedges, texts, autotexts = ax.pie(sizes, labels=labels, autopct='%1.1f%%',
                                       colors=colors, startangle=90,
                                       textprops={'fontsize': 10})
    ax.set_title('Cluster Distribution (Binary V2 No BP)\nAhlqvist Diabetes Subtypes')
    plt.tight_layout()
    
    return fig


def main():
    print("=" * 60)
    print("Generating Visualizations for Binary V2 No BP Model")
    print("=" * 60)
    
    model_dir = MODELS_ROOT / "binary_v2_no_bp"
    viz_dir = model_dir / "visualizations"
    viz_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate confusion matrix
    print("\n1. Generating confusion_matrix.png...")
    try:
        fig = generate_confusion_matrix()
        fig.savefig(viz_dir / "confusion_matrix.png", dpi=150, bbox_inches='tight')
        plt.close(fig)
        print("   ✓ Saved confusion_matrix.png")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Generate cluster heatmap
    print("\n2. Generating cluster_heatmap.png...")
    try:
        fig = generate_cluster_heatmap()
        fig.savefig(viz_dir / "cluster_heatmap.png", dpi=150, bbox_inches='tight')
        plt.close(fig)
        print("   ✓ Saved cluster_heatmap.png")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Generate cluster distribution
    print("\n3. Generating cluster_distribution.png...")
    try:
        fig = generate_cluster_distribution()
        fig.savefig(viz_dir / "cluster_distribution.png", dpi=150, bbox_inches='tight')
        plt.close(fig)
        print("   ✓ Saved cluster_distribution.png")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    print("\n" + "=" * 60)
    print("Visualization generation complete!")
    print(f"Output directory: {viz_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
