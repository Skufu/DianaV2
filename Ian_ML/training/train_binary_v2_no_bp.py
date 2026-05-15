# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportCallIssue=false, reportIndexIssue=false, reportAttributeAccessIssue=false, reportMissingImports=false
"""DIANA Binary Classification Training V2."""

from __future__ import annotations

import json
import os
import warnings
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
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
from sklearn.compose import ColumnTransformer
from typing import Any, cast

import sys
import importlib
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
try:
    paths_module = importlib.import_module("Ian_ML.common.paths")
except ModuleNotFoundError:
    paths_module = importlib.import_module("..common.paths", package=__package__)
MODELS_ROOT = paths_module.MODELS_ROOT
NHANES_PROCESSED_ROOT = paths_module.NHANES_PROCESSED_ROOT

try:
    feature_constants = importlib.import_module("Ian_ML.common.feature_constants")
except ModuleNotFoundError:
    feature_constants = importlib.import_module("..common.feature_constants", package=__package__)
CLUSTER_FEATURES = feature_constants.CLUSTER_FEATURES
CLUSTER_FEATURE_COUNT = feature_constants.CLUSTER_FEATURE_COUNT
KMEANS_K = feature_constants.KMEANS_K


warnings.filterwarnings("ignore")

# Configuration
DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
MODELS_DIR = MODELS_ROOT / "binary_v2_no_bp"
RESULTS_DIR = MODELS_DIR / "results"
VIZ_DIR = MODELS_DIR / "visualizations"

N_JOBS = int(os.environ.get("ML_N_JOBS", "1"))
BOOTSTRAP_SAMPLES = int(os.environ.get("ML_BOOTSTRAP_SAMPLES", "1000"))

# 9 LR-safe features (continuous + ordinal, no derived ratios/scores)
MODEL_FEATURES = [
    # Continuous biomarkers (6)
    "bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference",
    # Ordinal encodings (3)
    "smoking_encoded", "activity_encoded", "alcohol_encoded",
]

# Legacy 12-feature list (kept for reference; not used in training)
FEATURES_LEGACY = [
    # Original metabolic biomarkers (5)
    "bmi", "triglycerides", "ldl", "hdl", "age",
    # Derived features (6)
    "bmi_category", "tg_hdl_ratio", "smoking_encoded",
    "activity_encoded", "alcohol_encoded", "metabolic_syndrome_score",
    # Enrichment features (1)
    "waist_circumference",
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
        'full_name': 'Atherogenic / Lipid-Driven Diabetes',
        'subtype': 'ATH',
        'characteristics': 'High LDL cholesterol, severe dyslipidemia (atherogenic phenotype)',
        'clinical_implication': 'Statin therapy indicated; cardiovascular risk management primary; identified via LDL proxy without HOMA2 (adaptation per Tanabe 2024)',
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


def normalize_alcohol_category(value: object) -> str:
    text = str(value).strip()
    lower = text.lower()
    if lower in {"", "nan", "unknown"}:
        return "Unknown"
    if lower in {"none", "never", "no alcohol", "abstinent"}:
        return "Never"
    return text.title()


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create engineered features"""
    df = df.copy()

    # Philippine (Asia-Pacific WHO) BMI cutoffs:
    # Underweight <18.5, Normal 18.5-22.9, Overweight 23-24.9, Obese ≥25
    bmi_category = pd.cut(
        df["bmi"], bins=[-np.inf, 18.5, 23, 25, np.inf], labels=[0, 1, 2, 3], right=False
    )
    df["bmi_category"] = pd.Series(bmi_category, index=df.index, dtype="float64")
    df["tg_hdl_ratio"] = df["triglycerides"] / df["hdl"].replace(0, np.nan)

    smoking_map = {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
    if "smoking_status" in df.columns:
        df["smoking_encoded"] = df["smoking_status"].fillna("Unknown").map(
            lambda value: smoking_map.get(str(value).strip().title() if str(value).strip().lower() != 'unknown' else 'Unknown', 1)
        )

    activity_map = {"Sedentary": 0, "Moderate": 1, "Active": 2, "Unknown": 1}
    if "physical_activity" in df.columns:
        df["activity_encoded"] = df["physical_activity"].fillna("Unknown").map(
            lambda value: activity_map.get(str(value).strip().title() if str(value).strip().lower() != 'unknown' else 'Unknown', 1)
        )

    alcohol_map = {"Never": 0, "None": 0, "Light": 1, "Moderate": 2, "Heavy": 3, "Unknown": 1}
    if "alcohol_use" in df.columns:
        df["alcohol_encoded"] = df["alcohol_use"].fillna("Unknown").map(
            lambda value: alcohol_map.get(normalize_alcohol_category(value), 1)
        )

    metabolic_criteria = pd.DataFrame(
        {
            "high_tg": df["triglycerides"] > 150,
            "low_hdl": df["hdl"] < 50,
            "high_bmi": df["bmi"] >= 25,  # PH Asia-Pacific WHO obesity cutoff
            "high_waist": df["waist_circumference"] >= 80 if "waist_circumference" in df.columns else False,
        }
    )
    df["metabolic_syndrome_score"] = metabolic_criteria.sum(axis=1)

    return df


def create_binary_v2_no_bp_target(df: pd.DataFrame) -> pd.DataFrame:
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


def get_preprocessing_pipeline() -> ColumnTransformer:
    """
    Build ColumnTransformer that scales only continuous features.
    
    Continuous features (indices 0-5): bmi, triglycerides, ldl, hdl, age, waist_circumference
    Ordinal features (indices 6-8): smoking_encoded, activity_encoded, alcohol_encoded
    
    Returns:
        ColumnTransformer with SimpleImputer + StandardScaler for continuous,
        SimpleImputer + passthrough for ordinal.
    """
    continuous_indices = [0, 1, 2, 3, 4, 5]  # First 6 features
    ordinal_indices = [6, 7, 8]  # Last 3 features
    
    return ColumnTransformer(
        transformers=[
            ("continuous", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]), continuous_indices),
            ("ordinal", Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
            ]), ordinal_indices),
        ],
        remainder="drop",  # No other features expected
    )


def get_inner_cv(groups: np.ndarray) -> GroupKFold:
    n_groups = len(np.unique(groups))
    n_splits = min(3, n_groups)
    if n_splits < 2:
        raise ValueError("Need at least 2 distinct groups for nested group CV.")
    return GroupKFold(n_splits=n_splits)


def build_model_registry() -> dict[str, dict[str, object]]:
    registry: dict[str, dict[str, object]] = {
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
        pass

    try:
        from xgboost import XGBClassifier
        
        class XGBClassifierWrapper(XGBClassifier):
            _estimator_type = "classifier"
            def __sklearn_tags__(self):
                tags = super().__sklearn_tags__()
                tags.estimator_type = "classifier"
                return tags

        registry["XGBoost"] = {
            "estimator": XGBClassifierWrapper(
                random_state=42, n_jobs=N_JOBS,
                scale_pos_weight=2.0, # Approximate weight to help handle unbalance
                eval_metric="logloss",
                objective="binary:logistic"
            ),
            "param_grid": {
                "model__n_estimators": [200, 300],
                "model__max_depth": [3, 5],
                "model__learning_rate": [0.05, 0.1],
            },
        }
    except ImportError:
        pass

    if "LightGBM" not in registry and "XGBoost" not in registry:
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


def compute_binary_v2_no_bp_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray) -> dict[str, float | int]:
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
    min_sensitivity: float = 0.80,
) -> dict[str, object]:
    thresholds = np.arange(0.10, 0.90, 0.01)

    strategies: dict[str, dict[str, object]] = {}

    best_j = -1.0
    best_j_thresh = 0.5
    for thresh in thresholds:
        y_pred = (y_proba >= thresh).astype(int)
        m = compute_binary_v2_no_bp_metrics(y_true, y_pred, y_proba)
        j = m["sensitivity"] + m["specificity"] - 1.0
        if j > best_j:
            best_j = j
            best_j_thresh = thresh
    youden_metrics = compute_binary_v2_no_bp_metrics(
        y_true, (y_proba >= best_j_thresh).astype(int), y_proba
    )
    strategies["youden"] = {
        "threshold": float(best_j_thresh),
        "metrics": youden_metrics,
    }

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
    screening_metrics = compute_binary_v2_no_bp_metrics(
        y_true, (y_proba >= best_screen_thresh).astype(int), y_proba
    )
    strategies["screening"] = {
        "threshold": float(best_screen_thresh),
        "metrics": screening_metrics,
    }

    best_gmean = -1.0
    best_gmean_thresh = 0.5
    for thresh in thresholds:
        y_pred = (y_proba >= thresh).astype(int)
        m = compute_binary_v2_no_bp_metrics(y_true, y_pred, y_proba)
        gmean = np.sqrt(m["sensitivity"] * m["specificity"])
        if gmean > best_gmean:
            best_gmean = gmean
            best_gmean_thresh = thresh
    gmean_metrics = compute_binary_v2_no_bp_metrics(
        y_true, (y_proba >= best_gmean_thresh).astype(int), y_proba
    )
    strategies["gmean"] = {
        "threshold": float(best_gmean_thresh),
        "metrics": gmean_metrics,
    }

    def _composite_score(metrics: dict[str, object]) -> float:
        return (
            0.35 * float(metrics.get("sensitivity", 0.0))
            + 0.30 * float(metrics.get("specificity", 0.0))
            + 0.25 * float(metrics.get("f1", 0.0))
            + 0.10 * float(metrics.get("accuracy", 0.0))
        )

    best_name = None
    best_score = -1.0
    all_strategies = {}
    for name, strat in strategies.items():
        if not isinstance(strat, dict):
            continue
        metrics = strat.get("metrics", {})
        if not isinstance(metrics, dict):
            continue
        composite = _composite_score(metrics)
        if composite > best_score:
            best_score = composite
            best_name = name
        threshold = strat.get("threshold", 0.5)
        sensitivity = metrics.get("sensitivity", 0.0)
        specificity = metrics.get("specificity", 0.0)
        accuracy = metrics.get("accuracy", 0.0)
        f1 = metrics.get("f1", 0.0)
        all_strategies[name] = {
            "threshold": float(threshold) if isinstance(threshold, (int, float)) else 0.5,
            "sensitivity": float(sensitivity) if isinstance(sensitivity, (int, float)) else 0.0,
            "specificity": float(specificity) if isinstance(specificity, (int, float)) else 0.0,
            "accuracy": float(accuracy) if isinstance(accuracy, (int, float)) else 0.0,
            "f1": float(f1) if isinstance(f1, (int, float)) else 0.0,
        }

    if best_name is None:
        raise RuntimeError("No valid threshold strategy found")

    original_best_name = best_name
    original_best_strategy = strategies[original_best_name]
    original_best_threshold = float(original_best_strategy.get("threshold", 0.5))

    # Deterministic safety guardrail arbitration (post-selection only).
    pos_prev = float(np.mean(y_true)) if len(y_true) > 0 else 0.0
    normal_prev = 1.0 - pos_prev
    base_spec_floor = 0.45 if normal_prev >= 0.55 else 0.40
    sens_floor = max(float(min_sensitivity) - 0.05, 0.75)

    original_strategy_name = best_name
    original_strategy = strategies[original_strategy_name]
    original_metrics = original_strategy.get("metrics", {})
    original_sens = float(original_metrics.get("sensitivity", 0.0)) if isinstance(original_metrics, dict) else 0.0
    original_spec = float(original_metrics.get("specificity", 0.0)) if isinstance(original_metrics, dict) else 0.0

    # Tighten specificity floor for high-sensitivity operating points to prevent
    # unstable low-threshold selections under temporal prevalence shift.
    spec_floor = max(base_spec_floor, 0.45 if original_sens >= 0.85 else base_spec_floor)

    # Severe prevalence-shift signature (observed in problematic folds):
    # very high sensitivity with low specificity at a low provisional threshold.
    # Apply a stricter specificity floor and an explicit minimum threshold bump
    # to avoid repeatedly selecting unstable low-threshold operating points.
    severe_shift_signature = bool(
        original_sens >= 0.85
        and original_spec < 0.45
        and original_best_threshold <= 0.38
    )
    effective_spec_floor = spec_floor
    shift_threshold_floor = 0.46 if severe_shift_signature else None

    guardrail_triggered = bool(original_spec < spec_floor and original_sens >= 0.85)
    guardrail_reason = ""

    def _rank_key(name: str) -> tuple[float, float, float]:
        strat = strategies.get(name, {})
        metrics = strat.get("metrics", {}) if isinstance(strat, dict) else {}
        threshold = strat.get("threshold", 0.5) if isinstance(strat, dict) else 0.5
        if not isinstance(metrics, dict):
            metrics = {}
        return (
            _composite_score(metrics),
            float(metrics.get("specificity", 0.0)),
            float(threshold) if isinstance(threshold, (int, float)) else 0.5,
        )

    def _nearest_guardrail_threshold() -> tuple[float, dict[str, float | int]] | None:
        feasible_points: list[tuple[float, dict[str, float | int]]] = []
        for thresh in thresholds:
            thresh_val = float(thresh)
            metrics = compute_binary_v2_no_bp_metrics(
                y_true,
                (y_proba >= thresh_val).astype(int),
                y_proba,
            )
            specificity = float(metrics.get("specificity", 0.0))
            sensitivity = float(metrics.get("sensitivity", 0.0))
            if specificity >= effective_spec_floor and sensitivity >= sens_floor:
                feasible_points.append((thresh_val, metrics))

        if not feasible_points:
            return None

        return min(
            feasible_points,
            key=lambda item: (
                abs(item[0] - original_best_threshold),
                0 if item[0] < 0.5 else 1,
                -float(item[1].get("sensitivity", 0.0)),
                -_composite_score(item[1]),
            ),
        )

    if guardrail_triggered:
        guardrail_reason = "specificity_collapse"
        eligible = []
        for name, strat in strategies.items():
            if not isinstance(strat, dict):
                continue
            metrics = strat.get("metrics", {})
            if not isinstance(metrics, dict):
                continue
            sensitivity = float(metrics.get("sensitivity", 0.0))
            specificity = float(metrics.get("specificity", 0.0))
            if specificity >= effective_spec_floor and sensitivity >= sens_floor:
                eligible.append(name)

        if eligible:
            best_name = max(eligible, key=_rank_key)
        else:
            sensitivity_eligible = []
            for name, strat in strategies.items():
                if name == original_strategy_name:
                    continue
                if not isinstance(strat, dict):
                    continue
                metrics = strat.get("metrics", {})
                if not isinstance(metrics, dict):
                    continue
                sensitivity = float(metrics.get("sensitivity", 0.0))
                if sensitivity >= sens_floor:
                    sensitivity_eligible.append(name)

            if sensitivity_eligible:
                best_name = max(sensitivity_eligible, key=lambda n: (_rank_key(n)[1], _rank_key(n)[2], _rank_key(n)[0]))
            else:
                nearest_feasible = _nearest_guardrail_threshold()
                if nearest_feasible is not None:
                    feasible_thresh, feasible_metrics = nearest_feasible
                    strategies["guardrail_nearest_feasible"] = {
                        "threshold": float(feasible_thresh),
                        "metrics": feasible_metrics,
                    }
                    best_name = "guardrail_nearest_feasible"
                    all_strategies["guardrail_nearest_feasible"] = {
                        "threshold": float(feasible_thresh),
                        "sensitivity": float(feasible_metrics.get("sensitivity", 0.0)),
                        "specificity": float(feasible_metrics.get("specificity", 0.0)),
                        "accuracy": float(feasible_metrics.get("accuracy", 0.0)),
                        "f1": float(feasible_metrics.get("f1", 0.0)),
                    }
                    guardrail_reason = "specificity_collapse_nearest_feasible"
                else:
                    fallback_thresh = 0.5
                    fallback_metrics = compute_binary_v2_no_bp_metrics(
                        y_true, (y_proba >= fallback_thresh).astype(int), y_proba
                    )
                    strategies["guardrail_fallback"] = {
                        "threshold": float(fallback_thresh),
                        "metrics": fallback_metrics,
                    }
                    best_name = "guardrail_fallback"
                    all_strategies["guardrail_fallback"] = {
                        "threshold": float(fallback_thresh),
                        "sensitivity": float(fallback_metrics.get("sensitivity", 0.0)),
                        "specificity": float(fallback_metrics.get("specificity", 0.0)),
                        "accuracy": float(fallback_metrics.get("accuracy", 0.0)),
                        "f1": float(fallback_metrics.get("f1", 0.0)),
                    }

    if shift_threshold_floor is not None:
        chosen = strategies.get(best_name, {}) if isinstance(best_name, str) else {}
        chosen_threshold = float(chosen.get("threshold", 0.5)) if isinstance(chosen, dict) else 0.5
        if chosen_threshold < shift_threshold_floor:
            floor_metrics = compute_binary_v2_no_bp_metrics(
                y_true,
                (y_proba >= shift_threshold_floor).astype(int),
                y_proba,
            )
            strategies["guardrail_shift_floor"] = {
                "threshold": float(shift_threshold_floor),
                "metrics": floor_metrics,
            }
            all_strategies["guardrail_shift_floor"] = {
                "threshold": float(shift_threshold_floor),
                "sensitivity": float(floor_metrics.get("sensitivity", 0.0)),
                "specificity": float(floor_metrics.get("specificity", 0.0)),
                "accuracy": float(floor_metrics.get("accuracy", 0.0)),
                "f1": float(floor_metrics.get("f1", 0.0)),
            }
            best_name = "guardrail_shift_floor"
            guardrail_triggered = True
            guardrail_reason = "specificity_collapse_shift_floor"

    best_strategy = strategies[best_name]
    best_threshold = best_strategy.get("threshold", 0.5)
    best_metrics = best_strategy.get("metrics", {})
    return {
        "threshold": best_threshold,
        "metrics": best_metrics,
        "strategy": best_name,
        "all_strategies": all_strategies,
        "guardrail_triggered": guardrail_triggered,
        "guardrail_reason": guardrail_reason,
        "guardrail_spec_floor": float(effective_spec_floor),
        "guardrail_pos_prevalence": float(pos_prev),
        "original_strategy": original_strategy_name,
        "original_threshold": float(original_best_threshold),
    }


def run_nested_logo_evaluation(
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
    model_registry: dict[str, dict[str, object]],
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, dict[str, object]]]:
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
                ("preprocessor", get_preprocessing_pipeline()),
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
                "Threshold_Strategy": str(thresh_result.get("strategy", "unknown")),
                "Original_Threshold_Strategy": str(thresh_result.get("original_strategy", "unknown")),
                "Original_Threshold": float(thresh_result.get("original_threshold", 0.5)),
                "Guardrail_Triggered": bool(thresh_result.get("guardrail_triggered", False)),
                "Guardrail_Reason": str(thresh_result.get("guardrail_reason", "")),
                "Guardrail_Spec_Floor": float(thresh_result.get("guardrail_spec_floor", 0.0)),
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
        guardrail_folds = int(model_folds["Guardrail_Triggered"].fillna(False).astype(bool).sum()) if "Guardrail_Triggered" in model_folds.columns else 0
        threshold_strategy_mode = (
            str(model_folds["Threshold_Strategy"].mode(dropna=True).iloc[0])
            if "Threshold_Strategy" in model_folds.columns and not model_folds["Threshold_Strategy"].mode(dropna=True).empty
            else "unknown"
        )
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
            "Mean_Threshold": float(np.mean(s["thresholds"])),
            "Std_Threshold": float(np.std(s["thresholds"])),
            "Inner_CV_AUC_Mean": float(np.mean(s["inner_cv_auc"])),
            "Inner_CV_AUC_Std": float(np.std(s["inner_cv_auc"])),
            "Mean_Fold_AUC": float(fold_df[fold_df["Model"] == model_name]["AUC_ROC"].mean()) if not fold_df.empty else 0.0,
            "Guardrail_Folds": guardrail_folds,
            "Threshold_Strategy_Mode": threshold_strategy_mode,
        })

        aggregated[model_name] = {
            "y_true": y_true,
            "y_proba": y_proba,
            "y_pred": y_pred_thresholded,
            "metrics": threshold_metrics,
        }

    comparison_df = pd.DataFrame(comparison_rows)
    return fold_df, comparison_df, aggregated


def bootstrap_metric_ci(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    metric_fn,
    n_bootstraps: int = 1000,
    ci: float = 0.95,
) -> tuple[float, float]:
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


def bootstrap_auc_ci(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    n_bootstraps: int = 1000,
    ci: float = 0.95,
) -> tuple[float, float]:
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


def assign_ahlqvist_labels(cluster_centers, feature_names, k=4) -> dict[int, str]:
    centers_df = pd.DataFrame(cluster_centers, columns=feature_names)
    available_clusters = list(range(k))
    final_labels: dict[int, str] = {}
    
    # 1. Identify SIRD: Highest LAP score (validated insulin resistance proxy)
    # LAP = (WC - 58) * TG — validated in Wang et al. (2024) BMC Endocrine Disorders
    ir_scores: dict[int, float] = {}
    for cid in available_clusters:
        c = centers_df.iloc[cid]
        waist = c.get('waist_circumference', 0)
        tg = c.get('triglycerides', 0)
        # LAP formula for women: (WC - 58) * TG (WC in cm, TG in mg/dL)
        ir_scores[cid] = (waist - 58) * tg
    
    sird_id = max(ir_scores, key=lambda cid: float(ir_scores[cid]))
    final_labels[sird_id] = 'SIRD'
    available_clusters.remove(sird_id)
    
    # 2. Identify SIDD → Rebranded as "Atherogenic/Lipid-Driven" phenotype:
    # Highest LDL among remaining (reflecting the atherogenic driver of this subtype)
    # Note: True SIDD requires HOMA2-B/C-peptide for beta-cell function.
    # Without insulin metrics, we use high LDL as a proxy for the atherogenic phenotype.
    ldl_scores: dict[int, float] = {}
    for cid in available_clusters:
        c = centers_df.iloc[cid]
        ldl_scores[cid] = c.get('ldl', 0)
    
    sidd_id = max(ldl_scores, key=lambda cid: float(ldl_scores[cid]))
    final_labels[sidd_id] = 'SIDD'
    available_clusters.remove(sidd_id)
    
    # 3. Identify MOD
    mod_scores: dict[int, float] = {}
    for cid in available_clusters:
        mod_scores[cid] = centers_df.iloc[cid].get('bmi', 0)
    
    mod_id = max(mod_scores, key=lambda cid: float(mod_scores[cid]))
    final_labels[mod_id] = 'MOD'
    available_clusters.remove(mod_id)
    
    # 4. Identify MARD
    mard_id = available_clusters[0]
    final_labels[mard_id] = 'MARD'
    
    return final_labels


def train_serving_kmeans(
    X: np.ndarray,
    y: np.ndarray,
    features: list[str],
    diabetes_labels: np.ndarray | None = None,
) -> dict[int, dict[str, object]]:
    """
    Train K-Means clustering on at-risk patients for Ahlqvist subtype classification.

    Args:
        X: Feature matrix (n_samples, n_features)
        y: Binary target array (n_samples,) where 1 = at-risk
        features: List of feature names corresponding to X columns
        diabetes_labels: Optional original 3-class labels for diabetic rate analysis

    Returns:
        Dictionary mapping cluster IDs to subtype profile dictionaries

    Raises:
        ValueError: If input array shapes are inconsistent or empty
    """
    # Input validation
    if X.shape[0] == 0:
        raise ValueError("X cannot be empty")
    if len(y) == 0:
        raise ValueError("y cannot be empty")
    if X.shape[0] != len(y):
        raise ValueError(f"X and y must have same number of samples: {X.shape[0]} != {len(y)}")
    if diabetes_labels is not None and len(diabetes_labels) != len(y):
        raise ValueError(
            f"diabetes_labels must have same length as y: {len(diabetes_labels)} != {len(y)}"
        )

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
    # Inverse transform Z-scores back to raw clinical values for proper LAP calculation
    raw_cluster_centers = scaler.inverse_transform(kmeans.cluster_centers_)
    label_map = assign_ahlqvist_labels(
        raw_cluster_centers, cluster_features, k=4
    )

    # ── Build cluster profiles (at-risk patients only) ───────────────
    # If we have original 3-class labels, compute diabetic rate within
    # each cluster for richer clinical context.
    if diabetes_labels is not None:
        y_original_at_risk = diabetes_labels[at_risk_mask]
    else:
        y_original_at_risk = None

    cluster_profiles: dict[int, dict[str, object]] = {}
    for k in range(4):
        mask = clusters == k
        cluster_size = int(np.sum(mask))
        subtype_key = label_map[k]
        subtype_info = AHLQVIST_SUBTYPES[subtype_key]

        profile: dict[str, object] = {
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

    # Save clustering artifacts.
    # NOTE: weighted_kmeans_model.joblib is saved by clustering.py (the active
    # KMeans artifact used by ClinicalPredictor). Do NOT save a competing
    # kmeans_model.joblib here — it would be a dead artifact.
    joblib.dump(scaler, MODELS_DIR / "cluster_scaler.joblib")
    joblib.dump(imputer, MODELS_DIR / "cluster_imputer.joblib")

    with open(MODELS_DIR / "cluster_labels.json", 'w') as f:
        json.dump(cluster_profiles, f, indent=2)

    print(f"[CLUSTERING] K-Means K=4 trained with Ahlqvist subtypes (at-risk only)")
    for k, prof in cluster_profiles.items():
        severity = prof.get("diabetic_rate", "?")
        sev_str = f", {severity:.0%} diabetic" if isinstance(severity, float) else ""
        subtype_full = prof.get('subtype_full', prof['subtype'])
        print(
            f"  Cluster {k}: {prof['subtype']} / {subtype_full} "
            f"(n={prof['size']}{sev_str})"
        )

    return cluster_profiles


def save_feature_manifest() -> None:
    with open(MODELS_DIR / "features.json", "w") as f:
        json.dump({
            "features": MODEL_FEATURES,
            "n_features": len(MODEL_FEATURES),
            "target": "at_risk_binary_v2_no_bp (0=Normal, 1=At-Risk)",
            "note": "Binary reformulation with 9 LR-safe features (continuous + ordinal), LOCO validation",
        }, f, indent=2)


def save_fold_metrics(fold_df: pd.DataFrame) -> None:
    fold_df = fold_df.copy()
    fold_df["Precision"] = fold_df["PPV"]
    fold_df["Recall"] = fold_df["Sensitivity"]
    fold_df["FPR"] = (1 - fold_df["Specificity"]).round(4)
    fold_df["FNR"] = (1 - fold_df["Sensitivity"]).round(4)
    fold_df["Balanced_Accuracy"] = ((fold_df["Sensitivity"] + fold_df["Specificity"]) / 2).round(4)
    fold_df["Year_Group"] = fold_df["Test_Cycle"].astype(str)
    fold_df.to_csv(RESULTS_DIR / "logo_fold_metrics.csv", index=False)

    summary = fold_df.groupby("Model").agg({
        "AUC_ROC": ["mean", "std", "min", "max"],
        "Sensitivity": ["mean", "std"],
        "Specificity": ["mean", "std"],
        "Balanced_Accuracy": ["mean", "std"],
    }).round(4)

    summary.to_csv(RESULTS_DIR / "logo_summary_by_model.csv")
    warning_rows = fold_df[
        (fold_df["Specificity"] < 0.4)
        | ((fold_df["Sensitivity"] >= 0.85) & (fold_df["Specificity"] <= 0.3))
    ]
    warnings = []
    for _, row in warning_rows.iterrows():
        warnings.append({
            "fold": int(row["Fold"]),
            "test_cycle": row["Test_Cycle"],
            "model": row["Model"],
            "auc_roc": float(row["AUC_ROC"]),
            "accuracy": float(row["Accuracy"]),
            "sensitivity": float(row["Sensitivity"]),
            "specificity": float(row["Specificity"]),
            "fpr": float(row["FPR"]),
            "fnr": float(row["FNR"]),
            "threshold": float(row["Threshold"]),
        })
    with open(RESULTS_DIR / "blindspot_warnings.json", "w") as f:
        json.dump(warnings, f, indent=2)
    print(f"[DEFENSIBILITY] Detected {len(warnings)} fold warnings")
    print(f"\n[DEFENSIBILITY] Saved fold metrics to {RESULTS_DIR}")


def save_best_model_report(comparison_df: pd.DataFrame, best_model_name: str) -> None:
    best_row = comparison_df[comparison_df["Model"] == best_model_name].iloc[0]
    
    report = {
        "model_type": "binary_v2_no_bp",
        "target": "at_risk_binary_v2_no_bp (0=Normal, 1=At-Risk)",
        "best_model": best_model_name,
        "n_features": len(MODEL_FEATURES),
        "validation_method": "Nested LOGO (outer) + GroupKFold Pipeline CV (inner)",
        "decision_thresholds": {
            "at_risk": float(best_row["Mean_Threshold"])
        },
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
            "std_threshold": float(best_row["Std_Threshold"]),
            "inner_cv_auc_mean": float(best_row["Inner_CV_AUC_Mean"]),
            "inner_cv_auc_std": float(best_row["Inner_CV_AUC_Std"]),
        },
        "threshold_policy": {
            "strategy_mode": str(best_row.get("Threshold_Strategy_Mode", "unknown")),
            "guardrail_folds": int(best_row.get("Guardrail_Folds", 0)),
        },
        "features": MODEL_FEATURES,
        "clinical_rationale": "Binary reformulation: Normal vs At-Risk (Pre-diabetic + Diabetic). Prioritizes sensitivity for screening. Uses 9 LR-safe features (continuous + ordinal only).",
    }
    
    with open(RESULTS_DIR / "best_model_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    # Save standalone threshold.json (consumed by tests and ClinicalPredictor)
    threshold_config = {"at_risk": float(best_row["Mean_Threshold"])}
    with open(RESULTS_DIR / "threshold.json", 'w') as f:
        json.dump(threshold_config, f, indent=2)
    
    print(f"[SAVED] Best model report to {RESULTS_DIR / 'best_model_report.json'}")
    print(f"[SAVED] Threshold config to {RESULTS_DIR / 'threshold.json'}")


def generate_roc_curve(aggregated: dict[str, dict[str, object]], best_model_name: str) -> None:
    plt.figure(figsize=(8, 6))
    
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
    
    for i, (model_name, s) in enumerate(aggregated.items()):
        y_true = s["y_true"]
        y_proba = s["y_proba"]
        
        fpr, tpr, _ = roc_curve(y_true, y_proba)
        auc_val = roc_auc_score(y_true, y_proba)
        
        c = colors[i % len(colors)]
        if model_name == best_model_name:
            plt.plot(fpr, tpr, color=c, linewidth=2.5, label=f'{model_name} (AUC = {auc_val:.3f}) ★')
        else:
            plt.plot(fpr, tpr, color=c, linewidth=1.5, alpha=0.8, label=f'{model_name} (AUC = {auc_val:.3f})')
            
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


def save_shap_background(
    X_processed: np.ndarray,
    feature_names: list[str],
    models_dir: Path,
    model_type: str = "binary_v2_no_bp",
    n_background: int = 100,
) -> Path:
    """
    Save SHAP background data deterministically (before explainer branching).

    This is REQUIRED for consistent runtime SHAP explanations.
    Must be called with the processed training matrix.

    Args:
        X_processed: Preprocessed training features (after ColumnTransformer)
        feature_names: Ordered feature names matching X_processed columns
        models_dir: Directory to save artifacts
        model_type: Model identifier for metadata
        n_background: Number of background samples (default 100)

    Returns:
        Path to saved artifact

    Raises:
        ValueError: If X_processed is empty or feature count mismatch
    """
    if X_processed.shape[0] == 0:
        raise ValueError("Cannot create SHAP background from empty data")

    if X_processed.shape[1] != len(feature_names):
        raise ValueError(
            f"Feature count mismatch: X has {X_processed.shape[1]} columns, "
            f"but feature_names has {len(feature_names)} items"
        )

    # Sample background deterministically
    bg_size = min(n_background, len(X_processed))
    rng = np.random.RandomState(42)
    indices = rng.choice(len(X_processed), size=bg_size, replace=False)
    background = X_processed[indices]

    # Build metadata envelope
    artifact = {
        "background": background,
        "feature_names": feature_names,
        "n_features": len(feature_names),
        "n_samples": bg_size,
        "model_type": model_type,
        "artifact_version": "1.0",
        "created_at": datetime.now().isoformat(),
    }

    output_path = models_dir / "shap_background.joblib"
    joblib.dump(artifact, output_path)

    print(f"[SHAP] Saved background data: {output_path}")
    print(f"       Shape: {background.shape}")
    print(f"       Features: {len(feature_names)}")

    return output_path


def generate_shap_plots(
    final_pipeline: Pipeline,
    X: np.ndarray,
    y: np.ndarray,
    feature_names: list[str],
    background_path: Path | None = None,
) -> None:
    """Generate SHAP summary plots for thesis."""
    try:
        import shap
    except ImportError:
        print("[SHAP] shap not installed — skipping. Install with: pip install shap")
        return

    print("\n[SHAP] Generating feature importance explanations...")

    # Extract the raw model from the pipeline for explainer
    model = final_pipeline.named_steps["model"]

    # Pre-process X through the pipeline's preprocessor
    X_processed = final_pipeline.named_steps["preprocessor"].transform(X)

    # Choose the right explainer for the model type
    shap_values_pos = None
    
    # 1. Try LinearExplainer first (best for logistic regression)
    try:
        explainer = shap.LinearExplainer(model, X_processed)
        shap_values_raw = explainer.shap_values(X_processed)
        print("   Using LinearExplainer")
        # LinearExplainer returns (n_samples, n_features) for binary — already correct
        shap_values_pos = np.array(shap_values_raw)
        if shap_values_pos.ndim == 3:
            shap_values_pos = shap_values_pos[:, :, 1]
    except Exception as e:
        print(f"   LinearExplainer failed ({e})")

    # 2. Try TreeExplainer (for tree-based models)
    if shap_values_pos is None:
        try:
            explainer = shap.TreeExplainer(model)
            shap_values_raw = explainer.shap_values(X_processed)
            print("   Using TreeExplainer")
            if isinstance(shap_values_raw, list) and len(shap_values_raw) > 1:
                shap_values_pos = np.array(shap_values_raw[1])
            else:
                shap_values_pos = np.array(shap_values_raw)
                if shap_values_pos.ndim == 3:
                    shap_values_pos = shap_values_pos[:, :, 1]
        except Exception as e:
            print(f"   TreeExplainer failed ({e})")

    # 3. Fall back to KernelExplainer (universal but slow)
    if shap_values_pos is None:
        try:
            print("   Falling back to KernelExplainer...")
            
            # Load saved background if available
            if background_path and background_path.exists():
                artifact = joblib.load(background_path)
                background = artifact["background"]
                print(f"   Loaded background from {background_path}")
            else:
                # Create on-the-fly (should not happen in production)
                bg_size = min(100, len(X_processed))
                background = shap.sample(X_processed, bg_size)
                print(f"   Created temporary background (not saved)")
            
            explainer = shap.KernelExplainer(model.predict_proba, background)
            shap_values_raw = explainer.shap_values(X_processed[:200])
            X_processed = X_processed[:200]
            print("   Using KernelExplainer (limited to 200 samples)")
            
            shap_values_pos = np.array(shap_values_raw)
            # KernelExplainer with predict_proba returns (n_samples, n_features, n_outputs)
            if isinstance(shap_values_raw, list) and len(shap_values_raw) > 1:
                shap_values_pos = np.array(shap_values_raw[1])
            elif shap_values_pos.ndim == 3:
                shap_values_pos = shap_values_pos[:, :, 1]
        except Exception as e:
            print(f"   KernelExplainer also failed ({e})")
            print("[SHAP] Could not compute SHAP values with any explainer.")
            return

    # Final safety check: ensure 2D
    shap_values_pos = np.array(shap_values_pos)
    if shap_values_pos.ndim != 2:
        print(f"   [WARN] Unexpected SHAP values shape: {shap_values_pos.shape}, skipping plots")
        return
    print(f"   SHAP values shape: {shap_values_pos.shape}")

    # 1. Bar plot — mean |SHAP| per feature
    try:
        plt.close("all")
        shap.summary_plot(
            shap_values_pos,
            X_processed,
            feature_names=feature_names,
            plot_type="bar",
            show=False,
        )
        fig = plt.gcf()
        fig.set_size_inches(10, 6)
        fig.suptitle("SHAP Feature Importance (Mean |SHAP Value|)", y=1.02)
        fig.tight_layout()
        fig.savefig(str(VIZ_DIR / "shap_importance_bar.png"), dpi=150, bbox_inches="tight")
        plt.close("all")
        print(f"   Saved: {VIZ_DIR / 'shap_importance_bar.png'}")
    except Exception as e:
        print(f"   [WARN] Bar plot failed: {e}")

    # 2. Beeswarm plot — per-sample feature impact
    try:
        plt.close("all")
        shap.summary_plot(
            shap_values_pos,
            X_processed,
            feature_names=feature_names,
            show=False,
        )
        fig = plt.gcf()
        fig.set_size_inches(10, 6)
        fig.suptitle("SHAP Beeswarm — Feature Impact on At-Risk Prediction", y=1.02)
        fig.tight_layout()
        fig.savefig(str(VIZ_DIR / "shap_beeswarm.png"), dpi=150, bbox_inches="tight")
        plt.close("all")
        print(f"   Saved: {VIZ_DIR / 'shap_beeswarm.png'}")
    except Exception as e:
        print(f"   [WARN] Beeswarm plot failed: {e}")

    print("[SHAP] Done.")

def main():
    """Main training pipeline."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 78)
    print("DIANA Binary Model Training V2 - Defensible Evaluation")
    print("Binary: Normal vs At-Risk | 9 LR-Safe Features | LOCO Validation")
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
    missing_cols = [f for f in MODEL_FEATURES + ["at_risk_binary_v2_no_bp", "cycle"] if f not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing columns: {missing_cols}")
    
    # Prepare data
    X = df_clean[MODEL_FEATURES].values.astype(float)
    y = df_clean["at_risk_binary_v2_no_bp"].values.astype(int)
    groups = df_clean["cycle"].astype(str).to_numpy()
    # Keep original 3-class labels for cluster profiling
    diabetes_labels = df_clean["diabetes_label"].values.astype(int)
    
    print(f"\n[DATA]")
    print(f"       Features: {len(MODEL_FEATURES)}")
    print(f"       Samples: {len(X)}")
    print(f"       NHANES cycles: {list(np.unique(groups))}")
    
    # Train clustering (at-risk patients only — scientifically correct)
    cluster_profiles = train_serving_kmeans(X, y, MODEL_FEATURES, diabetes_labels)
    
    # Build model registry
    model_registry = build_model_registry()
    
    # Run nested LOGO evaluation
    fold_df, comparison_df, aggregated = run_nested_logo_evaluation(
        X, y, groups, model_registry
    )
    
    # Select best model by mean fold AUC (more defensible than aggregated AUC)
    fold_auc_by_model = fold_df.groupby("Model")["AUC_ROC"].mean()
    best_model_name = str(fold_auc_by_model.idxmax())
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
    
    # Train final model on full data with best hyperparameters from LOGO CV
    print("\n[FINAL] Training best model on full dataset...")
    best_cfg = model_registry[best_model_name]

    # Collect best_params from each fold and vote on most-frequent set
    best_model_folds = fold_df[fold_df["Model"] == best_model_name]
    fold_params_list = [json.loads(p) for p in best_model_folds["Best_Params"]]
    # Serialize each param dict to a hashable string for voting
    param_strings = [json.dumps(p, sort_keys=True) for p in fold_params_list]
    from collections import Counter
    most_common_params = json.loads(Counter(param_strings).most_common(1)[0][0])
    print(f"  Voted best params ({len(fold_params_list)} folds): {most_common_params}")

    # Build estimator with best hyperparameters applied
    estimator = best_cfg["estimator"]
    if not hasattr(estimator, "set_params"):
        raise TypeError("Selected estimator does not support set_params")
    # Strip the 'model__' prefix from pipeline param names
    native_params = {k.replace('model__', ''): v for k, v in most_common_params.items()}
    estimator = cast(Any, estimator).set_params(**native_params)

    final_pipeline = Pipeline([
        ("preprocessor", get_preprocessing_pipeline()),
        ("model", estimator),
    ])
    
    # Fit on all data
    final_pipeline.fit(X, y)
    
    # Save artifacts
    joblib.dump(final_pipeline, MODELS_DIR / "best_model.joblib")
    save_feature_manifest()
    save_fold_metrics(fold_df)
    save_best_model_report(comparison_df, str(best_model_name))
    generate_roc_curve(aggregated, str(best_model_name))
    
    # Save SHAP background BEFORE generating plots
    X_processed = final_pipeline.named_steps["preprocessor"].transform(X)
    shap_bg_path = save_shap_background(
        X_processed=X_processed,
        feature_names=MODEL_FEATURES,
        models_dir=MODELS_DIR,
        model_type="binary_v2_no_bp",
        n_background=100,
    )
    
    generate_shap_plots(final_pipeline, X, y, MODEL_FEATURES, background_path=shap_bg_path)
    
    print("\n" + "=" * 78)
    print("TRAINING COMPLETE")
    print("=" * 78)
    print(f"Artifacts saved to: {MODELS_DIR}")
    print(f"Results saved to:   {RESULTS_DIR}")
    print(f"Visualizations:     {VIZ_DIR}")
    print("=" * 78)


if __name__ == "__main__":
    main()
