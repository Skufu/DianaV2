#!/usr/bin/env python3
"""Leakage-safe exploratory test of the full available non-circular feature set.

This script is evidence generation, not production training. It never writes a
deployable model. Every learned preprocessing step and Logistic Regression
hyperparameter is fitted inside grouped cross-validation, and every threshold is
chosen from inner out-of-fold predictions only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, GroupKFold, LeaveOneGroupOut, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, REPO_ROOT
    from Ian_ML.training.train_binary_v2_no_bp import optimize_binary_v2_no_bp_threshold
except ModuleNotFoundError:
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, REPO_ROOT
    from Ian_ML.training.train_binary_v2_no_bp import optimize_binary_v2_no_bp_threshold


DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs" / "07-research" / "model-experiments" / "expanded-non-circular"
N_JOBS = int(os.environ.get("ML_N_JOBS", "1"))
RANDOM_STATE = 42

# Current production-content feature set, expressed with the same deterministic
# lifestyle encodings used by the active trainer.
BASELINE_FEATURES = [
    "bmi",
    "triglycerides",
    "ldl",
    "hdl",
    "age",
    "waist_circumference",
    "smoking_encoded",
    "activity_encoded",
    "alcohol_encoded",
]

# Full raw non-circular concepts requested for the sensitivity experiment.
EXPANDED_RAW_CONCEPTS = [
    "age",
    "bmi",
    "waist_circumference",
    "triglycerides",
    "ldl",
    "hdl",
    "total_cholesterol",
    "systolic",
    "diastolic",
    "fasting_insulin",
    "crp",
    "family_history_diabetes",
    "smoking_status",
    "physical_activity",
    "alcohol_use",
]

EXPANDED_FEATURES = BASELINE_FEATURES + [
    "total_cholesterol",
    "systolic",
    "diastolic",
    "fasting_insulin",
    "crp",
    "family_history_diabetes",
]

FORBIDDEN_PREDICTORS = {
    "hba1c",
    "fbs",
    "DIQ010",
    "diq010",
    "diabetes_status",
    "diabetes_label",
    "at_risk_binary_v2_no_bp",
    "SEQN",
    "cycle",
    "menopausal_status",
    "has_outlier",
    "bmi_category",
    "tg_hdl_ratio",
    "metabolic_syndrome_score",
}

CONTINUOUS_FEATURES = {
    "bmi",
    "triglycerides",
    "ldl",
    "hdl",
    "age",
    "waist_circumference",
    "total_cholesterol",
    "systolic",
    "diastolic",
    "fasting_insulin",
    "crp",
}


def encode_allowed_lifestyle_fields(df: pd.DataFrame) -> pd.DataFrame:
    """Apply fixed, non-learned encodings without constructing target-derived fields."""
    out = df.copy()

    smoking_map = {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
    activity_map = {"Sedentary": 0, "Moderate": 1, "Active": 2, "Vigorous": 2, "Unknown": 1}
    alcohol_map = {"Never": 0, "None": 0, "Light": 1, "Moderate": 2, "Heavy": 3, "Unknown": 1}

    def normalize(value: object) -> str:
        text = str(value).strip()
        return "Unknown" if not text or text.lower() in {"nan", "unknown"} else text.title()

    out["smoking_encoded"] = out["smoking_status"].map(
        lambda value: smoking_map.get(normalize(value), 1)
    )
    out["activity_encoded"] = out["physical_activity"].map(
        lambda value: activity_map.get(normalize(value), 1)
    )
    out["alcohol_encoded"] = out["alcohol_use"].map(
        lambda value: alcohol_map.get(normalize(value), 1)
    )
    return out


def feature_sets() -> dict[str, list[str]]:
    """Return the predeclared feature tests; no outcome-driven selection occurs."""
    return {
        "baseline_9": list(BASELINE_FEATURES),
        "expanded_all_15": list(EXPANDED_FEATURES),
        "expanded_minus_crp": [f for f in EXPANDED_FEATURES if f != "crp"],
        "expanded_minus_insulin": [f for f in EXPANDED_FEATURES if f != "fasting_insulin"],
        "expanded_minus_total_cholesterol": [f for f in EXPANDED_FEATURES if f != "total_cholesterol"],
        "expanded_minus_bmi": [f for f in EXPANDED_FEATURES if f != "bmi"],
        "expanded_minus_waist": [f for f in EXPANDED_FEATURES if f != "waist_circumference"],
    }


def validate_feature_contract(features: Sequence[str]) -> None:
    duplicates = sorted({f for f in features if list(features).count(f) > 1})
    forbidden = sorted(set(features) & FORBIDDEN_PREDICTORS)
    if duplicates:
        raise ValueError(f"Duplicate predictors: {duplicates}")
    if forbidden:
        raise ValueError(f"Circular, identifier, or derived predictors are forbidden: {forbidden}")


def build_preprocessor(features: Sequence[str]) -> ColumnTransformer:
    """Build a named-column, fold-fitted imputer/scaler contract."""
    validate_feature_contract(features)
    continuous = [f for f in features if f in CONTINUOUS_FEATURES]
    ordinal = [f for f in features if f not in CONTINUOUS_FEATURES]
    return ColumnTransformer(
        transformers=[
            (
                "continuous",
                Pipeline(
                    [
                        (
                            "imputer",
                            SimpleImputer(strategy="median", keep_empty_features=True),
                        ),
                        ("scaler", StandardScaler()),
                    ]
                ),
                continuous,
            ),
            (
                "ordinal",
                Pipeline(
                    [
                        (
                            "imputer",
                            SimpleImputer(strategy="median", keep_empty_features=True),
                        )
                    ]
                ),
                ordinal,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def build_pipeline(features: Sequence[str]) -> Pipeline:
    return Pipeline(
        [
            ("preprocessor", build_preprocessor(features)),
            (
                "model",
                LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def binary_metrics(y_true: np.ndarray, probability: np.ndarray, prediction: np.ndarray) -> dict[str, float]:
    tn, fp, fn, tp = confusion_matrix(y_true, prediction, labels=[0, 1]).ravel()
    sensitivity = tp / (tp + fn) if tp + fn else 0.0
    specificity = tn / (tn + fp) if tn + fp else 0.0
    ppv = tp / (tp + fp) if tp + fp else 0.0
    npv = tn / (tn + fn) if tn + fn else 0.0
    f1 = 2 * ppv * sensitivity / (ppv + sensitivity) if ppv + sensitivity else 0.0
    return {
        "roc_auc": float(roc_auc_score(y_true, probability)),
        "pr_auc": float(average_precision_score(y_true, probability)),
        "brier": float(brier_score_loss(y_true, probability)),
        "balanced_accuracy": float((sensitivity + specificity) / 2),
        "sensitivity": float(sensitivity),
        "specificity": float(specificity),
        "ppv": float(ppv),
        "npv": float(npv),
        "f1": float(f1),
    }


def calibration_coefficients(y_true: np.ndarray, probability: np.ndarray) -> tuple[float, float]:
    clipped = np.clip(probability, 1e-6, 1 - 1e-6)
    logit = np.log(clipped / (1 - clipped)).reshape(-1, 1)
    calibrator = LogisticRegression(C=1e6, solver="lbfgs", max_iter=2000)
    calibrator.fit(logit, y_true)
    return float(calibrator.intercept_[0]), float(calibrator.coef_[0, 0])


def extract_imputer_statistics(pipeline: Pipeline, features: Sequence[str]) -> dict[str, float]:
    preprocessor = pipeline.named_steps["preprocessor"]
    stats: dict[str, float] = {}
    for transformer_name in ("continuous", "ordinal"):
        transformer = preprocessor.named_transformers_[transformer_name]
        imputer = transformer.named_steps["imputer"]
        columns = list(preprocessor.transformers_[0 if transformer_name == "continuous" else 1][2])
        for name, value in zip(columns, imputer.statistics_):
            stats[str(name)] = float(value)
    return {feature: stats[feature] for feature in features}


def evaluate_feature_set(
    frame: pd.DataFrame,
    features: list[str],
    feature_set_name: str,
    cohort_name: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    validate_feature_contract(features)
    X = frame[features]
    y = frame["target"].to_numpy(dtype=int)
    groups = frame["cycle"].astype(str).to_numpy()
    logo = LeaveOneGroupOut()

    fold_rows: list[dict[str, Any]] = []
    prediction_rows: list[dict[str, Any]] = []
    imputation_rows: list[dict[str, Any]] = []

    for fold, (train_idx, test_idx) in enumerate(logo.split(X, y, groups), start=1):
        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]
        y_train = y[train_idx]
        y_test = y[test_idx]
        train_groups = groups[train_idx]
        test_cycle = str(groups[test_idx][0])
        inner = GroupKFold(n_splits=min(3, len(np.unique(train_groups))))
        inner_splits = list(inner.split(X_train, y_train, train_groups))

        search = GridSearchCV(
            build_pipeline(features),
            {"model__C": [0.01, 0.1, 0.3, 1.0, 3.0]},
            scoring="roc_auc",
            cv=inner_splits,
            n_jobs=N_JOBS,
            refit=True,
            error_score="raise",
        )
        search.fit(X_train, y_train)
        fitted = search.best_estimator_

        # Clone/refit the selected pipeline in each inner split. The threshold
        # therefore sees inner OOF probabilities only, never the outer cycle.
        oof_probability = cross_val_predict(
            clone(fitted),
            X_train,
            y_train,
            cv=inner_splits,
            method="predict_proba",
            n_jobs=N_JOBS,
        )[:, 1]
        threshold_result = optimize_binary_v2_no_bp_threshold(y_train, oof_probability)
        threshold = float(threshold_result["threshold"])

        probability = fitted.predict_proba(X_test)[:, 1]
        prediction = (probability >= threshold).astype(int)
        metrics = binary_metrics(y_test, probability, prediction)
        fold_rows.append(
            {
                "cohort": cohort_name,
                "feature_set": feature_set_name,
                "fold": fold,
                "test_cycle": test_cycle,
                "n_train": len(train_idx),
                "n_test": len(test_idx),
                "test_prevalence": float(np.mean(y_test)),
                "inner_best_auc": float(search.best_score_),
                "best_C": float(search.best_params_["model__C"]),
                "threshold": threshold,
                "threshold_strategy": str(threshold_result.get("strategy", "unknown")),
                **metrics,
            }
        )

        learned = extract_imputer_statistics(fitted, features)
        imputation_rows.append(
            {
                "cohort": cohort_name,
                "feature_set": feature_set_name,
                "fold": fold,
                "test_cycle": test_cycle,
                **{f"median_{name}": value for name, value in learned.items()},
            }
        )

        transformed_test = fitted.named_steps["preprocessor"].transform(X_test)
        if transformed_test.shape[1] != len(features) or not np.isfinite(transformed_test).all():
            raise RuntimeError(
                f"Non-finite or width-changing transform in {feature_set_name}, holdout {test_cycle}"
            )

        for row_index, truth, proba, pred in zip(
            frame.iloc[test_idx].index,
            y_test,
            probability,
            prediction,
        ):
            prediction_rows.append(
                {
                    "cohort": cohort_name,
                    "feature_set": feature_set_name,
                    "row_index": int(row_index),
                    "test_cycle": test_cycle,
                    "y_true": int(truth),
                    "probability": float(proba),
                    "prediction": int(pred),
                    "threshold": threshold,
                }
            )

    return fold_rows, prediction_rows, imputation_rows


def summarize_predictions(
    fold_df: pd.DataFrame,
    prediction_df: pd.DataFrame,
) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    keys = ["cohort", "feature_set"]
    for (cohort, feature_set), predictions in prediction_df.groupby(keys, sort=False):
        folds = fold_df[(fold_df["cohort"] == cohort) & (fold_df["feature_set"] == feature_set)]
        y_true = predictions["y_true"].to_numpy(dtype=int)
        probability = predictions["probability"].to_numpy(dtype=float)
        prediction = predictions["prediction"].to_numpy(dtype=int)
        aggregate = binary_metrics(y_true, probability, prediction)
        calibration_intercept, calibration_slope = calibration_coefficients(y_true, probability)
        rows.append(
            {
                "cohort": cohort,
                "feature_set": feature_set,
                "n": len(predictions),
                "n_features": len(feature_sets().get(feature_set, EXPANDED_FEATURES)),
                "mean_fold_roc_auc": float(folds["roc_auc"].mean()),
                "sd_fold_roc_auc": float(folds["roc_auc"].std(ddof=1)),
                "mean_inner_auc": float(folds["inner_best_auc"].mean()),
                "calibration_intercept": calibration_intercept,
                "calibration_slope": calibration_slope,
                **{f"aggregate_{key}": value for key, value in aggregate.items()},
            }
        )

    summary = pd.DataFrame(rows)
    for cohort, cohort_rows in summary.groupby("cohort"):
        index = cohort_rows.index
        if cohort == "all_cycles":
            reference = float(
                summary.loc[(summary["cohort"] == cohort) & (summary["feature_set"] == "baseline_9"), "mean_fold_roc_auc"].iloc[0]
            )
            summary.loc[index, "delta_mean_fold_auc_vs_reference"] = (
                summary.loc[index, "mean_fold_roc_auc"] - reference
            )
            summary.loc[index, "reference_feature_set"] = "baseline_9"
        else:
            reference = float(
                summary.loc[
                    (summary["cohort"] == cohort)
                    & (summary["feature_set"] == "expanded_minus_crp"),
                    "mean_fold_roc_auc",
                ].iloc[0]
            )
            summary.loc[index, "delta_mean_fold_auc_vs_reference"] = (
                summary.loc[index, "mean_fold_roc_auc"] - reference
            )
            summary.loc[index, "reference_feature_set"] = "expanded_minus_crp"
    return summary


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repository_commit() -> str:
    """Return the base commit while script hashes capture uncommitted changes."""
    try:
        return subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unavailable"


def plot_results(summary: pd.DataFrame, missingness: pd.DataFrame, output_dir: Path) -> None:
    all_cycle = summary[summary["cohort"] == "all_cycles"].sort_values("mean_fold_roc_auc")
    fig, ax = plt.subplots(figsize=(11, 6))
    ax.errorbar(
        all_cycle["mean_fold_roc_auc"],
        all_cycle["feature_set"],
        xerr=all_cycle["sd_fold_roc_auc"],
        fmt="o",
        color="#185FA5",
        ecolor="#85B7EB",
        capsize=4,
    )
    ax.axvline(
        float(all_cycle.loc[all_cycle["feature_set"] == "baseline_9", "mean_fold_roc_auc"].iloc[0]),
        color="#BA7517",
        linestyle="--",
        label="Current-content baseline",
    )
    ax.set_xlabel("Mean outer-cycle ROC-AUC (error bar = SD across cycles)")
    ax.set_title("Exploratory non-circular feature-set comparison\nFixed Logistic Regression; nested grouped CV")
    ax.legend()
    fig.tight_layout()
    fig.savefig(output_dir / "feature_set_auc_comparison.png", dpi=180, bbox_inches="tight")
    plt.close(fig)

    matrix = missingness.pivot(index="cycle", columns="feature", values="missing_percent")
    fig, ax = plt.subplots(figsize=(13, 5))
    image = ax.imshow(matrix.to_numpy(), aspect="auto", cmap="YlOrRd", vmin=0, vmax=100)
    ax.set_xticks(np.arange(len(matrix.columns)), matrix.columns, rotation=45, ha="right")
    ax.set_yticks(np.arange(len(matrix.index)), matrix.index)
    ax.set_title("Missingness by NHANES cycle (%): structural assay availability is visible")
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            ax.text(column, row, f"{matrix.iloc[row, column]:.0f}", ha="center", va="center", fontsize=7)
    fig.colorbar(image, ax=ax, label="Missing (%)")
    fig.tight_layout()
    fig.savefig(output_dir / "missingness_by_cycle.png", dpi=180, bbox_inches="tight")
    plt.close(fig)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DATA_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data_path = args.data.expanduser().resolve()
    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    declared_sets = feature_sets()
    for declared in declared_sets.values():
        validate_feature_contract(declared)
    if "crp" not in declared_sets["expanded_all_15"]:
        raise RuntimeError("Expanded contract must contain CRP")

    raw = pd.read_csv(data_path)
    required = set(EXPANDED_RAW_CONCEPTS) | {"cycle", "diabetes_label"}
    missing_columns = sorted(required - set(raw.columns))
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")

    frame = encode_allowed_lifestyle_fields(raw)
    frame["target"] = (frame["diabetes_label"] >= 1).astype(int)
    frame = frame.dropna(subset=["target", "cycle"]).copy()
    if len(frame) != len(raw):
        raise RuntimeError("Exploratory test must not perform complete-case row deletion")

    missingness_rows: list[dict[str, Any]] = []
    for cycle, cycle_frame in frame.groupby("cycle", sort=True):
        for feature in EXPANDED_RAW_CONCEPTS:
            missingness_rows.append(
                {
                    "cycle": str(cycle),
                    "feature": feature,
                    "n": len(cycle_frame),
                    "missing_n": int(cycle_frame[feature].isna().sum()),
                    "missing_percent": float(cycle_frame[feature].isna().mean() * 100),
                }
            )
    missingness = pd.DataFrame(missingness_rows)

    fold_rows: list[dict[str, Any]] = []
    prediction_rows: list[dict[str, Any]] = []
    imputation_rows: list[dict[str, Any]] = []
    for name, features in declared_sets.items():
        print(f"[all_cycles] {name}: {len(features)} features")
        folds, predictions, imputations = evaluate_feature_set(
            frame, features, name, "all_cycles"
        )
        fold_rows.extend(folds)
        prediction_rows.extend(predictions)
        imputation_rows.extend(imputations)

    # Paired CRP sensitivity analysis restricted to cycles where CRP was assayed.
    crp_cycles = [
        str(cycle)
        for cycle, values in frame.groupby("cycle")["crp"]
        if values.notna().any()
    ]
    late_frame = frame[frame["cycle"].astype(str).isin(crp_cycles)].copy()
    if late_frame["cycle"].nunique() >= 3:
        for name in ("expanded_all_15", "expanded_minus_crp"):
            print(f"[crp_assayed_cycles] {name}: {len(declared_sets[name])} features")
            folds, predictions, imputations = evaluate_feature_set(
                late_frame,
                declared_sets[name],
                name,
                "crp_assayed_cycles",
            )
            fold_rows.extend(folds)
            prediction_rows.extend(predictions)
            imputation_rows.extend(imputations)

    fold_df = pd.DataFrame(fold_rows)
    prediction_df = pd.DataFrame(prediction_rows)
    imputation_df = pd.DataFrame(imputation_rows)
    summary = summarize_predictions(fold_df, prediction_df)

    fold_df.to_csv(output_dir / "outer_fold_metrics.csv", index=False)
    prediction_df.to_csv(output_dir / "outer_predictions.csv", index=False)
    imputation_df.to_csv(output_dir / "fold_fitted_imputer_statistics.csv", index=False)
    summary.to_csv(output_dir / "feature_set_comparison.csv", index=False)
    missingness.to_csv(output_dir / "missingness_by_cycle.csv", index=False)

    manifest = {
        "purpose": "exploratory sensitivity analysis; not a production model or promotion decision",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "command": [sys.executable, str(Path(__file__).resolve()), *sys.argv[1:]],
        "base_git_commit": repository_commit(),
        "script_sha256": file_sha256(Path(__file__).resolve()),
        "worktree_note": "The script hash, not the base commit alone, identifies uncommitted revision code.",
        "data_path": str(data_path),
        "data_sha256": file_sha256(data_path),
        "n_rows": int(len(frame)),
        "target_definition": "diabetes_label >= 1; target-only and never a predictor",
        "validation": "nested Leave-One-NHANES-Cycle-Out with grouped inner CV",
        "threshold_selection": "inner out-of-fold predictions only",
        "model_family": "fixed Logistic Regression to isolate feature-set effects",
        "preprocessing": "fold-local median imputation; continuous scaling; no missing indicators",
        "raw_predictor_concepts": EXPANDED_RAW_CONCEPTS,
        "feature_sets": declared_sets,
        "forbidden_predictors": sorted(FORBIDDEN_PREDICTORS),
        "crp_assayed_cycles": crp_cycles,
        "software": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
        },
    }
    (output_dir / "run_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    plot_results(summary, missingness, output_dir)

    print("\nExploratory comparison (not promoted):")
    print(
        summary[
            [
                "cohort",
                "feature_set",
                "mean_fold_roc_auc",
                "sd_fold_roc_auc",
                "aggregate_pr_auc",
                "aggregate_brier",
                "delta_mean_fold_auc_vs_reference",
            ]
        ].to_string(index=False)
    )
    print(f"\nEvidence written to {output_dir}")


if __name__ == "__main__":
    main()
