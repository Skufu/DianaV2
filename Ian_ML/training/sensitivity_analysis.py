# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportCallIssue=false, reportIndexIssue=false, reportMissingTypeArgument=false, reportAttributeAccessIssue=false
"""Weighted K-Means sensitivity analysis (single-weight perturbations).

Runs ±10% and ±20% perturbations for each expert weight while keeping all
other weights fixed. Uses the same at-risk-only clustering methodology as the
corrected weighted training path and reports assignment stability vs baseline.
"""

from __future__ import annotations

import itertools
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, cast

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.metrics import adjusted_rand_score
from sklearn.preprocessing import StandardScaler

try:
    from Ian_ML.common.paths import MODELS_ROOT, NHANES_PROCESSED_ROOT
    from Ian_ML.common.weighted_kmeans import WeightedKMeans
except ModuleNotFoundError:
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from Ian_ML.common.paths import MODELS_ROOT, NHANES_PROCESSED_ROOT
    from Ian_ML.common.weighted_kmeans import WeightedKMeans


DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
MODELS_DIR = MODELS_ROOT / "binary_v2_no_bp"
RESULTS_DIR = MODELS_DIR / "results"
WEIGHTS_PATH = MODELS_DIR / "feature_weights.json"

PERTURBATION_STEPS = [(-20, 0.80), (-10, 0.90), (10, 1.10), (20, 1.20)]


@dataclass(frozen=True)
class BaselineConfig:
    feature_order: list[str]
    weight_vector: list[float]
    k: int


def load_baseline_config() -> BaselineConfig:
    if not WEIGHTS_PATH.exists():
        raise FileNotFoundError(f"Missing baseline weights file: {WEIGHTS_PATH}")

    with open(WEIGHTS_PATH, "r", encoding="utf-8") as f:
        payload = cast(dict[str, Any], json.load(f))

    feature_order = payload.get("feature_order")
    weight_vector = payload.get("weight_vector")
    k = payload.get("k", 4)

    if not isinstance(feature_order, list) or not feature_order:
        raise ValueError("feature_weights.json missing non-empty feature_order")
    if not isinstance(weight_vector, list) or len(weight_vector) != len(feature_order):
        raise ValueError("feature_weights.json has invalid weight_vector")
    if not isinstance(k, int) or k <= 1:
        raise ValueError("feature_weights.json has invalid k")

    return BaselineConfig(
        feature_order=[str(x) for x in feature_order],
        weight_vector=[float(x) for x in weight_vector],
        k=int(k),
    )


def load_at_risk_matrix(feature_order: list[str]) -> tuple[Any, dict[str, int]]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing dataset: {DATA_PATH}")

    df = cast(Any, pd.read_csv(DATA_PATH))
    if "diabetes_label" not in list(df.columns):
        raise ValueError("Dataset missing required column 'diabetes_label'")

    missing = [col for col in feature_order if col not in list(df.columns)]
    if missing:
        raise ValueError(f"Dataset missing required clustering columns: {missing}")

    at_risk = cast(Any, df.loc[df["diabetes_label"] >= 1, :].copy())
    feature_df = cast(Any, at_risk.loc[:, feature_order])
    complete = cast(Any, feature_df.dropna())

    X = np.asarray(complete.to_numpy(dtype=np.float64), dtype=np.float64)

    imputer = SimpleImputer(strategy="median")
    X_imputed = np.asarray(imputer.fit_transform(X), dtype=np.float64)

    scaler = StandardScaler()
    X_scaled = np.asarray(scaler.fit_transform(X_imputed), dtype=np.float64)

    counts = {
        "n_total": int(len(df)),
        "n_at_risk": int(len(at_risk)),
        "n_at_risk_complete": int(len(complete)),
    }
    return X_scaled, counts


def fit_weighted_labels(X_scaled: Any, weights: list[float], k: int) -> tuple[Any, float]:
    km = WeightedKMeans(
        n_clusters=k,
        weights=weights,
        random_state=42,
        n_init=10,
    )
    _ = km.fit(X_scaled)
    if km.labels_ is None or km.inertia_ is None:
        raise RuntimeError("WeightedKMeans fit did not return labels/inertia")
    labels = np.asarray(km.labels_, dtype=np.int64)
    inertia = float(km.inertia_)
    return labels, inertia


def best_label_alignment(baseline_labels: Any, trial_labels: Any, k: int) -> tuple[float, Any]:
    best_match = -1.0
    best_mapped = np.asarray(trial_labels, dtype=np.int64)

    for perm in itertools.permutations(range(k)):
        mapping = {trial_cluster: baseline_cluster for trial_cluster, baseline_cluster in enumerate(perm)}
        mapped = np.asarray([mapping[int(lbl)] for lbl in trial_labels], dtype=np.int64)
        match = float(np.mean(mapped == baseline_labels))
        if match > best_match:
            best_match = match
            best_mapped = mapped

    return best_match, best_mapped


def run_sensitivity_analysis() -> Any:
    baseline_cfg = load_baseline_config()
    X_scaled, counts = load_at_risk_matrix(baseline_cfg.feature_order)

    baseline_labels, baseline_inertia = fit_weighted_labels(
        X_scaled=X_scaled,
        weights=baseline_cfg.weight_vector,
        k=baseline_cfg.k,
    )

    rows: list[dict[str, float | int | str]] = [
        {
            "scenario": "baseline",
            "feature": "ALL",
            "baseline_weight": np.nan,
            "perturbed_weight": np.nan,
            "perturbation_percent": 0.0,
            "weight_ratio": 1.0,
            "n_total": counts["n_total"],
            "n_at_risk": counts["n_at_risk"],
            "n_at_risk_complete": counts["n_at_risk_complete"],
            "k": baseline_cfg.k,
            "inertia": baseline_inertia,
            "assignment_stability_raw": 1.0,
            "assignment_stability_aligned": 1.0,
            "adjusted_rand_index": 1.0,
            "changed_assignments_aligned": 0,
            "changed_assignments_percent_aligned": 0.0,
        }
    ]

    for feature_idx, feature_name in enumerate(baseline_cfg.feature_order):
        base_weight = float(baseline_cfg.weight_vector[feature_idx])

        for perturbation_percent, factor in PERTURBATION_STEPS:
            trial_weights = list(baseline_cfg.weight_vector)
            trial_weights[feature_idx] = base_weight * factor

            trial_labels, trial_inertia = fit_weighted_labels(
                X_scaled=X_scaled,
                weights=trial_weights,
                k=baseline_cfg.k,
            )

            raw_stability = float(np.mean(trial_labels == baseline_labels))
            aligned_stability, aligned_labels = best_label_alignment(
                baseline_labels=baseline_labels,
                trial_labels=trial_labels,
                k=baseline_cfg.k,
            )

            changed_aligned = int(np.count_nonzero(aligned_labels != baseline_labels))
            changed_pct = (changed_aligned / len(baseline_labels)) * 100.0
            ari = float(adjusted_rand_score(baseline_labels, trial_labels))

            rows.append(
                {
                    "scenario": f"{feature_name}_{'plus' if perturbation_percent > 0 else 'minus'}{abs(perturbation_percent)}",
                    "feature": feature_name,
                    "baseline_weight": base_weight,
                    "perturbed_weight": float(trial_weights[feature_idx]),
                    "perturbation_percent": float(perturbation_percent),
                    "weight_ratio": float(factor),
                    "n_total": counts["n_total"],
                    "n_at_risk": counts["n_at_risk"],
                    "n_at_risk_complete": counts["n_at_risk_complete"],
                    "k": baseline_cfg.k,
                    "inertia": trial_inertia,
                    "assignment_stability_raw": raw_stability,
                    "assignment_stability_aligned": aligned_stability,
                    "adjusted_rand_index": ari,
                    "changed_assignments_aligned": changed_aligned,
                    "changed_assignments_percent_aligned": changed_pct,
                }
            )

    result_df = cast(Any, pd.DataFrame(rows))
    ordered = [
        "scenario",
        "feature",
        "baseline_weight",
        "perturbed_weight",
        "perturbation_percent",
        "weight_ratio",
        "n_total",
        "n_at_risk",
        "n_at_risk_complete",
        "k",
        "inertia",
        "assignment_stability_raw",
        "assignment_stability_aligned",
        "adjusted_rand_index",
        "changed_assignments_aligned",
        "changed_assignments_percent_aligned",
    ]
    return cast(Any, result_df.loc[:, ordered])


def main() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    results_df = run_sensitivity_analysis()
    csv_path = RESULTS_DIR / "weighted_kmeans_sensitivity_analysis.csv"
    cast(Any, results_df).to_csv(csv_path, index=False)

    non_baseline = cast(Any, results_df.loc[results_df["scenario"] != "baseline", :].copy())
    weakest = cast(Any, non_baseline.sort_values(
        by=["assignment_stability_aligned", "adjusted_rand_index"],
        ascending=[True, True],
    ).iloc[0])

    print("=" * 72)
    print("Weighted K-Means Sensitivity Analysis")
    print("=" * 72)
    print(f"Saved: {csv_path}")
    print(f"Rows: {len(results_df)} (1 baseline + {len(non_baseline)} perturbations)")
    print(
        "Weakest perturbation (aligned stability): "
        f"{weakest['scenario']} | aligned={weakest['assignment_stability_aligned']:.4f} "
        f"| ARI={weakest['adjusted_rand_index']:.4f} "
        f"| changed={int(weakest['changed_assignments_aligned'])}"
    )


if __name__ == "__main__":
    main()
