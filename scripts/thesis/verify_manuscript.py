"""
DIANA Manuscript Verification Script
Run this script to get all the exact numbers for your thesis.
"""

import pandas as pd
import json

print("="*60)
print("DIANA MANUSCRIPT VERIFICATION")
print("="*60)

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
    profiles = pd.read_csv("models/clinical/cluster_profiles.csv")
    print(profiles.to_string())
except Exception as e:
    print(f"Error: {e}")

# 3. Model Comparison
print("\n[3] MODEL COMPARISON")
print("-"*40)
try:
    models = pd.read_csv("models/clinical/results/model_comparison.csv")
    print(models.to_string())
    
    # Best model details
    best = models.loc[models['AUC-ROC'].idxmax()]
    print(f"\n[BEST MODEL]: {best['Model']}")
    print(f"   AUC-ROC: {best['AUC-ROC']}")
    print(f"   Accuracy: {best['Accuracy']}")
    print(f"   Overfit Gap: {best['Overfit_Gap']*100:.2f}%")
except Exception as e:
    print(f"Error: {e}")

# 4. Check cluster labels JSON
print("\n[4] CLUSTER LABELS (from JSON)")
print("-"*40)
try:
    with open("models/clinical/cluster_labels.json", 'r') as f:
        labels = json.load(f)
    for k, v in labels.items():
        print(f"   Cluster {k}: {v['label']}")
except Exception as e:
    print(f"Error: {e}")

# 5. Summary for manuscript
print("\n" + "="*60)
print("COPY THESE FOR YOUR MANUSCRIPT")
print("="*60)
try:
    # SIDD
    sidd = profiles[profiles['cluster'] == 3].iloc[0]
    print(f"\nSIDD: HbA1c={sidd['hba1c']}%, FBS={sidd['fbs']} mg/dL, BMI={sidd['bmi']}")
    
    # SIRD  
    sird = profiles[profiles['cluster'] == 2].iloc[0]
    print(f"SIRD: BMI={sird['bmi']}, TG={sird['triglycerides']} mg/dL, HDL={sird['hdl']} mg/dL")
    
    # MOD
    mod = profiles[profiles['cluster'] == 0].iloc[0]
    print(f"MOD: BMI={mod['bmi']}, HbA1c={mod['hba1c']}%, TG={mod['triglycerides']} mg/dL")
    
    # MARD
    mard = profiles[profiles['cluster'] == 1].iloc[0]
    print(f"MARD: BMI={mard['bmi']}, HbA1c={mard['hba1c']}%, HDL={mard['hdl']} mg/dL")
    
    print(f"\nBest Model AUC: {best['AUC-ROC']}")
    print(f"Overfit Gap: {best['Overfit_Gap']*100:.2f}%")
    
except Exception as e:
    print(f"Error generating summary: {e}")

print("\n[DONE]")
