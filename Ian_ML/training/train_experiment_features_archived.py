"""
DIANA Clinical Model Training Script V2 - Defensible Evaluation

High-impact improvements in this version:
- Full Leave-One-Group-Out (NHANES cycle) outer evaluation
- Leakage-safe nested CV using Pipeline(StandardScaler -> model)
- Decision-threshold optimization for at-risk recall
- Calibration diagnostics (reliability + ECE + per-class Brier)
- Class-level confidence intervals (bootstrap)
- K=2 vs K=4 clustering defensibility report

Usage: python Ian_ML/training/train_v2.py
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
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    calinski_harabasz_score,
    confusion_matrix,
    davies_bouldin_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
    silhouette_score,
    auc,
)
from sklearn.model_selection import (
    GridSearchCV,
    GroupKFold,
    LeaveOneGroupOut,
    cross_val_predict,
)
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, label_binarize

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from Ian_ML.common.paths import CLINICAL_V2_MODELS_DIR, NHANES_PROCESSED_ROOT

warnings.filterwarnings("ignore")

HAS_XGBOOST = False  # Disabled: overkill for small dataset
HAS_CATBOOST = False  # Disabled: overkill for small dataset
HAS_LIGHTGBM = False  # Disabled: overkill for small dataset


# Use non-imputed file for leakage-safe imputation inside CV pipeline
# Previously used diana_dataset_imputed.csv which caused data leakage
DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
MODELS_DIR = CLINICAL_V2_MODELS_DIR
RESULTS_DIR = MODELS_DIR / "results"
VIZ_DIR = MODELS_DIR / "visualizations"

TARGET = "diabetes_label"
CLASSES = ["Normal", "Pre-diabetic", "Diabetic"]
AT_RISK_CLASSES = [1, 2]
N_JOBS = int(os.environ.get("ML_N_JOBS", "1"))
BOOTSTRAP_SAMPLES = int(os.environ.get("ML_BOOTSTRAP_SAMPLES", "1000"))

# Original 13-feature reduced set
REDUCED_FEATURES = [
    "bmi",
    "triglycerides",
    "ldl",
    "hdl",
    "age",
    "systolic",
    "diastolic",
    "bmi_category",
    "tg_hdl_ratio",
    "smoking_encoded",
    "activity_encoded",
    "alcohol_encoded",
    "metabolic_syndrome_score",
    # New features
    "bmi_squared",
    "age_squared",
    "age_bmi_interaction",
    "log_triglycerides",
    "castelli_index",
]


def engineer_features_reduced(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create enhanced engineered clinical features.
    
    Phase 2 Improvements (Experiment):
    - Added polynomial BMI term (bmi_squared) for non-linear risk capture
    - Added polynomial Age term (age_squared) for non-linear risk capture
    - Added age-BMI interaction (metabolic risk amplifies with age)
    - Added log-transformed triglycerides for skewed distribution
    - Added Castelli Risk Index I (TC/HDL)
    - Added clinically-motivated interactions (age-SBP, BMI-TG)
    """
    df = df.copy()

    # Non-linear terms
    df["bmi_squared"] = df["bmi"] ** 2
    df["age_squared"] = df["age"] ** 2
    
    # Interactions
    df["age_bmi_interaction"] = df["age"] * df["bmi"]

    # Log transforms (handle skew)
    df["log_triglycerides"] = np.log1p(df["triglycerides"])

    # Clinical ratios
    df["bmi_category"] = pd.cut(
        df["bmi"], bins=[0, 18.5, 25, 30, 100], labels=[0, 1, 2, 3]
    ).astype(float)
    df["tg_hdl_ratio"] = df["triglycerides"] / df["hdl"].replace(0, np.nan)
    df["castelli_index"] = df["total_cholesterol"] / df["hdl"].replace(0, np.nan)

    smoking_map = {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
    if "smoking_status" in df.columns:
        df["smoking_encoded"] = df["smoking_status"].map(smoking_map)

    activity_map = {"Sedentary": 0, "Moderate": 1, "Active": 2, "Unknown": 1}
    if "physical_activity" in df.columns:
        df["activity_encoded"] = df["physical_activity"].map(activity_map)

    alcohol_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3}
    if "alcohol_use" in df.columns:
        df["alcohol_encoded"] = df["alcohol_use"].map(alcohol_map)

    metabolic_criteria = pd.DataFrame(
        {
            "high_tg": df["triglycerides"] > 150,
            "low_hdl": df["hdl"] < 50,
            "high_bp": df["systolic"] >= 130,
            "high_bmi": df["bmi"] >= 30,
        }
    )
    df["metabolic_syndrome_score"] = metabolic_criteria.sum(axis=1)
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
    registry: dict[str, dict] = {
        "Logistic Regression": {
            "estimator": LogisticRegression(
                max_iter=1500, class_weight="balanced", random_state=42
            ),
            "param_grid": {"model__C": [0.3, 1.0, 2.0]},
        },
        "Random Forest": {
            "estimator": RandomForestClassifier(
                class_weight="balanced", random_state=42, n_jobs=N_JOBS
            ),
            "param_grid": {
                "model__n_estimators": [300],
                "model__max_depth": [4, 6],
                "model__min_samples_leaf": [15, 25],
                "model__min_samples_split": [20, 30],
            },
        },
    }

    return registry


def safe_auc_ovr_weighted(y_true: np.ndarray, y_proba: np.ndarray) -> float:
    """Compute multiclass weighted AUC safely."""
    y_bin = label_binarize(y_true, classes=[0, 1, 2])
    try:
        return float(
            roc_auc_score(y_bin, y_proba, multi_class="ovr", average="weighted")
        )
    except Exception:
        return 0.0


def apply_at_risk_thresholds(
    y_proba: np.ndarray, pre_diabetic_threshold: float, diabetic_threshold: float
) -> np.ndarray:
    """
    Apply class-probability thresholds favoring at-risk recall.
    
    RATIONALE FOR THESIS DEFENSE:
    ==============================
    This implements a SCREENING THRESHOLD strategy, not a diagnostic one.
    
    How it works:
    1. Start with argmax (standard probability-based prediction)
    2. Override predictions if probability exceeds at-risk thresholds
    3. If diabetic_prob >= diabetic_threshold -> predict Diabetic (regardless of argmax)
    4. If pre-diabetic_prob >= pre_diabetic_threshold AND not diabetic -> predict Pre-diabetic
    
    Clinical rationale (for screening context):
    - Lower thresholds for at-risk classes = more likely to flag as at-risk
    - "When in doubt, classify up" - better to over-flag than under-flag
    - Healthy patients flagged will get follow-up testing (acceptable)
    - Diabetic patients missed will NOT get follow-up (unacceptable)
    
    Expected impact on metrics:
    - Increases Diabetic and Pre-diabetic recall
    - Decreases Normal recall (more false positives for Normal class)
    - This is INTENTIONAL for screening use case
    
    Args:
        y_proba: Probability array shape (n_samples, 3) for [Normal, Pre-diabetic, Diabetic]
        pre_diabetic_threshold: Minimum prob to predict Pre-diabetic (typically 0.25-0.35)
        diabetic_threshold: Minimum prob to predict Diabetic (typically 0.25-0.35)
    
    Returns:
        Predicted class labels (0=Normal, 1=Pre-diabetic, 2=Diabetic)
    """
    y_pred = np.argmax(y_proba, axis=1).astype(int)
    diabetic_mask = y_proba[:, 2] >= diabetic_threshold
    pre_diabetic_mask = (y_proba[:, 1] >= pre_diabetic_threshold) & (~diabetic_mask)
    y_pred[diabetic_mask] = 2
    y_pred[pre_diabetic_mask] = 1
    return y_pred


def optimize_at_risk_thresholds(
    y_true: np.ndarray, y_proba: np.ndarray
) -> dict[str, float]:
    """
    Tune thresholds to prioritize class 1/2 recall while preserving overall behavior.
    
    RATIONALE FOR THESIS DEFENSE:
    ==============================
    This function searches for the optimal thresholds that maximize at-risk recall
    while maintaining reasonable overall performance.
    
    Search space:
    - Pre-diabetic threshold: 0.25 to 0.65 (step 0.05)
    - Diabetic threshold: 0.20 to 0.60 (step 0.05)
    
    The grid is asymmetric because:
    - We want to be MORE aggressive on catching diabetics (lower threshold = more flags)
    - Pre-diabetic threshold can be slightly higher (less critical than diabetic)
    
    The optimized thresholds maximize selection_score which weights:
    - 45% Diabetic recall (most important)
    - 30% Pre-diabetic recall (important)
    - 20% AUC (overall discrimination)
    - 5% Macro F1 (balance)
    
    This intentionally accepts lower Normal recall as a trade-off for higher
    at-risk recall - appropriate for screening, not for diagnostic use.
    """
    pre_grid = np.arange(0.25, 0.66, 0.05)
    diab_grid = np.arange(0.20, 0.61, 0.05)

    best = {
        "pre_diabetic": 0.35,
        "diabetic": 0.30,
        "selection_score": -1.0,
    }

    for pre_t in pre_grid:
        for diab_t in diab_grid:
            y_pred = apply_at_risk_thresholds(y_proba, pre_t, diab_t)
            recalls = recall_score(
                y_true, y_pred, labels=[0, 1, 2], average=None, zero_division=0
            )
            macro_f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
            score = (
                0.45 * recalls[2]
                + 0.35 * recalls[1]
                + 0.15 * macro_f1
                + 0.05 * recalls[0]
            )
            if score > best["selection_score"]:
                best = {
                    "pre_diabetic": float(pre_t),
                    "diabetic": float(diab_t),
                    "selection_score": float(score),
                }
    return best


def compute_prediction_metrics(
    y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray
) -> dict:
    """Compute aggregate and per-class metrics."""
    recalls = recall_score(
        y_true, y_pred, labels=[0, 1, 2], average=None, zero_division=0
    )
    precisions = precision_score(
        y_true, y_pred, labels=[0, 1, 2], average=None, zero_division=0
    )
    f1_per_class = f1_score(
        y_true, y_pred, labels=[0, 1, 2], average=None, zero_division=0
    )

    y_bin = label_binarize(y_true, classes=[0, 1, 2])
    brier_by_class = []
    for i in range(3):
        try:
            brier_by_class.append(float(brier_score_loss(y_bin[:, i], y_proba[:, i])))
        except Exception:
            brier_by_class.append(0.0)

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_weighted": float(
            precision_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "recall_weighted": float(
            recall_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "weighted_f1": float(
            f1_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "auc_roc_weighted_ovr": safe_auc_ovr_weighted(y_true, y_proba),
        "brier_score": float(np.mean(brier_by_class)),
        "brier_by_class": {
            CLASSES[i]: float(brier_by_class[i]) for i in range(len(CLASSES))
        },
        "recall_by_class": {CLASSES[i]: float(recalls[i]) for i in range(len(CLASSES))},
        "precision_by_class": {
            CLASSES[i]: float(precisions[i]) for i in range(len(CLASSES))
        },
        "f1_by_class": {CLASSES[i]: float(f1_per_class[i]) for i in range(len(CLASSES))},
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=[0, 1, 2]).tolist(),
    }


def selection_score(metrics: dict) -> float:
    """
    Score model quality with explicit preference for at-risk recall.
    
    RATIONALE FOR THESIS DEFENSE:
    =================================
    This function implements the clinical objective of a SCREENING TOOL, not a diagnostic tool.
    
    For screening (case-finding), the priority is:
    - Maximize sensitivity for at-risk classes (Pre-diabetic, Diabetic)
    - Accept lower specificity (more false positives are acceptable)
    - A false positive (healthy labeled at-risk) is less harmful than a false negative (missed diabetic)
    
    Weight distribution:
    - 45% Diabetic recall: Critical - don't miss diabetics
    - 30% Pre-diabetic recall: Important - catch pre-diabetics for intervention
    - 20% AUC-ROC: Maintain overall discrimination ability
    - 5% Macro F1: Minor balance
    
    Normal class recall is intentionally NOT weighted because:
    1. For screening, we WANT to over-flag healthy patients (they'll get follow-up tests)
    2. Missing a diabetic patient is far worse than inconveniencing a healthy patient
    3. This aligns with ADA screening guidelines: "when in doubt, test more"
    
    Expected behavior:
    - High Diabetic recall (~75%+) - catch most actual diabetics
    - Moderate Pre-diabetic recall (~40-50%) - catch about half
    - Low Normal recall (~10-20%) - screening over-flags, acceptable
    """
    return float(
        0.45 * metrics["recall_by_class"]["Diabetic"]
        + 0.30 * metrics["recall_by_class"]["Pre-diabetic"]
        + 0.20 * metrics["auc_roc_weighted_ovr"]
        + 0.05 * metrics["macro_f1"]
    )


def bootstrap_class_metric_ci(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    n_bootstrap: int = BOOTSTRAP_SAMPLES,
    seed: int = 42,
) -> dict:
    """Bootstrap CIs for macro-F1 and per-class recall."""
    rng = np.random.default_rng(seed)
    n = len(y_true)

    macro_f1_samples = []
    recall_samples = {name: [] for name in CLASSES}

    for _ in range(n_bootstrap):
        idx = rng.integers(0, n, size=n)
        y_t = y_true[idx]
        y_p = y_pred[idx]

        macro_f1_samples.append(f1_score(y_t, y_p, average="macro", zero_division=0))
        recalls = recall_score(y_t, y_p, labels=[0, 1, 2], average=None, zero_division=0)
        for i, name in enumerate(CLASSES):
            recall_samples[name].append(recalls[i])

    def ci(values: list[float]) -> dict:
        lower, upper = np.percentile(values, [2.5, 97.5])
        return {"lower": float(lower), "upper": float(upper)}

    full_recalls = recall_score(y_true, y_pred, labels=[0, 1, 2], average=None, zero_division=0)
    result = {
        "macro_f1": {
            "value": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
            "ci95": ci(macro_f1_samples),
        },
        "recall_by_class": {},
    }
    for i, name in enumerate(CLASSES):
        result["recall_by_class"][name] = {
            "value": float(full_recalls[i]),
            "ci95": ci(recall_samples[name]),
        }
    return result


def compute_ece_binary(y_true_binary: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """Expected Calibration Error for one-vs-rest probabilities."""
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_prob)
    for i in range(n_bins):
        left, right = bins[i], bins[i + 1]
        if i == n_bins - 1:
            mask = (y_prob >= left) & (y_prob <= right)
        else:
            mask = (y_prob >= left) & (y_prob < right)
        if not np.any(mask):
            continue
        conf = float(np.mean(y_prob[mask]))
        acc = float(np.mean(y_true_binary[mask]))
        ece += (np.sum(mask) / n) * abs(acc - conf)
    return float(ece)


def build_calibration_report(y_true: np.ndarray, y_proba: np.ndarray) -> dict:
    """Generate per-class Brier + ECE calibration summary."""
    y_bin = label_binarize(y_true, classes=[0, 1, 2])
    report = {"overall_brier": 0.0, "per_class": {}}
    briers = []
    for i, name in enumerate(CLASSES):
        brier = float(brier_score_loss(y_bin[:, i], y_proba[:, i]))
        ece = compute_ece_binary(y_bin[:, i], y_proba[:, i], n_bins=10)
        briers.append(brier)
        report["per_class"][name] = {"brier": brier, "ece": ece}
    report["overall_brier"] = float(np.mean(briers))
    return report


def compute_binary_at_risk_metrics(
    y_true_bin: np.ndarray, y_pred_bin: np.ndarray
) -> dict[str, float]:
    """Compute binary metrics for at-risk detection (classes 1 or 2)."""
    y_true_bin = y_true_bin.astype(int)
    y_pred_bin = y_pred_bin.astype(int)
    tp = int(np.sum((y_true_bin == 1) & (y_pred_bin == 1)))
    fp = int(np.sum((y_true_bin == 0) & (y_pred_bin == 1)))
    tn = int(np.sum((y_true_bin == 0) & (y_pred_bin == 0)))
    fn = int(np.sum((y_true_bin == 1) & (y_pred_bin == 0)))
    n = len(y_true_bin)

    sensitivity = tp / (tp + fn) if (tp + fn) else 0.0
    specificity = tn / (tn + fp) if (tn + fp) else 0.0
    ppv = tp / (tp + fp) if (tp + fp) else 0.0
    npv = tn / (tn + fn) if (tn + fn) else 0.0
    accuracy = (tp + tn) / n if n else 0.0
    f1 = (2 * tp) / (2 * tp + fp + fn) if (2 * tp + fp + fn) else 0.0
    prevalence = float(np.mean(y_true_bin))

    return {
        "sensitivity": float(sensitivity),
        "specificity": float(specificity),
        "ppv": float(ppv),
        "npv": float(npv),
        "accuracy": float(accuracy),
        "f1": float(f1),
        "prevalence": prevalence,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
    }


def build_operating_points(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    y_pred_default: np.ndarray,
    y_pred_thresholded: np.ndarray,
) -> tuple[pd.DataFrame, dict]:
    """
    Build operating-point table for at-risk detection.
    Positive class is (Pre-diabetic or Diabetic).
    """
    y_true_bin = np.isin(y_true, AT_RISK_CLASSES).astype(int)
    at_risk_prob = y_proba[:, 1] + y_proba[:, 2]

    rows = []

    # Strategy 1: multiclass argmax then collapse to at-risk.
    y_pred_default_bin = np.isin(y_pred_default, AT_RISK_CLASSES).astype(int)
    m_default = compute_binary_at_risk_metrics(y_true_bin, y_pred_default_bin)
    rows.append({"strategy": "multiclass_argmax", "threshold": np.nan, **m_default})

    # Strategy 2: tuned class thresholds.
    y_pred_tuned_bin = np.isin(y_pred_thresholded, AT_RISK_CLASSES).astype(int)
    m_tuned = compute_binary_at_risk_metrics(y_true_bin, y_pred_tuned_bin)
    rows.append({"strategy": "multiclass_tuned_thresholds", "threshold": np.nan, **m_tuned})

    # Strategy 3+: direct binary thresholds on P(at-risk).
    for threshold in [0.20, 0.30, 0.40, 0.50, 0.60]:
        y_pred_bin = (at_risk_prob >= threshold).astype(int)
        m = compute_binary_at_risk_metrics(y_true_bin, y_pred_bin)
        rows.append(
            {
                "strategy": f"at_risk_probability_{threshold:.2f}",
                "threshold": float(threshold),
                **m,
            }
        )

    op_df = pd.DataFrame(rows)
    # Favor sensitivity for screening but avoid collapse in specificity.
    screened = op_df[op_df["specificity"] >= 0.30].copy()
    if screened.empty:
        screened = op_df.copy()
    screened["selection_score"] = (
        0.55 * screened["sensitivity"]
        + 0.25 * screened["ppv"]
        + 0.20 * screened["specificity"]
    )
    best_row = screened.sort_values("selection_score", ascending=False).iloc[0].to_dict()
    return op_df, best_row


def compute_decision_curve(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    thresholds: np.ndarray | None = None,
) -> pd.DataFrame:
    """
    Compute decision-curve analysis for at-risk classification.
    Positive class: Pre-diabetic or Diabetic.
    """
    if thresholds is None:
        thresholds = np.arange(0.05, 0.95, 0.05)

    y_true_bin = np.isin(y_true, AT_RISK_CLASSES).astype(int)
    at_risk_prob = y_proba[:, 1] + y_proba[:, 2]
    n = len(y_true_bin)
    prevalence = float(np.mean(y_true_bin))

    rows = []
    for pt in thresholds:
        if pt <= 0.0 or pt >= 1.0:
            continue
        y_pred_bin = (at_risk_prob >= pt).astype(int)
        tp = np.sum((y_true_bin == 1) & (y_pred_bin == 1))
        fp = np.sum((y_true_bin == 0) & (y_pred_bin == 1))

        weight = pt / (1.0 - pt)
        nb_model = (tp / n) - (fp / n) * weight
        nb_all = prevalence - (1.0 - prevalence) * weight
        nb_none = 0.0
        rows.append(
            {
                "threshold_probability": float(pt),
                "net_benefit_model": float(nb_model),
                "net_benefit_treat_all": float(nb_all),
                "net_benefit_treat_none": float(nb_none),
            }
        )

    return pd.DataFrame(rows)


def build_threshold_ablation(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    y_pred_default: np.ndarray,
    y_pred_thresholded: np.ndarray,
) -> tuple[pd.DataFrame, dict]:
    """Compare default argmax vs tuned-threshold decision behavior."""
    default_multi = compute_prediction_metrics(y_true, y_pred_default, y_proba)
    tuned_multi = compute_prediction_metrics(y_true, y_pred_thresholded, y_proba)

    y_true_bin = np.isin(y_true, AT_RISK_CLASSES).astype(int)
    y_default_bin = np.isin(y_pred_default, AT_RISK_CLASSES).astype(int)
    y_tuned_bin = np.isin(y_pred_thresholded, AT_RISK_CLASSES).astype(int)

    default_bin = compute_binary_at_risk_metrics(y_true_bin, y_default_bin)
    tuned_bin = compute_binary_at_risk_metrics(y_true_bin, y_tuned_bin)

    rows = [
        {
            "strategy": "multiclass_argmax",
            "macro_f1": default_multi["macro_f1"],
            "auc_roc_weighted_ovr": default_multi["auc_roc_weighted_ovr"],
            "recall_pre_diabetic": default_multi["recall_by_class"]["Pre-diabetic"],
            "recall_diabetic": default_multi["recall_by_class"]["Diabetic"],
            "at_risk_sensitivity": default_bin["sensitivity"],
            "at_risk_specificity": default_bin["specificity"],
            "at_risk_ppv": default_bin["ppv"],
            "at_risk_npv": default_bin["npv"],
        },
        {
            "strategy": "multiclass_tuned_thresholds",
            "macro_f1": tuned_multi["macro_f1"],
            "auc_roc_weighted_ovr": tuned_multi["auc_roc_weighted_ovr"],
            "recall_pre_diabetic": tuned_multi["recall_by_class"]["Pre-diabetic"],
            "recall_diabetic": tuned_multi["recall_by_class"]["Diabetic"],
            "at_risk_sensitivity": tuned_bin["sensitivity"],
            "at_risk_specificity": tuned_bin["specificity"],
            "at_risk_ppv": tuned_bin["ppv"],
            "at_risk_npv": tuned_bin["npv"],
        },
    ]
    df = pd.DataFrame(rows)

    summary = {
        "delta_macro_f1": float(rows[1]["macro_f1"] - rows[0]["macro_f1"]),
        "delta_recall_pre_diabetic": float(
            rows[1]["recall_pre_diabetic"] - rows[0]["recall_pre_diabetic"]
        ),
        "delta_recall_diabetic": float(
            rows[1]["recall_diabetic"] - rows[0]["recall_diabetic"]
        ),
        "delta_at_risk_sensitivity": float(
            rows[1]["at_risk_sensitivity"] - rows[0]["at_risk_sensitivity"]
        ),
        "delta_at_risk_specificity": float(
            rows[1]["at_risk_specificity"] - rows[0]["at_risk_specificity"]
        ),
    }
    return df, summary


def find_threshold_for_target_sensitivity(
    y_true_bin: np.ndarray,
    score: np.ndarray,
    target_sensitivity: float,
) -> tuple[float, dict]:
    """Find threshold whose sensitivity is closest to target."""
    best_threshold = 0.5
    best_metrics = None
    best_gap = 1e9
    for thr in np.arange(0.05, 0.95, 0.01):
        y_pred_bin = (score >= thr).astype(int)
        metrics = compute_binary_at_risk_metrics(y_true_bin, y_pred_bin)
        gap = abs(metrics["sensitivity"] - target_sensitivity)
        if (
            gap < best_gap
            or (abs(gap - best_gap) < 1e-12 and best_metrics is not None and metrics["specificity"] > best_metrics["specificity"])
        ):
            best_gap = gap
            best_threshold = float(thr)
            best_metrics = metrics
    return best_threshold, (best_metrics or compute_binary_at_risk_metrics(y_true_bin, (score >= 0.5).astype(int)))


def compute_net_benefit_binary(
    y_true_bin: np.ndarray,
    y_pred_bin: np.ndarray,
    threshold_probability: float,
) -> float:
    """Compute net benefit for a binary classifier at a given threshold."""
    n = len(y_true_bin)
    tp = np.sum((y_true_bin == 1) & (y_pred_bin == 1))
    fp = np.sum((y_true_bin == 0) & (y_pred_bin == 1))
    w = threshold_probability / (1.0 - threshold_probability)
    return float((tp / n) - (fp / n) * w)


def build_best_vs_logistic_ablation(
    aggregated: dict,
    best_model_name: str,
) -> tuple[pd.DataFrame | None, dict]:
    """
    Compare best model to Logistic Regression at matched at-risk sensitivity.
    This isolates whether complexity buys practical clinical utility.
    """
    if "Logistic Regression" not in aggregated:
        return None, {"available": False, "reason": "Logistic Regression baseline not found."}
    if best_model_name == "Logistic Regression":
        return None, {
            "available": False,
            "reason": "Best model is already Logistic Regression.",
        }

    best = aggregated[best_model_name]
    lr = aggregated["Logistic Regression"]

    y_true = best["y_true"]
    if not np.array_equal(y_true, lr["y_true"]):
        return None, {
            "available": False,
            "reason": "Model fold aggregation order mismatch; cannot compare safely.",
        }
    y_true_bin = np.isin(y_true, AT_RISK_CLASSES).astype(int)

    deployed_best_pred_bin = np.isin(best["y_pred_thresholded"], AT_RISK_CLASSES).astype(int)
    deployed_best_metrics_bin = compute_binary_at_risk_metrics(
        y_true_bin, deployed_best_pred_bin
    )
    target_sens = deployed_best_metrics_bin["sensitivity"]

    best_score = best["y_proba"][:, 1] + best["y_proba"][:, 2]
    best_threshold, best_metrics_bin = find_threshold_for_target_sensitivity(
        y_true_bin, best_score, target_sens
    )
    best_pred_bin = (best_score >= best_threshold).astype(int)

    lr_score = lr["y_proba"][:, 1] + lr["y_proba"][:, 2]
    lr_threshold, lr_metrics_bin = find_threshold_for_target_sensitivity(
        y_true_bin, lr_score, target_sens
    )
    lr_pred_bin = (lr_score >= lr_threshold).astype(int)

    rows = [
        {
            "model": best_model_name,
            "comparison_mode": "matched_sensitivity",
            "at_risk_threshold": float(best_threshold),
            "target_sensitivity": float(target_sens),
            "sensitivity": float(best_metrics_bin["sensitivity"]),
            "specificity": float(best_metrics_bin["specificity"]),
            "ppv": float(best_metrics_bin["ppv"]),
            "npv": float(best_metrics_bin["npv"]),
            "net_benefit": float(
                compute_net_benefit_binary(y_true_bin, best_pred_bin, best_threshold)
            ),
            "multiclass_auc_ovr_weighted": float(best["threshold_metrics"]["auc_roc_weighted_ovr"]),
            "multiclass_macro_f1": float(best["threshold_metrics"]["macro_f1"]),
        },
        {
            "model": "Logistic Regression",
            "comparison_mode": "matched_sensitivity",
            "at_risk_threshold": float(lr_threshold),
            "target_sensitivity": float(target_sens),
            "sensitivity": float(lr_metrics_bin["sensitivity"]),
            "specificity": float(lr_metrics_bin["specificity"]),
            "ppv": float(lr_metrics_bin["ppv"]),
            "npv": float(lr_metrics_bin["npv"]),
            "net_benefit": float(
                compute_net_benefit_binary(y_true_bin, lr_pred_bin, lr_threshold)
            ),
            "multiclass_auc_ovr_weighted": float(lr["threshold_metrics"]["auc_roc_weighted_ovr"]),
            "multiclass_macro_f1": float(lr["threshold_metrics"]["macro_f1"]),
        },
    ]
    df = pd.DataFrame(rows)
    summary = {
        "available": True,
        "target_sensitivity": float(target_sens),
        "deployed_best_sensitivity": float(deployed_best_metrics_bin["sensitivity"]),
        "delta_specificity_best_minus_lr": float(
            rows[0]["specificity"] - rows[1]["specificity"]
        ),
        "delta_ppv_best_minus_lr": float(rows[0]["ppv"] - rows[1]["ppv"]),
        "delta_net_benefit_best_minus_lr": float(
            rows[0]["net_benefit"] - rows[1]["net_benefit"]
        ),
    }
    return df, summary


def plot_threshold_ablation(ablation_df: pd.DataFrame, output_path: Path) -> None:
    """Plot key threshold ablation metrics for quick defense visuals."""
    fig, ax = plt.subplots(figsize=(9, 5))
    x = np.arange(len(ablation_df))
    width = 0.2
    ax.bar(x - width, ablation_df["recall_pre_diabetic"], width, label="Recall Pre-diabetic")
    ax.bar(x, ablation_df["recall_diabetic"], width, label="Recall Diabetic")
    ax.bar(x + width, ablation_df["at_risk_specificity"], width, label="At-risk Specificity")
    ax.set_xticks(x)
    ax.set_xticklabels(ablation_df["strategy"], rotation=15, ha="right")
    ax.set_ylim(0.0, 1.0)
    ax.set_ylabel("Score")
    ax.set_title("Thresholding Ablation")
    ax.grid(alpha=0.2, axis="y")
    ax.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_best_vs_logistic(ablation_df: pd.DataFrame, output_path: Path) -> None:
    """Plot matched-sensitivity comparison: best model vs logistic baseline."""
    fig, ax = plt.subplots(figsize=(9, 5))
    x = np.arange(len(ablation_df))
    width = 0.2
    ax.bar(x - width, ablation_df["sensitivity"], width, label="Sensitivity")
    ax.bar(x, ablation_df["specificity"], width, label="Specificity")
    ax.bar(x + width, ablation_df["ppv"], width, label="PPV")
    ax.set_xticks(x)
    ax.set_xticklabels(ablation_df["model"], rotation=15, ha="right")
    ax.set_ylim(0.0, 1.0)
    ax.set_ylabel("Score")
    ax.set_title("Best Model vs Logistic (Matched Sensitivity)")
    ax.grid(alpha=0.2, axis="y")
    ax.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_decision_curve(decision_df: pd.DataFrame, output_path: Path) -> None:
    """Plot decision curve net benefit across threshold probabilities."""
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(
        decision_df["threshold_probability"],
        decision_df["net_benefit_model"],
        label="Model",
        linewidth=2.5,
    )
    ax.plot(
        decision_df["threshold_probability"],
        decision_df["net_benefit_treat_all"],
        label="Treat All",
        linestyle="--",
        linewidth=1.8,
    )
    ax.plot(
        decision_df["threshold_probability"],
        decision_df["net_benefit_treat_none"],
        label="Treat None",
        linestyle=":",
        linewidth=1.8,
    )
    ax.set_xlabel("Threshold Probability")
    ax.set_ylabel("Net Benefit")
    ax.set_title("Decision Curve Analysis (At-Risk Detection)")
    ax.grid(alpha=0.3)
    ax.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_confusion_matrix(cm: np.ndarray, model_name: str, output_path: Path) -> None:
    """Plot multiclass confusion matrix."""
    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(3),
        yticks=np.arange(3),
        xticklabels=CLASSES,
        yticklabels=CLASSES,
        ylabel="True Label",
        xlabel="Predicted Label",
        title=f"Confusion Matrix - {model_name}",
    )
    thresh = cm.max() / 2.0 if cm.max() > 0 else 1.0
    for i in range(3):
        for j in range(3):
            ax.text(
                j,
                i,
                format(cm[i, j], "d"),
                ha="center",
                va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontsize=12,
            )
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_roc_curve(y_true: np.ndarray, y_proba: np.ndarray, model_name: str, output_path: Path) -> None:
    """Plot one-vs-rest ROC curves."""
    y_test_bin = label_binarize(y_true, classes=[0, 1, 2])
    fig, ax = plt.subplots(figsize=(8, 6))
    colors = ["#e74c3c", "#f39c12", "#27ae60"]
    for i in range(3):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, color=colors[i], lw=2, label=f"{CLASSES[i]} (AUC={roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=2)
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(f"ROC Curve - {model_name}")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_reliability_diagrams(y_true: np.ndarray, y_proba: np.ndarray, output_path: Path) -> None:
    """Plot calibration curves for each class."""
    y_bin = label_binarize(y_true, classes=[0, 1, 2])
    fig, axes = plt.subplots(1, 3, figsize=(16, 4.5))
    for i, name in enumerate(CLASSES):
        frac_pos, mean_pred = calibration_curve(
            y_bin[:, i], y_proba[:, i], n_bins=10, strategy="quantile"
        )
        axes[i].plot(mean_pred, frac_pos, marker="o", linewidth=2)
        axes[i].plot([0, 1], [0, 1], "k--", linewidth=1)
        axes[i].set_title(f"{name}")
        axes[i].set_xlabel("Mean Predicted Probability")
        axes[i].set_ylabel("Observed Frequency")
        axes[i].grid(alpha=0.3)
    fig.suptitle("Reliability Diagrams (One-vs-Rest)")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


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
    fold_rows: list[dict] = []
    store = defaultdict(
        lambda: {
            "y_true": [],
            "y_proba": [],
            "y_pred_default": [],
            "y_pred_thresholded": [],
            "pre_thresholds": [],
            "diab_thresholds": [],
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
            pipeline = Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    ("model", cfg["estimator"]),
                ]
            )
            search = GridSearchCV(
                estimator=pipeline,
                param_grid=cfg["param_grid"],
                scoring="roc_auc_ovr_weighted",
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
            train_oof_proba = cross_val_predict(
                best_pipeline,
                X_train,
                y_train,
                cv=inner_cv.split(X_train, y_train, g_train),
                method="predict_proba",
                n_jobs=N_JOBS,
            )
            thresh = optimize_at_risk_thresholds(y_train, train_oof_proba)

            test_proba = best_pipeline.predict_proba(X_test)
            test_pred_default = np.argmax(test_proba, axis=1)
            test_pred_thresholded = apply_at_risk_thresholds(
                test_proba,
                thresh["pre_diabetic"],
                thresh["diabetic"],
            )

            default_metrics = compute_prediction_metrics(y_test, test_pred_default, test_proba)
            threshold_metrics = compute_prediction_metrics(
                y_test, test_pred_thresholded, test_proba
            )
            score = selection_score(threshold_metrics)

            fold_rows.append(
                {
                    "Fold": fold_idx,
                    "Test_Cycle": test_cycle,
                    "Model": model_name,
                    "Inner_CV_AUC": float(search.best_score_),
                    "AUC_ROC": threshold_metrics["auc_roc_weighted_ovr"],
                    "Accuracy": threshold_metrics["accuracy"],
                    "Macro_F1": threshold_metrics["macro_f1"],
                    "Recall_Normal": threshold_metrics["recall_by_class"]["Normal"],
                    "Recall_PreDiabetic": threshold_metrics["recall_by_class"][
                        "Pre-diabetic"
                    ],
                    "Recall_Diabetic": threshold_metrics["recall_by_class"]["Diabetic"],
                    "PreDiabetic_Threshold": thresh["pre_diabetic"],
                    "Diabetic_Threshold": thresh["diabetic"],
                    "Selection_Score": score,
                    "Best_Params": json.dumps(search.best_params_),
                }
            )

            s = store[model_name]
            s["y_true"].append(y_test)
            s["y_proba"].append(test_proba)
            s["y_pred_default"].append(test_pred_default)
            s["y_pred_thresholded"].append(test_pred_thresholded)
            s["pre_thresholds"].append(thresh["pre_diabetic"])
            s["diab_thresholds"].append(thresh["diabetic"])
            s["inner_cv_auc"].append(float(search.best_score_))

            print(
                f"   {model_name:<20} AUC={threshold_metrics['auc_roc_weighted_ovr']:.4f} "
                f"R1={threshold_metrics['recall_by_class']['Pre-diabetic']:.3f} "
                f"R2={threshold_metrics['recall_by_class']['Diabetic']:.3f}"
            )

    fold_df = pd.DataFrame(fold_rows)
    if fold_df.empty:
        raise RuntimeError("No model completed nested LOGO evaluation successfully.")

    comparison_rows = []
    aggregated = {}
    for model_name, s in store.items():
        y_true = np.concatenate(s["y_true"])
        y_proba = np.vstack(s["y_proba"])
        y_pred_default = np.concatenate(s["y_pred_default"])
        y_pred_thresholded = np.concatenate(s["y_pred_thresholded"])

        default_metrics = compute_prediction_metrics(y_true, y_pred_default, y_proba)
        threshold_metrics = compute_prediction_metrics(y_true, y_pred_thresholded, y_proba)
        class_ci = bootstrap_class_metric_ci(y_true, y_pred_thresholded)
        score = selection_score(threshold_metrics)

        model_folds = fold_df[fold_df["Model"] == model_name]
        comparison_rows.append(
            {
                "Model": model_name,
                "AUC_ROC": threshold_metrics["auc_roc_weighted_ovr"],
                "Accuracy": threshold_metrics["accuracy"],
                "Macro_F1": threshold_metrics["macro_f1"],
                "Recall_PreDiabetic": threshold_metrics["recall_by_class"]["Pre-diabetic"],
                "Recall_Diabetic": threshold_metrics["recall_by_class"]["Diabetic"],
                "Brier": threshold_metrics["brier_score"],
                "Inner_CV_AUC_Mean": float(np.mean(s["inner_cv_auc"])),
                "Inner_CV_AUC_Std": float(np.std(s["inner_cv_auc"])),
                "Outer_AUC_Mean": float(model_folds["AUC_ROC"].mean()),
                "Outer_AUC_Std": float(model_folds["AUC_ROC"].std(ddof=0)),
                "Median_PreDiabetic_Threshold": float(np.median(s["pre_thresholds"])),
                "Median_Diabetic_Threshold": float(np.median(s["diab_thresholds"])),
                "Selection_Score": score,
            }
        )

        aggregated[model_name] = {
            "y_true": y_true,
            "y_proba": y_proba,
            "y_pred_default": y_pred_default,
            "y_pred_thresholded": y_pred_thresholded,
            "default_metrics": default_metrics,
            "threshold_metrics": threshold_metrics,
            "class_metric_ci": class_ci,
            "pre_threshold": float(np.median(s["pre_thresholds"])),
            "diab_threshold": float(np.median(s["diab_thresholds"])),
            "selection_score": score,
        }

    comparison_df = pd.DataFrame(comparison_rows).sort_values(
        "Selection_Score", ascending=False
    )
    return comparison_df, fold_df, aggregated


def train_full_model_for_serving(
    best_model_name: str,
    model_registry: dict,
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
) -> tuple[SimpleImputer, StandardScaler, object, object, dict, bool]:
    """Refit selected model on full data with group-aware search."""
    cfg = model_registry[best_model_name]
    inner_cv = get_inner_cv(groups)
    pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", cfg["estimator"]),
        ]
    )
    search = GridSearchCV(
        estimator=pipeline,
        param_grid=cfg["param_grid"],
        scoring="roc_auc_ovr_weighted",
        cv=inner_cv.split(X, y, groups),
        n_jobs=N_JOBS,
        refit=True,
        error_score=np.nan,
    )
    search.fit(X, y)
    best_pipeline = search.best_estimator_
    imputer = best_pipeline.named_steps["imputer"]
    scaler = best_pipeline.named_steps["scaler"]
    uncalibrated_model = best_pipeline.named_steps["model"]

    calibrated_model = uncalibrated_model
    calibrated_used = False
    X_imputed = imputer.transform(X)
    X_scaled = scaler.transform(X_imputed)
    try:
        # Calibrate at probability level for better risk estimation.
        calibrated = CalibratedClassifierCV(uncalibrated_model, method="sigmoid", cv=5)
        calibrated.fit(X_scaled, y)
        calibrated_model = calibrated
        calibrated_used = True
    except Exception as exc:
        print(f"[WARN] Calibration skipped: {exc}")

    logo = LeaveOneGroupOut()
    full_oof_proba = cross_val_predict(
        best_pipeline,
        X,
        y,
        cv=logo.split(X, y, groups),
        method="predict_proba",
        n_jobs=N_JOBS,
    )
    thresholds = optimize_at_risk_thresholds(y, full_oof_proba)
    return imputer, scaler, uncalibrated_model, calibrated_model, thresholds, calibrated_used


def generate_clustering_defensibility(
    X: np.ndarray,
    y: np.ndarray,
    feature_names: list[str],
) -> dict:
    """Compare K=2 vs K=4 clustering quality and clinical separation."""
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    rows = []
    details = {}
    for k in [2, 4]:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=20)
        labels = kmeans.fit_predict(X_scaled)

        silhouettes = float(silhouette_score(X_scaled, labels))
        calinski = float(calinski_harabasz_score(X_scaled, labels))
        davies = float(davies_bouldin_score(X_scaled, labels))

        cluster_sizes = {
            str(i): int(np.sum(labels == i))
            for i in range(k)
        }
        diabetic_rate = {
            str(i): float(np.mean(y[labels == i] == 2))
            for i in range(k)
        }

        rows.append(
            {
                "k": k,
                "silhouette": silhouettes,
                "calinski_harabasz": calinski,
                "davies_bouldin": davies,
            }
        )

        cluster_df = pd.DataFrame(X_imputed, columns=feature_names)
        cluster_df["cluster"] = labels
        cluster_df[TARGET] = y
        profile = cluster_df.groupby("cluster")[feature_names].mean().round(3)
        profile["size"] = cluster_df.groupby("cluster").size().values
        profile["diabetic_rate"] = (
            cluster_df.groupby("cluster")[TARGET].apply(lambda s: float(np.mean(s == 2))).values
        )
        profile.to_csv(RESULTS_DIR / f"cluster_profiles_k{k}.csv")

        details[str(k)] = {
            "cluster_sizes": cluster_sizes,
            "diabetic_rate": diabetic_rate,
        }

    comparison_df = pd.DataFrame(rows)
    comparison_df.to_csv(RESULTS_DIR / "k_comparison.csv", index=False)

    with open(RESULTS_DIR / "k_comparison.json", "w") as f:
        json.dump({"k_metrics": rows, "cluster_details": details}, f, indent=2)

    fig, axes = plt.subplots(1, 3, figsize=(12, 4))
    axes[0].bar(comparison_df["k"].astype(str), comparison_df["silhouette"], color="#3498db")
    axes[0].set_title("Silhouette (higher better)")
    axes[1].bar(comparison_df["k"].astype(str), comparison_df["calinski_harabasz"], color="#2ecc71")
    axes[1].set_title("Calinski-Harabasz (higher better)")
    axes[2].bar(comparison_df["k"].astype(str), comparison_df["davies_bouldin"], color="#e67e22")
    axes[2].set_title("Davies-Bouldin (lower better)")
    for ax in axes:
        ax.set_xlabel("K")
        ax.grid(alpha=0.2)
    plt.tight_layout()
    plt.savefig(VIZ_DIR / "k2_vs_k4_comparison.png", dpi=150, bbox_inches="tight")
    plt.close()

    return {
        "k_metrics": rows,
        "silhouette_optimal_k": int(
            comparison_df.loc[comparison_df["silhouette"].idxmax(), "k"]
        ),
        "clinical_k": 4,
    }


def train_serving_kmeans(
    X_scaled: np.ndarray,
    y: np.ndarray,
    feature_names: list[str],
) -> dict:
    """
    Train and save K=4 clustering artifact for runtime risk-cluster output.
    Uses the same scaled feature space as classifier inference.
    """
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=20)
    labels = kmeans.fit_predict(X_scaled)

    # Risk scoring by observed class prevalence in each cluster.
    cluster_profiles = pd.DataFrame(X_scaled, columns=feature_names)
    cluster_profiles["cluster"] = labels
    cluster_profiles[TARGET] = y

    summary_rows = []
    for cluster_id in sorted(np.unique(labels)):
        subset = cluster_profiles[cluster_profiles["cluster"] == cluster_id]
        n = len(subset)
        diabetic_rate = float(np.mean(subset[TARGET] == 2))
        pre_diabetic_rate = float(np.mean(subset[TARGET] == 1))
        risk_score = diabetic_rate + 0.5 * pre_diabetic_rate
        summary_rows.append(
            {
                "cluster_id": int(cluster_id),
                "size": int(n),
                "diabetic_rate": diabetic_rate,
                "pre_diabetic_rate": pre_diabetic_rate,
                "risk_score": risk_score,
            }
        )

    summary_df = pd.DataFrame(summary_rows).sort_values("risk_score", ascending=False)
    rank_to_label = {
        0: ("High Risk", "HIGH"),
        1: ("Moderate Risk", "MODERATE"),
        2: ("Low-Moderate Risk", "LOW_MODERATE"),
        3: ("Low Risk", "LOW"),
    }
    cluster_labels = {}
    for rank, row in enumerate(summary_df.itertuples(index=False)):
        label, risk_level = rank_to_label.get(rank, ("Risk Cluster", "UNKNOWN"))
        cluster_labels[str(int(row.cluster_id))] = {
            "label": label,
            "risk_level": risk_level,
            "diabetic_rate": float(row.diabetic_rate),
            "pre_diabetic_rate": float(row.pre_diabetic_rate),
            "risk_score": float(row.risk_score),
            "size": int(row.size),
        }

    joblib.dump(kmeans, MODELS_DIR / "kmeans_model.joblib")
    with open(MODELS_DIR / "cluster_labels.json", "w") as f:
        json.dump(cluster_labels, f, indent=2)

    profile_out = (
        cluster_profiles.groupby("cluster")[feature_names + [TARGET]]
        .mean()
        .round(4)
        .reset_index()
    )
    profile_out.to_csv(RESULTS_DIR / "cluster_profiles.csv", index=False)

    cluster_analysis = {
        "method": "kmeans_k4_on_scaled_clinical_features",
        "cluster_labels": cluster_labels,
        "cluster_sizes": {
            cluster_labels[str(k)]["label"]: cluster_labels[str(k)]["size"]
            for k in sorted(int(k) for k in cluster_labels.keys())
        },
    }
    with open(RESULTS_DIR / "cluster_analysis.json", "w") as f:
        json.dump(cluster_analysis, f, indent=2)

    return cluster_analysis


def compute_outer_fold_ci(fold_df: pd.DataFrame, model_name: str) -> dict:
    """Compute percentile CIs from outer LOGO fold metrics for one model."""
    model_folds = fold_df[fold_df["Model"] == model_name]
    metrics = ["AUC_ROC", "Macro_F1", "Recall_PreDiabetic", "Recall_Diabetic", "Accuracy"]
    out = {}
    for metric in metrics:
        vals = model_folds[metric].astype(float).values
        if len(vals) == 0:
            out[metric] = {"mean": 0.0, "ci95": {"lower": 0.0, "upper": 0.0}}
            continue
        lower, upper = np.percentile(vals, [2.5, 97.5])
        out[metric] = {
            "mean": float(np.mean(vals)),
            "ci95": {"lower": float(lower), "upper": float(upper)},
        }
    return out


def save_feature_manifest() -> None:
    """Persist feature contract for inference."""
    with open(MODELS_DIR / "features.json", "w") as f:
        json.dump(
            {
                "features": REDUCED_FEATURES,
                "n_features": len(REDUCED_FEATURES),
                "note": "Defensible v2 feature contract (13 reduced features)",
            },
            f,
            indent=2,
        )


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    VIZ_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 78)
    print("DIANA Clinical Model Training V2 - Defensible Evaluation Upgrade")
    print("Nested LOGO | Leakage-safe Pipeline CV | Calibration | Thresholding | CI")
    print("=" * 78)

    print(f"\n[LOAD] Reading dataset from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"   Total rows: {len(df)}")

    df = engineer_features_reduced(df)
    missing_cols = [f for f in REDUCED_FEATURES + [TARGET, "cycle"] if f not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    # Keep feature NaNs so imputation happens inside CV pipeline (leakage-safe).
    df_clean = df.dropna(subset=[TARGET, "cycle"]).copy()
    X = df_clean[REDUCED_FEATURES].values.astype(float)
    y = df_clean[TARGET].values.astype(int)
    groups = df_clean["cycle"].values

    print(f"\n[DATA] Complete records: {len(X)}")
    print(f"       Features: {len(REDUCED_FEATURES)}")
    print(f"       Class distribution: {dict(zip(CLASSES, np.bincount(y)))}")
    print(f"       NHANES cycles: {list(np.unique(groups))}")

    model_registry = build_model_registry()
    print(f"\n[MODELS] Candidates: {list(model_registry.keys())}")

    comparison_df, fold_df, aggregated = run_nested_logo_evaluation(
        X, y, groups, model_registry
    )
    comparison_df.to_csv(RESULTS_DIR / "model_comparison.csv", index=False)
    fold_df.to_csv(RESULTS_DIR / "logo_fold_metrics.csv", index=False)

    best_model_name = comparison_df.iloc[0]["Model"]
    best_agg = aggregated[best_model_name]
    outer_fold_ci = compute_outer_fold_ci(fold_df, best_model_name)
    print(f"\n[BEST] Selected model: {best_model_name}")
    print(
        f"       AUC={best_agg['threshold_metrics']['auc_roc_weighted_ovr']:.4f}, "
        f"R1={best_agg['threshold_metrics']['recall_by_class']['Pre-diabetic']:.4f}, "
        f"R2={best_agg['threshold_metrics']['recall_by_class']['Diabetic']:.4f}"
    )

    imputer, scaler, uncalibrated_model, serving_model, full_thresholds, calibrated_used = (
        train_full_model_for_serving(best_model_name, model_registry, X, y, groups)
    )

    # Save model artifacts
    print("\n[SAVE] Writing model artifacts...")
    joblib.dump(imputer, MODELS_DIR / "imputer.joblib")
    joblib.dump(scaler, MODELS_DIR / "scaler.joblib")
    joblib.dump(uncalibrated_model, MODELS_DIR / "best_model_uncalibrated.joblib")
    joblib.dump(serving_model, MODELS_DIR / "best_model.joblib")
    if calibrated_used:
        joblib.dump(serving_model, MODELS_DIR / "best_model_calibrated.joblib")
    save_feature_manifest()

    # Diagnostics for best model (aggregated OOF from nested LOGO)
    y_true_best = best_agg["y_true"]
    y_proba_best = best_agg["y_proba"]
    y_pred_best = best_agg["y_pred_thresholded"]

    calibration_report = build_calibration_report(y_true_best, y_proba_best)
    with open(RESULTS_DIR / "calibration_report.json", "w") as f:
        json.dump(calibration_report, f, indent=2)

    # Clinical utility: operating points + decision curve.
    operating_points_df, recommended_operating_point = build_operating_points(
        y_true_best,
        y_proba_best,
        best_agg["y_pred_default"],
        y_pred_best,
    )
    operating_points_df.to_csv(RESULTS_DIR / "operating_points.csv", index=False)

    decision_curve_df = compute_decision_curve(y_true_best, y_proba_best)
    decision_curve_df.to_csv(RESULTS_DIR / "decision_curve.csv", index=False)
    plot_decision_curve(decision_curve_df, VIZ_DIR / "decision_curve.png")
    best_decision_row = decision_curve_df.sort_values(
        "net_benefit_model", ascending=False
    ).iloc[0].to_dict()

    # Week-3 ablation: tuned thresholds vs default argmax.
    threshold_ablation_df, threshold_ablation_summary = build_threshold_ablation(
        y_true_best,
        y_proba_best,
        best_agg["y_pred_default"],
        y_pred_best,
    )
    threshold_ablation_df.to_csv(RESULTS_DIR / "threshold_ablation.csv", index=False)
    plot_threshold_ablation(threshold_ablation_df, VIZ_DIR / "threshold_ablation.png")

    # Week-3 ablation: best model vs logistic baseline at matched sensitivity.
    best_vs_lr_df, best_vs_lr_summary = build_best_vs_logistic_ablation(
        aggregated, best_model_name
    )
    if best_vs_lr_df is not None:
        best_vs_lr_df.to_csv(
            RESULTS_DIR / "best_vs_logistic_ablation.csv", index=False
        )
        plot_best_vs_logistic(best_vs_lr_df, VIZ_DIR / "best_vs_logistic.png")

    class_ci = best_agg["class_metric_ci"]
    with open(RESULTS_DIR / "class_metrics_ci.json", "w") as f:
        json.dump(class_ci, f, indent=2)

    with open(RESULTS_DIR / "outer_fold_ci.json", "w") as f:
        json.dump(outer_fold_ci, f, indent=2)

    with open(RESULTS_DIR / "decision_thresholds.json", "w") as f:
        json.dump(
            {
                "pre_diabetic": full_thresholds["pre_diabetic"],
                "diabetic": full_thresholds["diabetic"],
                "selection_score": full_thresholds["selection_score"],
            },
            f,
            indent=2,
        )

    # Clustering defensibility (K=2 vs K=4)
    clustering_report = generate_clustering_defensibility(X, y, REDUCED_FEATURES)
    X_scaled_full = scaler.transform(imputer.transform(X))
    cluster_analysis = train_serving_kmeans(X_scaled_full, y, REDUCED_FEATURES)
    optimal_k = int(clustering_report["silhouette_optimal_k"])
    clinical_k = int(clustering_report["clinical_k"])
    if optimal_k == clinical_k:
        wording = (
            f"Use K={optimal_k} as both the primary unsupervised finding and "
            "the clinically interpretable mapping."
        )
    else:
        wording = (
            f"Use K={optimal_k} as the primary unsupervised finding; present "
            f"K={clinical_k} as exploratory clinical mapping for interpretability."
        )

    clustering_positioning = {
        "primary_unsupervised": {
            "k": optimal_k,
            "basis": "Best unsupervised compactness/separation (silhouette).",
        },
        "exploratory_clinical_mapping": {
            "k": clinical_k,
            "basis": "Clinically interpretable risk stratification aligned to 4 groups.",
        },
        "recommended_thesis_wording": wording,
    }
    with open(RESULTS_DIR / "clustering_positioning.json", "w") as f:
        json.dump(clustering_positioning, f, indent=2)

    # Visualizations
    print("\n[VIZ] Generating diagnostics plots...")
    cm = np.array(best_agg["threshold_metrics"]["confusion_matrix"])
    plot_confusion_matrix(cm, best_model_name, VIZ_DIR / "confusion_matrix.png")
    plot_roc_curve(y_true_best, y_proba_best, best_model_name, VIZ_DIR / "roc_curve.png")
    plot_reliability_diagrams(
        y_true_best, y_proba_best, VIZ_DIR / "reliability_diagram.png"
    )

    # Training/OOF gap (defensible overfit proxy)
    y_train_pred = serving_model.predict(X_scaled_full)
    train_accuracy = float(accuracy_score(y, y_train_pred))
    oof_accuracy = float(best_agg["threshold_metrics"]["accuracy"])
    overfit_gap = train_accuracy - oof_accuracy

    report = {
        "model_type": "clinical_3class_reduced_features",
        "features": REDUCED_FEATURES,
        "n_features": len(REDUCED_FEATURES),
        "validation_method": "Nested LOGO (outer) + GroupKFold Pipeline CV (inner)",
        "preprocessing": {
            "imputation": "SimpleImputer(strategy=median) inside CV pipeline",
            "scaling": "StandardScaler inside CV pipeline",
        },
        "best_model": best_model_name,
        "calibrated_for_serving": calibrated_used,
        "decision_thresholds": {
            "pre_diabetic": full_thresholds["pre_diabetic"],
            "diabetic": full_thresholds["diabetic"],
            "objective": "Optimize recall on Pre-diabetic/Diabetic classes",
            "screening_behavior": {
                "description": "This model is designed for SCREENING (case-finding), not diagnosis",
                "clinical_rationale": "For screening, we prioritize sensitivity over specificity. A false positive (healthy labeled at-risk) is less harmful than a false negative (missed diabetic). Patients flagged as at-risk will receive follow-up diagnostic testing.",
                "expected_class_recall": {
                    "Diabetic": "High (~75%+) - Must catch most diabetics",
                    "Pre-diabetic": "Moderate (~40-50%) - Catch about half for early intervention",
                    "Normal": "Low (~10-20%) - Acceptable over-flagging in screening context"
                },
                "threshold_strategy": "Apply lower probability thresholds for at-risk classes, forcing predictions toward Pre-diabetic/Diabetic when probability exceeds threshold",
                "selection_score_weights": {
                    "Diabetic_recall": "45%",
                    "Pre_diabetic_recall": "30%",
                    "AUC_ROC": "20%",
                    "Macro_F1": "5%",
                    "Normal_recall": "0% (intentionally not weighted)"
                }
            },
        },
        "metrics": {
            "accuracy": best_agg["threshold_metrics"]["accuracy"],
            "precision": best_agg["threshold_metrics"]["precision_weighted"],
            "recall": best_agg["threshold_metrics"]["recall_weighted"],
            "f1_score": best_agg["threshold_metrics"]["weighted_f1"],
            "macro_f1": best_agg["threshold_metrics"]["macro_f1"],
            "auc_roc": best_agg["threshold_metrics"]["auc_roc_weighted_ovr"],
            "brier_score": best_agg["threshold_metrics"]["brier_score"],
            "train_accuracy": train_accuracy,
            "overfit_gap": overfit_gap,
        },
        "class_level_metrics": {
            "recall_by_class": best_agg["threshold_metrics"]["recall_by_class"],
            "precision_by_class": best_agg["threshold_metrics"]["precision_by_class"],
            "f1_by_class": best_agg["threshold_metrics"]["f1_by_class"],
            "confidence_intervals_95": class_ci,
        },
        "clinical_utility": {
            "target_condition": "At-risk (Pre-diabetic or Diabetic)",
            "recommended_operating_point": recommended_operating_point,
            "decision_curve_best_net_benefit": best_decision_row,
            "operating_points": operating_points_df.to_dict(orient="records"),
        },
        "ablation_bundle": {
            "thresholding_default_vs_tuned": {
                "summary": threshold_ablation_summary,
                "rows": threshold_ablation_df.to_dict(orient="records"),
            },
            "best_vs_logistic_matched_sensitivity": {
                "summary": best_vs_lr_summary,
                "rows": (
                    best_vs_lr_df.to_dict(orient="records")
                    if best_vs_lr_df is not None
                    else []
                ),
            },
        },
        "outer_fold_confidence_intervals": outer_fold_ci,
        "calibration": calibration_report,
        "clustering_defensibility": clustering_report,
        "clustering_positioning": clustering_positioning,
        "cluster_analysis": cluster_analysis,
        "confusion_matrix": best_agg["threshold_metrics"]["confusion_matrix"],
    }

    with open(RESULTS_DIR / "best_model_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 78)
    print("TRAINING SUMMARY")
    print("=" * 78)
    print(f"Best Model:          {best_model_name}")
    print(f"AUC-ROC (OOF):       {report['metrics']['auc_roc']:.4f}")
    print(f"Macro F1 (OOF):      {report['metrics']['macro_f1']:.4f}")
    print(
        f"Recall Pre/Diab:     "
        f"{report['class_level_metrics']['recall_by_class']['Pre-diabetic']:.4f} / "
        f"{report['class_level_metrics']['recall_by_class']['Diabetic']:.4f}"
    )
    print(
        f"Thresholds (P1/P2):  "
        f"{report['decision_thresholds']['pre_diabetic']:.2f} / "
        f"{report['decision_thresholds']['diabetic']:.2f}"
    )
    print(f"Calibration Brier:   {report['metrics']['brier_score']:.4f}")
    print(f"Overfit Gap:         {report['metrics']['overfit_gap']:.4f}")
    print(
        "K-comparison:        "
        f"silhouette-optimal K={clustering_report['silhouette_optimal_k']} | "
        f"clinical K={clustering_report['clinical_k']}"
    )
    print(
        "Clinical utility:    "
        f"{recommended_operating_point['strategy']} "
        f"(Sens={recommended_operating_point['sensitivity']:.3f}, "
        f"Spec={recommended_operating_point['specificity']:.3f}, "
        f"PPV={recommended_operating_point['ppv']:.3f})"
    )
    print(
        "Threshold ablation:  "
        f"Delta recall diab={threshold_ablation_summary['delta_recall_diabetic']:+.3f}, "
        f"Delta specificity={threshold_ablation_summary['delta_at_risk_specificity']:+.3f}"
    )
    if best_vs_lr_df is not None:
        print(
            "Best vs Logistic:   "
            f"Delta net benefit={best_vs_lr_summary['delta_net_benefit_best_minus_lr']:+.4f}"
        )
    print("\n[DONE] Defensible V2 training complete.")

    return comparison_df, report


if __name__ == "__main__":
    main()
