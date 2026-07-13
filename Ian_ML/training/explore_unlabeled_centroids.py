#!/usr/bin/env python3
"""Broad-K clustering sensitivity analysis with anonymous centroids.

Nothing from this script is loaded by serving. It scans a declared K range and
reports every centroid as an arbitrary numeric ID; it does not assign clinical,
risk, treatment, or Ahlqvist subtype names. One specification uses the
operational outcome only to define its cohort; no outcome enters K-Means as a
feature, so that specification is unsupervised within an outcome-defined cohort.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    adjusted_rand_score,
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.mixture import GaussianMixture
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

try:
    from Ian_ML.common.feature_constants import CLUSTER_FEATURES
    from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, REPO_ROOT
    from Ian_ML.training.clustering import EXPERT_FEATURE_WEIGHTS
except ModuleNotFoundError:
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from Ian_ML.common.feature_constants import CLUSTER_FEATURES
    from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, REPO_ROOT
    from Ian_ML.training.clustering import EXPERT_FEATURE_WEIGHTS


DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "docs" / "07-research" / "model-experiments" / "unlabeled-centroids"
RANDOM_STATE = 42

FORBIDDEN_CLUSTER_FEATURES = {
    "hba1c",
    "fbs",
    "DIQ010",
    "diq010",
    "diabetes_status",
    "diabetes_label",
    "at_risk_binary_v2_no_bp",
    "menopausal_status",
    "has_outlier",
    "SEQN",
    "cycle",
}


def specifications() -> dict[str, dict[str, Any]]:
    core = list(CLUSTER_FEATURES)
    return {
        "core6_all_equal": {
            "features": core,
            "cohort": "all",
            "weights": {feature: 1.0 for feature in core},
            "log_features": [],
            "k_max": 20,
        },
        "core6_operational_positive_weighted": {
            "features": core,
            "cohort": "operational_positive",
            "weights": {feature: float(EXPERT_FEATURE_WEIGHTS[feature]) for feature in core},
            "log_features": [],
            "k_max": 20,
        },
        "expanded8_recent_equal": {
            "features": core + ["fasting_insulin", "crp"],
            "cohort": "recent_assayed",
            "weights": {feature: 1.0 for feature in core + ["fasting_insulin", "crp"]},
            "log_features": ["triglycerides", "fasting_insulin", "crp"],
            "k_max": 15,
        },
    }


def validate_specification(spec: dict[str, Any]) -> None:
    features = list(spec["features"])
    forbidden = sorted(set(features) & FORBIDDEN_CLUSTER_FEATURES)
    if forbidden:
        raise ValueError(f"Outcome, identifier, or circular fields are forbidden in clustering: {forbidden}")
    if len(features) != len(set(features)):
        raise ValueError("Duplicate clustering features are not allowed")
    if set(features) != set(spec["weights"]):
        raise ValueError("Feature-weight keys must exactly match feature columns")
    if not set(spec["log_features"]).issubset(features):
        raise ValueError("Log-transformed fields must be declared features")


def subset_for_spec(raw: pd.DataFrame, spec: dict[str, Any]) -> pd.DataFrame:
    cohort = spec["cohort"]
    if cohort == "all":
        return raw.copy()
    if cohort == "operational_positive":
        return raw.loc[raw["diabetes_label"] >= 1].copy()
    if cohort == "recent_assayed":
        assayed_cycles = []
        for cycle, cycle_frame in raw.groupby("cycle"):
            if cycle_frame["crp"].notna().any() and cycle_frame["fasting_insulin"].notna().any():
                assayed_cycles.append(str(cycle))
        return raw.loc[raw["cycle"].astype(str).isin(assayed_cycles)].copy()
    raise ValueError(f"Unknown cohort: {cohort}")


class CohortPreprocessor:
    """Median -> optional log1p -> standardization, fitted on one cohort/split."""

    def __init__(self, features: list[str], log_features: list[str]):
        self.features = features
        self.log_features = log_features
        self.log_indices = [features.index(feature) for feature in log_features]
        self.imputer = SimpleImputer(strategy="median", keep_empty_features=True)
        self.scaler = StandardScaler()

    def fit_transform(self, frame: pd.DataFrame) -> np.ndarray:
        imputed = self.imputer.fit_transform(frame[self.features])
        transformed = self._apply_log(imputed)
        return self.scaler.fit_transform(transformed)

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        imputed = self.imputer.transform(frame[self.features])
        transformed = self._apply_log(imputed)
        return self.scaler.transform(transformed)

    def inverse_centers(self, centers_scaled: np.ndarray) -> np.ndarray:
        transformed = self.scaler.inverse_transform(centers_scaled)
        raw = transformed.copy()
        for index in self.log_indices:
            raw[:, index] = np.expm1(raw[:, index])
        return raw

    def _apply_log(self, values: np.ndarray) -> np.ndarray:
        transformed = np.asarray(values, dtype=float).copy()
        for index in self.log_indices:
            transformed[:, index] = np.log1p(np.clip(transformed[:, index], a_min=0, a_max=None))
        return transformed


def hopkins_statistic(X: np.ndarray, repeats: int = 20, seed: int = RANDOM_STATE) -> tuple[float, float]:
    """Return median/IQR Hopkins cluster-tendency statistic (0.5 ~ random)."""
    rng = np.random.default_rng(seed)
    n, p = X.shape
    m = min(100, max(10, n // 10))
    neighbor_model = NearestNeighbors(n_neighbors=2).fit(X)
    values = []
    lower = X.min(axis=0)
    upper = X.max(axis=0)
    for _ in range(repeats):
        sample_idx = rng.choice(n, size=m, replace=False)
        observed_distances = neighbor_model.kneighbors(X[sample_idx], n_neighbors=2)[0][:, 1]
        uniform_points = rng.uniform(lower, upper, size=(m, p))
        uniform_distances = neighbor_model.kneighbors(uniform_points, n_neighbors=1)[0][:, 0]
        denominator = uniform_distances.sum() + observed_distances.sum()
        values.append(float(uniform_distances.sum() / denominator) if denominator else 0.5)
    return float(np.median(values)), float(np.subtract(*np.percentile(values, [75, 25])))


def canonical_cluster_order(centers_scaled: np.ndarray, X_scaled: np.ndarray) -> list[int]:
    """Create repeatable anonymous IDs by ordering centers on an anchored PC1 axis."""
    pca = PCA(n_components=1, random_state=RANDOM_STATE).fit(X_scaled)
    direction = pca.components_[0].copy()
    anchor = int(np.argmax(np.abs(direction)))
    if direction[anchor] < 0:
        direction *= -1
    scores = centers_scaled @ direction
    return [int(value) for value in np.argsort(scores)]


def bootstrap_stability(
    frame: pd.DataFrame,
    spec: dict[str, Any],
    k: int,
    reference_labels: np.ndarray,
    runs: int,
) -> list[float]:
    rng = np.random.default_rng(RANDOM_STATE + k)
    features = list(spec["features"])
    sqrt_weights = np.sqrt([float(spec["weights"][f]) for f in features])
    scores = []
    for run in range(runs):
        sample_indices = rng.integers(0, len(frame), size=len(frame))
        sample = frame.iloc[sample_indices]
        preprocessor = CohortPreprocessor(features, list(spec["log_features"]))
        sample_scaled = preprocessor.fit_transform(sample)
        sample_geometry = sample_scaled * sqrt_weights
        model = KMeans(
            n_clusters=k,
            n_init=10,
            random_state=RANDOM_STATE + 1000 + run,
        ).fit(sample_geometry)
        original_geometry = preprocessor.transform(frame) * sqrt_weights
        predicted = model.predict(original_geometry)
        scores.append(float(adjusted_rand_score(reference_labels, predicted)))
    return scores


def leave_cycle_out_stability(
    frame: pd.DataFrame,
    spec: dict[str, Any],
    k: int,
    reference_labels: np.ndarray,
) -> list[dict[str, Any]]:
    features = list(spec["features"])
    sqrt_weights = np.sqrt([float(spec["weights"][f]) for f in features])
    rows = []
    cycle_values = frame["cycle"].astype(str)
    for fold, cycle in enumerate(sorted(cycle_values.unique()), start=1):
        train = frame.loc[cycle_values != cycle]
        test_mask = (cycle_values == cycle).to_numpy()
        test = frame.loc[cycle_values == cycle]
        preprocessor = CohortPreprocessor(features, list(spec["log_features"]))
        train_geometry = preprocessor.fit_transform(train) * sqrt_weights
        test_geometry = preprocessor.transform(test) * sqrt_weights
        model = KMeans(n_clusters=k, n_init=30, random_state=RANDOM_STATE).fit(train_geometry)
        predicted = model.predict(test_geometry)
        rows.append(
            {
                "fold": fold,
                "held_out_cycle": cycle,
                "n": len(test),
                "ari_vs_full_fit_on_holdout": float(
                    adjusted_rand_score(reference_labels[test_mask], predicted)
                ),
            }
        )
    return rows


def evaluate_specification(
    raw: pd.DataFrame,
    spec_name: str,
    spec: dict[str, Any],
    k_min: int,
    stability_runs: int,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    validate_specification(spec)
    frame = subset_for_spec(raw, spec).reset_index(drop=True)
    features = list(spec["features"])
    preprocessor = CohortPreprocessor(features, list(spec["log_features"]))
    X_scaled = preprocessor.fit_transform(frame)
    sqrt_weights = np.sqrt([float(spec["weights"][feature]) for feature in features])
    X_geometry = X_scaled * sqrt_weights
    if not np.isfinite(X_geometry).all():
        raise RuntimeError(f"Non-finite transformed values in {spec_name}")

    hopkins_median, hopkins_iqr = hopkins_statistic(X_geometry)
    metric_rows: list[dict[str, Any]] = []
    centroid_rows: list[dict[str, Any]] = []
    centroid_z_rows: list[dict[str, Any]] = []
    stability_rows: list[dict[str, Any]] = []
    reference_by_k: dict[int, np.ndarray] = {}

    k_max = min(int(spec["k_max"]), len(frame) - 1)
    for k in range(k_min, k_max + 1):
        print(f"[{spec_name}] K={k}")
        model = KMeans(n_clusters=k, n_init=50, random_state=RANDOM_STATE).fit(X_geometry)
        labels = model.labels_
        reference_by_k[k] = labels
        counts = np.bincount(labels, minlength=k)
        bootstrap_scores = bootstrap_stability(frame, spec, k, labels, stability_runs)
        lco_rows = leave_cycle_out_stability(frame, spec, k, labels)

        centers_scaled = model.cluster_centers_ / sqrt_weights
        raw_centers = preprocessor.inverse_centers(centers_scaled)
        order = canonical_cluster_order(centers_scaled, X_scaled)
        anonymous_by_original = {
            original: f"K{k:02d}-C{anonymous:02d}"
            for anonymous, original in enumerate(order, start=1)
        }

        for original_cluster in range(k):
            member_mask = labels == original_cluster
            members = frame.loc[member_mask, features]
            identifier = anonymous_by_original[original_cluster]
            raw_row: dict[str, Any] = {
                "specification": spec_name,
                "k": k,
                "centroid_id": identifier,
                "n": int(member_mask.sum()),
                "share_percent": float(member_mask.mean() * 100),
                "cycle_counts": json.dumps(
                    frame.loc[member_mask, "cycle"].astype(str).value_counts().sort_index().to_dict(),
                    sort_keys=True,
                ),
            }
            z_row: dict[str, Any] = {
                "specification": spec_name,
                "k": k,
                "centroid_id": identifier,
                "n": int(member_mask.sum()),
                "share_percent": float(member_mask.mean() * 100),
            }
            for feature_index, feature in enumerate(features):
                observed_members = members[feature].dropna()
                raw_row[f"centroid_{feature}"] = float(raw_centers[original_cluster, feature_index])
                raw_row[f"member_median_{feature}"] = (
                    float(observed_members.median()) if len(observed_members) else np.nan
                )
                raw_row[f"member_q1_{feature}"] = (
                    float(observed_members.quantile(0.25)) if len(observed_members) else np.nan
                )
                raw_row[f"member_q3_{feature}"] = (
                    float(observed_members.quantile(0.75)) if len(observed_members) else np.nan
                )
                raw_row[f"missing_percent_{feature}"] = float(members[feature].isna().mean() * 100)
                z_row[f"z_{feature}"] = float(centers_scaled[original_cluster, feature_index])
            centroid_rows.append(raw_row)
            centroid_z_rows.append(z_row)

        lco_scores = [float(row["ari_vs_full_fit_on_holdout"]) for row in lco_rows]
        bootstrap_median = float(np.median(bootstrap_scores))
        min_share = float(counts.min() / len(frame) * 100)
        metric_rows.append(
            {
                "specification": spec_name,
                "k": k,
                "n": len(frame),
                "silhouette": float(silhouette_score(X_geometry, labels)),
                "davies_bouldin": float(davies_bouldin_score(X_geometry, labels)),
                "calinski_harabasz": float(calinski_harabasz_score(X_geometry, labels)),
                "inertia": float(model.inertia_),
                "gmm_bic": float(
                    GaussianMixture(
                        n_components=k,
                        covariance_type="full",
                        n_init=5,
                        # Avoid singular tiny-component solutions that can make
                        # high-K BIC look artificially attractive.
                        reg_covar=1e-3,
                        random_state=RANDOM_STATE,
                    ).fit(X_geometry).bic(X_geometry)
                ),
                "min_cluster_n": int(counts.min()),
                "min_cluster_share_percent": min_share,
                "bootstrap_ari_median": bootstrap_median,
                "bootstrap_ari_q1": float(np.percentile(bootstrap_scores, 25)),
                "bootstrap_ari_q3": float(np.percentile(bootstrap_scores, 75)),
                "leave_cycle_out_ari_median": float(np.median(lco_scores)),
                "flag_small_or_unstable": bool(min_share < 5.0 or bootstrap_median < 0.70),
            }
        )
        for run, score in enumerate(bootstrap_scores, start=1):
            stability_rows.append(
                {
                    "specification": spec_name,
                    "k": k,
                    "method": "bootstrap_refit",
                    "replicate": run,
                    "held_out_cycle": "",
                    "ari": score,
                }
            )
        for row in lco_rows:
            stability_rows.append(
                {
                    "specification": spec_name,
                    "k": k,
                    "method": "leave_cycle_out",
                    "replicate": int(row["fold"]),
                    "held_out_cycle": row["held_out_cycle"],
                    "ari": row["ari_vs_full_fit_on_holdout"],
                }
            )

    metrics = pd.DataFrame(metric_rows)
    centroids = pd.DataFrame(centroid_rows)
    centroids_z = pd.DataFrame(centroid_z_rows)
    stability = pd.DataFrame(stability_rows)
    leaders = {
        "highest_silhouette": int(metrics.loc[metrics["silhouette"].idxmax(), "k"]),
        "lowest_davies_bouldin": int(metrics.loc[metrics["davies_bouldin"].idxmin(), "k"]),
        "highest_calinski_harabasz": int(metrics.loc[metrics["calinski_harabasz"].idxmax(), "k"]),
        "highest_bootstrap_stability": int(metrics.loc[metrics["bootstrap_ari_median"].idxmax(), "k"]),
        "lowest_gmm_bic": int(metrics.loc[metrics["gmm_bic"].idxmin(), "k"]),
    }
    metadata = {
        "n": len(frame),
        "features": features,
        "cohort": spec["cohort"],
        "weights": spec["weights"],
        "log_features": spec["log_features"],
        "k_range": [k_min, k_max],
        "hopkins_median": hopkins_median,
        "hopkins_iqr": hopkins_iqr,
        "metric_leaders_not_a_selected_k": leaders,
        "missingness_percent": {
            feature: float(frame[feature].isna().mean() * 100) for feature in features
        },
        "cycles": sorted(frame["cycle"].astype(str).unique()),
    }
    return metrics, centroids, centroids_z, stability, metadata


def plot_scan(metrics: pd.DataFrame, output_path: Path, title: str) -> None:
    fig, axes = plt.subplots(2, 3, figsize=(15, 8), sharex=True)
    series = [
        ("silhouette", "Silhouette (higher)"),
        ("davies_bouldin", "Davies-Bouldin (lower)"),
        ("calinski_harabasz", "Calinski-Harabasz (higher)"),
        ("bootstrap_ari_median", "Bootstrap ARI (higher)"),
        ("min_cluster_share_percent", "Smallest cluster share (%)"),
        ("gmm_bic", "GMM BIC sensitivity (lower)"),
    ]
    for ax, (column, label) in zip(axes.flat, series):
        ax.plot(metrics["k"], metrics[column], marker="o", color="#185FA5")
        if column == "bootstrap_ari_median":
            ax.axhline(0.70, linestyle="--", color="#BA7517", linewidth=1)
        if column == "min_cluster_share_percent":
            ax.axhline(5.0, linestyle="--", color="#BA7517", linewidth=1)
        ax.set_ylabel(label)
        ax.set_xticks(np.arange(int(metrics["k"].min()), int(metrics["k"].max()) + 1, 2))
        ax.grid(alpha=0.2)
    for ax in axes[-1]:
        ax.set_xlabel("K")
    fig.suptitle(title + "\nNo semantic labels; metric leaders are not a chosen biological K")
    fig.tight_layout()
    fig.savefig(output_path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def plot_leader_centroids(
    centroids_z: pd.DataFrame,
    metadata: dict[str, Any],
    output_dir: Path,
    spec_name: str,
) -> None:
    # Always show K=2 (global split), K=4 (serving comparator), and K=5
    # (moderate-resolution exploration), plus any other metric leaders.
    k_min, k_max = metadata["k_range"]
    comparators = {k for k in (2, 4, 5) if k_min <= k <= k_max}
    leader_values = sorted(
        comparators | set(metadata["metric_leaders_not_a_selected_k"].values())
    )
    features = list(metadata["features"])
    for k in leader_values:
        subset = centroids_z[centroids_z["k"] == k].sort_values("centroid_id")
        matrix = subset[[f"z_{feature}" for feature in features]].to_numpy()
        fig, ax = plt.subplots(figsize=(max(8, len(features) * 1.25), max(3, len(subset) * 0.55)))
        image = ax.imshow(matrix, aspect="auto", cmap="RdBu_r", vmin=-2.5, vmax=2.5)
        ax.set_xticks(np.arange(len(features)), features, rotation=45, ha="right")
        ax.set_yticks(np.arange(len(subset)), subset["centroid_id"])
        for row in range(matrix.shape[0]):
            for column in range(matrix.shape[1]):
                ax.text(column, row, f"{matrix[row, column]:.1f}", ha="center", va="center", fontsize=8)
        ax.set_title(f"{spec_name}: anonymous standardized centroids, K={k}")
        fig.colorbar(image, ax=ax, label="SD from cohort mean")
        fig.tight_layout()
        fig.savefig(output_dir / f"centroids_k{k:02d}.png", dpi=180, bbox_inches="tight")
        plt.close(fig)


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DATA_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--k-min", type=int, default=2)
    parser.add_argument("--stability-runs", type=int, default=30)
    parser.add_argument(
        "--specification",
        action="append",
        choices=sorted(specifications()),
        help="Run only selected specification(s); default runs all.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.k_min < 2:
        raise ValueError("K scan must start at 2 or greater")
    if args.stability_runs < 1:
        raise ValueError("At least one stability run is required")

    data_path = args.data.expanduser().resolve()
    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    raw = pd.read_csv(data_path)
    required = set(CLUSTER_FEATURES) | {
        "fasting_insulin",
        "crp",
        "cycle",
        "diabetes_label",
    }
    missing_columns = sorted(required - set(raw.columns))
    if missing_columns:
        raise ValueError(f"Dataset is missing required fields: {missing_columns}")

    declared = specifications()
    requested = args.specification or list(declared)
    all_metrics = []
    all_centroids = []
    all_centroids_z = []
    all_stability = []
    summaries: dict[str, Any] = {}

    for spec_name in requested:
        spec_dir = output_dir / spec_name
        spec_dir.mkdir(parents=True, exist_ok=True)
        for stale_plot in spec_dir.glob("centroids_k*.png"):
            stale_plot.unlink()
        metrics, centroids, centroids_z, stability, metadata = evaluate_specification(
            raw,
            spec_name,
            declared[spec_name],
            args.k_min,
            args.stability_runs,
        )
        metrics.to_csv(spec_dir / "k_scan.csv", index=False)
        centroids.to_csv(spec_dir / "centroids_raw.csv", index=False)
        centroids_z.to_csv(spec_dir / "centroids_z.csv", index=False)
        stability.to_csv(spec_dir / "stability.csv", index=False)
        (spec_dir / "summary.json").write_text(json.dumps(metadata, indent=2) + "\n")
        plot_scan(metrics, spec_dir / "k_scan_metrics.png", spec_name)
        plot_leader_centroids(centroids_z, metadata, spec_dir, spec_name)

        all_metrics.append(metrics)
        all_centroids.append(centroids)
        all_centroids_z.append(centroids_z)
        all_stability.append(stability)
        summaries[spec_name] = metadata

    pd.concat(all_metrics, ignore_index=True).to_csv(output_dir / "k_scan_all.csv", index=False)
    pd.concat(all_centroids, ignore_index=True).to_csv(output_dir / "centroids_raw_all_k.csv", index=False)
    pd.concat(all_centroids_z, ignore_index=True).to_csv(output_dir / "centroids_z_all_k.csv", index=False)
    pd.concat(all_stability, ignore_index=True).to_csv(output_dir / "stability_all.csv", index=False)

    manifest = {
        "purpose": "anonymous-centroid broad-K sensitivity analysis; no serving artifacts",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "command": [sys.executable, str(Path(__file__).resolve()), *sys.argv[1:]],
        "base_git_commit": repository_commit(),
        "script_sha256": file_sha256(Path(__file__).resolve()),
        "worktree_note": "The script hash, not the base commit alone, identifies uncommitted revision code.",
        "data_path": str(data_path),
        "data_sha256": file_sha256(data_path),
        "specifications": {name: declared[name] for name in requested},
        "results": summaries,
        "centroid_id_note": "Anonymous IDs are arbitrary PC1-ordered identifiers, not clinical labels.",
        "selection_note": "All K values are reported. Metric leaders do not establish a uniquely correct biological K.",
        "forbidden_cluster_features": sorted(FORBIDDEN_CLUSTER_FEATURES),
        "software": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
        },
    }
    (output_dir / "run_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"\nAnonymous centroid evidence written to {output_dir}")


if __name__ == "__main__":
    main()
