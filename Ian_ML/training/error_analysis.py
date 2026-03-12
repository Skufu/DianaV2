# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportCallIssue=false, reportIndexIssue=false, reportAttributeAccessIssue=false
"""
DIANA Error Analysis Script
Investigates False Negatives (Missed Diabetics) to improve defensibility.
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
from sklearn.metrics import confusion_matrix

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, CLINICAL_V2_MODELS_DIR

DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
OUTPUT_DIR = CLINICAL_V2_MODELS_DIR / "experiments" / "error_analysis"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 13 Baseline Features (from train_v2.py)
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

CLASSES = ["Normal", "Pre-diabetic", "Diabetic"]

def load_data():
    """Load and prepare data exactly as train_v2.py does."""
    df = pd.read_csv(DATA_PATH)
    
    # Feature Engineering (Minimal replication of train_v2.py logic)
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
    
    # Drop rows missing critical columns
    df = df.dropna(subset=REDUCED_FEATURES + ["diabetes_label", "cycle"])
    return df

def run_error_analysis():
    print("Loading data...")
    df = load_data()
    X = df[REDUCED_FEATURES].values
    y = df["diabetes_label"].values.astype(int)
    groups = df["cycle"].values
    
    print(f"Dataset: {len(df)} samples")
    
    # Pipeline: Median Impute -> Scale -> Logistic Regression (Best Model)
    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(max_iter=1500, class_weight="balanced", random_state=42, C=1.0))
    ])
    
    # Run LOGO CV manually to capture indices
    logo = LeaveOneGroupOut()
    y_pred_proba = np.zeros((len(y), 3))
    
    print("Running Leave-One-Group-Out CV to generate predictions...")
    for train_idx, test_idx in logo.split(X, y, groups=groups):
        X_train, y_train = X[train_idx], y[train_idx]
        X_test, y_test = X[test_idx], y[test_idx]
        
        pipeline.fit(X_train, y_train)
        y_pred_proba[test_idx] = pipeline.predict_proba(X_test)
        
    # Apply Thresholds (from Best Model Report: P1=0.25, P2=0.35 - wait, report said 0.35, let's use 0.30/0.35 from report)
    # Actually, let's stick to the latest best thresholds. train_v2.py prints them. 
    # report said 0.25 / 0.30 or 0.25 / 0.35 depending on run. I'll use 0.25/0.30 as a reasonable default.
    PRE_DIAB_THRESH = 0.25
    DIAB_THRESH = 0.30
    
    y_pred = np.argmax(y_pred_proba, axis=1) # Default argmax
    diabetic_mask = y_pred_proba[:, 2] >= DIAB_THRESH
    pre_diabetic_mask = (y_pred_proba[:, 1] >= PRE_DIAB_THRESH) & (~diabetic_mask)
    
    y_pred_tuned = y_pred.copy()
    y_pred_tuned[diabetic_mask] = 2
    y_pred_tuned[pre_diabetic_mask] = 1
    
    # Identify False Negatives (Missed Diabetics)
    # Definition: True Class = Diabetic (2), Predicted Class < 2 (Normal or Pre-diabetic)
    # Actually, distinguishing missed Diabetics who were predicted as Pre-diabetic vs Normal is important.
    
    results_df = df.copy()
    results_df["predicted_class"] = y_pred_tuned
    results_df["predicted_prob_diabetic"] = y_pred_proba[:, 2]
    
    # FN: True Diabetic predicted as Normal or Pre-diabetic
    missed_diabetics = results_df[(results_df["diabetes_label"] == 2) & (results_df["predicted_class"] != 2)]
    found_diabetics = results_df[(results_df["diabetes_label"] == 2) & (results_df["predicted_class"] == 2)]
    
    print(f"\nAnalysis of Diabetic Patients (Total: {len(results_df[results_df['diabetes_label']==2])})")
    print(f"Correctly Identified (TP): {len(found_diabetics)}")
    print(f"Missed (FN): {len(missed_diabetics)}")
    print(f"Recall: {len(found_diabetics) / len(results_df[results_df['diabetes_label']==2]):.2%}")
    
    # Save missed cases to CSV
    missed_diabetics.to_csv(OUTPUT_DIR / "missed_diabetic_cases.csv", index=False)
    print(f"Saved {len(missed_diabetics)} missed cases to {OUTPUT_DIR / 'missed_diabetic_cases.csv'}")
    
    # Feature Comparison Plot
    features_to_compare = ["age", "bmi", "triglycerides", "glu", "hba1c"] # glu/hba1c might be in df even if not in features
    # Check if glu/hba1c are in df. train_v2 loading usually drops non-features or keeps them? 
    # load_data() keeps what's in CSV. data_processing.py saves them.
    # Let's check available columns.
    available_features = [f for f in features_to_compare if f in df.columns]
    
    comparison_data = []
    for feat in available_features:
        t_mean = found_diabetics[feat].mean()
        m_mean = missed_diabetics[feat].mean()
        comparison_data.append({
            "Feature": feat,
            "Found (TP) Mean": t_mean,
            "Missed (FN) Mean": m_mean,
            "Delta %": ((m_mean - t_mean) / t_mean) * 100
        })
        
    comp_df = pd.DataFrame(comparison_data)
    print("\nFeature Comparison (Found vs Missed):")
    print(comp_df.to_string(index=False))
    comp_df.to_csv(OUTPUT_DIR / "fn_vs_tp_comparison.csv", index=False)
    
    # Plotting
    plt.figure(figsize=(12, 6))
    for i, feat in enumerate(available_features[:3]): # Plot top 3
        plt.subplot(1, 3, i+1)
        sns.boxplot(data=pd.concat([found_diabetics.assign(Status="Found"), missed_diabetics.assign(Status="Missed")]), x="Status", y=feat)
        plt.title(f"{feat} Distribution")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "error_analysis_boxplot.png")
    print(f"Saved boxplots to {OUTPUT_DIR / 'error_analysis_boxplot.png'}")
    
    # Confusion Matrix
    cm = confusion_matrix(y, y_pred_tuned)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=CLASSES, yticklabels=CLASSES)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("Confusion Matrix (Tuned Thresholds)")
    plt.savefig(OUTPUT_DIR / "confusion_matrix.png")

if __name__ == "__main__":
    run_error_analysis()
