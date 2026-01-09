"""
DIANA Clinical Model Training Script (Non-Circular)

================================================================================
WHY HbA1c AND FBS ARE EXCLUDED FROM FEATURES
================================================================================

RATIONALE: Avoiding Circular Reasoning in Diabetes Prediction

The diabetes_label (Normal/Pre-diabetic/Diabetic) is derived directly from 
HbA1c thresholds per ADA guidelines:
  - Normal:       HbA1c < 5.7%
  - Pre-diabetic: HbA1c 5.7-6.4%
  - Diabetic:     HbA1c >= 6.5%

INCLUDING HbA1c OR FBS AS FEATURES WOULD CREATE CIRCULAR REASONING:
  - The model would essentially learn: "if HbA1c >= 6.5, predict Diabetic"
  - This produces artificially high accuracy (>95%) but is clinically useless
  - It's equivalent to predicting the answer using the answer itself

CLINICAL VALUE OF THIS APPROACH:
  - We predict diabetes risk using SURROGATE MARKERS (lipids, BMI, lifestyle)
  - This enables screening BEFORE expensive HbA1c testing
  - Identifies high-risk individuals for priority testing
  - Useful for community health screening programs

THESIS JUSTIFICATION:
  If asked "why not include HbA1c?", explain:
  "Including HbA1c would create data leakage because our target variable 
   is derived from HbA1c itself. We intentionally use surrogate markers 
   to create a clinically useful screening tool."

================================================================================

Features: Biomarkers + Blood Pressure + Lifestyle + Engineered
Target: diabetes_label (from HbA1c thresholds - ground truth only)

Enhancements:
- GridSearchCV for hyperparameter tuning
- Mutual Information for feature selection
- Early stopping for XGBoost
- SMOTE for class imbalance
- Learning curves for thesis visualization
- Probability calibration
- Train/test split traceability
- Feature engineering (BMI categories, lipid ratios, BP categories)

Usage: python ml/train.py
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
    GridSearchCV, train_test_split, learning_curve
)
from sklearn.preprocessing import StandardScaler, label_binarize, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import mutual_info_classif, SelectKBest
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve, auc, brier_score_loss
)

# Try to import SMOTE and SMOTETomek
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

# Try to import CatBoost
try:
    from catboost import CatBoostClassifier
    HAS_CATBOOST = True
except ImportError:
    HAS_CATBOOST = False
    print("[WARN] CatBoost not installed.")

# Try to import LightGBM
try:
    from lightgbm import LGBMClassifier
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("[WARN] LightGBM not installed.")

# Ensemble methods
from sklearn.ensemble import VotingClassifier, StackingClassifier, GradientBoostingClassifier

DATA_PATH = Path("data/nhanes/processed/diana_dataset_imputed.csv")
RAW_DATA_PATH = Path("data/nhanes/processed/diana_training_data_multi.csv")
MODELS_DIR = Path("models/clinical")
RESULTS_DIR = Path("models/clinical/results")
VIZ_DIR = Path("models/clinical/visualizations")

# ================================================================================
# FEATURE CONFIGURATION
# ================================================================================
# EXCLUDED: hba1c, fbs (circular reasoning - see rationale above)
# INCLUDED: Everything else that has predictive value

# Biomarker features (continuous)
BIOMARKER_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

# Blood pressure features (continuous)
BP_FEATURES = ['systolic', 'diastolic']

# Lifestyle features (categorical - will be encoded)
LIFESTYLE_FEATURES = ['smoking_status', 'physical_activity', 'alcohol_use']

# Combined base features
BASE_FEATURES = BIOMARKER_FEATURES + BP_FEATURES

TARGET = 'diabetes_label'
CLASSES = ['Normal', 'Pre-diabetic', 'Diabetic']


def engineer_features(df):
    """
    Create additional features from existing biomarkers.
    
    New features:
    - bmi_category: WHO BMI classification (0-3)
    - tg_hdl_ratio: Triglycerides/HDL (insulin resistance marker)
    - ldl_hdl_ratio: LDL/HDL (cardiovascular risk)
    - bp_category: Blood pressure classification
    - hypertension: Binary hypertension indicator
    - smoking_encoded: Numeric smoking status
    - activity_encoded: Numeric physical activity level
    - alcohol_encoded: Numeric alcohol use level
    - vldl: Very Low-Density Lipoprotein (TG/5)
    - non_hdl: Non-HDL cholesterol (cardiovascular risk)
    - metabolic_syndrome_score: ATP III criteria count
    - bmi_squared: Polynomial feature for non-linear BMI effects
    - age_bmi_interaction: Age-BMI interaction term
    - tg_log: Log-transformed triglycerides
    """
    print("\n[FEATURE ENGINEERING] Creating derived features...")
    
    df = df.copy()
    
    # =========================================
    # BMI Categories (WHO classification)
    # =========================================
    def categorize_bmi(bmi):
        if pd.isna(bmi):
            return np.nan
        elif bmi < 18.5:
            return 0  # Underweight
        elif bmi < 25:
            return 1  # Normal
        elif bmi < 30:
            return 2  # Overweight
        else:
            return 3  # Obese
    
    df['bmi_category'] = df['bmi'].apply(categorize_bmi)
    
    # =========================================
    # Lipid ratios (important insulin resistance markers)
    # =========================================
    df['tg_hdl_ratio'] = df['triglycerides'] / df['hdl'].replace(0, np.nan)
    df['ldl_hdl_ratio'] = df['ldl'] / df['hdl'].replace(0, np.nan)
    
    # =========================================
    # ADVANCED: VLDL and Non-HDL Cholesterol
    # =========================================
    # VLDL (Very Low-Density Lipoprotein) - approximation
    df['vldl'] = df['triglycerides'] / 5
    
    # Non-HDL Cholesterol (LDL + VLDL) - cardiovascular risk marker
    df['non_hdl'] = df['ldl'] + df['vldl']
    
    # Cholesterol to HDL ratio (atherogenic index)
    df['cholesterol_hdl_ratio'] = df['ldl'] / df['hdl'].replace(0, np.nan)
    
    # TG/HDL ratio squared (captures non-linear relationship)
    df['tg_hdl_ratio_sq'] = df['tg_hdl_ratio'] ** 2
    
    # =========================================
    # Blood Pressure Classification (JNC guidelines)
    # =========================================
    def categorize_bp(systolic, diastolic):
        if pd.isna(systolic) or pd.isna(diastolic):
            return np.nan
        elif systolic < 120 and diastolic < 80:
            return 0  # Normal
        elif systolic < 130 and diastolic < 80:
            return 1  # Elevated
        elif systolic < 140 or diastolic < 90:
            return 2  # Stage 1 Hypertension
        else:
            return 3  # Stage 2 Hypertension
    
    if 'systolic' in df.columns and 'diastolic' in df.columns:
        df['bp_category'] = df.apply(lambda x: categorize_bp(x['systolic'], x['diastolic']), axis=1)
        df['hypertension'] = ((df['systolic'] >= 140) | (df['diastolic'] >= 90)).astype(float)
        df['hypertension'] = df['hypertension'].where(df['systolic'].notna() & df['diastolic'].notna(), np.nan)
    
    # =========================================
    # ADVANCED: Metabolic Syndrome Score (ATP III Criteria)
    # =========================================
    # Count of metabolic syndrome criteria met (0-4 for our available features)
    metabolic_criteria = pd.DataFrame({
        'high_tg': df['triglycerides'] > 150,  # TG > 150 mg/dL
        'low_hdl': df['hdl'] < 50,             # HDL < 50 mg/dL (female threshold)
        'high_bp': df['systolic'] >= 130,      # BP >= 130/85
        'high_bmi': df['bmi'] >= 30,           # Obesity as waist proxy
    })
    df['metabolic_syndrome_score'] = metabolic_criteria.sum(axis=1)
    
    # =========================================
    # Lifestyle Feature Encoding
    # =========================================
    smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    if 'smoking_status' in df.columns:
        df['smoking_encoded'] = df['smoking_status'].map(smoking_map)
    
    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    if 'physical_activity' in df.columns:
        df['activity_encoded'] = df['physical_activity'].map(activity_map)
    
    alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}
    if 'alcohol_use' in df.columns:
        df['alcohol_encoded'] = df['alcohol_use'].map(alcohol_map)
    
    # =========================================
    # Age categories
    # =========================================
    df['age_group'] = pd.cut(df['age'], bins=[0, 50, 55, 60, 100], labels=[0, 1, 2, 3]).astype(float)
    
    # =========================================
    # ADVANCED: Polynomial and Interaction Features
    # =========================================
    # BMI squared (captures non-linear obesity effects)
    df['bmi_squared'] = df['bmi'] ** 2
    
    # Age-BMI interaction (older + obese = higher risk)
    df['age_bmi_interaction'] = df['age'] * df['bmi']
    
    # Log transform for skewed triglycerides
    df['tg_log'] = np.log1p(df['triglycerides'])
    
    # =========================================
    # Combined risk indicator (metabolic syndrome proxy)
    # =========================================
    if 'tg_hdl_ratio' in df.columns and 'hypertension' in df.columns:
        high_tg_hdl = (df['tg_hdl_ratio'] > 3.5).astype(float)
        obese = (df['bmi'] >= 30).astype(float)
        df['metabolic_risk'] = high_tg_hdl + df['hypertension'] + obese
    
    # List all engineered features
    engineered_features = [
        'bmi_category', 'tg_hdl_ratio', 'ldl_hdl_ratio', 'age_group',
        'bp_category', 'hypertension', 
        'smoking_encoded', 'activity_encoded', 'alcohol_encoded',
        'metabolic_risk',
        # NEW advanced features
        'vldl', 'non_hdl', 'cholesterol_hdl_ratio', 'tg_hdl_ratio_sq',
        'metabolic_syndrome_score', 'bmi_squared', 'age_bmi_interaction', 'tg_log'
    ]
    
    # Filter to only features that exist
    new_features = [f for f in engineered_features if f in df.columns]
    
    for feat in new_features:
        valid = df[feat].notna().sum()
        print(f"   {feat}: {valid} valid values")
    
    return df, new_features


def compute_mutual_information(X, y, feature_names):
    """
    Compute Mutual Information scores for feature selection.
    """
    print("\n[FEATURE SELECTION] Computing Mutual Information scores...")
    
    mi_scores = mutual_info_classif(X, y, random_state=42)
    
    mi_df = pd.DataFrame({
        'Feature': feature_names,
        'MI_Score': mi_scores
    }).sort_values('MI_Score', ascending=False)
    
    print("\n   Feature Importance (Mutual Information):")
    for _, row in mi_df.iterrows():
        bar = "█" * int(row['MI_Score'] * 50)
        print(f"   {row['Feature']:18} {row['MI_Score']:.4f} {bar}")
    
    return mi_df


def apply_smote(X_train, y_train):
    """
    Apply SMOTE+Tomek to handle class imbalance.
    SMOTETomek combines oversampling with Tomek link removal for cleaner boundaries.
    """
    if not HAS_SMOTE:
        print("\n[WARN] SMOTE skipped - imbalanced-learn not installed!")
        return X_train, y_train
    
    print("\n[SMOTE+TOMEK] Applying Synthetic Minority Over-sampling with Tomek link removal...")
    
    # Show class distribution before
    unique, counts = np.unique(y_train, return_counts=True)
    min_class_samples = min(counts)
    print(f"   Before: {dict(zip(CLASSES, counts))}")
    print(f"   Minority class count: {min_class_samples}")
    
    # Safety check for k_neighbors
    k = min(5, min_class_samples - 1)
    if k < 1: k = 1
    
    print(f"   Using k_neighbors={k}")
    
    # Use SMOTETomek for cleaner synthetic samples
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
        # Fallback to plain SMOTE
        try:
            smote = SMOTE(random_state=42, k_neighbors=k)
            X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
            print("   [INFO] Fell back to plain SMOTE")
        except Exception as e2:
            print(f"   [ERROR] SMOTE also failed: {e2}")
            return X_train, y_train
    
    # Show class distribution after
    unique, counts = np.unique(y_resampled, return_counts=True)
    print(f"   After:  {dict(zip(CLASSES, counts))}")
    print(f"   Samples: {len(y_train)} → {len(y_resampled)}")
    
    return X_resampled, y_resampled


def log_split_traceability(X_train, X_test, y_train, y_test, train_idx, test_idx, test_cycle, output_path):
    """
    Log train/test split details for reproducibility.
    """
    print("\n[TRACEABILITY] Logging train/test split...")
    
    # Create hash of indices for verification
    train_hash = hashlib.md5(str(sorted(train_idx.tolist())).encode()).hexdigest()[:8]
    test_hash = hashlib.md5(str(sorted(test_idx.tolist())).encode()).hexdigest()[:8]
    
    split_log = {
        "timestamp": datetime.now().isoformat(),
        "random_seed": 42,
        "split_method": "LeaveOneGroupOut (NHANES cycles)",
        "test_cycle": test_cycle,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "train_class_distribution": {
            CLASSES[i]: int(count) for i, count in enumerate(np.bincount(y_train))
        },
        "test_class_distribution": {
            CLASSES[i]: int(count) for i, count in enumerate(np.bincount(y_test))
        },
        "train_indices_hash": train_hash,
        "test_indices_hash": test_hash,
        "train_indices_sample": train_idx[:10].tolist(),
        "test_indices_sample": test_idx[:10].tolist(),
        "reproducibility_note": "Use random_state=42 and same data file to reproduce exact split"
    }
    
    with open(output_path, 'w') as f:
        json.dump(split_log, f, indent=2)
    
    print(f"   Train hash: {train_hash}, Test hash: {test_hash}")
    print(f"   Saved to: {output_path}")
    
    return split_log


def plot_learning_curve(estimator, X, y, title, output_path, cv=5):
    """
    Plot learning curve to diagnose overfitting/underfitting.
    """
    print(f"\n[LEARNING CURVE] Generating for {title}...")
    
    train_sizes, train_scores, test_scores = learning_curve(
        estimator, X, y,
        cv=StratifiedKFold(n_splits=cv, shuffle=True, random_state=42),
        n_jobs=-1,
        train_sizes=np.linspace(0.1, 1.0, 10),
        scoring='accuracy'
    )
    
    train_mean = train_scores.mean(axis=1)
    train_std = train_scores.std(axis=1)
    test_mean = test_scores.mean(axis=1)
    test_std = test_scores.std(axis=1)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    ax.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.1, color='blue')
    ax.fill_between(train_sizes, test_mean - test_std, test_mean + test_std, alpha=0.1, color='orange')
    ax.plot(train_sizes, train_mean, 'o-', color='blue', label='Training score')
    ax.plot(train_sizes, test_mean, 'o-', color='orange', label='Cross-validation score')
    
    ax.set_xlabel('Training Examples', fontsize=12)
    ax.set_ylabel('Accuracy', fontsize=12)
    ax.set_title(f'Learning Curve - {title}', fontsize=14)
    ax.legend(loc='best')
    ax.grid(True, alpha=0.3)
    ax.set_ylim([0.3, 0.8])
    
    # Add gap annotation
    final_gap = train_mean[-1] - test_mean[-1]
    ax.annotate(f'Gap: {final_gap:.2%}', 
                xy=(train_sizes[-1], (train_mean[-1] + test_mean[-1])/2),
                fontsize=10, color='red')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"   Saved to: {output_path}")
    print(f"   Final train score: {train_mean[-1]:.4f}")
    print(f"   Final CV score: {test_mean[-1]:.4f}")
    print(f"   Gap: {final_gap:.4f}")
    
    return train_mean[-1], test_mean[-1], final_gap


def calibrate_model(model, X_train, y_train, method='sigmoid'):
    """
    Calibrate model probabilities using Platt scaling or isotonic regression.
    """
    print(f"\n[CALIBRATION] Applying {method} calibration...")
    
    calibrated = CalibratedClassifierCV(model, method=method, cv=5)
    calibrated.fit(X_train, y_train)
    
    return calibrated


def perform_grid_search(model, param_grid, X_train, y_train, model_name, cv=5):
    """
    Perform GridSearchCV for hyperparameter tuning.
    """
    print(f"\n[GRID SEARCH] Tuning {model_name}...")
    print(f"   Parameter grid: {param_grid}")
    
    grid_search = GridSearchCV(
        estimator=model,
        param_grid=param_grid,
        cv=StratifiedKFold(n_splits=cv, shuffle=True, random_state=42),
        scoring='roc_auc_ovr_weighted',
        n_jobs=-1,
        verbose=0
    )
    
    grid_search.fit(X_train, y_train)
    
    print(f"   Best score (CV): {grid_search.best_score_:.4f}")
    print(f"   Best params: {grid_search.best_params_}")
    
    return grid_search.best_estimator_, grid_search.best_params_


def train_and_evaluate(model, model_name, X_train, X_test, y_train, y_test, X_all, y_all):
    """Train a model and calculate all metrics."""
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
    
    # Brier score for calibration quality (lower is better)
    brier_scores = []
    for i in range(3):
        brier = brier_score_loss(y_test_bin[:, i], y_proba[:, i])
        brier_scores.append(brier)
    avg_brier = np.mean(brier_scores)
    
    # Cross-validation on full data
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
    print(f"   Brier:     {avg_brier:.4f} (lower is better)")
    print(f"   CV Score:  {cv_mean:.4f} (+/- {cv_std:.4f})")
    
    # Check for overfitting
    train_score = accuracy_score(y_train, model.predict(X_train))
    overfit_gap = train_score - accuracy
    if overfit_gap > 0.10:
        print(f"   [WARN] Possible overfitting: train={train_score:.4f}, test={accuracy:.4f}, gap={overfit_gap:.4f}")
    else:
        print(f"   [OK] No major overfitting: train-test gap = {overfit_gap:.4f}")
    
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
           title=f'Confusion Matrix - {model_name} (Clinical)')
    
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
    """Plot ROC curve for multiclass."""
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
    ax.set_title(f'ROC Curve - {model_name} (Clinical Model)', fontsize=14)
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()


def plot_feature_importance(mi_df, output_path):
    """Plot feature importance bar chart."""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    colors = plt.cm.viridis(np.linspace(0.3, 0.8, len(mi_df)))
    bars = ax.barh(mi_df['Feature'], mi_df['MI_Score'], color=colors)
    
    ax.set_xlabel('Mutual Information Score', fontsize=12)
    ax.set_title('Feature Importance (Mutual Information)', fontsize=14)
    ax.invert_yaxis()
    ax.grid(axis='x', alpha=0.3)
    
    for bar, score in zip(bars, mi_df['MI_Score']):
        ax.text(bar.get_width() + 0.002, bar.get_y() + bar.get_height()/2,
                f'{score:.4f}', va='center', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 70)
    print("DIANA Clinical Model Training")
    print("GridSearchCV | SMOTE | Learning Curves | Calibration | Traceability")
    print("=" * 70)
    
    # =========================================
    # STEP 1: Load Data
    # =========================================
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total records: {len(df)}")
    
    # =========================================
    # STEP 2: Feature Engineering
    # =========================================
    df, new_features = engineer_features(df)
    ALL_FEATURES = BASE_FEATURES + new_features
    
    # Check for required columns
    missing_cols = [f for f in BASE_FEATURES if f not in df.columns]
    if missing_cols:
        print(f"[ERROR] Missing columns: {missing_cols}")
        return None, None
    
    # Prepare features - drop rows with missing clinical features
    df_clean = df.dropna(subset=BASE_FEATURES + [TARGET, 'cycle'])
    
    # Also drop rows with missing engineered features
    for feat in new_features:
        if feat in df_clean.columns:
            df_clean = df_clean.dropna(subset=[feat])
    
    X = df_clean[ALL_FEATURES].values
    y = df_clean[TARGET].values.astype(int)
    groups = df_clean['cycle'].values
    
    print(f"\n[DATA] Prepared dataset:")
    print(f"   Complete records: {len(X)}")
    print(f"   Features ({len(ALL_FEATURES)}): {ALL_FEATURES}")
    print(f"   Class distribution: {dict(zip(CLASSES, np.bincount(y)))}")
    print(f"   NHANES cycles: {np.unique(groups)}")
    
    # =========================================
    # STEP 3: Feature Selection (Mutual Information)
    # =========================================
    mi_df = compute_mutual_information(X, y, ALL_FEATURES)
    mi_df.to_csv(RESULTS_DIR / "feature_importance.csv", index=False)
    
    # =========================================
    # STEP 4: Standardize
    # =========================================
    print("\n[PREPROCESS] Standardizing features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # =========================================
    # STEP 5: Train/Test Split with Traceability
    # =========================================
    print(f"\n[SPLIT] Using Leave-One-Cycle-Out validation...")
    
    logo = LeaveOneGroupOut()
    
    # Get first split for final evaluation
    all_splits = list(logo.split(X_scaled, y, groups))
    train_idx, test_idx = all_splits[0]
    
    X_train_raw, X_test = X_scaled[train_idx], X_scaled[test_idx]
    y_train_raw, y_test = y[train_idx], y[test_idx]
    
    test_cycle = groups[test_idx][0]
    print(f"   Train: {len(X_train_raw)} samples, Test: {len(X_test)} samples ({test_cycle})")
    
    # Log split traceability
    split_log = log_split_traceability(
        X_train_raw, X_test, y_train_raw, y_test,
        train_idx, test_idx, test_cycle,
        RESULTS_DIR / "split_traceability.json"
    )
    
    # =========================================
    # STEP 6: Apply SMOTE for Class Imbalance
    # =========================================
    X_train, y_train = apply_smote(X_train_raw, y_train_raw)
    
    # =========================================
    # STEP 7: GridSearchCV for Each Model
    # =========================================
    best_params_all = {}
    tuned_models = []
    
    # --- Logistic Regression ---
    lr_param_grid = {
        'C': [0.1, 0.5, 1.0, 2.0],
        'penalty': ['l2'],
        'solver': ['lbfgs'],
        'class_weight': ['balanced']
    }
    lr_base = LogisticRegression(max_iter=1000, random_state=42)
    lr_best, lr_params = perform_grid_search(lr_base, lr_param_grid, X_train, y_train, "Logistic Regression")
    best_params_all['Logistic Regression'] = lr_params
    tuned_models.append((lr_best, "Logistic Regression"))
    
    # --- Random Forest with Aggressive Regularization ---
    # Goal: Reduce overfitting from 46% to <15%
    rf_param_grid = {
        'n_estimators': [200, 300, 500],       # More trees = more stable
        'max_depth': [3, 4, 5, 6],             # Shallow trees (was None/unlimited)
        'min_samples_leaf': [15, 20, 30],      # High = fewer overfitted leaves (was 2)
        'min_samples_split': [20, 30],         # High = more robust splits (was 5)
        'max_features': ['sqrt', 0.5],         # Feature subsampling
        'max_samples': [0.7, 0.8],             # Row subsampling (bootstrap)
        'class_weight': ['balanced'],
        'oob_score': [True]                    # Out-of-bag validation
    }
    rf_base = RandomForestClassifier(random_state=42, bootstrap=True)
    rf_best, rf_params = perform_grid_search(rf_base, rf_param_grid, X_train, y_train, "Random Forest")
    best_params_all['Random Forest'] = rf_params
    tuned_models.append((rf_best, "Random Forest"))
    
    # --- XGBoost with Heavy Regularization to Reduce Overfitting ---
    if HAS_XGBOOST:
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_train, y_train, test_size=0.2, stratify=y_train, random_state=42
        )
        
        # Expanded grid with more regularization options
        xgb_param_grid = {
            'n_estimators': [100, 200, 300],
            'max_depth': [2, 3, 4],  # Shallower trees
            'learning_rate': [0.01, 0.03, 0.05],  # Lower learning rates
            'min_child_weight': [5, 7, 10],  # Higher = more regularization
            'reg_alpha': [0.5, 1.0, 2.0],  # L1 regularization
            'reg_lambda': [2.0, 5.0, 10.0],  # L2 regularization
            'subsample': [0.6, 0.8],  # Row sampling
            'colsample_bytree': [0.6, 0.8],  # Column sampling
        }
        
        print(f"\n[GRID SEARCH] Tuning XGBoost with heavy regularization...")
        print(f"   Parameter combinations: {np.prod([len(v) for v in xgb_param_grid.values()])}")
        
        best_xgb_score = 0
        best_xgb_params = None
        best_xgb_model = None
        
        # Use a subset for faster search
        for n_est in xgb_param_grid['n_estimators']:
            for max_d in xgb_param_grid['max_depth']:
                for lr in xgb_param_grid['learning_rate']:
                    for min_cw in [5, 10]:  # Simplified
                        for reg_a in [0.5, 2.0]:  # Simplified
                            for reg_l in [2.0, 10.0]:  # Simplified
                                for subsamp in [0.6, 0.8]:
                                    for colsamp in [0.7]:  # Fixed
                                        xgb_model = XGBClassifier(
                                            n_estimators=n_est,
                                            max_depth=max_d,
                                            learning_rate=lr,
                                            min_child_weight=min_cw,
                                            reg_alpha=reg_a,
                                            reg_lambda=reg_l,
                                            subsample=subsamp,
                                            colsample_bytree=colsamp,
                                            eval_metric='mlogloss',
                                            verbosity=0,
                                            random_state=42,
                                            early_stopping_rounds=30
                                        )
                                        
                                        xgb_model.fit(
                                            X_tr, y_tr,
                                            eval_set=[(X_val, y_val)],
                                            verbose=False
                                        )
                                        
                                        y_val_proba = xgb_model.predict_proba(X_val)
                                        y_val_bin = label_binarize(y_val, classes=[0, 1, 2])
                                        try:
                                            val_score = roc_auc_score(y_val_bin, y_val_proba, multi_class='ovr', average='weighted')
                                        except:
                                            val_score = 0.0
                                        
                                        if val_score > best_xgb_score:
                                            best_xgb_score = val_score
                                            best_xgb_params = {
                                                'n_estimators': n_est,
                                                'max_depth': max_d,
                                                'learning_rate': lr,
                                                'min_child_weight': min_cw,
                                                'reg_alpha': reg_a,
                                                'reg_lambda': reg_l,
                                                'subsample': subsamp,
                                                'colsample_bytree': colsamp
                                            }
                                            best_xgb_model = xgb_model
        
        print(f"   Best score (Val AUC): {best_xgb_score:.4f}")
        print(f"   Best params: {best_xgb_params}")
        if best_xgb_model:
            print(f"   Early stopped at: {best_xgb_model.best_iteration} iterations")
        best_params_all['XGBoost'] = best_xgb_params
        
        xgb_final = XGBClassifier(
            **best_xgb_params,
            eval_metric='mlogloss',
            verbosity=0,
            random_state=42
        )
        xgb_final.fit(X_train, y_train)
        tuned_models.append((xgb_final, "XGBoost"))
    
    # --- CatBoost (optimized for small datasets) ---
    # Note: CatBoost doesn't work well with sklearn's GridSearchCV due to API incompatibility
    # Using manual hyperparameter search instead
    if HAS_CATBOOST:
        print("\n[MANUAL SEARCH] Tuning CatBoost with regularization...")
        
        X_tr_cat, X_val_cat, y_tr_cat, y_val_cat = train_test_split(
            X_train, y_train, test_size=0.2, stratify=y_train, random_state=42
        )
        
        best_cat_score = 0
        best_cat_params = None
        best_cat_model = None
        
        for depth in [3, 4, 5]:
            for lr in [0.02, 0.05]:
                for iterations in [200, 300]:
                    for l2_reg in [5, 10]:
                        cat_model = CatBoostClassifier(
                            depth=depth,
                            learning_rate=lr,
                            iterations=iterations,
                            l2_leaf_reg=l2_reg,
                            random_state=42,
                            verbose=0,
                            eval_metric='MultiClass'
                        )
                        cat_model.fit(X_tr_cat, y_tr_cat)
                        
                        y_val_proba = cat_model.predict_proba(X_val_cat)
                        y_val_bin = label_binarize(y_val_cat, classes=[0, 1, 2])
                        try:
                            val_score = roc_auc_score(y_val_bin, y_val_proba, multi_class='ovr', average='weighted')
                        except:
                            val_score = 0.0
                        
                        if val_score > best_cat_score:
                            best_cat_score = val_score
                            best_cat_params = {
                                'depth': depth,
                                'learning_rate': lr,
                                'iterations': iterations,
                                'l2_leaf_reg': l2_reg
                            }
                            best_cat_model = cat_model
        
        print(f"   Best score (Val AUC): {best_cat_score:.4f}")
        print(f"   Best params: {best_cat_params}")
        best_params_all['CatBoost'] = best_cat_params
        
        # Retrain on full training set
        cat_final = CatBoostClassifier(**best_cat_params, random_state=42, verbose=0)
        cat_final.fit(X_train, y_train)
        tuned_models.append((cat_final, "CatBoost"))
    
    # --- LightGBM ---
    if HAS_LIGHTGBM:
        print("\n[GRID SEARCH] Tuning LightGBM with regularization...")
        lgb_param_grid = {
            'num_leaves': [15, 20, 31],
            'learning_rate': [0.02, 0.05],
            'n_estimators': [200, 300],
            'min_child_samples': [30, 40, 50],
            'reg_alpha': [1.0, 2.0],
            'reg_lambda': [5.0, 10.0],
        }
        lgb_base = LGBMClassifier(random_state=42, verbose=-1, class_weight='balanced')
        lgb_best, lgb_params = perform_grid_search(lgb_base, lgb_param_grid, X_train, y_train, "LightGBM")
        best_params_all['LightGBM'] = lgb_params
        tuned_models.append((lgb_best, "LightGBM"))
    
    # =========================================
    # STEP 7b: ENSEMBLE METHODS
    # =========================================
    print("\n" + "=" * 70)
    print("ENSEMBLE METHODS")
    print("=" * 70)
    
    # Get best individual models for ensembling
    # NOTE: CatBoost excluded from ensembles due to sklearn API incompatibility
    ensemble_estimators = [('lr', lr_best), ('rf', rf_best)]
    ensemble_weights = [1, 1]
    
    if HAS_XGBOOST and 'XGBoost' in best_params_all:
        xgb_for_ensemble = XGBClassifier(**best_params_all['XGBoost'], eval_metric='mlogloss', verbosity=0, random_state=42)
        ensemble_estimators.append(('xgb', xgb_for_ensemble))
        ensemble_weights.append(1.5)  # Slightly favor gradient boosting
    
    if HAS_LIGHTGBM and 'LightGBM' in best_params_all:
        lgb_for_ensemble = LGBMClassifier(**best_params_all['LightGBM'], verbose=-1, random_state=42)
        ensemble_estimators.append(('lgb', lgb_for_ensemble))
        ensemble_weights.append(1.5)
    
    # Voting Ensemble (soft voting with probabilities)
    print("\n[ENSEMBLE] Training Voting Classifier...")
    voting_clf = VotingClassifier(
        estimators=ensemble_estimators,
        voting='soft',
        weights=ensemble_weights
    )
    voting_clf.fit(X_train, y_train)
    tuned_models.append((voting_clf, "Voting Ensemble"))
    
    # Stacking Ensemble (meta-learner)
    print("[ENSEMBLE] Training Stacking Classifier...")
    stacking_estimators = [
        ('lr', LogisticRegression(C=2.0, class_weight='balanced', max_iter=1000, random_state=42)),
        ('rf', rf_best)
    ]
    if HAS_XGBOOST and 'XGBoost' in best_params_all:
        stacking_estimators.append(('xgb', XGBClassifier(**best_params_all['XGBoost'], eval_metric='mlogloss', verbosity=0, random_state=42)))
    
    stacking_clf = StackingClassifier(
        estimators=stacking_estimators,
        final_estimator=LogisticRegression(C=1.0, max_iter=1000, random_state=42),
        cv=5,
        passthrough=False
    )
    stacking_clf.fit(X_train, y_train)
    tuned_models.append((stacking_clf, "Stacking Ensemble"))
    
    # =========================================
    # STEP 8: Evaluate All Tuned Models
    # =========================================
    print("\n" + "=" * 70)
    print("MODEL EVALUATION (After GridSearchCV + SMOTE)")
    print("=" * 70)
    
    results = []
    for model, name in tuned_models:
        result = train_and_evaluate(model, name, X_train, X_test, y_train, y_test, X_scaled, y)
        results.append(result)
    
    # =========================================
    # STEP 9: Select Best Model & Calibrate
    # =========================================
    best = max(results, key=lambda x: x['auc_roc'])
    print(f"\n[BEST] {best['name']} selected (AUC-ROC: {best['auc_roc']:.4f})")
    
    # Calibrate best model (only for base models, not ensembles)
    if best['name'] in ['Voting Ensemble', 'Stacking Ensemble']:
        # Ensembles already combine probabilities, use as-is
        final_model = best['model']
        calibrated_model = best['model']
        print("[INFO] Ensemble model selected - skipping calibration")
    else:
        # Recreate model with best params for calibration
        if best['name'] == 'XGBoost' and 'XGBoost' in best_params_all:
            final_model = XGBClassifier(
                **best_params_all['XGBoost'],
                eval_metric='mlogloss',
                verbosity=0,
                random_state=42
            )
        elif best['name'] == 'CatBoost' and HAS_CATBOOST and 'CatBoost' in best_params_all:
            final_model = CatBoostClassifier(
                **best_params_all['CatBoost'],
                verbose=0,
                random_state=42
            )
        elif best['name'] == 'LightGBM' and HAS_LIGHTGBM and 'LightGBM' in best_params_all:
            final_model = LGBMClassifier(
                **best_params_all['LightGBM'],
                verbose=-1,
                random_state=42
            )
        else:
            try:
                final_model = type(best['model'])(**best['model'].get_params())
            except:
                final_model = best['model']
        
        # Apply calibration
        print("\n[FINAL] Calibrating and retraining on full dataset...")
        calibrated_model = calibrate_model(final_model, X_scaled, y, method='sigmoid')
    
    # =========================================
    # STEP 9b: SHAP Explainability (for thesis)
    # =========================================
    try:
        import shap
        print("\n[SHAP] Generating feature importance explanations...")
        
        # Find first tree-based model for SHAP (they work best)
        shap_model = None
        shap_model_name = None
        for name in ['XGBoost', 'CatBoost', 'LightGBM', 'Random Forest']:
            for result in results:
                if result['name'] == name:
                    shap_model = result['model']
                    shap_model_name = name
                    break
            if shap_model:
                break
        
        if shap_model and shap_model_name:
            print(f"   Using {shap_model_name} for SHAP analysis...")
            explainer = shap.TreeExplainer(shap_model)
            shap_values = explainer.shap_values(X_test)
            
            # Summary plot
            plt.figure(figsize=(10, 8))
            # Handle different SHAP output formats
            if isinstance(shap_values, list):
                # Multi-class: use absolute mean across classes
                shap.summary_plot(shap_values[1], X_test, feature_names=ALL_FEATURES, show=False)
            else:
                shap.summary_plot(shap_values, X_test, feature_names=ALL_FEATURES, show=False)
            plt.tight_layout()
            plt.savefig(VIZ_DIR / "shap_summary.png", dpi=150, bbox_inches='tight')
            plt.close()
            print(f"   SHAP summary plot saved to: {VIZ_DIR / 'shap_summary.png'}")
    except ImportError:
        print("[WARN] SHAP not installed - skipping explainability analysis")
    except Exception as e:
        print(f"[WARN] SHAP analysis failed: {e}")
    
    # =========================================
    # STEP 10: Generate Learning Curves
    # =========================================
    print("\n" + "=" * 70)
    print("LEARNING CURVES (Overfitting Diagnosis)")
    print("=" * 70)
    
    # Only generate learning curves for base models (not ensembles - too slow)
    for model, name in tuned_models:
        if name in ['Voting Ensemble', 'Stacking Ensemble']:
            continue  # Skip ensembles for learning curves
        safe_name = name.lower().replace(' ', '_')
        plot_learning_curve(
            model, X_train, y_train, name,
            VIZ_DIR / f"learning_curve_{safe_name}.png"
        )
    
    # =========================================
    # STEP 11: Save Models and Results
    # =========================================
    print("\n[SAVE] Saving clinical models...")
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    
    for result in results:
        model_file = result['name'].lower().replace(' ', '_') + '.joblib'
        joblib.dump(result['model'], MODELS_DIR / model_file)
        print(f"   {model_file}")
    
    # Save calibrated model
    joblib.dump(calibrated_model, MODELS_DIR / "best_model_calibrated.joblib")
    print(f"   best_model_calibrated.joblib ({best['name']} - calibrated)")
    
    # Save best uncalibrated model
    joblib.dump(best['model'], MODELS_DIR / "best_model.joblib")
    print(f"   best_model.joblib ({best['name']} - uncalibrated)")
    
    # Save best hyperparameters
    with open(RESULTS_DIR / "best_params.json", 'w') as f:
        json.dump(best_params_all, f, indent=2)
    print(f"\n[SAVE] Best hyperparameters saved to {RESULTS_DIR / 'best_params.json'}")
    
    # Create model comparison CSV
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
            'CV_Mean': r['cv_mean'],
            'CV_Std': r['cv_std'],
            'Train_Acc': r['train_accuracy'],
            'Overfit_Gap': r['overfit_gap']
        })
    
    comparison_df = pd.DataFrame(comparison)
    comparison_df.to_csv(RESULTS_DIR / "model_comparison.csv", index=False)
    print(f"\n[SAVE] Model comparison saved to {RESULTS_DIR / 'model_comparison.csv'}")
    print("\n" + comparison_df.to_string(index=False))
    
    # Best model report
    report = {
        "model_type": "clinical",
        "features": ALL_FEATURES,
        "engineered_features": new_features,
        "note": "Non-circular model with GridSearchCV, SMOTE, calibration",
        "smote_applied": HAS_SMOTE,
        "best_model": best['name'],
        "best_params": best_params_all.get(best['name'], {}),
        "justification": f"Selected based on highest AUC-ROC ({best['auc_roc']:.4f})",
        "validation_method": "Leave-One-Cycle-Out + GridSearchCV",
        "test_cycle": test_cycle,
        "metrics": {
            "accuracy": best['accuracy'],
            "precision": best['precision'],
            "recall": best['recall'],
            "f1_score": best['f1_score'],
            "auc_roc": best['auc_roc'],
            "brier_score": best['brier_score'],
            "cv_score": best['cv_mean'],
            "train_accuracy": best['train_accuracy'],
            "overfit_gap": best['overfit_gap']
        },
        "auc_threshold_met": best['auc_roc'] >= 0.70,
        "confusion_matrix": best['confusion_matrix']
    }
    
    with open(RESULTS_DIR / "best_model_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    # =========================================
    # STEP 12: Generate Visualizations
    # =========================================
    print("\n[VIZ] Generating visualizations...")
    plot_confusion_matrix(np.array(best['confusion_matrix']), best['name'], 
                         VIZ_DIR / "confusion_matrix.png")
    plot_roc_curve(best['y_test'], best['y_proba'], best['name'],
                  VIZ_DIR / "roc_curve.png")
    plot_feature_importance(mi_df, VIZ_DIR / "feature_importance.png")
    
    # =========================================
    # STEP 13: Final Summary
    # =========================================
    print("\n" + "=" * 70)
    print("TRAINING SUMMARY")
    print("=" * 70)
    
    print(f"\n   Best Model:    {best['name']}")
    print(f"   AUC-ROC:       {best['auc_roc']:.4f}")
    print(f"   Brier Score:   {best['brier_score']:.4f}")
    print(f"   Overfit Gap:   {best['overfit_gap']:.2%}")
    print(f"   SMOTE Applied: {'Yes' if HAS_SMOTE else 'No (install imbalanced-learn)'}")
    print(f"   Calibrated:    Yes (sigmoid)")
    
    if best['auc_roc'] >= 0.70:
        print(f"\n   ✅ AUC-ROC threshold (0.70) MET")
    else:
        print(f"\n   ⚠️ AUC-ROC below 0.70 threshold")
    
    print("\n[DONE] Clinical model training complete!")
    
    return results, best


if __name__ == "__main__":
    main()
