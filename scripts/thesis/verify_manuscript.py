"""
DIANA Manuscript Verification Script
Run this script to get all the exact numbers for your thesis.
"""

import pandas as pd
import json
from pathlib import Path

print("="*60)
print("DIANA MANUSCRIPT VERIFICATION")
print("="*60)

# Paths
MODELS_DIR = Path("models/binary_v2_no_bp")
RESULTS_DIR = MODELS_DIR / "results"

# 1. Cluster Sizes
print("\n[1] CLUSTER SIZES")
print("-"*40)
try:
    clusters = pd.read_csv("data/nhanes/processed/clustered_data.csv")
    print(f"Total records in clustered_data.csv: {len(clusters)}")
    print(f"\nCluster distribution:")
    print(clusters['cluster_label'].value_counts())
except Exception as e:
    print(f"Error: {e}")

# 2. Cluster Profiles
print("\n[2] CLUSTER PROFILES (for manuscript)")
print("-"*40)
try:
    profiles = pd.read_csv(RESULTS_DIR / "cluster_profiles.csv", index_col=0)
    print(profiles.to_string())
except Exception as e:
    print(f"Error: {e}")

# 3. Model Comparison / Details
print("\n[3] BEST MODEL DETAILS")
print("-"*40)
try:
    with open(RESULTS_DIR / "best_model_report.json") as f:
        best_model = json.load(f)
    print(f"Best Model: {best_model.get('best_model')}")
    print(f"Inference Type: {best_model.get('model_type')}")
    print(f"Validation Method: {best_model.get('validation_method')}")
    print(f"Number of Features: {best_model.get('n_features')}")
    print("Metrics:")
    for k, v in best_model.get('metrics', {}).items():
        print(f"   {k}: {v}")
except Exception as e:
    print(f"Error: {e}")

# 4. Check cluster labels JSON
print("\n[4] CLUSTER LABELS (from JSON)")
print("-"*40)
try:
    with open(MODELS_DIR / "cluster_labels.json", 'r') as f:
        labels = json.load(f)
    for k, v in labels.items():
        print(f"   Cluster {k}: {v['label']} ({v.get('risk_level')}) - {v.get('full_name')}")
except Exception as e:
    print(f"Error: {e}")

# 5. Summary for manuscript
print("\n" + "="*60)
print("COPY THESE FOR YOUR MANUSCRIPT")
print("="*60)
try:
    # Print profile characteristics
    for subtype in ['SIRD', 'SIDD', 'MOD', 'MARD']:
        row = profiles.loc[subtype]
        print(f"\n{subtype} centroid characteristics:")
        print(f"   BMI: {row['bmi']:.2f} kg/m²")
        print(f"   Triglycerides: {row['triglycerides']:.2f} mg/dL")
        print(f"   LDL: {row['ldl']:.2f} mg/dL")
        print(f"   HDL: {row['hdl']:.2f} mg/dL")
        print(f"   Age: {row['age']:.2f} years")
        print(f"   Waist Circumference: {row['waist_circumference']:.2f} cm")
        
    print(f"\nBest Model AUC-ROC: {best_model['metrics']['auc_roc']:.4f}")
    print(f"Sensitivity: {best_model['metrics']['sensitivity']:.4f}")
    print(f"Specificity: {best_model['metrics']['specificity']:.4f}")
    print(f"F1 Score: {best_model['metrics']['f1']:.4f}")
except Exception as e:
    print(f"Error generating summary: {e}")

print("\n[DONE]")
