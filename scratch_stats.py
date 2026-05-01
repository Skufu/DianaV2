import pandas as pd
import joblib
import json
import sys
from pathlib import Path

df = pd.read_csv("data/nhanes/processed/diana_dataset_final.csv")
df_at_risk = df[df['diabetes_label'] >= 1].copy()

imputer = joblib.load("models/binary_v2_no_bp/cluster_imputer.joblib")
scaler = joblib.load("models/binary_v2_no_bp/cluster_scaler.joblib")
kmeans = joblib.load("models/binary_v2_no_bp/weighted_kmeans_model.joblib")
with open("models/binary_v2_no_bp/feature_weights.json") as f:
    features = json.load(f)['feature_order']
with open("models/binary_v2_no_bp/cluster_labels.json") as f:
    label_map = json.load(f)

X = df_at_risk[features].values
X_imp = imputer.transform(X)
X_sca = scaler.transform(X_imp)

labels = kmeans.predict(X_sca)
df_at_risk['cluster'] = labels
df_at_risk['cluster_name'] = df_at_risk['cluster'].apply(lambda x: label_map[str(x)]['label'])

for name in ['MARD', 'MOD', 'SIDD', 'SIRD']:
    subset = df_at_risk[df_at_risk['cluster_name'] == name]
    n = len(subset)
    pct = n / len(df_at_risk) * 100
    mean_age = subset['age'].mean()
    pct_pre = (subset['diabetes_label'] == 1).mean() * 100
    pct_dia = (subset['diabetes_label'] == 2).mean() * 100
    print(f"{name}-like | {n} | {pct:.1f}% | {mean_age:.1f} | {pct_pre:.1f}% | {pct_dia:.1f}%")

