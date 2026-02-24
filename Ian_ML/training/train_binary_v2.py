"""
DIANA Binary Classification Training V2 - Defensible Evaluation

Binary reformulation: At-Risk (Pre-diabetic + Diabetic) vs Normal
- 16 engineered features (same as 3-class clinical_3class)
- Nested Leave-One-Group-Out (LOGO) validation on NHANES cycles
- Leakage-safe pipeline
- Threshold optimization for recall

Usage: python Ian_ML/training/train_binary_v2_no_bp.py
"""

from __future__ import annotations

import json
import os
import warnings
from collections import defaultdict
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    roc_auc_score,
    roc_curve,
    recall_score,
)
from sklearn.model_selection import (
    GridSearchCV,
    GroupKFold,
    LeaveOneGroupOut,
    cross_val_predict,
)
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

import sys
import importlib
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
try:
    paths_module = importlib.import_module("Ian_ML.common.paths")
except ModuleNotFoundError:
    paths_module = importlib.import_module("..common.paths", package=__package__)
MODELS_ROOT = paths_module.MODELS_ROOT
NHANES_PROCESSED_ROOT = paths_module.NHANES_PROCESSED_ROOT

from Ian_ML.common.feature_constants import (
    CLUSTER_FEATURES,
    CLUSTER_FEATURE_COUNT,
    KMEANS_K,
)


warnings.filterwarnings("ignore")

# Configuration
DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
MODELS_DIR = MODELS_ROOT / "binary_v2_no_bp"
RESULTS_DIR = MODELS_DIR / "results"
VIZ_DIR = MODELS_DIR / "visualizations"

N_JOBS = int(os.environ.get("ML_N_JOBS", "1"))
BOOTSTRAP_SAMPLES = int(os.environ.get("ML_BOOTSTRAP_SAMPLES", "1000"))

# 16 features (same as clinical_3class)
FEATURES = [
    # Original metabolic biomarkers (7)
    "bmi", "triglycerides", "ldl", "hdl", "age",
    "systolic", "diastolic",
    # Derived features (6)
    "bmi_category", "tg_hdl_ratio", "smoking_encoded",
    "activity_encoded", "alcohol_encoded", "metabolic_syndrome_score",
    # Enrichment features (3)
    "waist_circumference", "family_history_diabetes", "race_encoded",
]

# Ahlqvist et al. T2DM Subtype definitions
AHLQVIST_SUBTYPES = {
    'SIRD': {
        'full_name': 'Severe Insulin-Resistant Diabetes',
        'characteristics': 'High BMI, high TG, low HDL (metabolic syndrome pattern)',
        'clinical_implication': 'Responds well to insulin sensitizers (metformin)',
        'risk_level': 'HIGH',
        'risk_label': 'High Risk'
    },
    'SIDD': {
        'full_name': 'Severe Insulin-Deficient Diabetes',
        'characteristics': 'High TG/HDL ratio — metabolic derangement (proxy for insulin deficiency)',
        'clinical_implication': 'May need early insulin therapy',
        'risk_level': 'HIGH',
        'risk_label': 'High Risk'
    },
    'MOD': {
        'full_name': 'Mild Obesity-Related Diabetes',
        'characteristics': 'High BMI (>30), moderate metabolic markers',
        'clinical_implication': 'Weight management primary intervention',
        'risk_level': 'MODERATE',
        'risk_label': 'Moderate Risk'
    },
    'MARD': {
        'full_name': 'Mild Age-Related Diabetes',
        'characteristics': 'Older age at diagnosis, mild metabolic dysfunction',
        'clinical_implication': 'Conservative management, slower progression',
        'risk_level': 'LOW',
        'risk_label': 'Low Risk'
    }
}


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create engineered features (same as clinical_3class)."""
    df = df.copy()

    # Philippine (Asia-Pacific WHO) BMI cutoffs:
    # Underweight <18.5, Normal 18.5-22.9, Overweight 23-24.9, Obese ≥25
    bmi_category = pd.cut(
        df["bmi"], bins=[0, 18.5, 23, 25, 100], labels=[0, 1, 2, 3]
    )
    df["bmi_category"] = pd.Series(bmi_category, index=df.index, dtype="float64")
    df["tg_hdl_ratio"] = df["triglycerides"] / df["hdl"].replace(0, np.nan)

    smoking_map = {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
    if "smoking_status" in df.columns:
        df["smoking_encoded"] = df["smoking_status"].map(
            lambda value: smoking_map.get(value, 1)
        )

    activity_map = {"Sedentary": 0, "Moderate": 1, "Active": 2, "Unknown": 1}
    if "physical_activity" in df.columns:
        df["activity_encoded"] = df["physical_activity"].map(
            lambda value: activity_map.get(value, 1)
        )

    alcohol_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
    if "alcohol_use" in df.columns:
        df["alcohol_encoded"] = df["alcohol_use"].map(
            lambda value: alcohol_map.get(value, 0)
        )

    metabolic_criteria = pd.DataFrame(
        {
            "high_tg": df["triglycerides"] > 150,
            "low_hdl": df["hdl"] < 50,
            "high_bp": df["systolic"] >= 130 if "systolic" in df.columns else False,
            "high_bmi": df["bmi"] >= 25,  # PH Asia-Pacific WHO obesity cutoff
            "high_waist": df["waist_circumference"] >= 80 if "waist_circumference" in df.columns else False,
        }
    )
    df["metabolic_syndrome_score"] = metabolic_criteria.sum(axis=1)

    if "race_ethnicity" in df.columns:
        df["race_encoded"] = df["race_ethnicity"].fillna(0).astype(float)
    else:
        df["race_encoded"] = 0.0

    return df


def create_binary_v2_no_bp_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create binary_v2_no_bp target:
    - 0 = Normal (healthy)
    - 1 = At-Risk (Pre-diabetic + Diabetic)
    
    Clinical rationale: For screening, we want to catch anyone who needs 
    intervention or follow-up testing.
    """
    df = df.copy()
    # Normal (0) stays 0
    # Pre-diabetic (1) + Diabetic (2) become 1 (At-Risk)
    df["at_risk_binary_v2_no_bp"] = (df["diabetes_label"] >= 1).astype(int)
    
    counts = df["at_risk_binary_v2_no_bp"].value_counts()
    total_count = len(df)
    normal_count = int(counts.get(0, 0) or 0)
    at_risk_count = int(counts.get(1, 0) or 0)
    print(f"\n[BINARY TARGET]")
    print(f"  Class 0 (Normal):      {normal_count} ({normal_count/total_count*100:.1f}%)")
    print(f"  Class 1 (At-Risk):     {at_risk_count} ({at_risk_count/total_count*100:.1f}%)")
    
    # Show breakdown
    diabetes_counts = df["diabetes_label"].value_counts().sort_index()
    label_map = {0: "Normal", 1: "Pre-diabetic", 2: "Diabetic"}
    print(f"\n  Breakdown:")
    for lbl, count in diabetes_counts.items():
        if isinstance(lbl, (int, np.integer)):
            label_name = label_map.get(int(lbl), "Unknown")
        else:
            label_name = "Unknown"
        print(f"    {label_name}: {count}")
    
    return df


def get_inner_cv(groups: np.ndarray) -> GroupKFold:
    """Choose a valid group-aware inner CV splitter."""
    n_groups = len(np.unique(groups))
    n_splits = min(3, n_groups)
    if n_splits < 2:
        raise ValueError("Need at least 2 distinct groups for nested group CV.")
    return GroupKFold(n_splits=n_splits)


def build_model_registry() -> dict:
    """Create model configs for nested pipeline CV."""
    registry = {
        "Logistic Regression": {
            "estimator": LogisticRegression(
                max_iter=1500, class_weight="balanced", random_state=42
            ),
            "param_grid": {"model__C": [0.01, 0.1, 0.3, 1.0, 3.0]},
        },
        "Random Forest": {
            "estimator": RandomForestClassifier(
                class_weight="balanced", random_state=42, n_jobs=N_JOBS
            ),
            "param_grid": {
                "model__n_estimators": [200, 300],
                "model__max_depth": [4, 6, 8],
                "model__min_samples_leaf": [10, 15, 25],
            },
        },
    }

    # Add gradient boosting — best model family for tabular data
    try:
        from lightgbm import LGBMClassifier
        registry["LightGBM"] = {
            "estimator": LGBMClassifier(
                random_state=42, verbose=-1, n_jobs=N_JOBS,
                is_unbalance=True,  # Fix: match class_weight="balanced" used by LR/RF
            ),
            "param_grid": {
                "model__n_estimators": [200, 400],
                "model__max_depth": [3, 5, 7],
                "model__learning_rate": [0.05, 0.1],
                "model__min_child_samples": [20, 30],
            },
        }
    except ImportError:
        from sklearn.ensemble import GradientBoostingClassifier
        registry["Gradient Boosting"] = {
            "estimator": GradientBoostingClassifier(
                random_state=42, max_features="sqrt",
            ),
            "param_grid": {
                "model__n_estimators": [200, 300],
                "model__max_depth": [3, 5],
                "model__learning_rate": [0.05, 0.1],
                "model__min_samples_leaf": [15, 25],
            },
        }

    return registry


def compute_binary_v2_no_bp_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray) -> dict:
    """Compute comprehensive binary_v2_no_bp classification metrics."""
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    
    accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0.0
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0
    f1 = (2 * ppv * sensitivity) / (ppv + sensitivity) if (ppv + sensitivity) > 0 else 0.0
    
    return {
        "accuracy": float(accuracy),
        "auc_roc": float(roc_auc_score(y_true, y_proba)),
        "sensitivity": float(sensitivity),
        "specificity": float(specificity),
        "ppv": float(ppv),
        "npv": float(npv),
        "f1": float(f1),
        "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn),
    }


def optimize_binary_v2_no_bp_threshold(
    y_true: np.ndarray, 
    y_proba: np.ndarray,
    min_sensitivity: float = 0.75,
) -> dict:
    """
    Multi-strategy threshold optimization for binary_v2_no_bp screening.

    Returns the BEST operating point across three strategies:

    1. **Youden's J** (Sensitivity + Specificity - 1)
       Best balanced accuracy — the textbook clinical threshold.

    2. **Screening** (maximize sensitivity subject to specificity >= 0.30)
       High recall, but avoids the degenerate "flag everyone" trap.

    3. **G-mean** (sqrt(sensitivity * specificity))
       Geometric mean penalises extreme imbalance more than Youden.

    After finding each strategy's best threshold, the function picks the
    overall winner based on a composite score:
        0.40 * sensitivity + 0.25 * specificity + 0.25 * f1 + 0.10 * accuracy
    This ensures we value recall highly but still reward meaningful specificity.
    """
    thresholds = np.arange(0.10, 0.90, 0.01)
    
    strategies: dict[str, dict] = {}

    # --- Strategy 1: Youden's J ---
    best_j = -1.0
    best_j_thresh = 0.5
    for thresh in thresholds:
        y_pred = (y_proba >= thresh).astype(int)
        m = compute_binary_v2_no_bp_metrics(y_true, y_pred, y_proba)
        j = m["sensitivity"] + m["specificity"] - 1.0
        if j > best_j:
            best_j = j
            best_j_thresh = thresh
    strategies["youden"] = {
        "threshold": float(best_j_thresh),
        "metrics": compute_binary_v2_no_bp_metrics(
            y_true, (y_proba >= best_j_thresh).astype(int), y_proba
        ),
    }

    # --- Strategy 2: Screening (high sens, spec >= 0.40) ---
    best_screen_score = -1.0
    best_screen_thresh = 0.5
    for thresh in thresholds:
        y_pred = (y_proba >= thresh).astype(int)
        m = compute_binary_v2_no_bp_metrics(y_true, y_pred, y_proba)
        if m["specificity"] >= 0.40 and m["sensitivity"] >= min_sensitivity:
            score = 0.60 * m["sensitivity"] + 0.40 * m["f1"]
            if score > best_screen_score:
                best_screen_score = score
                best_screen_thresh = thresh
    strategies["screening"] = {
        "threshold": float(best_screen_thresh),
        "metrics": compute_binary_v2_no_bp_metrics(
            y_true, (y_proba >= best_screen_thresh).astype(int), y_proba
        ),
    }

    # --- Strategy 3: G-mean ---
    best_gmean = -1.0
    best_gmean_thresh = 0.5
    for thresh in thresholds:
        y_pred = (y_proba >= thresh).astype(int)
        m = compute_binary_v2_no_bp_metrics(y_true, y_pred, y_proba)
        gmean = np.sqrt(m["sensitivity"] * m["specificity"])
        if gmean > best_gmean:
            best_gmean = gmean
            best_gmean_thresh = thresh
    strategies["gmean"] = {
        "threshold": float(best_gmean_thresh),
        "metrics": compute_binary_v2_no_bp_metrics(
            y_true, (y_proba >= best_gmean_thresh).astype(int), y_proba
        ),
    }

    # --- Pick overall best via composite score ---
    def _composite(m: dict) -> float:
        return (
            0.35 * m["sensitivity"]
            + 0.30 * m["specificity"]
            + 0.25 * m["f1"]
            + 0.10 * m["accuracy"]
        )

    best_name = max(strategies, key=lambda n: _composite(strategies[n]["metrics"]))

    return {
        "threshold": strategies[best_name]["threshold"],
        "metrics": strategies[best_name]["metrics"],
        "strategy": best_name,
        "all_strategies": {
            name: {
                "threshold": s["threshold"],
                "sensitivity": s["metrics"]["sensitivity"],
                "specificity": s["metrics"]["specificity"],
                "accuracy": s["metrics"]["accuracy"],
                "f1": s["metrics"]["f1"],
            }
            for name, s in strategies.items()
        },
    }


def run_nested_logo_evaluation(
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
    model_registry: dict,
) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    Outer loop: LOGO on NHANES cycles.
    Inner loop: group-aware grid search with leakage-safe pipeline.
    """
    outer_cv = LeaveOneGroupOut()
    fold_rows = []
    store = defaultdict(
        lambda: {
            "y_true": [],
            "y_proba": [],
            "y_pred_default": [],
            "y_pred_thresholded": [],
            "thresholds": [],
            "inner_cv_auc": [],
        }
    )

    split_count = len(list(outer_cv.split(X, y, groups)))
    print(f"\n[NESTED-CV] Outer LOGO folds: {split_count}")

    for fold_idx, (train_idx, test_idx) in enumerate(outer_cv.split(X, y, groups), start=1):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        g_train = groups[train_idx]
        test_cycle = str(groups[test_idx][0])
        inner_cv = get_inner_cv(g_train)

        print(f"\n[FOLD {fold_idx}/{split_count}] Holdout cycle: {test_cycle}")
        for model_name, cfg in model_registry.items():
            pipeline = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("model", cfg["estimator"]),
            ])
            
            search = GridSearchCV(
                estimator=pipeline,
                param_grid=cfg["param_grid"],
                scoring="roc_auc",  # Binary AUC
                cv=inner_cv.split(X_train, y_train, g_train),
                n_jobs=N_JOBS,
                refit=True,
                error_score=np.nan,
            )

            try:
                search.fit(X_train, y_train)
            except Exception as exc:
                print(f"   [SKIP] {model_name}: {exc}")
                continue

            if np.isnan(search.best_score_):
                print(f"   [SKIP] {model_name}: no valid inner CV score")
                continue

            best_pipeline = search.best_estimator_
            
            # Get OOF predictions for threshold optimization
            train_oof = cross_val_predict(
                best_pipeline,
                X_train,
                y_train,
                cv=inner_cv.split(X_train, y_train, g_train),
                method="predict_proba",
                n_jobs=N_JOBS,
            )
            train_oof_proba = np.asarray(train_oof)[:, 1]
            
            thresh_result = optimize_binary_v2_no_bp_threshold(y_train, train_oof_proba)
            threshold = thresh_result["threshold"]

            # Test predictions
            test_proba = np.asarray(best_pipeline.predict_proba(X_test))[:, 1]
            test_pred_default = (test_proba >= 0.5).astype(int)
            test_pred_thresholded = (test_proba >= threshold).astype(int)

            default_metrics = compute_binary_v2_no_bp_metrics(y_test, test_pred_default, test_proba)
            threshold_metrics = compute_binary_v2_no_bp_metrics(y_test, test_pred_thresholded, test_proba)

            fold_rows.append({
                "Fold": fold_idx,
                "Test_Cycle": test_cycle,
                "Model": model_name,
                "Inner_CV_AUC": float(search.best_score_),
                "AUC_ROC": threshold_metrics["auc_roc"],
                "Accuracy": threshold_metrics["accuracy"],
                "Sensitivity": threshold_metrics["sensitivity"],
                "Specificity": threshold_metrics["specificity"],
                "PPV": threshold_metrics["ppv"],
                "NPV": threshold_metrics["npv"],
                "F1": threshold_metrics["f1"],
                "Threshold": threshold,
                "Best_Params": json.dumps(search.best_params_),
            })

            s = store[model_name]
            s["y_true"].append(y_test)
            s["y_proba"].append(test_proba)
            s["y_pred_default"].append(test_pred_default)
            s["y_pred_thresholded"].append(test_pred_thresholded)
            s["thresholds"].append(threshold)
            s["inner_cv_auc"].append(float(search.best_score_))

            print(
                f"   {model_name:<20} "
                f"AUC={threshold_metrics['auc_roc']:.4f} "
                f"Sens={threshold_metrics['sensitivity']:.3f} "
                f"Spec={threshold_metrics['specificity']:.3f} "
                f"Thresh={threshold:.2f}"
            )

    fold_df = pd.DataFrame(fold_rows)
    if fold_df.empty:
        raise RuntimeError("No model completed nested LOGO evaluation successfully.")

    # Aggregate results
    comparison_rows = []
    aggregated = {}
    for model_name, s in store.items():
        y_true = np.concatenate(s["y_true"])
        y_proba = np.concatenate(s["y_proba"])
        y_pred_default = np.concatenate(s["y_pred_default"])
        y_pred_thresholded = np.concatenate(s["y_pred_thresholded"])

        default_metrics = compute_binary_v2_no_bp_metrics(y_true, y_pred_default, y_proba)
        threshold_metrics = compute_binary_v2_no_bp_metrics(y_true, y_pred_thresholded, y_proba)
        
        # Bootstrap CIs for key metrics
        sensitivity_ci = bootstrap_metric_ci(
            y_true,
            y_pred_thresholded,
            lambda yt, yp: recall_score(yt, yp, zero_division="warn"),
        )
        auc_ci = bootstrap_auc_ci(y_true, y_proba)

        model_folds = fold_df[fold_df["Model"] == model_name]
        comparison_rows.append({
            "Model": model_name,
            "AUC_ROC": threshold_metrics["auc_roc"],
            "AUC_CI_Lower": auc_ci[0],
            "AUC_CI_Upper": auc_ci[1],
            "Accuracy": threshold_metrics["accuracy"],
            "Sensitivity": threshold_metrics["sensitivity"],
            "Sensitivity_CI_Lower": sensitivity_ci[0],
            "Sensitivity_CI_Upper": sensitivity_ci[1],
            "Specificity": threshold_metrics["specificity"],
            "PPV": threshold_metrics["ppv"],
            "NPV": threshold_metrics["npv"],
            "F1": threshold_metrics["f1"],
            "Mean_Threshold": np.mean(s["thresholds"]),
            "Inner_CV_AUC_Mean": float(np.mean(s["inner_cv_auc"])),
            "Inner_CV_AUC_Std": float(np.std(s["inner_cv_auc"])),
            "Mean_Fold_AUC": float(np.mean([fold_df[(fold_df["Model"] == model_name)]["AUC_ROC"].mean()])) if not fold_df.empty else 0.0,
        })

        aggregated[model_name] = {
            "y_true": y_true,
            "y_proba": y_proba,
            "y_pred": y_pred_thresholded,
            "metrics": threshold_metrics,
        }

    comparison_df = pd.DataFrame(comparison_rows)
    return fold_df, comparison_df, aggregated


def bootstrap_metric_ci(y_true: np.ndarray, y_pred: np.ndarray, 
                        metric_fn, n_bootstraps: int = 1000, ci: float = 0.95) -> tuple:
    """Bootstrap confidence interval for a metric."""
    rng = np.random.RandomState(42)
    n_samples = len(y_true)
    scores = []
    
    for _ in range(n_bootstraps):
        indices = rng.randint(0, n_samples, n_samples)
        if len(np.unique(y_true[indices])) < 2:
            continue
        score = metric_fn(y_true[indices], y_pred[indices])
        scores.append(score)
    
    if len(scores) < 100:
        return (np.nan, np.nan)
    
    alpha = (1 - ci) / 2
    return (
        float(np.percentile(scores, alpha * 100)),
        float(np.percentile(scores, (1 - alpha) * 100)),
    )


def bootstrap_auc_ci(y_true: np.ndarray, y_proba: np.ndarray, 
                     n_bootstraps: int = 1000, ci: float = 0.95) -> tuple:
    """Bootstrap confidence interval for AUC."""
    rng = np.random.RandomState(42)
    n_samples = len(y_true)
    scores = []
    
    for _ in range(n_bootstraps):
        indices = rng.randint(0, n_samples, n_samples)
        if len(np.unique(y_true[indices])) < 2:
            continue
        try:
            score = roc_auc_score(y_true[indices], y_proba[indices])
            scores.append(score)
        except ValueError:
            continue
    
    if len(scores) < 100:
        return (np.nan, np.nan)
    
    alpha = (1 - ci) / 2
    return (
        float(np.percentile(scores, alpha * 100)),
        float(np.percentile(scores, (1 - alpha) * 100)),
    )


def assign_ahlqvist_labels(cluster_centers, feature_names, k=4):
    """
    Assign Ahlqvist subtype labels to clusters based on centroid characteristics.
    Assignment strategy (without HbA1c):
    1. SIRD (Severe Insulin-Resistant): Highest insulin resistance composite
       (BMI + TG/50 - HDL/10)
    2. SIDD (Severe Insulin-Deficient): Highest TG/HDL ratio among remaining
       (metabolic derangement proxy)
    3. MOD (Mild Obesity-Related): Highest BMI of remaining
    4. MARD (Mild Age-Related): Remaining (typically lowest metabolic risk)
    """
    centers_df = pd.DataFrame(cluster_centers, columns=feature_names)
    available_clusters = list(range(k))
    final_labels = {}
    
    # 1. Identify SIRD
    ir_scores = {}
    for cid in available_clusters:
        c = centers_df.iloc[cid]
        ir_scores[cid] = c.get('bmi', 0) + (c.get('triglycerides', 0) / 50) - (c.get('hdl', 0) / 10)
    
    sird_id = max(ir_scores, key=ir_scores.get)
    final_labels[sird_id] = 'SIRD'
    available_clusters.remove(sird_id)
    
    # 2. Identify SIDD
    tg_hdl_scores = {}
    for cid in available_clusters:
        c = centers_df.iloc[cid]
        tg_hdl_scores[cid] = c.get('triglycerides', 0) / max(c.get('hdl', 1), 0.01)
    
    sidd_id = max(tg_hdl_scores, key=tg_hdl_scores.get)
    final_labels[sidd_id] = 'SIDD'
    available_clusters.remove(sidd_id)
    
    # 3. Identify MOD
    mod_scores = {}
    for cid in available_clusters:
        mod_scores[cid] = centers_df.iloc[cid].get('bmi', 0)
    
    mod_id = max(mod_scores, key=mod_scores.get)
    final_labels[mod_id] = 'MOD'
    available_clusters.remove(mod_id)
    
    # 4. Identify MARD
    mard_id = available_clusters[0]
    final_labels[mard_id] = 'MARD'
    
    return final_labels


def train_serving_kmeans(
    X: np.ndarray,
    y: np.ndarray,
    features: list,
    diabetes_labels: np.ndarray | None = None,
) -> dict:
    """
    Train K-Means clustering for T2DM subtype identification.

    IMPORTANT SCIENTIFIC DECISION:
    Ahlqvist et al. (2018) defined SIRD/SIDD/MOD/MARD subtypes for
    *diagnosed* T2DM patients.  We therefore:
      1. Fit K-Means ONLY on at-risk patients (y == 1).
      2. Save the scaler fitted on at-risk patients so that at inference
         time we can transform a new at-risk patient into the same space.
      3. Report per-cluster diabetic vs pre-diabetic breakdown for
         clinical context.

    At inference time, the clustering should ONLY be applied to patients
    the binary_v2_no_bp classifier has already flagged as At-Risk.
    """
    # Use base clinical features for clustering (same as clinical_3class)
    # IMPORTED from Ian_ML.common.feature_constants - DO NOT HARDCODE
    cluster_features = CLUSTER_FEATURES

    # Create feature index mapping
    feature_idx = {f: i for i, f in enumerate(features)}
    cluster_idx = [feature_idx[f] for f in cluster_features if f in feature_idx]

    if len(cluster_idx) != len(cluster_features):
        print(f"[WARNING] Missing cluster features, using all available")
        cluster_idx = list(range(min(5, X.shape[1])))

    # ── Filter to at-risk patients only ──────────────────────────────
    at_risk_mask = (y == 1)
    X_at_risk = X[at_risk_mask][:, cluster_idx].copy()

    print(f"\n[CLUSTERING] Fitting on at-risk patients only: "
          f"n={int(at_risk_mask.sum())} / {len(y)} total")

    # Handle NaN values before clustering
    imputer = SimpleImputer(strategy="median")
    X_at_risk = imputer.fit_transform(X_at_risk)

    # Scale for clustering (fitted on at-risk population only)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_at_risk)

    # Train K-Means with K=4
    kmeans = KMeans(n_clusters=4, random_state=42, n_init="auto")
    clusters = kmeans.fit_predict(X_scaled)

    # Assign Ahlqvist labels based on centroid characteristics
    label_map = assign_ahlqvist_labels(
        kmeans.cluster_centers_, cluster_features, k=4
    )

    # ── Build cluster profiles (at-risk patients only) ───────────────
    # If we have original 3-class labels, compute diabetic rate within
    # each cluster for richer clinical context.
    if diabetes_labels is not None:
        y_original_at_risk = diabetes_labels[at_risk_mask]
    else:
        y_original_at_risk = None

    cluster_profiles = {}
    for k in range(4):
        mask = clusters == k
        cluster_size = int(np.sum(mask))
        subtype_key = label_map[k]
        subtype_info = AHLQVIST_SUBTYPES[subtype_key]

        profile: dict = {
            "label": subtype_key,
            "subtype": subtype_key,
            "subtype_full": subtype_info["full_name"],
            "risk_level": subtype_info["risk_level"],
            "risk_label": subtype_info["risk_label"],
            "description": subtype_info["characteristics"],
            "treatment_focus": subtype_info["clinical_implication"],
            "size": cluster_size,
            "population": "at_risk_only",
        }

        # Add diabetic vs pre-diabetic breakdown if available
        if y_original_at_risk is not None:
            cluster_labels = y_original_at_risk[mask]
            diabetic_count = int(np.sum(cluster_labels == 2))
            prediabetic_count = int(np.sum(cluster_labels == 1))
            diabetic_rate = (
                diabetic_count / cluster_size if cluster_size > 0 else 0.0
            )
            profile["diabetic_count"] = diabetic_count
            profile["prediabetic_count"] = prediabetic_count
            profile["diabetic_rate"] = float(diabetic_rate)
            profile["severity_score"] = float(diabetic_rate)
        else:
            profile["severity_score"] = 0.5  # unknown

        cluster_profiles[k] = profile

    # Save artifacts
    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    joblib.dump(scaler, MODELS_DIR / "cluster_scaler.joblib")

    with open(MODELS_DIR / "cluster_labels.json", 'w') as f:
        json.dump(cluster_profiles, f, indent=2)

    print(f"[CLUSTERING] K-Means K=4 trained with Ahlqvist subtypes (at-risk only)")
    for k, prof in cluster_profiles.items():
        severity = prof.get("diabetic_rate", "?")
        sev_str = f", {severity:.0%} diabetic" if isinstance(severity, float) else ""
        print(
            f"  Cluster {k}: {prof['subtype']} "
            f"(n={prof['size']}{sev_str})"
        )

    return cluster_profiles


def save_feature_manifest() -> None:
    """Persist feature contract for inference."""
    with open(MODELS_DIR / "features.json", "w") as f:
        json.dump({
            "features": FEATURES,
            "n_features": len(FEATURES),
            "target": "at_risk_binary_v2_no_bp (0=Normal, 1=At-Risk)",
            "note": "Binary reformulation with 16 features, LOCO validation",
        }, f, indent=2)


def save_fold_metrics(fold_df: pd.DataFrame) -> None:
    """Save per-fold metrics for defensibility."""
    fold_df.to_csv(RESULTS_DIR / "logo_fold_metrics.csv", index=False)
    
    # Summary by model
    summary = fold_df.groupby("Model").agg({
        "AUC_ROC": ["mean", "std", "min", "max"],
        "Sensitivity": ["mean", "std"],
        "Specificity": ["mean", "std"],
    }).round(4)
    
    summary.to_csv(RESULTS_DIR / "logo_summary_by_model.csv")
    print(f"\n[DEFENSIBILITY] Saved fold metrics to {RESULTS_DIR}")


def save_best_model_report(comparison_df: pd.DataFrame, best_model_name: str) -> None:
    """Save comprehensive report for best model."""
    best_row = comparison_df[comparison_df["Model"] == best_model_name].iloc[0]
    
    report = {
        "model_type": "binary_v2_no_bp",
        "target": "at_risk_binary_v2_no_bp (0=Normal, 1=At-Risk)",
        "best_model": best_model_name,
        "n_features": len(FEATURES),
        "validation_method": "Nested LOGO (outer) + GroupKFold Pipeline CV (inner)",
        "metrics": {
            "auc_roc": float(best_row["AUC_ROC"]),
            "auc_ci_95": [float(best_row["AUC_CI_Lower"]), float(best_row["AUC_CI_Upper"])],
            "accuracy": float(best_row["Accuracy"]),
            "sensitivity": float(best_row["Sensitivity"]),
            "sensitivity_ci_95": [float(best_row["Sensitivity_CI_Lower"]), float(best_row["Sensitivity_CI_Upper"])],
            "specificity": float(best_row["Specificity"]),
            "ppv": float(best_row["PPV"]),
            "npv": float(best_row["NPV"]),
            "f1": float(best_row["F1"]),
            "mean_threshold": float(best_row["Mean_Threshold"]),
            "inner_cv_auc_mean": float(best_row["Inner_CV_AUC_Mean"]),
            "inner_cv_auc_std": float(best_row["Inner_CV_AUC_Std"]),
        },
        "features": FEATURES,
        "clinical_rationale": "Binary reformulation: Normal vs At-Risk (Pre-diabetic + Diabetic). Prioritizes sensitivity for screening.",
    }
    
    with open(RESULTS_DIR / "best_model_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"[SAVED] Best model report to {RESULTS_DIR / 'best_model_report.json'}")


def generate_roc_curve(aggregated: dict, best_model_name: str) -> None:
    """Generate ROC curve for best model."""
    s = aggregated[best_model_name]
    y_true = s["y_true"]
    y_proba = s["y_proba"]
    
    fpr, tpr, _ = roc_curve(y_true, y_proba)
    auc_val = roc_auc_score(y_true, y_proba)
    
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, 'b-', linewidth=2, label=f'{best_model_name} (AUC = {auc_val:.3f})')
    plt.plot([0, 1], [0, 1], 'k--', label='Random')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve - Binary At-Risk Prediction')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "roc_curve.png", dpi=150, bbox_inches='tight')
    plt.close()
    print(f"[SAVED] ROC curve to {VIZ_DIR / 'roc_curve.png'}")


def main():
    """Main training pipeline."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 78)
    print("DIANA Binary Model Training V2 - Defensible Evaluation")
    print("Binary: Normal vs At-Risk | 16 Features | LOCO Validation")
    print("=" * 78)
    
    # Load data
    print(f"\n[LOAD] Reading from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"       Records: {len(df)}")
    
    # Engineer features
    df = engineer_features(df)
    
    # Create binary_v2_no_bp target
    df = create_binary_v2_no_bp_target(df)
    
    # Filter to records with target and cycle
    df_clean = df.dropna(subset=["at_risk_binary_v2_no_bp", "cycle"]).copy()
    print(f"       Records after filtering: {len(df_clean)}")
    
    # Check for missing features
    missing_cols = [f for f in FEATURES + ["at_risk_binary_v2_no_bp", "cycle"] if f not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing columns: {missing_cols}")
    
    # Prepare data
    X = df_clean[FEATURES].values.astype(float)
    y = df_clean["at_risk_binary_v2_no_bp"].values.astype(int)
    groups = df_clean["cycle"].astype(str).to_numpy()
    # Keep original 3-class labels for cluster profiling
    diabetes_labels = df_clean["diabetes_label"].values.astype(int)
    
    print(f"\n[DATA]")
    print(f"       Features: {len(FEATURES)}")
    print(f"       Samples: {len(X)}")
    print(f"       NHANES cycles: {list(np.unique(groups))}")
    
    # Train clustering (at-risk patients only — scientifically correct)
    cluster_profiles = train_serving_kmeans(X, y, FEATURES, diabetes_labels)
    
    # Build model registry
    model_registry = build_model_registry()
    
    # Run nested LOGO evaluation
    fold_df, comparison_df, aggregated = run_nested_logo_evaluation(
        X, y, groups, model_registry
    )
    
    # Select best model by mean fold AUC (more defensible than aggregated AUC)
    fold_auc_by_model = fold_df.groupby("Model")["AUC_ROC"].mean()
    best_model_name = fold_auc_by_model.idxmax()
    best = comparison_df[comparison_df["Model"] == best_model_name].iloc[0]
    
    print("\n" + "=" * 78)
    print("MODEL COMPARISON")
    print("=" * 78)
    for _, row in comparison_df.iterrows():
        print(f"\n{row['Model']}:")
        print(f"  AUC-ROC:      {row['AUC_ROC']:.4f} [{row['AUC_CI_Lower']:.3f}, {row['AUC_CI_Upper']:.3f}]")
        print(f"  Sensitivity:  {row['Sensitivity']:.4f} [{row['Sensitivity_CI_Lower']:.3f}, {row['Sensitivity_CI_Upper']:.3f}]")
        print(f"  Specificity:  {row['Specificity']:.4f}")
        print(f"  PPV/NPV:      {row['PPV']:.3f} / {row['NPV']:.3f}")
        print(f"  F1-Score:     {row['F1']:.4f}")
        print(f"  Threshold:    {row['Mean_Threshold']:.3f}")
    
    print("\n" + "=" * 78)
    print(f"BEST MODEL: {best_model_name}")
    print("=" * 78)
    print(f"  AUC-ROC:      {best['AUC_ROC']:.4f}")
    print(f"  Sensitivity:  {best['Sensitivity']:.4f}")
    print(f"  Specificity:  {best['Specificity']:.4f}")
    print(f"  NPV:          {best['NPV']:.4f}")
    print(f"  AUC >= 0.70:  {'YES (pass)' if best['AUC_ROC'] >= 0.70 else 'NO (fail)'}")
    
    # Train final model on full data
    print("\n[FINAL] Training best model on full dataset...")
    best_cfg = model_registry[best_model_name]
    final_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", best_cfg["estimator"]),
    ])
    
    # Fit on all data
    final_pipeline.fit(X, y)
    
    # Save artifacts
    joblib.dump(final_pipeline, MODELS_DIR / "best_model.joblib")
    save_feature_manifest()
    save_fold_metrics(fold_df)
    save_best_model_report(comparison_df, best_model_name)
    generate_roc_curve(aggregated, best_model_name)
    
    print("\n" + "=" * 78)
    print("TRAINING COMPLETE")
    print("=" * 78)
    print(f"Artifacts saved to: {MODELS_DIR}")
    print(f"Results saved to:   {RESULTS_DIR}")
    print(f"Visualizations:     {VIZ_DIR}")
    print("=" * 78)


if __name__ == "__main__":
    main()
