#!/usr/bin/env python3
"""
Retrain Clinical V2 K-Means clustering using the 5 clinical-feature contract.

This script trains KMeans on the same 5 base clinical biomarkers used by
train_clusters.py (bmi, triglycerides, ldl, hdl, age), NOT the 13 classifier
features. This avoids circular reasoning (no HbA1c/FBS) and keeps the
clustering model aligned with ClinicalPredictor's cluster inference path.

Usage:
    python scripts/train/retrain_clinical_v2_kmeans.py
"""

from pathlib import Path
import sys
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from Ian_ML.common.paths import CLINICAL_V2_MODELS_DIR, NHANES_PROCESSED_ROOT

# Must match train_clusters.py and predict.py CLUSTER_FEATURES exactly
CLUSTER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
K = 4  # Fixed per Ahlqvist methodology


def assign_cluster_labels(profiles):
    """Assign Ahlqvist-like labels using proxy metrics (no HbA1c)."""
    available_ids = list(profiles.index)
    labels = {}

    # 1. SIRD: Highest insulin resistance composite
    ir_scores = {
        cid: profiles.loc[cid, 'bmi'] + (profiles.loc[cid, 'triglycerides'] / 50) - (profiles.loc[cid, 'hdl'] / 10)
        for cid in available_ids
    }
    sird_id = max(ir_scores, key=ir_scores.get)
    labels[str(int(sird_id))] = {
        "label": "SIRD", "subtype": "SIRD",
        "subtype_full": "Severe Insulin-Resistant Diabetes",
        "risk_level": "HIGH", "risk_label": "High Risk",
        "description": "High BMI, high triglycerides, low HDL — insulin resistance pattern",
        "treatment_focus": "Weight management, insulin sensitizers (metformin), cardiovascular monitoring"
    }
    available_ids.remove(sird_id)

    # 2. SIDD: Highest TG/HDL ratio among remaining
    tg_hdl = {
        cid: profiles.loc[cid, 'triglycerides'] / max(profiles.loc[cid, 'hdl'], 1)
        for cid in available_ids
    }
    sidd_id = max(tg_hdl, key=tg_hdl.get)
    labels[str(int(sidd_id))] = {
        "label": "SIDD", "subtype": "SIDD",
        "subtype_full": "Severe Insulin-Deficient Diabetes",
        "risk_level": "HIGH", "risk_label": "High Risk",
        "description": "High TG/HDL ratio — metabolic derangement pattern",
        "treatment_focus": "Blood glucose monitoring, consider insulin therapy, monitor for complications"
    }
    available_ids.remove(sidd_id)

    # 3. MOD: Highest BMI among remaining
    mod_id = profiles.loc[available_ids, 'bmi'].idxmax()
    labels[str(int(mod_id))] = {
        "label": "MOD", "subtype": "MOD",
        "subtype_full": "Mild Obesity-Related Diabetes",
        "risk_level": "MODERATE", "risk_label": "Moderate Risk",
        "description": "Elevated BMI with moderate metabolic markers — obesity-driven pattern",
        "treatment_focus": "Weight loss (5-10%), healthy eating, moderate exercise, lipid monitoring"
    }
    available_ids.remove(mod_id)

    # 4. MARD: Remaining
    mard_id = available_ids[0]
    labels[str(int(mard_id))] = {
        "label": "MARD", "subtype": "MARD",
        "subtype_full": "Mild Age-Related Diabetes",
        "risk_level": "LOW", "risk_label": "Low Risk",
        "description": "Older age with mild metabolic values — age-related pattern",
        "treatment_focus": "Regular health checkups, lifestyle management, cardiovascular screening"
    }

    return labels


def main() -> None:
    models_dir = CLINICAL_V2_MODELS_DIR

    data_path = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
    df = pd.read_csv(data_path)

    # Use only the 5 cluster features
    X = df[CLUSTER_FEATURES].dropna()

    if len(X) < 50:
        raise ValueError(f"Insufficient data: {len(X)} rows (need 50+)")

    # Fit a dedicated cluster scaler on the 5 features
    cluster_scaler = StandardScaler()
    X_scaled = cluster_scaler.fit_transform(X)

    # Train K-Means with K=4
    kmeans = KMeans(n_clusters=K, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)

    # Profile and assign labels
    df_clustered = df.loc[X.index].copy()
    df_clustered['cluster'] = labels
    profiles = df_clustered.groupby('cluster')[CLUSTER_FEATURES].mean()
    cluster_labels = assign_cluster_labels(profiles)

    # Save artifacts
    joblib.dump(kmeans, models_dir / "kmeans_model.joblib")
    joblib.dump(cluster_scaler, models_dir / "cluster_scaler.joblib")

    with open(models_dir / "cluster_labels.json", 'w') as f:
        json.dump(cluster_labels, f, indent=2)

    print("[OK] Clinical v2 clustering retrained.")
    print(f"[OK] Saved kmeans_model.joblib to {models_dir}")
    print(f"[OK] Saved cluster_scaler.joblib to {models_dir}")
    print(f"[OK] Cluster labels: {len(cluster_labels)}")


if __name__ == "__main__":
    main()

