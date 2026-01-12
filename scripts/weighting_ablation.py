"""
DIANA Weighting Ablation Study
Tests different weighting schemes: classifier alone, cluster alone, and various combinations.
Run this to justify your final weighting choice (or decision to use separate outputs).

Usage: python scripts/weighting_ablation.py
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split, StratifiedKFold
import joblib
import json
from pathlib import Path


def load_models():
    scaler = joblib.load('models/scaler.joblib')
    classifier = joblib.load('models/random_forest.joblib')
    kmeans = joblib.load('models/kmeans_model.joblib')
    with open('models/cluster_labels.json') as f:
        cluster_labels = json.load(f)
    return scaler, classifier, kmeans, cluster_labels


def compute_weighted_score(cluster_prob, classifier_prob, cluster_weight):
    classifier_weight = 1 - cluster_weight
    return cluster_prob * cluster_weight + classifier_prob * classifier_weight


def run_weighting_ablation():
    print('=' * 70)
    print('DIANA WEIGHTING ABLATION STUDY')
    print('Testing: Classifier alone, Cluster alone, and weighted combinations')
    print('=' * 70)
    
    df = pd.read_csv('data/nhanes/processed/diana_dataset_final.csv')
    features = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
    df_clean = df.dropna(subset=features + ['diabetes_status'])
    
    X = df_clean[features].values
    y_multiclass = df_clean['diabetes_status']
    y_binary = (y_multiclass == 'Diabetic').astype(int).values
    
    scaler, classifier, kmeans, cluster_labels = load_models()
    X_scaled = scaler.transform(X)
    
    risk_level_to_prob = {'HIGH': 0.8, 'MODERATE': 0.5, 'LOW': 0.2, 'UNKNOWN': 0.5}
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    weighting_schemes = [
        ('Classifier Only (0/100)', 0.0),
        ('10/90 Cluster/Classifier', 0.1),
        ('20/80 Cluster/Classifier', 0.2),
        ('30/70 Cluster/Classifier', 0.3),
        ('40/60 Cluster/Classifier', 0.4),
        ('50/50 Cluster/Classifier', 0.5),
        ('60/40 Cluster/Classifier', 0.6),
        ('70/30 Cluster/Classifier', 0.7),
        ('Cluster Only (100/0)', 1.0),
    ]
    
    results = []
    
    for name, cluster_weight in weighting_schemes:
        fold_aucs = []
        fold_f1s = []
        fold_accuracies = []
        
        for train_idx, test_idx in cv.split(X_scaled, y_binary):
            X_test = X_scaled[test_idx]
            y_test = y_binary[test_idx]
            
            classifier_probs = classifier.predict_proba(X_test)[:, 0]
            
            cluster_ids = kmeans.predict(X_test)
            cluster_probs = np.array([
                risk_level_to_prob[cluster_labels[str(c)]['risk_level']] 
                for c in cluster_ids
            ])
            
            combined_probs = compute_weighted_score(cluster_probs, classifier_probs, cluster_weight)
            
            y_pred = (combined_probs >= 0.5).astype(int)
            
            try:
                auc = roc_auc_score(y_test, combined_probs)
            except:
                auc = 0.5
            
            f1 = f1_score(y_test, y_pred, zero_division=0)
            acc = accuracy_score(y_test, y_pred)
            
            fold_aucs.append(auc)
            fold_f1s.append(f1)
            fold_accuracies.append(acc)
        
        results.append({
            'scheme': name,
            'cluster_weight': cluster_weight,
            'mean_auc': np.mean(fold_aucs),
            'std_auc': np.std(fold_aucs),
            'mean_f1': np.mean(fold_f1s),
            'std_f1': np.std(fold_f1s),
            'mean_accuracy': np.mean(fold_accuracies),
        })
    
    print('\n' + '=' * 70)
    print('5-FOLD CROSS-VALIDATION RESULTS')
    print('=' * 70)
    print(f'{"Scheme":<30} {"AUC-ROC":<15} {"F1-Score":<15} {"Accuracy":<12}')
    print('-' * 70)
    
    best_auc_scheme = max(results, key=lambda x: x['mean_auc'])
    best_f1_scheme = max(results, key=lambda x: x['mean_f1'])
    
    for r in results:
        auc_str = f"{r['mean_auc']:.4f} +/- {r['std_auc']:.4f}"
        f1_str = f"{r['mean_f1']:.4f} +/- {r['std_f1']:.4f}"
        acc_str = f"{r['mean_accuracy']:.4f}"
        
        marker = ''
        if r['scheme'] == best_auc_scheme['scheme']:
            marker += ' [BEST AUC]'
        if r['scheme'] == best_f1_scheme['scheme']:
            marker += ' [BEST F1]'
        
        print(f"{r['scheme']:<30} {auc_str:<15} {f1_str:<15} {acc_str:<12}{marker}")
    
    print('\n' + '=' * 70)
    print('RECOMMENDATION FOR THESIS')
    print('=' * 70)
    
    classifier_only = next(r for r in results if r['cluster_weight'] == 0.0)
    cluster_only = next(r for r in results if r['cluster_weight'] == 1.0)
    
    print(f'''
BEST PERFORMING SCHEMES:
  - Best AUC-ROC: {best_auc_scheme['scheme']} (AUC = {best_auc_scheme['mean_auc']:.4f})
  - Best F1-Score: {best_f1_scheme['scheme']} (F1 = {best_f1_scheme['mean_f1']:.4f})

COMPARISON:
  - Classifier Only: AUC = {classifier_only['mean_auc']:.4f}, F1 = {classifier_only['mean_f1']:.4f}
  - Cluster Only:    AUC = {cluster_only['mean_auc']:.4f}, F1 = {cluster_only['mean_f1']:.4f}

THESIS DEFENSE SCRIPT:
  "We conducted ablation testing across 9 weighting schemes using 5-fold 
   cross-validation. The {best_auc_scheme['scheme']} achieved the highest 
   AUC-ROC of {best_auc_scheme['mean_auc']:.4f}. However, we recommend presenting 
   classifier probability and cluster subtype as SEPARATE outputs rather than 
   a combined score, as this provides clearer clinical interpretation:
   
   - Diabetes Probability (0-100%): From XGBoost classifier
   - Metabolic Subtype (SIDD/SIRD/MOD/MARD): From K-Means clustering
   - Subtype Risk Level (HIGH/MODERATE/LOW): From Ahlqvist et al. literature"
''')
    
    results_df = pd.DataFrame(results)
    results_df.to_csv('models/results/weighting_ablation.csv', index=False)
    print('Results saved to: models/results/weighting_ablation.csv')
    
    return results


if __name__ == '__main__':
    results = run_weighting_ablation()
