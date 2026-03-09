
import pandas as pd
import numpy as np
import json
from pathlib import Path

# Paths
DATA_PATH = Path("c:/Users/ADRIAN/Github/skufu/DianaV2/data/nhanes/processed/diana_dataset_final.csv")
CLUSTER_LABELS_PATH = Path("c:/Users/ADRIAN/Github/skufu/DianaV2/models/binary_v2_no_bp/cluster_labels.json")
MODEL_PATH = Path("c:/Users/ADRIAN/Github/skufu/DianaV2/models/binary_v2_no_bp/kmeans_model.joblib")
SCALER_PATH = Path("c:/Users/ADRIAN/Github/skufu/DianaV2/models/binary_v2_no_bp/cluster_scaler.joblib")
IMPUTER_PATH = Path("c:/Users/ADRIAN/Github/skufu/DianaV2/models/binary_v2_no_bp/cluster_imputer.joblib")

import joblib

# Load data
df = pd.read_csv(DATA_PATH)
df_clean = df.dropna(subset=["cycle"]).copy()
df_clean["at_risk"] = (df_clean["diabetes_label"] >= 1).astype(int)

# Filter to at-risk only
at_risk_df = df_clean[df_clean["at_risk"] == 1].copy()

# Load models
kmeans = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
imputer = joblib.load(IMPUTER_PATH)

# Cluster features
CLUSTER_FEATURES = ["bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"]

# Prepare X
X = at_risk_df[CLUSTER_FEATURES].values
X_imputed = imputer.transform(X)
X_scaled = scaler.transform(X_imputed)

# Predict clusters
at_risk_df["cluster_id"] = kmeans.predict(X_scaled)

# Load labels map
with open(CLUSTER_LABELS_PATH) as f:
    cluster_info = json.load(f)

label_map = {int(k): v["label"] for k, v in cluster_info.items()}
at_risk_df["cluster_label"] = at_risk_df["cluster_id"].map(label_map)

# Compute stats
stats = at_risk_df.groupby("cluster_label").agg({
    "age": "mean",
    "diabetes_status": lambda x: x.value_counts(normalize=True).to_dict()
})

# Flatten stats
results = []
for label, row in stats.iterrows():
    size = len(at_risk_df[at_risk_df["cluster_label"] == label])
    age_mean = row["age"]
    dist = row["diabetes_status"]
    diabetic_pct = dist.get("Diabetic", 0) * 100
    prediabetic_pct = dist.get("Pre-diabetic", 0) * 100
    results.append({
        "Cluster": label,
        "n": size,
        "Pct": size / len(at_risk_df) * 100,
        "Mean Age": age_mean,
        "Pre-diabetic": prediabetic_pct,
        "Diabetic": diabetic_pct
    })

print(pd.DataFrame(results).to_string())
