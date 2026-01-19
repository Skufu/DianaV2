"""
DIANA Enhanced ML Training Script
Combines K-Means clustering with supervised classification (Random Forest + XGBoost).

Pipeline:
1. K-means clustering to discover patient groups
2. Random Forest classifier trained on cluster labels
3. XGBoost classifier for comparison
4. Outputs risk scores and feature importance

Usage: python scripts/train_enhanced.py
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, silhouette_score, confusion_matrix
import joblib
import json
from pathlib import Path
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

# Try to import XGBoost
try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("[WARN] XGBoost not installed, using Random Forest only")

DATA_PATH = Path("data/nhanes/processed/diana_training_data_multi.csv")
MODELS_DIR = Path("models")

# Features for clustering and classification
CLUSTER_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']


def find_optimal_k(X_scaled, k_range=range(2, 7)):
    """Find optimal K using silhouette scores."""
    results = []
    print("[INFO] Testing K values...")
    
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        results.append({'k': k, 'wcss': km.inertia_, 'silhouette': sil})
        print(f"   K={k}: Silhouette={sil:.3f}")
    
    return pd.DataFrame(results)


def assign_cluster_labels(profiles):
    """Assign clinical labels based on cluster profiles."""
    labels = {}
    
    for cluster_id in profiles.index:
        p = profiles.loc[cluster_id]
        
        # Tiered scoring based on clinical criteria
        if p['hba1c'] >= 7.0 or p['fbs'] >= 150:
            if p['bmi'] >= 30:
                label = "SIRD-like"
                desc = "Severe Insulin-Resistant Diabetes"
                risk_level = "HIGH"
            else:
                label = "SIDD-like"
                desc = "Severe Insulin-Deficient Diabetes"
                risk_level = "HIGH"
        elif p['bmi'] >= 30 and p['hba1c'] < 6.5:
            label = "MOD-like"
            desc = "Mild Obesity-Related Diabetes"
            risk_level = "MODERATE"
        elif p['hba1c'] < 6.0 and p['fbs'] < 110:
            label = "MARD-like"
            desc = "Mild Age-Related Diabetes"
            risk_level = "LOW"
        else:
            label = f"Risk-Cluster-{cluster_id}"
            desc = "Intermediate risk pattern"
            risk_level = "MODERATE"
        
        labels[int(cluster_id)] = {
            "label": label,
            "description": desc,
            "risk_level": risk_level
        }
    
    return labels


def train_pipeline():
    """Main training pipeline with clustering + supervised classification."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load data
    print(f"[INFO] Loading data from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total records: {len(df)}")
    
    # Select features and drop missing
    X = df[CLUSTER_FEATURES].dropna()
    print(f"   Complete records: {len(X)}")
    
    if len(X) < 100:
        print("[ERROR] Insufficient data")
        return
    
    # ============================================
    # STEP 1: K-MEANS CLUSTERING
    # ============================================
    print("\n" + "=" * 60)
    print("STEP 1: K-MEANS CLUSTERING")
    print("=" * 60)
    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Find optimal K
    k_results = find_optimal_k(X_scaled)
    best_k = k_results.loc[k_results['silhouette'].idxmax(), 'k']
    print(f"\n[RESULT] Optimal K = {int(best_k)}")
    
    # Train K-means
    kmeans = KMeans(n_clusters=int(best_k), random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    
    # Profile clusters
    df_work = df.loc[X.index].copy()
    df_work['cluster'] = cluster_labels
    profiles = df_work.groupby('cluster')[CLUSTER_FEATURES + ['age']].mean().round(2)
    
    print("\n[INFO] Cluster Profiles:")
    print(profiles)
    
    # Assign clinical labels
    cluster_info = assign_cluster_labels(profiles)
    print("\n[INFO] Cluster Labels:")
    for cid, info in cluster_info.items():
        print(f"   Cluster {cid}: {info['label']} ({info['risk_level']})")
    
    df_work['cluster_label'] = df_work['cluster'].map(lambda x: cluster_info[x]['label'])
    df_work['risk_level'] = df_work['cluster'].map(lambda x: cluster_info[x]['risk_level'])
    
    # ============================================
    # STEP 2: SUPERVISED CLASSIFICATION
    # ============================================
    print("\n" + "=" * 60)
    print("STEP 2: SUPERVISED CLASSIFICATION")
    print("=" * 60)
    
    # Prepare classification data
    y = cluster_labels
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"   Train size: {len(X_train)}, Test size: {len(X_test)}")
    
    # Random Forest
    print("\n[TRAIN] Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    rf.fit(X_train, y_train)
    
    rf_train_acc = rf.score(X_train, y_train)
    rf_test_acc = rf.score(X_test, y_test)
    rf_cv = cross_val_score(rf, X_scaled, y, cv=5).mean()
    
    print(f"   Train Accuracy: {rf_train_acc:.3f}")
    print(f"   Test Accuracy:  {rf_test_acc:.3f}")
    print(f"   CV Score (5-fold): {rf_cv:.3f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': CLUSTER_FEATURES,
        'importance': rf.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n[INFO] Feature Importance (Random Forest):")
    for _, row in feature_importance.iterrows():
        print(f"   {row['feature']}: {row['importance']:.3f}")
    
    # XGBoost if available
    xgb = None
    if HAS_XGBOOST:
        print("\n[TRAIN] XGBoost...")
        xgb = XGBClassifier(n_estimators=100, random_state=42, max_depth=5, 
                           eval_metric='mlogloss', verbosity=0)
        xgb.fit(X_train, y_train)
        
        xgb_train_acc = xgb.score(X_train, y_train)
        xgb_test_acc = xgb.score(X_test, y_test)
        xgb_cv = cross_val_score(xgb, X_scaled, y, cv=5).mean()
        
        print(f"   Train Accuracy: {xgb_train_acc:.3f}")
        print(f"   Test Accuracy:  {xgb_test_acc:.3f}")
        print(f"   CV Score (5-fold): {xgb_cv:.3f}")
    
    # ============================================
    # STEP 3: SAVE ARTIFACTS
    # ============================================
    print("\n" + "=" * 60)
    print("STEP 3: SAVING ARTIFACTS")
    print("=" * 60)
    
    # Save models
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    joblib.dump(rf, MODELS_DIR / "random_forest.joblib")
    
    if xgb is not None:
        joblib.dump(xgb, MODELS_DIR / "xgboost.joblib")
    
    # Save cluster info
    with open(MODELS_DIR / "cluster_labels.json", 'w') as f:
        json.dump(cluster_info, f, indent=2)
    
    profiles.to_csv(MODELS_DIR / "cluster_profiles.csv")
    feature_importance.to_csv(MODELS_DIR / "feature_importance.csv", index=False)
    
    # Save clustered data
    df_work.to_csv("data/nhanes/processed/clustered_data_enhanced.csv", index=False)
    
    # Save model metrics
    metrics = {
        "dataset_size": len(X),
        "n_clusters": int(best_k),
        "silhouette_score": float(k_results.loc[k_results['k'] == best_k, 'silhouette'].values[0]),
        "random_forest": {
            "train_accuracy": float(rf_train_acc),
            "test_accuracy": float(rf_test_acc),
            "cv_score": float(rf_cv)
        }
    }
    if xgb is not None:
        metrics["xgboost"] = {
            "train_accuracy": float(xgb_train_acc),
            "test_accuracy": float(xgb_test_acc),
            "cv_score": float(xgb_cv)
        }
    
    with open(MODELS_DIR / "model_metrics.json", 'w') as f:
        json.dump(metrics, f, indent=2)
    
    # Plot feature importance
    plt.figure(figsize=(10, 6))
    plt.barh(feature_importance['feature'], feature_importance['importance'])
    plt.xlabel('Importance')
    plt.title('Feature Importance (Random Forest)')
    plt.tight_layout()
    plt.savefig(MODELS_DIR / "feature_importance.png", dpi=150)
    
    print("\n[SUCCESS] All artifacts saved to models/")
    print("   - scaler.joblib")
    print("   - kmeans_model.joblib")
    print("   - random_forest.joblib")
    if xgb is not None:
        print("   - xgboost.joblib")
    print("   - cluster_labels.json")
    print("   - cluster_profiles.csv")
    print("   - feature_importance.csv")
    print("   - feature_importance.png")
    print("   - model_metrics.json")


if __name__ == "__main__":
    train_pipeline()
