#!/usr/bin/env python3
"""
Retrain Clinical V2 K-Means clustering using the 13-feature contract.

This script reuses the existing clinical_v2 imputer + scaler so the
K-Means model aligns with runtime inference features.

Usage:
    python scripts/train/retrain_clinical_v2_kmeans.py
"""

from pathlib import Path
import sys

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from Ian_ML.common.paths import CLINICAL_V2_MODELS_DIR, NHANES_PROCESSED_ROOT
from Ian_ML.training.train_v2 import (
    REDUCED_FEATURES,
    TARGET,
    engineer_features_reduced,
    train_serving_kmeans,
)


def main() -> None:
    models_dir = CLINICAL_V2_MODELS_DIR
    imputer_path = models_dir / "imputer.joblib"
    scaler_path = models_dir / "scaler.joblib"

    if not imputer_path.exists() or not scaler_path.exists():
        raise FileNotFoundError(
            "Clinical v2 imputer/scaler not found. Run train_v2.py first."
        )

    imputer = joblib.load(imputer_path)
    scaler = joblib.load(scaler_path)

    data_path = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
    df = pd.read_csv(data_path)
    df = engineer_features_reduced(df)

    missing_cols = [
        f for f in REDUCED_FEATURES + [TARGET] if f not in df.columns
    ]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    df_clean = df.dropna(subset=[TARGET]).copy()
    X = df_clean[REDUCED_FEATURES].values.astype(float)
    y = df_clean[TARGET].values.astype(int)

    X_imputed = imputer.transform(X)
    X_scaled = scaler.transform(X_imputed)

    cluster_analysis = train_serving_kmeans(X_scaled, y, REDUCED_FEATURES)

    joblib.dump(scaler, models_dir / "cluster_scaler.joblib")

    print("[OK] Clinical v2 clustering retrained.")
    print(f"[OK] Saved kmeans_model.joblib to {models_dir}")
    print(f"[OK] Saved cluster_scaler.joblib to {models_dir}")
    print(
        f"[OK] Cluster labels: {len(cluster_analysis.get('cluster_labels', {}))}"
    )


if __name__ == "__main__":
    main()
