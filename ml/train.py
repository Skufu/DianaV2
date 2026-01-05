"""
DIANA Clinical Model Training Script (Non-Circular)
Trains classifiers WITHOUT HbA1c/FBS as features to avoid circular reasoning.

Features: BMI, Triglycerides, LDL, HDL, Age
Target: diabetes_label (still from HbA1c thresholds - this is the ground truth)

This is the PRIMARY model for clinical risk prediction.
The original model (with HbA1c/FBS) becomes the ADA Baseline for validation.

Usage: python scripts/train_models_v2.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import cross_val_score, StratifiedKFold, LeaveOneGroupOut
from sklearn.preprocessing import StandardScaler, label_binarize
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve, auc,
)

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except Exception as e:
    HAS_XGBOOST = False
    print(f"[WARN] XGBoost not available: {e}")

DATA_PATH = Path("data/nhanes/processed/diana_dataset_final.csv")
MODELS_DIR = Path("models/clinical")
RESULTS_DIR = Path("models/clinical/results")
VIZ_DIR = Path("models/clinical/visualizations")

# Clinical features - NO HbA1c, NO FBS (avoids circular reasoning)
CLINICAL_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
TARGET = 'diabetes_label'
CLASSES = ['Normal', 'Pre-diabetic', 'Diabetic']


def train_and_evaluate(model, model_name, X_train, X_test, y_train, y_test, X_all, y_all):
    """Train a model and calculate all metrics."""
    print(f"\n[TRAIN] {model_name}...")
    
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    recall_macro = recall_score(y_test, y_pred, average='macro', zero_division=0)  # Clinical: catch all classes
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    try:
        auc_roc = roc_auc_score(y_test_bin, y_proba, multi_class='ovr', average='weighted')
    except:
        auc_roc = 0.0
    
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
    print(f"   CV Score:  {cv_mean:.4f} (+/- {cv_std:.4f})")
    
    return {
        'model': model,
        'name': model_name,
        'accuracy': round(accuracy, 4),
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'recall_macro': round(recall_macro, 4),
        'f1_score': round(f1, 4),
        'auc_roc': round(auc_roc, 4),
        'cv_mean': round(cv_mean, 4),
        'cv_std': round(cv_std, 4),
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
    print(f"   Confusion matrix saved to {output_path}")


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
    print(f"   ROC curve saved to {output_path}")


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("DIANA Clinical Model Training (Non-Circular)")
    print("Features: BMI, TG, LDL, HDL, Age (NO HbA1c, NO FBS)")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total records: {len(df)}")
    
    # Check for required columns
    missing_cols = [f for f in CLINICAL_FEATURES if f not in df.columns]
    if missing_cols:
        print(f"[ERROR] Missing columns: {missing_cols}")
        return None, None
    
    # Prepare features - drop rows with missing clinical features
    df_clean = df.dropna(subset=CLINICAL_FEATURES + [TARGET, 'cycle'])
    X = df_clean[CLINICAL_FEATURES].values
    y = df_clean[TARGET].values
    groups = df_clean['cycle'].values
    
    print(f"   Complete records: {len(X)}")
    print(f"   Features: {CLINICAL_FEATURES}")
    print(f"   Class distribution: {dict(zip(*np.unique(y, return_counts=True)))}")
    print(f"   NHANES cycles: {np.unique(groups)}")
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Use Leave-One-Group-Out CV for temporal validation
    print(f"\n[SPLIT] Using Leave-One-Cycle-Out validation...")
    
    logo = LeaveOneGroupOut()
    
    # Get first split for final evaluation (test on 2009-2010)
    train_idx, test_idx = next(logo.split(X_scaled, y, groups))
    X_train, X_test = X_scaled[train_idx], X_scaled[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    
    test_cycle = groups[test_idx][0]
    print(f"   Train: {len(X_train)} (4 cycles), Test: {len(X_test)} ({test_cycle})")
    
    # Define models
    models = [
        (LogisticRegression(max_iter=1000, solver='lbfgs', C=0.5,
                           class_weight='balanced', random_state=42), "Logistic Regression"),
        (RandomForestClassifier(n_estimators=100, max_depth=8, min_samples_leaf=5,
                               min_samples_split=10, class_weight='balanced',
                               random_state=42), "Random Forest"),
    ]
    
    if HAS_XGBOOST:
        models.append((
            XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05,
                         min_child_weight=5, reg_alpha=0.1, reg_lambda=1.0,
                         eval_metric='mlogloss', verbosity=0, random_state=42),
            "XGBoost"
        ))
    
    # Train and evaluate all models
    results = []
    for model, name in models:
        result = train_and_evaluate(model, name, X_train, X_test, y_train, y_test, X_scaled, y)
        results.append(result)
    
    # Select best model by AUC-ROC
    best = max(results, key=lambda x: x['auc_roc'])
    print(f"\n[BEST] {best['name']} selected (AUC-ROC: {best['auc_roc']:.4f})")
    
    # Retrain best model on full dataset for production
    print(f"\n[FINAL] Retraining {best['name']} on full dataset for production...")
    final_model = type(best['model'])(**best['model'].get_params())
    final_model.fit(X_scaled, y)
    
    # Save all models
    print("\n[SAVE] Saving clinical models...")
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    
    for result in results:
        model_file = result['name'].lower().replace(' ', '_') + '.joblib'
        joblib.dump(result['model'], MODELS_DIR / model_file)
        print(f"   {model_file}")
    
    # Save best model (trained on full data)
    joblib.dump(final_model, MODELS_DIR / "best_model.joblib")
    print(f"   best_model.joblib ({best['name']} - full data)")
    
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
            'CV_Mean': r['cv_mean'],
            'CV_Std': r['cv_std']
        })
    
    comparison_df = pd.DataFrame(comparison)
    comparison_df.to_csv(RESULTS_DIR / "model_comparison.csv", index=False)
    print(f"\n[SAVE] Model comparison saved to {RESULTS_DIR / 'model_comparison.csv'}")
    print(comparison_df.to_string(index=False))
    
    # Best model report
    report = {
        "model_type": "clinical",
        "features": CLINICAL_FEATURES,
        "note": "Non-circular model: HbA1c and FBS excluded from features",
        "best_model": best['name'],
        "justification": f"Selected based on highest AUC-ROC score ({best['auc_roc']:.4f}) with Leave-One-Cycle-Out validation",
        "validation_method": "Leave-One-Cycle-Out (temporal validation)",
        "test_cycle": test_cycle,
        "metrics": {
            "accuracy": best['accuracy'],
            "precision": best['precision'],
            "recall": best['recall'],
            "f1_score": best['f1_score'],
            "auc_roc": best['auc_roc'],
            "cv_score": best['cv_mean']
        },
        "auc_threshold_met": best['auc_roc'] >= 0.70,  # Lower threshold for clinical model
        "confusion_matrix": best['confusion_matrix']
    }
    
    with open(RESULTS_DIR / "best_model_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    # Generate visualizations for best model
    print("\n[VIZ] Generating visualizations...")
    plot_confusion_matrix(np.array(best['confusion_matrix']), best['name'], 
                         VIZ_DIR / "confusion_matrix.png")
    plot_roc_curve(best['y_test'], best['y_proba'], best['name'],
                  VIZ_DIR / "roc_curve.png")
    
    # Sanity check: verify we're getting realistic scores
    if best['accuracy'] >= 0.95:
        print("\n[WARN] Accuracy >= 95%. This may indicate residual issues.")
    else:
        print(f"\n[OK] Accuracy {best['accuracy']:.2%} is realistic for clinical prediction.")
    
    print("\n[DONE] Clinical model training complete!")
    
    return results, best


if __name__ == "__main__":
    main()
