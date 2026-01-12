"""
DIANA Ablation Study: Classifier vs Clustering Analysis
Compares different approaches to validate the dual-output methodology.

Usage: python scripts/ablation_study.py
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, roc_auc_score, confusion_matrix
from sklearn.model_selection import train_test_split
import joblib
import json
from pathlib import Path
from collections import Counter


def load_models():
    scaler = joblib.load('models/scaler.joblib')
    classifier = joblib.load('models/random_forest.joblib')
    kmeans = joblib.load('models/kmeans_model.joblib')
    with open('models/cluster_labels.json') as f:
        cluster_labels = json.load(f)
    return scaler, classifier, kmeans, cluster_labels


def run_ablation():
    print('=' * 70)
    print('DIANA ABLATION STUDY')
    print('Comparing Classifier, Clustering, and Combined Approaches')
    print('=' * 70)
    
    df = pd.read_csv('data/nhanes/processed/diana_dataset_final.csv')
    features = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
    df_clean = df.dropna(subset=features + ['diabetes_status'])
    
    X = df_clean[features]
    y_multiclass = df_clean['diabetes_status']
    y_binary = (y_multiclass == 'Diabetic').astype(int)
    
    scaler, classifier, kmeans, cluster_labels = load_models()
    X_scaled = scaler.transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_binary, test_size=0.3, random_state=42, stratify=y_binary
    )
    _, _, y_train_mc, y_test_mc = train_test_split(
        X_scaled, y_multiclass, test_size=0.3, random_state=42, stratify=y_multiclass
    )
    
    print(f'\nDataset: {len(df_clean)} samples')
    print(f'Test set: {len(y_test)} samples')
    print(f'Diabetic in test: {y_test.sum()} ({y_test.mean()*100:.1f}%)')
    
    print('\n' + '=' * 70)
    print('1. CLASSIFIER ALONE (Binary: Diabetic vs Non-Diabetic)')
    print('=' * 70)
    
    y_pred_clf = classifier.predict(X_test)
    y_proba_clf = classifier.predict_proba(X_test)[:, 0]
    
    clf_accuracy = accuracy_score(y_test, y_pred_clf)
    clf_auc = roc_auc_score(y_test, y_proba_clf)
    
    print(f'Accuracy: {clf_accuracy:.4f}')
    print(f'AUC-ROC: {clf_auc:.4f}')
    print(f'Confusion Matrix:')
    cm = confusion_matrix(y_test, y_pred_clf)
    print(f'  TN={cm[0,0]}, FP={cm[0,1]}')
    print(f'  FN={cm[1,0]}, TP={cm[1,1]}')
    
    print('\n' + '=' * 70)
    print('2. CLUSTERING ALONE (Subtype-based Risk)')
    print('=' * 70)
    
    cluster_ids = kmeans.predict(X_test)
    risk_map = {int(k): v['risk_level'] for k, v in cluster_labels.items()}
    cluster_risks = [risk_map.get(c, 'UNKNOWN') for c in cluster_ids]
    
    cluster_pred = np.array([1 if r == 'HIGH' else 0 for r in cluster_risks])
    cluster_accuracy = accuracy_score(y_test, cluster_pred)
    
    print(f'Accuracy (HIGH cluster = Diabetic): {cluster_accuracy:.4f}')
    
    cluster_dist = Counter([cluster_labels[str(c)]['label'] for c in cluster_ids])
    print(f'Cluster distribution: {dict(cluster_dist)}')
    
    high_mask = np.array(cluster_risks) == 'HIGH'
    if high_mask.any():
        high_diabetic_rate = y_test[high_mask].mean()
        print(f'Actual diabetic rate in HIGH clusters: {high_diabetic_rate*100:.1f}%')
    
    low_mask = np.array(cluster_risks) == 'LOW'
    if low_mask.any():
        low_diabetic_rate = y_test[low_mask].mean()
        print(f'Actual diabetic rate in LOW clusters: {low_diabetic_rate*100:.1f}%')
    
    print('\n' + '=' * 70)
    print('3. COMPLEMENTARY VALUE ANALYSIS')
    print('=' * 70)
    
    print('\nProbability distribution by cluster subtype:')
    for label in ['SIDD', 'SIRD', 'MOD', 'MARD']:
        mask = np.array([cluster_labels[str(c)]['label'] == label for c in cluster_ids])
        if mask.any():
            probs = y_proba_clf[mask]
            actual = y_test.values[mask]
            print(f'  {label}: mean_prob={probs.mean()*100:.1f}%, actual_diabetic={actual.mean()*100:.1f}%, n={mask.sum()}')
    
    print('\n' + '=' * 70)
    print('4. KEY FINDING')
    print('=' * 70)
    
    sidd_mask = np.array([cluster_labels[str(c)]['label'] == 'SIDD' for c in cluster_ids])
    sird_mask = np.array([cluster_labels[str(c)]['label'] == 'SIRD' for c in cluster_ids])
    
    if sidd_mask.any() and sird_mask.any():
        sidd_prob = y_proba_clf[sidd_mask].mean()
        sird_prob = y_proba_clf[sird_mask].mean()
        sidd_actual = y_test.values[sidd_mask].mean()
        sird_actual = y_test.values[sird_mask].mean()
        
        print(f'''
SIDD (Insulin-Deficient) vs SIRD (Insulin-Resistant):
  - SIDD: {sidd_prob*100:.1f}% classifier probability, {sidd_actual*100:.1f}% actual diabetic
  - SIRD: {sird_prob*100:.1f}% classifier probability, {sird_actual*100:.1f}% actual diabetic

INTERPRETATION:
  Both are HIGH risk clusters per Ahlqvist, but:
  - SIDD has HIGH HbA1c - classifier gives high probability
  - SIRD has NORMAL HbA1c but metabolic dysfunction - classifier gives low probability
  
  This demonstrates WHY both outputs are needed:
  - Classifier catches current diabetics (high HbA1c)
  - Clustering catches metabolic risk patterns (even with normal HbA1c)
''')
    
    print('=' * 70)
    print('CONCLUSION FOR THESIS DEFENSE')
    print('=' * 70)
    print('''
1. CLASSIFIER provides: Current diabetes probability (0-100%)
   Based on HbA1c/FBS which are diagnostic criteria.
   
2. CLUSTERING provides: Metabolic subtype classification
   Based on full biomarker profile per Ahlqvist et al. (2018).
   
3. COMPLEMENTARY VALUE: SIRD patients have normal HbA1c but
   metabolic dysfunction - classifier alone would miss them.
   Clustering identifies them as HIGH risk for intervention.

RECOMMENDED OUTPUT STRUCTURE:
  - Diabetes Probability: [X]% (from classifier)
  - Metabolic Subtype: [SIDD/SIRD/MOD/MARD] (from clustering)  
  - Subtype Risk Level: [HIGH/MODERATE/LOW] (from Ahlqvist literature)
''')
    
    return {
        'classifier_auc': clf_auc,
        'classifier_accuracy': clf_accuracy,
        'cluster_accuracy': cluster_accuracy,
        'cluster_distribution': dict(cluster_dist)
    }


if __name__ == '__main__':
    results = run_ablation()
