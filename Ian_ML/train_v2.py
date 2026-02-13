"""
DIANA Clinical Model Training Script V2 - Reduced Features

This version uses only the 13 consensus features identified by
LASSO + RFE feature selection to reduce overfitting.

Key changes from train.py:
- Reduced from 24 to 13 features
- Removed highly correlated engineered features
- Simpler, more generalizable model

Usage: python Ian_ML/train_v2.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
import hashlib
import matplotlib.pyplot as plt
import warnings
from datetime import datetime
warnings.filterwarnings('ignore')

from sklearn.model_selection import (
    cross_val_score, StratifiedKFold, LeaveOneGroupOut,
    GridSearchCV, train_test_split
)
from sklearn.preprocessing import StandardScaler, label_binarize
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import mutual_info_classif
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve, auc, brier_score_loss
)

try:
    from imblearn.over_sampling import SMOTE
    from imblearn.combine import SMOTETomek
    from imblearn.under_sampling import TomekLinks
    HAS_SMOTE = True
except ImportError:
    HAS_SMOTE = False
    print("[WARN] imbalanced-learn not installed. SMOTE disabled.")

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except Exception as e:
    HAS_XGBOOST = False
    print(f"[WARN] XGBoost not available: {e}")

try:
    from catboost import CatBoostClassifier
    HAS_CATBOOST = True
except ImportError:
    HAS_CATBOOST = False
    print("[WARN] CatBoost not installed.")

try:
    from lightgbm import LGBMClassifier
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("[WARN] LightGBM not installed.")

from sklearn.ensemble import VotingClassifier, StackingClassifier

DATA_PATH = Path("data/nhanes/processed/diana_dataset_imputed.csv")
MODELS_DIR = Path("models/clinical_v2")
RESULTS_DIR = Path("models/clinical_v2/results")
VIZ_DIR = Path("models/clinical_v2/visualizations")

# ================================================================================
# REDUCED FEATURE SET (13 features - from feature_selection_analysis.py)
# ================================================================================
# Removed: vldl (correlated with TG), bmi_squared (correlated with BMI),
#          age_group (correlated with age), ldl_hdl_ratio/cholesterol_hdl_ratio (redundant),
#          tg_hdl_ratio_sq (redundant), metabolic_risk (redundant),
#          non_hdl (correlated with LDL)

REDUCED_FEATURES = [
    'bmi',                    # Base feature
    'triglycerides',          # Base feature
    'ldl',                    # Base feature
    'hdl',                    # Base feature
    'age',                    # Base feature
    'systolic',               # Base feature
    'diastolic',              # Base feature
    'bmi_category',           # Categorical (clinical threshold)
    'tg_hdl_ratio',           # Lipid ratio (insulin resistance marker)
    'smoking_encoded',        # Lifestyle
    'activity_encoded',       # Lifestyle
    'alcohol_encoded',        # Lifestyle
    'metabolic_syndrome_score' # Clinical score (ATP III criteria)
]

TARGET = 'diabetes_label'
CLASSES = ['Normal', 'Pre-diabetic', 'Diabetic']


def engineer_features_reduced(df):
    """
    Create only the necessary derived features (reduced set).
    Avoids highly correlated features identified in analysis.
    """
    print("\n[FEATURE ENGINEERING] Creating REDUCED feature set (13 features)...")
    
    df = df.copy()
    
    # BMI Category (WHO classification) - clinically meaningful
    df['bmi_category'] = pd.cut(df['bmi'], bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]).astype(float)
    
    # TG/HDL ratio (insulin resistance marker) - kept, clinically validated
    df['tg_hdl_ratio'] = df['triglycerides'] / df['hdl'].replace(0, np.nan)
    
    # Lifestyle encoding
    smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    if 'smoking_status' in df.columns:
        df['smoking_encoded'] = df['smoking_status'].map(smoking_map)
    
    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    if 'physical_activity' in df.columns:
        df['activity_encoded'] = df['physical_activity'].map(activity_map)
    
    alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}
    if 'alcohol_use' in df.columns:
        df['alcohol_encoded'] = df['alcohol_use'].map(alcohol_map)
    
    # Metabolic syndrome score (ATP III criteria count) - clinically validated
    # Using available features: high TG, low HDL, high BP, high BMI
    metabolic_criteria = pd.DataFrame({
        'high_tg': df['triglycerides'] > 150,
        'low_hdl': df['hdl'] < 50,
        'high_bp': df['systolic'] >= 130,
        'high_bmi': df['bmi'] >= 30,
    })
    df['metabolic_syndrome_score'] = metabolic_criteria.sum(axis=1)
    
    # Filter to only features that exist
    available_features = [f for f in REDUCED_FEATURES if f in df.columns]
    
    print(f"   Using {len(available_features)} features:")
    for feat in available_features:
        valid = df[feat].notna().sum()
        print(f"      {feat}: {valid} valid values")
    
    return df, available_features


def apply_smote(X_train, y_train):
    """Apply SMOTE+Tomek for class imbalance."""
    if not HAS_SMOTE:
        print("\n[WARN] SMOTE skipped - imbalanced-learn not installed!")
        return X_train, y_train
    
    print("\n[SMOTE+TOMEK] Applying class balancing...")
    
    unique, counts = np.unique(y_train, return_counts=True)
    min_class_samples = min(counts)
    print(f"   Before: {dict(zip(CLASSES, counts))}")
    
    k = min(5, min_class_samples - 1)
    if k < 1: k = 1
    
    smote_tomek = SMOTETomek(
        sampling_strategy='auto',
        random_state=42,
        smote=SMOTE(k_neighbors=k, random_state=42),
        tomek=TomekLinks(sampling_strategy='all')
    )
    
    try:
        X_resampled, y_resampled = smote_tomek.fit_resample(X_train, y_train)
    except Exception as e:
        print(f"   [ERROR] SMOTETomek failed: {e}")
        return X_train, y_train
    
    unique, counts = np.unique(y_resampled, return_counts=True)
    print(f"   After:  {dict(zip(CLASSES, counts))}")
    print(f"   Samples: {len(y_train)} -> {len(y_resampled)}")
    
    return X_resampled, y_resampled


def calibrate_model(model, X_train, y_train, method='sigmoid'):
    """Calibrate model probabilities."""
    print(f"\n[CALIBRATION] Applying {method} calibration...")
    calibrated = CalibratedClassifierCV(model, method=method, cv=5)
    calibrated.fit(X_train, y_train)
    return calibrated


def train_and_evaluate(model, model_name, X_train, X_test, y_train, y_test, X_all, y_all):
    """Train and evaluate a model."""
    print(f"\n[EVALUATE] {model_name}...")
    
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    recall_macro = recall_score(y_test, y_pred, average='macro', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    try:
        auc_roc = roc_auc_score(y_test_bin, y_proba, multi_class='ovr', average='weighted')
    except:
        auc_roc = 0.0
    
    brier_scores = []
    for i in range(3):
        brier = brier_score_loss(y_test_bin[:, i], y_proba[:, i])
        brier_scores.append(brier)
    avg_brier = np.mean(brier_scores)
    
    # Cross-validation
    if model_name == 'CatBoost':
        cv_mean = 0.0
        cv_std = 0.0
        print("   [INFO] CV skipped for CatBoost")
    else:
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X_all, y_all, cv=cv, scoring='accuracy')
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
    
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"   Accuracy:  {accuracy:.4f}")
    print(f"   Precision: {precision:.4f}")
    print(f"   Recall:    {recall:.4f} (macro: {recall_macro:.4f})")
    print(f"   F1-Score:  {f1:.4f}")
    print(f"   AUC-ROC:   {auc_roc:.4f}")
    print(f"   Brier:     {avg_brier:.4f}")
    if model_name != 'CatBoost':
        print(f"   CV Score:  {cv_mean:.4f} (+/- {cv_std:.4f})")
    
    train_score = accuracy_score(y_train, model.predict(X_train))
    overfit_gap = train_score - accuracy
    if overfit_gap > 0.10:
        print(f"   [WARN] Overfitting: train={train_score:.4f}, test={accuracy:.4f}, gap={overfit_gap:.4f}")
    else:
        print(f"   [OK] No major overfitting: gap={overfit_gap:.4f}")
    
    return {
        'model': model,
        'name': model_name,
        'accuracy': round(accuracy, 4),
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'recall_macro': round(recall_macro, 4),
        'f1_score': round(f1, 4),
        'auc_roc': round(auc_roc, 4),
        'brier_score': round(avg_brier, 4),
        'cv_mean': round(cv_mean, 4),
        'cv_std': round(cv_std, 4),
        'train_accuracy': round(train_score, 4),
        'overfit_gap': round(overfit_gap, 4),
        'confusion_matrix': cm.tolist(),
        'y_test': y_test,
        'y_proba': y_proba
    }


def plot_confusion_matrix(cm, model_name, output_path):
    """Plot confusion matrix."""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    im = ax.imshow(cm, interpolation='nearest', cmap='Blues')
    ax.figure.colorbar(im, ax=ax)
    
    ax.set(xticks=np.arange(3),
           yticks=np.arange(3),
           xticklabels=CLASSES,
           yticklabels=CLASSES,
           ylabel='True Label',
           xlabel='Predicted Label',
           title=f'Confusion Matrix - {model_name} (V2 Reduced Features)')
    
    thresh = cm.max() / 2.
    for i in range(3):
        for j in range(3):
            ax.text(j, i, format(cm[i, j], 'd'),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black",
                    fontsize=14)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()


def plot_roc_curve(y_test, y_proba, model_name, output_path):
    """Plot ROC curve."""
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    n_classes = 3
    
    fig, ax = plt.subplots(figsize=(8, 6))
    colors = ['#e74c3c', '#f39c12', '#27ae60']
    
    for i in range(n_classes):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, color=colors[i], lw=2,
                label=f'{CLASSES[i]} (AUC = {roc_auc:.2f})')
    
    ax.plot([0, 1], [0, 1], 'k--', lw=2)
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel('False Positive Rate', fontsize=12)
    ax.set_ylabel('True Positive Rate', fontsize=12)
    ax.set_title(f'ROC Curve - {model_name} (V2 Reduced Features)', fontsize=14)
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 70)
    print("DIANA Clinical Model Training V2 - REDUCED FEATURES")
    print("13 features (down from 24) - Less overfitting, better generalization")
    print("=" * 70)
    
    # =========================================
    # STEP 1: Load Data
    # =========================================
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total records: {len(df)}")
    
    # =========================================
    # STEP 2: Feature Engineering (Reduced)
    # =========================================
    df, available_features = engineer_features_reduced(df)
    
    # Check for required columns
    missing_cols = [f for f in REDUCED_FEATURES if f not in df.columns]
    if missing_cols:
        print(f"[ERROR] Missing columns: {missing_cols}")
        return None, None
    
    # Prepare features
    df_clean = df.dropna(subset=REDUCED_FEATURES + [TARGET, 'cycle'])
    
    X = df_clean[REDUCED_FEATURES].values
    y = df_clean[TARGET].values.astype(int)
    groups = df_clean['cycle'].values
    
    print(f"\n[DATA] Prepared dataset:")
    print(f"   Complete records: {len(X)}")
    print(f"   Features ({len(REDUCED_FEATURES)}): {REDUCED_FEATURES}")
    print(f"   Class distribution: {dict(zip(CLASSES, np.bincount(y)))}")
    print(f"   NHANES cycles: {np.unique(groups)}")
    
    # =========================================
    # STEP 3: Standardize
    # =========================================
    print("\n[PREPROCESS] Standardizing features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # =========================================
    # STEP 4: Train/Test Split
    # =========================================
    print(f"\n[SPLIT] Using Leave-One-Cycle-Out validation...")
    
    logo = LeaveOneGroupOut()
    all_splits = list(logo.split(X_scaled, y, groups))
    train_idx, test_idx = all_splits[0]
    
    X_train_raw, X_test = X_scaled[train_idx], X_scaled[test_idx]
    y_train_raw, y_test = y[train_idx], y[test_idx]
    
    test_cycle = groups[test_idx][0]
    print(f"   Train: {len(X_train_raw)} samples, Test: {len(X_test)} samples ({test_cycle})")
    
    # =========================================
    # STEP 5: SMOTE
    # =========================================
    X_train, y_train = apply_smote(X_train_raw, y_train_raw)
    
    # =========================================
    # STEP 6: Train Models (Simplified Grid Search)
    # =========================================
    print("\n" + "=" * 70)
    print("MODEL TRAINING (Simplified - Reduced Feature Set)")
    print("=" * 70)
    
    tuned_models = []
    
    # --- Logistic Regression ---
    print("\n[TRAIN] Logistic Regression...")
    lr = LogisticRegression(C=1.0, class_weight='balanced', max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    tuned_models.append((lr, "Logistic Regression"))
    
    # --- Random Forest (Conservative) ---
    print("[TRAIN] Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=5,
        min_samples_leaf=20,
        min_samples_split=30,
        class_weight='balanced',
        random_state=42
    )
    rf.fit(X_train, y_train)
    tuned_models.append((rf, "Random Forest"))
    
    # --- XGBoost (Conservative) ---
    if HAS_XGBOOST:
        print("[TRAIN] XGBoost...")
        
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_train, y_train, test_size=0.2, stratify=y_train, random_state=42
        )
        
        # Simplified search (fewer combinations)
        best_score = 0
        best_params = None
        best_model = None
        
        for max_depth in [3, 4]:
            for lr in [0.03, 0.05]:
                for reg_lambda in [2.0, 5.0]:
                    xgb = XGBClassifier(
                        n_estimators=200,
                        max_depth=max_depth,
                        learning_rate=lr,
                        min_child_weight=7,
                        reg_lambda=reg_lambda,
                        subsample=0.8,
                        colsample_bytree=0.8,
                        eval_metric='mlogloss',
                        random_state=42,
                        early_stopping_rounds=20
                    )
                    
                    xgb.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
                    
                    y_val_proba = xgb.predict_proba(X_val)
                    y_val_bin = label_binarize(y_val, classes=[0, 1, 2])
                    try:
                        val_score = roc_auc_score(y_val_bin, y_val_proba, multi_class='ovr', average='weighted')
                    except:
                        val_score = 0.0
                    
                    if val_score > best_score:
                        best_score = val_score
                        best_params = {'max_depth': max_depth, 'learning_rate': lr, 'reg_lambda': reg_lambda}
                        best_model = xgb
        
        print(f"   Best val AUC: {best_score:.4f}, Params: {best_params}")
        
        # Retrain on full training set
        xgb_final = XGBClassifier(
            n_estimators=200,
            max_depth=best_params['max_depth'],
            learning_rate=best_params['learning_rate'],
            min_child_weight=7,
            reg_lambda=best_params['reg_lambda'],
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric='mlogloss',
            random_state=42
        )
        xgb_final.fit(X_train, y_train)
        tuned_models.append((xgb_final, "XGBoost"))
    
    # --- CatBoost ---
    if HAS_CATBOOST:
        print("[TRAIN] CatBoost...")
        cat = CatBoostClassifier(
            depth=4,
            learning_rate=0.05,
            iterations=300,
            l2_leaf_reg=5,
            random_state=42,
            verbose=0
        )
        cat.fit(X_train, y_train)
        tuned_models.append((cat, "CatBoost"))
    
    # --- LightGBM ---
    if HAS_LIGHTGBM:
        print("[TRAIN] LightGBM...")
        lgb = LGBMClassifier(
            num_leaves=20,
            learning_rate=0.05,
            n_estimators=300,
            min_child_samples=40,
            reg_lambda=5.0,
            random_state=42,
            verbose=-1,
            class_weight='balanced'
        )
        lgb.fit(X_train, y_train)
        tuned_models.append((lgb, "LightGBM"))
    
    # --- Ensemble ---
    # Skipping ensemble for now to focus on individual model performance
    print("[TRAIN] Skipping ensemble - focusing on individual models")
    
    # =========================================
    # STEP 7: Evaluate All Models
    # =========================================
    print("\n" + "=" * 70)
    print("MODEL EVALUATION")
    print("=" * 70)
    
    results = []
    for model, name in tuned_models:
        result = train_and_evaluate(model, name, X_train, X_test, y_train, y_test, X_scaled, y)
        results.append(result)
    
    # =========================================
    # STEP 8: Select Best & Calibrate
    # =========================================
    best = max(results, key=lambda x: x['auc_roc'])
    print(f"\n[BEST] {best['name']} selected (AUC-ROC: {best['auc_roc']:.4f})")
    
    if best['name'] in ['Voting Ensemble', 'CatBoost']:
        final_model = best['model']
        calibrated_model = best['model']
        print("[INFO] CatBoost/Ensemble - skipping calibration (API incompatibility)")
    else:
        print("\n[FINAL] Calibrating and retraining on full dataset...")
        if best['name'] == 'XGBoost':
            # Use the already trained XGBoost model from tuned_models
            xgb_model = None
            for model, name in tuned_models:
                if name == "XGBoost":
                    xgb_model = model
                    break
            final_model = xgb_model if xgb_model else best['model']
        else:
            final_model = best['model']
        
        calibrated_model = calibrate_model(final_model, X_scaled, y)
    
    # =========================================
    # STEP 9: Save Models and Results
    # =========================================
    print("\n[SAVE] Saving V2 models...")
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    joblib.dump(calibrated_model, MODELS_DIR / "best_model_calibrated.joblib")
    joblib.dump(best['model'], MODELS_DIR / "best_model.joblib")
    
    # Save feature list
    with open(MODELS_DIR / "features.json", 'w') as f:
        json.dump({
            'features': REDUCED_FEATURES,
            'n_features': len(REDUCED_FEATURES),
            'note': 'Reduced feature set to reduce overfitting (from 24 to 13 features)'
        }, f, indent=2)
    
    # Model comparison
    comparison = []
    for r in results:
        comparison.append({
            'Model': r['name'],
            'Accuracy': r['accuracy'],
            'Precision': r['precision'],
            'Recall': r['recall'],
            'F1-Score': r['f1_score'],
            'AUC-ROC': r['auc_roc'],
            'Brier': r['brier_score'],
            'Overfit_Gap': r['overfit_gap']
        })
    
    comparison_df = pd.DataFrame(comparison)
    comparison_df.to_csv(RESULTS_DIR / "model_comparison.csv", index=False)
    print(f"\n[RESULTS]\n{comparison_df.to_string(index=False)}")
    
    # Best model report
    report = {
        "model_type": "clinical_v2_reduced_features",
        "features": REDUCED_FEATURES,
        "n_features": len(REDUCED_FEATURES),
        "note": "Reduced from 24 to 13 features to reduce overfitting",
        "best_model": best['name'],
        "metrics": {
            "accuracy": best['accuracy'],
            "precision": best['precision'],
            "recall": best['recall'],
            "f1_score": best['f1_score'],
            "auc_roc": best['auc_roc'],
            "brier_score": best['brier_score'],
            "overfit_gap": best['overfit_gap']
        },
        "comparison_to_v1": "Compare AUC with original 24-feature model"
    }
    
    with open(RESULTS_DIR / "best_model_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    # Visualizations
    print("\n[VIZ] Generating visualizations...")
    plot_confusion_matrix(np.array(best['confusion_matrix']), best['name'], 
                         VIZ_DIR / "confusion_matrix.png")
    plot_roc_curve(best['y_test'], best['y_proba'], best['name'],
                  VIZ_DIR / "roc_curve.png")
    
    # =========================================
    # STEP 10: Summary
    # =========================================
    print("\n" + "=" * 70)
    print("TRAINING SUMMARY V2")
    print("=" * 70)
    print(f"\n   Best Model:    {best['name']}")
    print(f"   AUC-ROC:       {best['auc_roc']:.4f}")
    print(f"   Brier Score:   {best['brier_score']:.4f}")
    print(f"   Overfit Gap:   {best['overfit_gap']:.2%}")
    print(f"   Features:      {len(REDUCED_FEATURES)} (reduced from 24)")
    print(f"\n   Compare with V1 (24 features):")
    print(f"   - If V2 AUC >= V1 AUC: Use reduced set (less overfitting)")
    print(f"   - If V2 AUC < V1 AUC by >0.02: Keep original")
    
    print("\n[DONE] V2 training complete!")
    
    return results, best


if __name__ == "__main__":
    main()
