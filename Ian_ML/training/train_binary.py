"""
DIANA Binary Classification Training (Risk Prediction)

This is a SIMPLIFIED version for menopausal diabetes risk prediction:
- Binary: Diabetic (1) vs Non-Diabetic (0) 
- 11 base features (no HbA1c/FBS to avoid circularity)
- No complex engineered features (prevents overfitting)
- Gives RISK PERCENTAGE (0-100%)

Usage: python Ian_ML/training/train_binary.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve, classification_report
)

from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from Ian_ML.common.paths import MODELS_ROOT, NHANES_PROCESSED_ROOT

# Paths
DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_imputed.csv"
MODELS_DIR = MODELS_ROOT / "binary"
RESULTS_DIR = MODELS_DIR / "results"
VIZ_DIR = MODELS_DIR / "visualizations"

# 11 Base Features (NO HbA1c, NO FBS, NO engineered features)
FEATURES = [
    'age', 'bmi', 'hdl', 'triglycerides', 'total_cholesterol',
    'systolic', 'diastolic', 'ldl',
    'smoking_status', 'physical_activity', 'alcohol_use'
]


def create_binary_target(df):
    """
    Create binary target: 
    - 0 = Non-Diabetic (Normal + Pre-diabetic combined)
    - 1 = Diabetic
    
    Rationale: For risk prediction, we care about "at risk vs not at risk"
    Pre-diabetic is "at risk" but we're predicting who will become diabetic
    """
    df = df.copy()
    # Merge Normal (0) and Pre-diabetic (1) into Non-Diabetic (0)
    # Keep Diabetic (2) as Diabetic (1)
    df['diabetes_binary'] = (df['diabetes_label'] == 2).astype(int)
    
    counts = df['diabetes_binary'].value_counts()
    print(f"\n[BINARY TARGET]")
    print(f"  Class 0 (Non-Diabetic): {counts[0]} ({counts[0]/len(df)*100:.1f}%)")
    print(f"  Class 1 (Diabetic): {counts[1]} ({counts[1]/len(df)*100:.1f}%)")
    
    return df


def train_binary_model():
    """Train simplified binary classification model."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 70)
    print("DIANA Binary Risk Prediction Model")
    print("Binary: Diabetic vs Non-Diabetic | 11 Features | No HbA1c/FBS")
    print("=" * 70)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"       Records: {len(df)}")
    
    # Create binary target
    df = create_binary_target(df)
    
    # Prepare features
    X = df[FEATURES].copy()
    y = df['diabetes_binary'].values
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )
    print(f"\n[SPLIT] Train: {len(X_train)}, Test: {len(X_test)}")
    
    # Identify feature types
    categorical = X_train.select_dtypes(include=['object']).columns.tolist()
    numerical = X_train.select_dtypes(include=[np.number]).columns.tolist()
    print(f"[FEATURES] Numerical: {len(numerical)}, Categorical: {len(categorical)}")
    
    # Preprocessing
    preprocessor = ColumnTransformer([
        ('num', StandardScaler(), numerical),
        ('cat', 'passthrough', categorical)  # Already encoded or let model handle
    ])
    
    # Encode categorical
    for col in categorical:
        le = LabelEncoder()
        X_train[col] = le.fit_transform(X_train[col].astype(str))
        X_test[col] = le.transform(X_test[col].astype(str))
    
    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Calculate scale_pos_weight for XGBoost (handle imbalance)
    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    print(f"[IMBALANCE] scale_pos_weight: {scale_pos_weight:.2f}")
    
    # Train models
    models = {
        'Logistic Regression': LogisticRegression(
            class_weight='balanced', 
            max_iter=1000, 
            random_state=42
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=200,
            max_depth=6,
            min_samples_leaf=10,
            class_weight='balanced',
            random_state=42
        ),
        'XGBoost': XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            min_child_weight=5,
            reg_alpha=1.0,
            reg_lambda=5.0,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            eval_metric='logloss',
            random_state=42
        )
    }
    
    results = []
    
    print("\n" + "=" * 70)
    print("MODEL TRAINING")
    print("=" * 70)
    
    for name, model in models.items():
        print(f"\n[TRAINING] {name}")
        
        # Train
        model.fit(X_train_scaled, y_train)
        
        # Predict
        y_pred = model.predict(X_test_scaled)
        y_proba = model.predict_proba(X_test_scaled)[:, 1]
        
        # Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='roc_auc')
        
        # Check overfitting
        train_acc = accuracy_score(y_train, model.predict(X_train_scaled))
        overfit_gap = train_acc - acc
        
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        print(f"  AUC-ROC:   {auc:.4f}")
        print(f"  CV AUC:    {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
        print(f"  Train Acc: {train_acc:.4f}")
        print(f"  Overfit:   {overfit_gap:.2%}")
        
        results.append({
            'model': model,
            'name': name,
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1': f1,
            'auc': auc,
            'cv_auc': cv_scores.mean(),
            'overfit_gap': overfit_gap,
            'y_test': y_test,
            'y_proba': y_proba
        })
        
        # Save model
        joblib.dump(model, MODELS_DIR / f"{name.lower().replace(' ', '_')}.joblib")
    
    # Select best model
    best = max(results, key=lambda x: x['auc'])
    print(f"\n[BEST MODEL] {best['name']} (AUC: {best['auc']:.4f})")
    
    # Save artifacts
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    joblib.dump(best['model'], MODELS_DIR / "best_model.joblib")
    
    # Save report
    report = {
        "model_type": "binary_risk_prediction",
        "features": FEATURES,
        "n_features": len(FEATURES),
        "target": "diabetes_binary (0=Non-Diabetic, 1=Diabetic)",
        "best_model": best['name'],
        "metrics": {
            "accuracy": round(best['accuracy'], 4),
            "precision": round(best['precision'], 4),
            "recall": round(best['recall'], 4),
            "f1_score": round(best['f1'], 4),
            "auc_roc": round(best['auc'], 4),
            "cv_auc": round(best['cv_auc'], 4),
            "overfit_gap": round(best['overfit_gap'], 4)
        },
        "auc_threshold_met": bool(best['auc'] >= 0.70),
        "all_models": [
            {
                "name": r['name'],
                "auc": round(r['auc'], 4),
                "overfit_gap": round(r['overfit_gap'], 4)
            } for r in results
        ]
    }
    
    with open(RESULTS_DIR / "binary_model_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    # Generate ROC curve
    plt.figure(figsize=(8, 6))
    for r in results:
        fpr, tpr, _ = roc_curve(r['y_test'], r['y_proba'])
        plt.plot(fpr, tpr, label=f"{r['name']} (AUC={r['auc']:.3f})")
    plt.plot([0, 1], [0, 1], 'k--', label='Random')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curves - Binary Risk Prediction')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.savefig(VIZ_DIR / "roc_curve_binary.png", dpi=150, bbox_inches='tight')
    plt.close()
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Best Model:        {best['name']}")
    print(f"AUC-ROC:           {best['auc']:.4f}")
    print(f"Overfit Gap:       {best['overfit_gap']:.2%}")
    print(f"Features Used:     {len(FEATURES)}")
    print(f"AUC >= 0.70:       {'YES' if best['auc'] >= 0.70 else 'NO'}")
    print(f"\nArtifacts saved to: {MODELS_DIR}")
    print("=" * 70)
    
    return best


if __name__ == "__main__":
    train_binary_model()
