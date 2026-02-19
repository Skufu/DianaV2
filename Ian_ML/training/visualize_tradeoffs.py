"""
DIANA Visualization Script
Generates Recall-Precision Trade-off and Decision Curves for Thesis Defense.
"""
from __future__ import annotations

import sys
from pathlib import Path
import json

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.metrics import recall_score, precision_score
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, CLINICAL_V2_MODELS_DIR

DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
OUTPUT_DIR = CLINICAL_V2_MODELS_DIR / "experiments" / "visualizations"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 13 Baseline Features
REDUCED_FEATURES = [
    "bmi",
    "triglycerides",
    "ldl",
    "hdl",
    "age",
    "systolic",
    "diastolic",
    "bmi_category",
    "tg_hdl_ratio",
    "smoking_encoded",
    "activity_encoded",
    "alcohol_encoded",
    "metabolic_syndrome_score",
]

def load_data():
    """Load and prepare data exactly as train_v2.py does."""
    df = pd.read_csv(DATA_PATH)
    
    # Feature Engineering (Minimal replication)
    df = df.copy()
    df["bmi_category"] = pd.cut(df["bmi"], bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]).astype(float)
    df["tg_hdl_ratio"] = df["triglycerides"] / df["hdl"].replace(0, np.nan)
    
    metabolic_criteria = pd.DataFrame({
        "high_tg": df["triglycerides"] > 150,
        "low_hdl": df["hdl"] < 50,
        "high_bp": df["systolic"] >= 130,
        "high_bmi": df["bmi"] >= 30,
    })
    df["metabolic_syndrome_score"] = metabolic_criteria.sum(axis=1)

    smoking_map = {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
    if "smoking_status" in df.columns:
        df["smoking_encoded"] = df["smoking_status"].map(smoking_map)

    activity_map = {"Sedentary": 0, "Moderate": 1, "Active": 2, "Unknown": 1}
    if "physical_activity" in df.columns:
        df["activity_encoded"] = df["physical_activity"].map(activity_map)

    alcohol_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
    if "alcohol_use" in df.columns:
        df["alcohol_encoded"] = df["alcohol_use"].map(alcohol_map)
    
    # Drop rows missing critical columns (Use correct cycle column)
    df = df.dropna(subset=REDUCED_FEATURES + ["diabetes_label", "cycle"])
    return df

def generate_visualizations():
    print("Loading data...")
    df = load_data()
    X = df[REDUCED_FEATURES].values
    y = df["diabetes_label"].values.astype(int)
    groups = df["cycle"].values
    
    print(f"Dataset: {len(df)} samples")
    
    # Pipeline
    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(max_iter=1500, class_weight="balanced", random_state=42, C=1.0))
    ])
    
    logo = LeaveOneGroupOut()
    y_pred_proba = np.zeros((len(y), 3))
    
    print("Running Leave-One-Group-Out CV...")
    for train_idx, test_idx in logo.split(X, y, groups=groups):
        X_train, y_train = X[train_idx], y[train_idx]
        X_test, y_test = X[test_idx], y[test_idx]
        pipeline.fit(X_train, y_train)
        y_pred_proba[test_idx] = pipeline.predict_proba(X_test)
        
    print("Generating trade-off data...")
    
    # At-Risk Probability (P1 + P2)
    at_risk_prob = y_pred_proba[:, 1] + y_pred_proba[:, 2]
    y_true_at_risk = np.isin(y, [1, 2]).astype(int)
    
    thresholds = np.linspace(0.05, 0.95, 19)
    metrics = []
    
    for t in thresholds:
        y_pred_bin = (at_risk_prob >= t).astype(int)
        sens = recall_score(y_true_at_risk, y_pred_bin)
        ppv = precision_score(y_true_at_risk, y_pred_bin, zero_division=0)
        # Specificity
        tn = np.sum((y_true_at_risk == 0) & (y_pred_bin == 0))
        fp = np.sum((y_true_at_risk == 0) & (y_pred_bin == 1))
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0
        
        metrics.append({
            "Threshold": t,
            "Sensitivity (Recall)": sens,
            "Precision (PPV)": ppv,
            "Specificity": spec
        })
        
    metrics_df = pd.DataFrame(metrics)
    
    # Plot 1: Recall vs Precision vs Specificity Trade-off
    plt.figure(figsize=(10, 6))
    plt.plot(metrics_df["Threshold"], metrics_df["Sensitivity (Recall)"], marker='o', label="Sensitivity (Recall)", linewidth=2)
    plt.plot(metrics_df["Threshold"], metrics_df["Precision (PPV)"], marker='s', label="Precision (PPV)", linewidth=2, linestyle='--')
    plt.plot(metrics_df["Threshold"], metrics_df["Specificity"], marker='^', label="Specificity", linewidth=2, linestyle=':')
    
    # Mark current operating point (0.35 approx)
    plt.axvline(x=0.35, color='red', alpha=0.5, linestyle='-.', label="Current Threshold (0.35)")
    
    plt.title("Constraint Trade-off Analysis: Threshold Selection")
    plt.xlabel("At-Risk Probability Threshold")
    plt.ylabel("Score")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.savefig(OUTPUT_DIR / "tradeoff_curves.png", dpi=300)
    print(f"Saved tradeoff plot to {OUTPUT_DIR / 'tradeoff_curves.png'}")
    
    # Save CSV for thesis tables
    metrics_df.to_csv(OUTPUT_DIR / "threshold_tradeoffs.csv", index=False)
    print(f"Saved metrics CSV to {OUTPUT_DIR / 'threshold_tradeoffs.csv'}")

if __name__ == "__main__":
    generate_visualizations()
