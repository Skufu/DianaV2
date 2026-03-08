import pandas as pd
import numpy as np
import joblib
import json
from pathlib import Path
import sys

# Setup paths
BASE_DIR = Path(r"c:\Users\ADRIAN\Github\skufu\DianaV2")
DATA_PATH = BASE_DIR / "data" / "nhanes" / "processed" / "diana_dataset_final.csv"
MODELS_DIR = BASE_DIR / "models" / "clinical" 
if not MODELS_DIR.exists():
    MODELS_DIR = BASE_DIR / "models" / "binary_v2_no_bp"

def generate_tables():
    print("Loading data and models...")
    df = pd.read_csv(DATA_PATH)
    
    scaler_path = MODELS_DIR / "cluster_scaler.joblib"
    kmeans_path = MODELS_DIR / "kmeans_model.joblib"
    labels_path = MODELS_DIR / "cluster_labels.json"
    
    if not (scaler_path.exists() and kmeans_path.exists() and labels_path.exists()):
        print("Models not found. Please ensure clustering models are trained.")
        return
        
    scaler = joblib.load(scaler_path)
    kmeans = joblib.load(kmeans_path)
    
    with open(labels_path, 'r') as f:
        cluster_labels_info = json.load(f)
        
    # Ian_ML uses these features for clustering usually
    # Let's import them if possible
    sys.path.insert(0, str(BASE_DIR))
    from Ian_ML.common.feature_constants import CLUSTER_FEATURES
    
    # In Ian_ML, clustering might be trained on the at-risk only, or everyone based on which file was run.
    # We will just predict on everyone who has the features.
    df_clean = df.dropna(subset=CLUSTER_FEATURES).copy()
    X = df_clean[CLUSTER_FEATURES].values
    
    # Predict clusters
    try:
        X_scaled = scaler.transform(X)
    except:
        # If the scaler was trained with imputation, let's try to load imputer
        imputer_path = MODELS_DIR / "cluster_imputer.joblib"
        if imputer_path.exists():
            imputer = joblib.load(imputer_path)
            X = imputer.transform(X)
        X_scaled = scaler.transform(X)
        
    clusters = kmeans.predict(X_scaled)
    df_clean['Cluster'] = clusters
    
    # Map cluster IDs to phenotypes based on the json
    # The JSON might have str keys or int keys depending on the script
    label_map = {}
    for k, v in cluster_labels_info.items():
        label_map[int(k)] = v['label'] if 'label' in v else v.get('subtype', 'Unknown')
        
    df_clean['Phenotype'] = df_clean['Cluster'].map(label_map)
    
    # ---------------------------------------------------------
    # Generate Table 1: Phenotypes Summary
    # ---------------------------------------------------------
    print("\n--- TABLE 1: Identified Diabetes Phenotypes (Ian_ML) ---\n")
    print("| Cluster | Phenotype | n (%) | Key Characteristics (Median) |")
    print("| :--- | :--- | :--- | :--- |")
    
    total_patients = len(df_clean)
    for c_id in sorted(df_clean['Cluster'].unique()):
        subset = df_clean[df_clean['Cluster'] == c_id]
        n = len(subset)
        pct = (n / total_patients) * 100
        phenotype = label_map.get(c_id, f"Cluster {c_id}")
        
        # Build key characteristics string
        bmi = subset['bmi'].median()
        age = subset['age'].median()
        hba1c = subset['hba1c'].median() if 'hba1c' in subset.columns else np.nan
        
        characteristics = f"Median Age {age:.1f}, BMI {bmi:.1f}"
        if not np.isnan(hba1c):
            characteristics += f", HbA1c {hba1c:.1f}%"
            
        print(f"| {c_id} | **{phenotype}** | {n} ({pct:.1f}%) | {characteristics} |")
        
    # ---------------------------------------------------------
    # Generate Table 2: Feature Medians
    # ---------------------------------------------------------
    print("\n\n--- TABLE 2: Feature Medians by Cluster (Ian_ML) ---\n")
    features_to_report = [
        ('Median Age', 'age', 'years'),
        ('Median HbA1c', 'hba1c', '%'),
        ('Median BMI', 'bmi', ''),
        ('Fasting Blood Sugar', 'fbs', 'mg/dL'),  # Assuming 'fbs' is the column name, or maybe blood_sugar
        ('Systolic BP', 'systolic_bp', 'mmHg'),
        ('Waist Circ.', 'waist_circumference', 'cm'),
        ('Total Cholesterol', 'total_cholesterol', 'mg/dL'),
        ('LDL', 'ldl', 'mg/dL'),
        ('HDL', 'hdl', 'mg/dL'),
        ('Triglycerides', 'triglycerides', 'mg/dL'),
    ]
    
    # Map exact column names if they differ
    col_mapping = {
        'fbs': 'glucose', # Usually fasting glucose is called glucose in these datasets
        'systolic_bp': 'systolic_bp' # check exact name in df.columns
    }
    
    # Print Header
    header = "| Feature | " + " | ".join([f"Cluster {c}: {label_map.get(c, '')}" for c in sorted(df_clean['Cluster'].unique())]) + " |"
    print(header)
    print("| :--- | " + " | ".join([":---:" for _ in df_clean['Cluster'].unique()]) + " |")
    
    for display_name, col_name, unit in features_to_report:
        actual_col = col_mapping.get(col_name, col_name)
        if actual_col not in df_clean.columns:
            # try to find a match
            matches = [c for c in df_clean.columns if actual_col.lower() in c.lower()]
            if matches:
                actual_col = matches[0]
            else:
                actual_col = None
                
        if actual_col:
            row_vals = []
            for c_id in sorted(df_clean['Cluster'].unique()):
                median_val = df_clean[df_clean['Cluster'] == c_id][actual_col].median()
                row_vals.append(f"{median_val:.2f} {unit}".strip())
            print(f"| **{display_name}** | " + " | ".join(row_vals) + " |")
        else:
            print(f"| **{display_name}** | " + " | ".join(["N/A" for _ in df_clean['Cluster'].unique()]) + " |")

if __name__ == "__main__":
    generate_tables()
