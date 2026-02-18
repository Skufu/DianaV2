#!/usr/bin/env python3
"""
Quick Training Script - Train CatBoost with 13 features (no grid search)

This is a fast training script for immediate testing.
For full training with all models and grid search, use train.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score

# Try to import CatBoost
try:
    from catboost import CatBoostClassifier
    HAS_CATBOOST = True
except ImportError:
    HAS_CATBOOST = False
    print("[ERROR] CatBoost not installed. Install with: pip install catboost")
    exit(1)

# Paths
DATA_PATH = Path("data/nhanes/processed/diana_dataset_imputed.csv")
MODELS_DIR = Path("models/clinical")

# 13 optimized features
FEATURES = [
    'bmi', 'triglycerides', 'ldl', 'hdl', 'age',
    'systolic', 'diastolic',
    'bmi_category', 'tg_hdl_ratio',
    'smoking_encoded', 'activity_encoded', 'alcohol_encoded',
    'metabolic_syndrome_score'
]

def engineer_features(df):
    """Create engineered features"""
    df = df.copy()
    
    # BMI category
    df['bmi_category'] = pd.cut(df['bmi'], bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]).astype(float)
    
    # TG/HDL ratio
    df['tg_hdl_ratio'] = df['triglycerides'] / df['hdl'].replace(0, np.nan)
    
    # Lifestyle encoding
    smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    df['smoking_encoded'] = df['smoking_status'].map(smoking_map) if 'smoking_status' in df.columns else 1
    
    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    df['activity_encoded'] = df['physical_activity'].map(activity_map) if 'physical_activity' in df.columns else 1
    
    alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}
    df['alcohol_encoded'] = df['alcohol_use'].map(alcohol_map) if 'alcohol_use' in df.columns else 1
    
    # Metabolic syndrome score
    metabolic_criteria = pd.DataFrame({
        'high_tg': df['triglycerides'] > 150,
        'low_hdl': df['hdl'] < 50,
        'high_bp': df['systolic'] >= 130,
        'high_bmi': df['bmi'] >= 30,
    })
    df['metabolic_syndrome_score'] = metabolic_criteria.sum(axis=1)
    
    return df

def main():
    print("="*60)
    print("QUICK TRAINING - CatBoost with 13 Features")
    print("="*60)
    
    # Load data
    print(f"\n[LOAD] Loading data from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Records: {len(df)}")
    
    # Engineer features
    print("\n[FEATURES] Engineering 13 features...")
    df = engineer_features(df)
    
    # Prepare data
    df_clean = df.dropna(subset=FEATURES + ['diabetes_label'])
    X = df_clean[FEATURES].values
    y = df_clean['diabetes_label'].values.astype(int)
    
    print(f"   Complete records: {len(X)}")
    print(f"   Features: {len(FEATURES)}")
    print(f"   Classes: {dict(zip(['Normal', 'Pre-diabetic', 'Diabetic'], np.bincount(y)))}")
    
    # Split
    print("\n[SPLIT] Train/test split (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    print(f"   Train: {len(X_train)}, Test: {len(X_test)}")
    
    # Scale
    print("\n[SCALE] Standardizing features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train CatBoost (fast, no grid search)
    print("\n[TRAIN] Training CatBoost (no grid search)...")
    model = CatBoostClassifier(
        depth=4,
        learning_rate=0.05,
        iterations=300,
        l2_leaf_reg=5,
        random_state=42,
        verbose=0
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    print("\n[EVALUATE] Evaluating model...")
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)
    
    accuracy = accuracy_score(y_test, y_pred)
    
    from sklearn.preprocessing import label_binarize
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    try:
        auc_roc = roc_auc_score(y_test_bin, y_proba, multi_class='ovr', average='weighted')
    except:
        auc_roc = 0.0
    
    print(f"   Accuracy: {accuracy:.4f}")
    print(f"   AUC-ROC:  {auc_roc:.4f}")
    
    # Save
    print("\n[SAVE] Saving model...")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    joblib.dump(model, MODELS_DIR / "best_model.joblib")
    
    # Save feature list
    with open(MODELS_DIR / "features.json", 'w') as f:
        json.dump({
            'features': FEATURES,
            'n_features': len(FEATURES),
            'note': '13 optimized features (reduced from 24)'
        }, f, indent=2)
    
    # Save report
    report = {
        'model_type': 'clinical_quick',
        'best_model': 'CatBoost',
        'features': FEATURES,
        'n_features': len(FEATURES),
        'metrics': {
            'accuracy': round(accuracy, 4),
            'auc_roc': round(auc_roc, 4)
        },
        'note': 'Quick training without grid search'
    }
    
    (MODELS_DIR / "results").mkdir(exist_ok=True)
    with open(MODELS_DIR / "results" / "best_model_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n✓ Model saved to {MODELS_DIR}")
    print(f"✓ Features saved: {len(FEATURES)} features")
    print(f"✓ AUC-ROC: {auc_roc:.4f}")
    print("\n[DONE] Quick training complete!")
    print("\nYou can now test with: python scripts/eval/test_predictor.py")

if __name__ == "__main__":
    main()
