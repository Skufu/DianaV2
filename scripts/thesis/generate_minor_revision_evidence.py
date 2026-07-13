"""Generate reproducible evidence requested during the DIANA minor revision.

This script does not retrain or overwrite deployed model artifacts. It reads the
frozen dataset/model outputs and produces an audit pack under
``docs/07-research/minor-revision-evidence`` covering:

* NHANES cohort attrition;
* missing-aware entropy / Information Gain;
* candidate-model selection across held-out NHANES cycles;
* exact 734-record centroid membership and post-hoc naming;
* clustering sensitivity to weights, random initialization, and inclusion of
  normal-glycemic records; and
* the recorded reasons for meeting the no-period-in-prior-year gate;
* a target-label source agreement audit; and
* an exploratory no-period-development-versus-menstruating NHANES comparison.

Run from the repository root with the project environment:

    .venv/bin/python scripts/thesis/generate_minor_revision_evidence.py

The menstrual-status comparison is an exploratory internal sensitivity
analysis. RHQ031=2 operationally means no period was reported in the prior 12
months; it does not by itself confirm natural menopause. The comparison is not
external validation and must not be described as evidence that menopause
causes the observed metabolic patterns.
"""

from __future__ import annotations

import contextlib
import io
import itertools
import json
import math
import sys
from pathlib import Path
from typing import Any, Iterable

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment
from scipy.stats import chi2_contingency
from sklearn.metrics import (
    adjusted_rand_score,
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
DATA_PATH = PROJECT_ROOT / "data/nhanes/processed/diana_dataset_final.csv"
MODEL_DIR = PROJECT_ROOT / "models/binary_v2_no_bp"
RESULTS_DIR = MODEL_DIR / "results"
OUTPUT_DIR = PROJECT_ROOT / "docs/07-research/minor-revision-evidence"

CLUSTER_FEATURES = [
    "bmi",
    "triglycerides",
    "ldl",
    "hdl",
    "age",
    "waist_circumference",
]
FEATURE_LABELS = {
    "bmi": "BMI",
    "triglycerides": "Triglycerides",
    "ldl": "LDL",
    "hdl": "HDL",
    "age": "Age",
    "waist_circumference": "Waist",
}
PROFILE_ORDER = ["SIRD-like", "SIDD-like", "MOD-like", "MARD-like"]
PROFILE_COLORS = {
    "SIRD-like": "#D97706",
    "SIDD-like": "#E76F51",
    "MOD-like": "#247BA0",
    "MARD-like": "#7A9CC6",
}
MODEL_COLORS = {
    "Logistic Regression": "#1D4ED8",
    "Random Forest": "#15803D",
    "LightGBM": "#A16207",
    "XGBoost": "#B91C1C",
}


def shannon_entropy(values: pd.Series) -> float:
    """Return Shannon entropy in bits, treating observed classes explicitly."""
    probabilities = values.value_counts(normalize=True, dropna=False)
    return float(-sum(p * math.log2(p) for p in probabilities if p > 0))


def information_gain(target: pd.Series, partition: pd.Series) -> float:
    """Compute H(Y) - H(Y|X) with every row assigned to a partition."""
    frame = pd.DataFrame({"target": target, "partition": partition})
    conditional = 0.0
    for _, group in frame.groupby("partition", dropna=False):
        conditional += len(group) / len(frame) * shannon_entropy(group["target"])
    return shannon_entropy(frame["target"]) - conditional


def discretize_with_missing(series: pd.Series, bins: int = 5) -> pd.Series:
    """Quantile-bin observed values and preserve missing values as a category."""
    result = pd.Series(index=series.index, dtype="object")
    missing = series.isna()
    result.loc[missing] = "Missing"
    observed = series.loc[~missing]
    if observed.empty:
        return result
    if observed.nunique(dropna=True) <= bins:
        result.loc[~missing] = observed.astype(str)
        return result
    try:
        binned = pd.qcut(observed, q=bins, duplicates="drop", labels=False)
    except (TypeError, ValueError):
        binned = pd.cut(observed, bins=bins, duplicates="drop", labels=False)
    result.loc[~missing] = binned.astype(str)
    return result


def legacy_missing_unsafe_ig(target: pd.Series, series: pd.Series, bins: int = 5) -> float:
    """Reproduce the current validator's NaN-omission behavior for audit only."""
    try:
        partition = pd.qcut(series, q=bins, duplicates="drop", labels=False)
    except (TypeError, ValueError):
        partition = pd.cut(series, bins=bins, duplicates="drop", labels=False)

    total_entropy = shannon_entropy(target)
    weighted_entropy = 0.0
    frame = pd.DataFrame({"target": target, "partition": partition})
    # pandas.unique includes NaN, but equality to NaN produces an empty subset.
    # This intentionally mirrors the existing implementation being audited.
    for value in frame["partition"].unique():
        subset = frame[frame["partition"] == value]
        weighted_entropy += len(subset) / len(frame) * shannon_entropy(subset["target"])
    return total_entropy - weighted_entropy


def normalize_alcohol(value: object) -> str:
    text = str(value).strip()
    lower = text.lower()
    if lower in {"", "nan", "unknown"}:
        return "Unknown"
    if lower in {"none", "never", "no alcohol", "abstinent"}:
        return "Never"
    return text.title()


def engineer_audit_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create the same derived/encoded candidates used by the IG audit."""
    result = df.copy()
    result["bmi_category"] = pd.cut(
        result["bmi"],
        bins=[-np.inf, 18.5, 23, 25, np.inf],
        labels=False,
        right=False,
    ).astype(float)
    result["tg_hdl_ratio"] = result["triglycerides"] / result["hdl"].replace(0, np.nan)
    result["smoking_encoded"] = result["smoking_status"].fillna("Unknown").map(
        {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
    )
    result["activity_encoded"] = result["physical_activity"].fillna("Unknown").map(
        {"Sedentary": 0, "Moderate": 1, "Active": 2, "Unknown": 1}
    )
    alcohol_map = {
        "Never": 0,
        "None": 0,
        "Light": 1,
        "Moderate": 2,
        "Heavy": 3,
        "Unknown": 1,
    }
    result["alcohol_encoded"] = result["alcohol_use"].fillna("Unknown").map(
        lambda value: alcohol_map.get(normalize_alcohol(value), 1)
    )
    metabolic = pd.DataFrame(
        {
            "high_tg": result["triglycerides"] > 150,
            "low_hdl": result["hdl"] < 50,
            "high_bmi": result["bmi"] >= 25,
            "high_waist": result["waist_circumference"] >= 80,
        }
    )
    result["metabolic_syndrome_score"] = metabolic.sum(axis=1)
    return result


IG_FEATURES = [
    "crp",
    "family_history_diabetes",
    "fasting_insulin",
    "hdl",
    "tg_hdl_ratio",
    "waist_circumference",
    "systolic",
    "triglycerides",
    "diastolic",
    "bmi",
    "metabolic_syndrome_score",
    "ldl",
    "bmi_category",
    "total_cholesterol",
    "alcohol_encoded",
    "activity_encoded",
    "age",
    "smoking_encoded",
]

IG_LABELS = {
    "crp": "CRP",
    "family_history_diabetes": "Family history of diabetes",
    "fasting_insulin": "Fasting insulin",
    "hdl": "HDL",
    "tg_hdl_ratio": "TG/HDL ratio",
    "waist_circumference": "Waist circumference",
    "systolic": "Systolic BP",
    "triglycerides": "Triglycerides",
    "diastolic": "Diastolic BP",
    "bmi": "BMI",
    "metabolic_syndrome_score": "Metabolic syndrome score",
    "ldl": "LDL",
    "bmi_category": "BMI category",
    "total_cholesterol": "Total cholesterol",
    "alcohol_encoded": "Alcohol use",
    "activity_encoded": "Physical activity",
    "age": "Age",
    "smoking_encoded": "Smoking status",
}

IG_DECISIONS = {
    "crp": ("Excluded", "48.3% missing; cycle-limited; not in deployed workflow"),
    "family_history_diabetes": (
        "Excluded",
        "19.3% missing; unavailable in 2021-2023; not in deployed workflow",
    ),
    "fasting_insulin": ("Excluded", "32.0% missing; specialized assay; not routinely available"),
    "hdl": ("Retained", "Non-diagnostic lipid predictor"),
    "tg_hdl_ratio": ("Excluded", "Derived duplicate of retained TG and HDL"),
    "waist_circumference": ("Retained", "Accessible central-adiposity predictor"),
    "systolic": ("Excluded", "Removed from cuff-free no-BP contract"),
    "triglycerides": ("Retained", "Non-diagnostic lipid predictor"),
    "diastolic": ("Excluded", "Removed from cuff-free no-BP contract"),
    "bmi": ("Retained", "Accessible anthropometric predictor"),
    "metabolic_syndrome_score": ("Excluded", "Composite duplicate of retained components"),
    "ldl": ("Retained", "Non-diagnostic lipid predictor"),
    "bmi_category": ("Excluded", "Derived duplicate of retained continuous BMI"),
    "total_cholesterol": ("Excluded", "Redundant with retained lipid components"),
    "alcohol_encoded": ("Retained", "Behavioral covariate; not selected by IG alone"),
    "activity_encoded": ("Retained", "Behavioral covariate; not selected by IG alone"),
    "age": ("Retained", "Prespecified demographic covariate"),
    "smoking_encoded": ("Retained", "Behavioral covariate; not selected by IG alone"),
}


def build_information_gain_audit(df: pd.DataFrame) -> tuple[pd.DataFrame, float]:
    engineered = engineer_audit_features(df)
    target = (engineered["diabetes_label"] >= 1).astype(int)
    target_entropy = shannon_entropy(target)
    rows: list[dict[str, Any]] = []
    for feature in IG_FEATURES:
        series = engineered[feature]
        observed = series.notna()
        partition = discretize_with_missing(series)
        observed_partition = discretize_with_missing(series.loc[observed])
        decision, reason = IG_DECISIONS[feature]
        corrected = information_gain(target, partition)
        rows.append(
            {
                "feature": feature,
                "feature_label": IG_LABELS[feature],
                "missing_n": int(series.isna().sum()),
                "missing_pct": float(series.isna().mean() * 100),
                "target_entropy_h_y": target_entropy,
                "legacy_missing_unsafe_ig": legacy_missing_unsafe_ig(target, series),
                "corrected_ig_missing_as_category": corrected,
                "conditional_entropy_h_y_given_x": target_entropy - corrected,
                "corrected_ig_pct_of_h_y": corrected / target_entropy * 100,
                "observed_only_ig": information_gain(
                    target.loc[observed], observed_partition
                )
                if observed.any()
                else np.nan,
                "missingness_indicator_ig": information_gain(
                    target, series.isna().astype(str)
                ),
                "decision": decision,
                "decision_reason": reason,
            }
        )
    result = pd.DataFrame(rows).sort_values(
        "corrected_ig_missing_as_category", ascending=False
    )
    result.insert(0, "corrected_rank", range(1, len(result) + 1))
    return result, target_entropy


def plot_information_gain(audit: pd.DataFrame, path: Path) -> None:
    # Order by the corrected result so bar position matches the manuscript rank.
    ordered = audit.sort_values("corrected_ig_missing_as_category", ascending=True)
    y = np.arange(len(ordered))
    fig, (ax1, ax2) = plt.subplots(
        1,
        2,
        figsize=(17, 9),
        gridspec_kw={"width_ratios": [2.4, 1]},
    )
    height = 0.36
    ax1.barh(
        y + height / 2,
        ordered["legacy_missing_unsafe_ig"],
        height,
        color="#D97706",
        alpha=0.78,
        label="Earlier missing-unsafe result",
    )
    ax1.barh(
        y - height / 2,
        ordered["corrected_ig_missing_as_category"],
        height,
        color="#1D4ED8",
        label="Missing-aware result",
    )
    ax1.set_yticks(y, ordered["feature_label"])
    ax1.set_xlabel("Information Gain (bits)")
    ax1.set_title("A. Information Gain changes after preserving missing rows")
    ax1.grid(axis="x", alpha=0.2)
    ax1.legend(loc="lower right")

    colors = np.where(ordered["decision"].eq("Retained"), "#15803D", "#64748B")
    ax2.barh(y, ordered["missing_pct"], color=colors, alpha=0.85)
    ax2.set_yticks(y, [""] * len(y))
    ax2.set_xlabel("Missing values (%)")
    ax2.set_title("B. Candidate-feature missingness")
    ax2.grid(axis="x", alpha=0.2)
    for index, value in enumerate(ordered["missing_pct"]):
        ax2.text(value + 0.6, index, f"{value:.1f}%", va="center", fontsize=8)
    fig.suptitle(
        "DIANA Information Gain Audit\n"
        "CRP and fasting-insulin rankings were inflated when NaN rows received zero conditional-entropy weight",
        fontsize=15,
        fontweight="bold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def reconstruct_raw_nhanes() -> pd.DataFrame:
    """Read the six raw NHANES releases without writing processed datasets."""
    from scripts.data import process_nhanes_multi as nhanes

    # The shared processor historically resolves RAW_DIR from the current
    # working directory. Pin it here so evidence generation and its tests work
    # both from the repository root and through ``make test-ml`` (cwd=Ian_ML).
    nhanes.RAW_DIR = PROJECT_ROOT / "data/nhanes/raw"

    frames: list[pd.DataFrame] = []
    with contextlib.redirect_stdout(io.StringIO()):
        for suffix, year in nhanes.CYCLES:
            cycle = nhanes.process_cycle(suffix, year)
            if not cycle.empty:
                reproductive = nhanes.load_xpt(f"RHQ_{suffix}")
                reason_columns = [
                    column
                    for column in ("RHD042", "RHD043")
                    if column in reproductive.columns
                ]
                if reason_columns:
                    cycle = cycle.merge(
                        reproductive[["SEQN", *reason_columns]],
                        on="SEQN",
                        how="left",
                    )
                frames.append(cycle)
    if not frames:
        raise RuntimeError("No raw NHANES cycles were available for attrition reconstruction.")
    return pd.concat(frames, ignore_index=True)


def build_attrition(raw: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []

    def record(stage: str, frame: pd.DataFrame, rule: str, variable: str) -> None:
        previous = rows[-1]["retained_n"] if rows else len(frame)
        rows.append(
            {
                "stage": stage,
                "source_variable": variable,
                "criterion": rule,
                "previous_n": previous,
                "excluded_n": previous - len(frame),
                "retained_n": len(frame),
                "retained_pct_of_raw": len(frame) / len(raw) * 100,
            }
        )

    cohort = raw.copy()
    record("Merged raw releases", cohort, "Six NHANES releases", "SEQN")
    cohort = cohort[cohort["RIAGENDR"] == 2]
    record("Female respondents", cohort, "RIAGENDR = 2", "RIAGENDR")
    cohort = cohort[cohort["RIDAGEYR"].between(45, 60)]
    record("Age 45-60", cohort, "45 <= RIDAGEYR <= 60", "RIDAGEYR")
    cohort = cohort[cohort["RHQ031"] == 2]
    record(
        "No-period operational cohort",
        cohort,
        "RHQ031 = 2: no menstrual period in prior 12 months",
        "RHQ031",
    )
    cohort = cohort.dropna(subset=["LBXGH"])
    record("Complete HbA1c", cohort, "LBXGH observed for label construction", "LBXGH")
    cohort = cohort.dropna(subset=["LBXGLU"])
    record(
        "Final fasting-lab cohort",
        cohort,
        "LBXGLU observed as fasting-subsample linkage gate",
        "LBXGLU",
    )
    return pd.DataFrame(rows)


REPRODUCTIVE_REASON_SPECS = (
    {
        "era": "2009-2012",
        "cycles": ("2009-2010", "2011-2012"),
        "source_variable": "RHD042",
        "labels": {
            7: "Menopause or hysterectomy (combined code)",
            8: "Medical condition or treatment",
            9: "Other",
            99: "Don't know",
        },
    },
    {
        "era": "2013-2023",
        "cycles": ("2013-2014", "2015-2016", "2017-2018", "2021-2023"),
        "source_variable": "RHD043",
        "labels": {
            3: "Hysterectomy",
            7: "Menopause / change of life (self-report)",
            9: "Other",
            99: "Don't know",
        },
    },
)


def build_reproductive_status_reason_audit(raw: pd.DataFrame) -> pd.DataFrame:
    """Tabulate why final-cohort participants reported no period in prior year."""
    cohort = raw[
        (raw["RIAGENDR"] == 2)
        & raw["RIDAGEYR"].between(45, 60)
        & (raw["RHQ031"] == 2)
    ].dropna(subset=["LBXGH", "LBXGLU"])

    rows: list[dict[str, Any]] = []
    for spec in REPRODUCTIVE_REASON_SPECS:
        era_frame = cohort[cohort["cycle"].isin(spec["cycles"])]
        source_variable = str(spec["source_variable"])
        values = pd.to_numeric(era_frame[source_variable], errors="coerce")
        counts = values.value_counts(dropna=False).sort_index()
        labels = spec["labels"]
        for response_code, count in counts.items():
            if pd.isna(response_code):
                code_display: int | str = "Missing/invalid"
                reason = "Missing or invalid response"
            else:
                code_display = int(response_code)
                reason = labels.get(code_display, f"Unmapped response code {code_display}")
            rows.append(
                {
                    "era": spec["era"],
                    "cycles": ", ".join(spec["cycles"]),
                    "source_variable": source_variable,
                    "response_code": code_display,
                    "recorded_reason": reason,
                    "count": int(count),
                    "percentage_within_era": float(count / len(era_frame) * 100),
                    "era_total_n": int(len(era_frame)),
                }
            )
    return pd.DataFrame(rows)


def plot_reproductive_status_reason_audit(audit: pd.DataFrame, path: Path) -> None:
    """Show the reason distribution without merging incompatible code eras."""
    fig, axes = plt.subplots(1, 2, figsize=(18, 7.5))
    colors = ["#1D4ED8", "#0F766E", "#D97706", "#64748B", "#B91C1C"]
    for ax, spec in zip(axes, REPRODUCTIVE_REASON_SPECS):
        subset = audit[audit["era"] == spec["era"]].copy()
        subset = subset.sort_values("count", ascending=True)
        bars = ax.barh(subset["recorded_reason"], subset["count"], color=colors[: len(subset)])
        total = int(subset["era_total_n"].iloc[0])
        for bar, (_, row) in zip(bars, subset.iterrows()):
            ax.text(
                bar.get_width() + max(total * 0.012, 2),
                bar.get_y() + bar.get_height() / 2,
                f"{int(row['count']):,} ({row['percentage_within_era']:.1f}%)",
                va="center",
                fontsize=10,
            )
        ax.set_xlim(0, max(subset["count"].max() * 1.34, 1))
        ax.set_xlabel("Final fasting-lab cohort records")
        ax.set_title(
            f"{spec['era']} | {spec['source_variable']} | n={total:,}",
            fontweight="bold",
        )
        ax.grid(axis="x", alpha=0.2)
    fig.suptitle(
        "Recorded Reasons for No Menstrual Period in the Prior 12 Months\n"
        "RHQ031=2 is an operational cohort gate, not confirmation of natural menopause",
        fontsize=15,
        fontweight="bold",
    )
    fig.text(
        0.5,
        0.012,
        "The 2009-2012 questionnaire combined menopause and hysterectomy in code 7; those records cannot be separated retrospectively.",
        ha="center",
        fontsize=10,
        color="#991B1B",
    )
    fig.tight_layout(rect=(0, 0.045, 1, 0.91))
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def plot_attrition(attrition: pd.DataFrame, path: Path) -> None:
    plot_df = attrition.iloc[::-1].reset_index(drop=True)
    colors = ["#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"]
    fig, ax = plt.subplots(figsize=(14, 7.5))
    bars = ax.barh(plot_df["stage"], plot_df["retained_n"], color=colors)
    ax.set_xscale("log")
    ax.set_xlabel("Retained records (log scale)")
    ax.set_title(
        "NHANES Cohort Attrition: 61,626 Raw Records to 1,376 Analytic Records",
        fontweight="bold",
        fontsize=15,
    )
    ax.grid(axis="x", alpha=0.2)
    for bar, (_, row) in zip(bars, plot_df.iterrows()):
        excluded = int(row["excluded_n"])
        suffix = f" | excluded at stage: {excluded:,}" if excluded else ""
        ax.text(
            bar.get_width() * 1.03,
            bar.get_y() + bar.get_height() / 2,
            f"{int(row['retained_n']):,}{suffix}",
            va="center",
            fontsize=9,
        )
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def load_cluster_inputs(df: pd.DataFrame) -> dict[str, Any]:
    at_risk = df[df["diabetes_label"] >= 1].copy()
    imputer = joblib.load(MODEL_DIR / "cluster_imputer.joblib")
    scaler = joblib.load(MODEL_DIR / "cluster_scaler.joblib")
    model = joblib.load(MODEL_DIR / "weighted_kmeans_model.joblib")
    x_imputed = imputer.transform(at_risk[CLUSTER_FEATURES].to_numpy())
    x_scaled = scaler.transform(x_imputed)
    labels = np.asarray(model.predict(x_scaled), dtype=int)
    centers_raw = scaler.inverse_transform(model.cluster_centers_)
    return {
        "at_risk": at_risk,
        "imputer": imputer,
        "scaler": scaler,
        "model": model,
        "x_scaled": x_scaled,
        "labels": labels,
        "centers_raw": centers_raw,
        "weights": np.asarray(model.weights_, dtype=float),
    }


def centroid_waterfall(centers_raw: np.ndarray) -> tuple[pd.DataFrame, dict[int, str]]:
    centers = pd.DataFrame(centers_raw, columns=CLUSTER_FEATURES)
    centers["raw_cluster_id"] = np.arange(len(centers))
    centers["lap_score"] = (
        centers["waist_circumference"] - 58
    ) * centers["triglycerides"]
    centers["lap_score_conventional_mmol_l"] = (
        centers["waist_circumference"] - 58
    ) * (centers["triglycerides"] / 88.57)

    remaining = list(centers["raw_cluster_id"].astype(int))
    mapping: dict[int, str] = {}
    rationale: dict[int, str] = {}

    sird = int(centers.loc[remaining].sort_values("lap_score").index[-1])
    mapping[sird] = "SIRD-like"
    rationale[sird] = "Step 1: highest centroid LAP score"
    remaining.remove(sird)

    sidd = int(centers.loc[remaining].sort_values("ldl").index[-1])
    mapping[sidd] = "SIDD-like"
    rationale[sidd] = "Step 2: highest LDL among remaining centroids"
    remaining.remove(sidd)

    mod = int(centers.loc[remaining].sort_values("bmi").index[-1])
    mapping[mod] = "MOD-like"
    rationale[mod] = "Step 3: highest BMI among remaining centroids"
    remaining.remove(mod)

    mard = int(remaining[0])
    mapping[mard] = "MARD-like"
    rationale[mard] = "Step 4: residual centroid; mildest metabolic pattern"

    centers["assigned_proxy_label"] = centers["raw_cluster_id"].map(mapping)
    centers["naming_rule"] = centers["raw_cluster_id"].map(rationale)
    caveats = {
        "SIRD-like": "TG-waist proxy; code score uses TG in mg/dL; no HOMA2-IR",
        "SIDD-like": "LDL-dominant; no HOMA2-B/C-peptide evidence",
        "MOD-like": "BMI 42.05 indicates severe obesity despite legacy 'mild' name",
        "MARD-like": "Residual label; age differs by only about 1.15 years across clusters",
    }
    centers["interpretation_boundary"] = centers["assigned_proxy_label"].map(caveats)
    return centers, mapping


def build_centroid_evidence(cluster: dict[str, Any]) -> tuple[pd.DataFrame, dict[int, str]]:
    table, mapping = centroid_waterfall(cluster["centers_raw"])
    counts = pd.Series(cluster["labels"]).value_counts().to_dict()
    table["count"] = table["raw_cluster_id"].map(counts).astype(int)
    table["percentage"] = table["count"] / len(cluster["labels"]) * 100
    return table, mapping


def plot_centroid_waterfall(table: pd.DataFrame, path: Path) -> None:
    order = ["SIRD-like", "SIDD-like", "MOD-like", "MARD-like"]
    primary_names = {
        "SIRD-like": "TG-waist dominant",
        "SIDD-like": "LDL-dominant / atherogenic",
        "MOD-like": "Obesity-dominant",
        "MARD-like": "Lower-burden residual",
    }
    ordered = table.set_index("assigned_proxy_label").loc[order].reset_index()
    fig, ax = plt.subplots(figsize=(17, 8.5))
    ax.axis("off")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.text(
        0.5,
        0.95,
        "Model-Clustered, Researcher-Named: Exact Centroid Naming Waterfall",
        ha="center",
        va="center",
        fontsize=17,
        fontweight="bold",
    )
    ax.text(
        0.5,
        0.895,
        "Weighted K-Means first locked raw groups C0-C3 for all 734 operational-label-positive records; the rules below named only the centroids",
        ha="center",
        fontsize=11,
        color="#334155",
    )
    x_positions = [0.04, 0.285, 0.53, 0.775]
    for index, row in ordered.iterrows():
        label = str(row["assigned_proxy_label"])
        raw_id = int(row["raw_cluster_id"])
        x = x_positions[index]
        color = PROFILE_COLORS[label]
        box = plt.Rectangle(
            (x, 0.25),
            0.185,
            0.52,
            facecolor=color,
            alpha=0.12,
            edgecolor=color,
            linewidth=2,
        )
        ax.add_patch(box)
        ax.text(x + 0.0925, 0.72, f"Step {index + 1}: C{raw_id}", ha="center", fontweight="bold", fontsize=13)
        ax.text(
            x + 0.0925,
            0.67,
            primary_names[label],
            ha="center",
            color=color,
            fontweight="bold",
            fontsize=12.5,
        )
        ax.text(x + 0.0925, 0.625, f"Legacy alias: {label}", ha="center", color=color, fontsize=9.5)
        if label == "SIRD-like":
            criterion = (
                "Highest LAP-style rank\n"
                f"code score {row['lap_score']:,.0f}\n"
                f"conventional-scale LAP {row['lap_score_conventional_mmol_l']:.1f}"
            )
        elif label == "SIDD-like":
            criterion = f"Highest remaining LDL\n{row['ldl']:.2f} mg/dL"
        elif label == "MOD-like":
            criterion = f"Highest remaining BMI\n{row['bmi']:.2f} kg/m²"
        else:
            criterion = "Remaining centroid\nlowest metabolic burden"
        ax.text(x + 0.0925, 0.545, criterion, ha="center", va="center", fontsize=10.5)
        ax.text(
            x + 0.0925,
            0.445,
            f"n={int(row['count'])} ({row['percentage']:.1f}%)\n"
            f"BMI {row['bmi']:.1f} | TG {row['triglycerides']:.1f}\n"
            f"LDL {row['ldl']:.1f} | HDL {row['hdl']:.1f}\n"
            f"Age {row['age']:.1f} | Waist {row['waist_circumference']:.1f}",
            ha="center",
            va="center",
            fontsize=9.5,
        )
        display_caveats = {
            "SIRD-like": "TG-waist proxy; code uses mg/dL\nfor ranking; no direct\ninsulin-resistance assay",
            "SIDD-like": "LDL-dominant; no direct\nbeta-cell-function or\nC-peptide evidence",
            "MOD-like": "BMI 42.05 = severe obesity;\n'mild' is a legacy subtype name",
            "MARD-like": "Residual label; cluster-age\nspread is only 1.15 years",
        }
        ax.text(
            x + 0.0925,
            0.305,
            display_caveats[label],
            ha="center",
            va="center",
            fontsize=8.2,
            color="#7F1D1D",
        )
        if index < 3:
            ax.annotate(
                "",
                xy=(x + 0.225, 0.51),
                xytext=(x + 0.19, 0.51),
                arrowprops={"arrowstyle": "->", "lw": 2, "color": "#64748B"},
            )
    ax.text(
        0.5,
        0.12,
        "Unsupervised component: membership in C0-C3 by nearest weighted centroid.  "
        "Researcher-defined component: K=4, feature weights, operational-positive gate, and semantic names.",
        ha="center",
        fontsize=11,
        fontweight="bold",
        color="#0F172A",
    )
    ax.text(
        0.5,
        0.07,
        "These are Ahlqvist-inspired proxy profiles, not validated biological diabetes subtypes or treatment categories.",
        ha="center",
        fontsize=10.5,
        color="#991B1B",
    )
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def cluster_validation_metrics(cluster: dict[str, Any]) -> pd.DataFrame:
    x = cluster["x_scaled"]
    labels = cluster["labels"]
    weights = cluster["weights"]
    weighted_x = x * np.sqrt(weights)
    return pd.DataFrame(
        [
            {
                "geometry": "Unweighted standardized space (legacy report)",
                "silhouette": silhouette_score(x, labels),
                "davies_bouldin": davies_bouldin_score(x, labels),
                "calinski_harabasz": calinski_harabasz_score(x, labels),
            },
            {
                "geometry": "Weighted fitted geometry (X * sqrt(weights))",
                "silhouette": silhouette_score(weighted_x, labels),
                "davies_bouldin": davies_bouldin_score(weighted_x, labels),
                "calinski_harabasz": calinski_harabasz_score(weighted_x, labels),
            },
        ]
    )


def weighted_k_sensitivity_scan(
    cluster: dict[str, Any], k_values: Iterable[int] = range(2, 7)
) -> pd.DataFrame:
    """Refit each K and score it in the same weighted geometry it minimizes."""
    from Ian_ML.common.weighted_kmeans import WeightedKMeans

    x = cluster["x_scaled"]
    weights = cluster["weights"]
    weighted_x = x * np.sqrt(weights)
    rows: list[dict[str, Any]] = []
    for k in k_values:
        fitted = WeightedKMeans(
            n_clusters=int(k),
            weights=weights,
            random_state=42,
            n_init=10,
        ).fit(x)
        rows.append(
            {
                "k": int(k),
                "silhouette_weighted_geometry": silhouette_score(
                    weighted_x, fitted.labels_
                ),
                "davies_bouldin_weighted_geometry": davies_bouldin_score(
                    weighted_x, fitted.labels_
                ),
                "calinski_harabasz_weighted_geometry": calinski_harabasz_score(
                    weighted_x, fitted.labels_
                ),
                "random_state": 42,
                "n_init": 10,
            }
        )
    return pd.DataFrame(rows)


def build_cluster_stability(
    cluster: dict[str, Any], mapping: dict[int, str]
) -> tuple[pd.DataFrame, pd.DataFrame]:
    from Ian_ML.common.weighted_kmeans import WeightedKMeans
    from Ian_ML.training.clustering import assign_ahlqvist_labels

    x = cluster["x_scaled"]
    weights = cluster["weights"]
    scaler = cluster["scaler"]
    base_labels = cluster["labels"]
    base_named = np.array([mapping[int(label)] for label in base_labels])

    perturbation_rows: list[dict[str, Any]] = []
    for feature_index, feature in enumerate(CLUSTER_FEATURES):
        for factor in (0.8, 0.9, 1.1, 1.2):
            perturbed = weights.copy()
            perturbed[feature_index] *= factor
            fitted = WeightedKMeans(
                n_clusters=4,
                weights=perturbed,
                random_state=42,
                n_init=10,
            ).fit(x)
            label_map = assign_ahlqvist_labels(
                scaler.inverse_transform(fitted.cluster_centers_),
                CLUSTER_FEATURES,
                4,
            )
            named = np.array([f"{label_map[int(label)]}-like" for label in fitted.labels_])
            perturbation_rows.append(
                {
                    "feature": feature,
                    "weight_factor": factor,
                    "adjusted_rand_index": adjusted_rand_score(base_labels, fitted.labels_),
                    "semantic_label_agreement": float(np.mean(named == base_named)),
                }
            )

    seed_rows: list[dict[str, Any]] = []
    for seed in range(30):
        fitted = WeightedKMeans(
            n_clusters=4,
            weights=weights,
            random_state=seed,
            n_init=10,
        ).fit(x)
        label_map = assign_ahlqvist_labels(
            scaler.inverse_transform(fitted.cluster_centers_),
            CLUSTER_FEATURES,
            4,
        )
        named = np.array([f"{label_map[int(label)]}-like" for label in fitted.labels_])
        seed_rows.append(
            {
                "seed": seed,
                "adjusted_rand_index": adjusted_rand_score(base_labels, fitted.labels_),
                "semantic_label_agreement": float(np.mean(named == base_named)),
            }
        )
    return pd.DataFrame(perturbation_rows), pd.DataFrame(seed_rows)


def plot_cluster_stability(
    perturbations: pd.DataFrame, seeds: pd.DataFrame, path: Path
) -> None:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6.5))
    pivot = perturbations.pivot(
        index="feature", columns="weight_factor", values="semantic_label_agreement"
    ).loc[CLUSTER_FEATURES]
    image = ax1.imshow(pivot.to_numpy(), vmin=0.9, vmax=1.0, cmap="YlGnBu", aspect="auto")
    ax1.set_xticks(range(len(pivot.columns)), [f"x{v:.1f}" for v in pivot.columns])
    ax1.set_yticks(range(len(pivot.index)), [FEATURE_LABELS[f] for f in pivot.index])
    ax1.set_title("A. Semantic label agreement under one-weight perturbations")
    for row in range(pivot.shape[0]):
        for col in range(pivot.shape[1]):
            ax1.text(col, row, f"{pivot.iloc[row, col] * 100:.1f}%", ha="center", va="center", fontsize=9)
    fig.colorbar(image, ax=ax1, fraction=0.046, pad=0.04, label="Agreement")

    ax2.plot(seeds["seed"], seeds["adjusted_rand_index"], marker="o", label="ARI", color="#1D4ED8")
    ax2.plot(
        seeds["seed"],
        seeds["semantic_label_agreement"],
        marker="s",
        label="Semantic agreement",
        color="#D97706",
    )
    ax2.set_ylim(0.9, 1.01)
    ax2.set_xlabel("Random seed")
    ax2.set_ylabel("Agreement with frozen model")
    ax2.set_title("B. Stability across 30 initialization seeds")
    ax2.grid(alpha=0.2)
    ax2.legend()
    fig.suptitle(
        "Weighted K-Means Stability on the Full 734-Record Imputed Operational-Positive Cohort",
        fontweight="bold",
        fontsize=15,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def build_normal_inclusion_ablation(df: pd.DataFrame, cluster: dict[str, Any]) -> tuple[pd.DataFrame, dict[str, float]]:
    from Ian_ML.common.weighted_kmeans import WeightedKMeans

    imputer = cluster["imputer"]
    scaler = cluster["scaler"]
    weights = cluster["weights"]
    baseline = cluster["model"]
    at_risk_mask = (df["diabetes_label"] >= 1).to_numpy()
    all_scaled = scaler.transform(imputer.transform(df[CLUSTER_FEATURES].to_numpy()))
    at_risk_scaled = all_scaled[at_risk_mask]
    full_model = WeightedKMeans(
        n_clusters=4,
        weights=weights,
        random_state=42,
        n_init=10,
    ).fit(all_scaled)

    baseline_labels = baseline.predict(at_risk_scaled)
    full_at_risk_labels = full_model.predict(at_risk_scaled)
    ari = adjusted_rand_score(baseline_labels, full_at_risk_labels)

    weighted_baseline_centers = baseline.cluster_centers_ * np.sqrt(weights)
    weighted_full_centers = full_model.cluster_centers_ * np.sqrt(weights)
    distances = np.sqrt(
        np.sum(
            (weighted_baseline_centers[:, None, :] - weighted_full_centers[None, :, :]) ** 2,
            axis=2,
        )
    )
    baseline_ids, full_ids = linear_sum_assignment(distances)
    match = dict(zip(full_ids.tolist(), baseline_ids.tolist()))

    rows: list[dict[str, Any]] = []
    for full_id in range(4):
        mask = np.asarray(full_model.labels_) == full_id
        normal_n = int(np.sum(~at_risk_mask[mask]))
        at_risk_n = int(np.sum(at_risk_mask[mask]))
        rows.append(
            {
                "all_cohort_raw_cluster": full_id,
                "matched_at_risk_only_cluster": match[full_id],
                "normal_n": normal_n,
                "at_risk_n": at_risk_n,
                "total_n": int(mask.sum()),
                "normal_percentage": normal_n / int(mask.sum()) * 100,
                "matched_centroid_shift_weighted_sd": distances[match[full_id], full_id],
            }
        )
    summary = {
        "at_risk_assignment_ari": float(ari),
        "mean_matched_centroid_shift_weighted_sd": float(
            np.mean(distances[baseline_ids, full_ids])
        ),
        "maximum_normal_concentration_pct": float(
            max(row["normal_percentage"] for row in rows)
        ),
    }
    return pd.DataFrame(rows), summary


def plot_normal_inclusion_ablation(
    ablation: pd.DataFrame, summary: dict[str, float], path: Path
) -> None:
    labels = [f"Full C{int(value)}" for value in ablation["all_cohort_raw_cluster"]]
    x = np.arange(len(labels))
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6.5))
    ax1.bar(x, ablation["normal_n"], label="Normal", color="#94A3B8")
    ax1.bar(
        x,
        ablation["at_risk_n"],
        bottom=ablation["normal_n"],
        label="At risk",
        color="#D97706",
    )
    ax1.set_xticks(x, labels)
    ax1.set_ylabel("Records")
    ax1.set_title("A. Composition after fitting K=4 on all 1,376 records")
    ax1.legend()
    for idx, value in enumerate(ablation["normal_percentage"]):
        ax1.text(idx, ablation.iloc[idx]["total_n"] + 10, f"{value:.1f}% normal", ha="center", fontsize=9)

    ax2.bar(
        x,
        ablation["matched_centroid_shift_weighted_sd"],
        color="#1D4ED8",
        alpha=0.85,
    )
    ax2.set_xticks(
        x,
        [
            f"Full C{int(row.all_cohort_raw_cluster)}\n↔ At-risk C{int(row.matched_at_risk_only_cluster)}"
            for row in ablation.itertuples()
        ],
    )
    ax2.set_ylabel("Matched centroid shift (weighted SD units)")
    ax2.set_title("B. Centroid movement after normal-record inclusion")
    ax2.grid(axis="y", alpha=0.2)
    fig.suptitle(
        "Normal-Inclusion Ablation: Operational-Positive Assignments Changed Materially "
        f"(ARI={summary['at_risk_assignment_ari']:.3f})",
        fontweight="bold",
        fontsize=15,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def classify_diq010_only(diq010: object) -> str | None:
    """Map only valid DIQ010 responses; preserve missing/invalid as unclassified."""
    if pd.isna(diq010):
        return None
    try:
        response = int(float(diq010))
    except (TypeError, ValueError, OverflowError):
        return None
    return {1: "Diabetic", 2: "Normal", 3: "Pre-diabetic"}.get(response)


def classify_hba1c_only(hba1c: object) -> str | None:
    """Classify HbA1c using the operational 5.7% and 6.5% cut points."""
    if pd.isna(hba1c):
        return None
    try:
        value = float(hba1c)
    except (TypeError, ValueError, OverflowError):
        return None
    if not np.isfinite(value):
        return None
    if value >= 6.5:
        return "Diabetic"
    if value >= 5.7:
        return "Pre-diabetic"
    return "Normal"


def classify_operational_label(diq010: object, hba1c: object) -> str | None:
    hba1c_label = classify_hba1c_only(hba1c)
    if hba1c_label == "Diabetic":
        return "Diabetic"
    direct_label = classify_diq010_only(diq010)
    if direct_label == "Diabetic":
        return direct_label
    if direct_label == "Pre-diabetic":
        return direct_label
    if direct_label == "Normal":
        if hba1c_label in (None, "Normal"):
            return "Normal"
        return "Pre-diabetic"
    return None


def build_target_label_source_audit(raw: pd.DataFrame) -> pd.DataFrame:
    """Compare source-only labels and flag circular hybrid agreement explicitly."""
    cohort = raw[
        (raw["RIAGENDR"] == 2)
        & raw["RIDAGEYR"].between(45, 60)
        & (raw["RHQ031"] == 2)
    ].dropna(subset=["LBXGH", "LBXGLU"])
    diq_only = cohort["DIQ010"].map(classify_diq010_only)
    hba1c_only = cohort["LBXGH"].map(classify_hba1c_only)
    hybrid = cohort.apply(
        lambda row: classify_operational_label(row.get("DIQ010"), row.get("LBXGH")),
        axis=1,
    )

    rows: list[dict[str, Any]] = []
    comparisons = (
        (
            "DIQ010-only vs HbA1c-only",
            diq_only,
            hba1c_only,
            "Independent source-agreement description; neither source is treated as a gold standard.",
        ),
        (
            "Hybrid operational label vs HbA1c-only",
            hybrid,
            hba1c_only,
            "Circular by construction because HbA1c is a component of the hybrid operational label; not validation evidence.",
        ),
    )
    for comparison, left, right, interpretation in comparisons:
        valid = left.notna() & right.notna()
        agreement_n = int((left.loc[valid] == right.loc[valid]).sum())
        eligible_n = int(valid.sum())
        rows.append(
            {
                "comparison": comparison,
                "cohort_n": int(len(cohort)),
                "eligible_valid_pair_n": eligible_n,
                "excluded_missing_or_invalid_n": int(len(cohort) - eligible_n),
                "agreement_n": agreement_n,
                "disagreement_n": eligible_n - agreement_n,
                "agreement_pct": agreement_n / eligible_n * 100 if eligible_n else np.nan,
                "interpretation": interpretation,
            }
        )
    return pd.DataFrame(rows)


def build_menstrual_comparator(
    raw: pd.DataFrame, cluster: dict[str, Any], mapping: dict[int, str]
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, float]]:
    rename = {
        "BMXBMI": "bmi",
        "LBXTR": "triglycerides",
        "LBDLDL": "ldl",
        "LBDHDD": "hdl",
        "RIDAGEYR": "age",
        "BMXWAIST": "waist_circumference",
    }
    comparison = raw[
        (raw["RIAGENDR"] == 2)
        & raw["RIDAGEYR"].between(45, 60)
        & (raw["RHQ031"] == 1)
    ].dropna(subset=["LBXGH", "LBXGLU"]).copy()
    comparison["diabetes_status"] = comparison.apply(
        lambda row: classify_operational_label(row.get("DIQ010"), row.get("LBXGH")),
        axis=1,
    )
    comparison = comparison.dropna(subset=["diabetes_status"]).rename(columns=rename)
    comparison_at_risk = comparison[comparison["diabetes_status"] != "Normal"].copy()
    comparison_imputed = cluster["imputer"].transform(
        comparison_at_risk[CLUSTER_FEATURES].to_numpy()
    )
    comparison_at_risk.loc[:, CLUSTER_FEATURES] = comparison_imputed
    x = cluster["scaler"].transform(comparison_imputed)
    raw_labels = np.asarray(cluster["model"].predict(x), dtype=int)
    comparison_at_risk["profile"] = [mapping[int(label)] for label in raw_labels]

    post = cluster["at_risk"].copy()
    post.loc[:, CLUSTER_FEATURES] = cluster["imputer"].transform(
        post[CLUSTER_FEATURES].to_numpy()
    )
    post["profile"] = [mapping[int(label)] for label in cluster["labels"]]

    rows: list[dict[str, Any]] = []
    development_group = "No period in prior year (development)"
    for group_name, frame in (
        (development_group, post),
        ("Menstruating comparison", comparison_at_risk),
    ):
        for profile in PROFILE_ORDER:
            subset = frame[frame["profile"] == profile]
            row: dict[str, Any] = {
                "group": group_name,
                "profile": profile,
                "count": len(subset),
                "percentage": len(subset) / len(frame) * 100,
            }
            for feature in CLUSTER_FEATURES:
                row[feature] = float(subset[feature].mean())
            rows.append(row)
    profiles = pd.DataFrame(rows)

    contingency = profiles.pivot(index="group", columns="profile", values="count").loc[
        [development_group, "Menstruating comparison"], PROFILE_ORDER
    ]
    chi2, p_value, _, _ = chi2_contingency(contingency.to_numpy())
    total = float(contingency.to_numpy().sum())
    cramer_v = math.sqrt(chi2 / total)
    summary = {
        "development_eligible_n": float(len(pd.read_csv(DATA_PATH))),
        "development_at_risk_n": float(len(post)),
        "menstruating_eligible_n": float(len(comparison)),
        "menstruating_at_risk_n": float(len(comparison_at_risk)),
        "chi_square": float(chi2),
        "chi_square_p": float(p_value),
        "cramers_v": float(cramer_v),
    }
    return profiles, comparison_at_risk, summary


def plot_menstrual_comparison(
    profiles: pd.DataFrame, cluster: dict[str, Any], summary: dict[str, float], path: Path
) -> None:
    scaler = cluster["scaler"]
    means = scaler.mean_
    scales = scaler.scale_
    fig, axes = plt.subplots(2, 2, figsize=(17, 10), sharey=True)
    feature_x = np.arange(len(CLUSTER_FEATURES))
    for ax, profile in zip(axes.flat, PROFILE_ORDER):
        subset = profiles[profiles["profile"] == profile].set_index("group")
        for group, style, marker in (
            ("No period in prior year (development)", "-", "o"),
            ("Menstruating comparison", "--", "s"),
        ):
            raw = subset.loc[group, CLUSTER_FEATURES].to_numpy(dtype=float)
            z = (raw - means) / scales
            ax.plot(feature_x, z, linestyle=style, marker=marker, linewidth=2, label=group)
        ax.axhline(0, color="#94A3B8", linewidth=1)
        ax.set_xticks(feature_x, [FEATURE_LABELS[f] for f in CLUSTER_FEATURES], rotation=30, ha="right")
        ax.set_title(profile, color=PROFILE_COLORS[profile], fontweight="bold")
        ax.grid(alpha=0.2)
    axes[0, 0].set_ylabel("Mean standardized value\n(using frozen development-cohort scaler)")
    axes[1, 0].set_ylabel("Mean standardized value\n(using frozen development-cohort scaler)")
    axes[0, 0].legend(loc="upper left", fontsize=9)
    fig.suptitle(
        "Exploratory Menstrual-Status Comparison: Metabolic Profile Shapes Are Similar\n"
        f"Frozen-centroid distribution: chi-square p={summary['chi_square_p']:.3f}, Cramer's V={summary['cramers_v']:.3f}; "
        "age differs by cohort design",
        fontsize=15,
        fontweight="bold",
    )
    fig.text(
        0.5,
        0.015,
        "Internal sensitivity analysis only. RHQ031 distinguishes period/no-period reports in the prior 12 months; neither group is an external or age-matched validation cohort.",
        ha="center",
        fontsize=10,
        color="#991B1B",
    )
    fig.tight_layout(rect=(0, 0.045, 1, 0.92))
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def exact_sign_flip_pvalue(differences: np.ndarray) -> float:
    observed = abs(float(np.mean(differences)))
    values = []
    for signs in itertools.product((-1.0, 1.0), repeat=len(differences)):
        values.append(abs(float(np.mean(differences * np.asarray(signs)))))
    return float(np.mean(np.asarray(values) >= observed - 1e-15))


def build_model_selection_evidence(
    fold_metrics: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    summary = (
        fold_metrics.groupby("Model")[["AUC_ROC", "Sensitivity", "Specificity", "F1"]]
        .agg(["mean", "std"])
        .reset_index()
    )
    summary.columns = [
        "model",
        "auc_mean",
        "auc_sd",
        "sensitivity_mean",
        "sensitivity_sd",
        "specificity_mean",
        "specificity_sd",
        "f1_mean",
        "f1_sd",
    ]

    auc = fold_metrics.pivot(index="Test_Cycle", columns="Model", values="AUC_ROC")
    rng = np.random.default_rng(42)
    comparisons: list[dict[str, Any]] = []
    for competitor in ["Random Forest", "LightGBM", "XGBoost"]:
        differences = (auc["Logistic Regression"] - auc[competitor]).to_numpy()
        boot = np.asarray(
            [rng.choice(differences, len(differences), replace=True).mean() for _ in range(50_000)]
        )
        comparisons.append(
            {
                "comparison": f"Logistic Regression - {competitor}",
                "lr_wins_out_of_6": int(np.sum(differences > 0)),
                "mean_auc_difference": float(np.mean(differences)),
                "bootstrap_95_ci_lower": float(np.quantile(boot, 0.025)),
                "bootstrap_95_ci_upper": float(np.quantile(boot, 0.975)),
                "exact_two_sided_sign_flip_p": exact_sign_flip_pvalue(differences),
                "bonferroni_adjusted_p_three_comparisons": min(
                    1.0, exact_sign_flip_pvalue(differences) * 3
                ),
            }
        )

    inner_rows: list[dict[str, Any]] = []
    for fold, group in fold_metrics.groupby("Fold"):
        selected = group.loc[group["Inner_CV_AUC"].idxmax()]
        inner_rows.append(
            {
                "fold": int(fold),
                "held_out_cycle": selected["Test_Cycle"],
                "inner_selected_model": selected["Model"],
                "selected_inner_cv_auc": float(selected["Inner_CV_AUC"]),
                "selected_outer_auc": float(selected["AUC_ROC"]),
            }
        )
    return summary, pd.DataFrame(comparisons), pd.DataFrame(inner_rows)


def plot_model_selection(fold_metrics: pd.DataFrame, path: Path) -> None:
    cycles = fold_metrics.sort_values("Fold")["Test_Cycle"].drop_duplicates().tolist()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(17, 6.5), gridspec_kw={"width_ratios": [2, 1]})
    for model, group in fold_metrics.groupby("Model"):
        ordered = group.set_index("Test_Cycle").loc[cycles]
        ax1.plot(
            cycles,
            ordered["AUC_ROC"],
            marker="o",
            linewidth=2.5 if model == "Logistic Regression" else 1.7,
            color=MODEL_COLORS.get(model, "#64748B"),
            label=model,
        )
    ax1.set_ylim(0.66, 0.81)
    ax1.set_ylabel("Held-out ROC-AUC")
    ax1.set_xlabel("Held-out NHANES release")
    ax1.set_title("A. Logistic Regression ranked first in all 6 held-out releases")
    ax1.tick_params(axis="x", rotation=30)
    ax1.grid(alpha=0.2)
    ax1.legend(fontsize=9)

    means = fold_metrics.groupby("Model")["AUC_ROC"].mean().sort_values()
    colors = [MODEL_COLORS.get(model, "#64748B") for model in means.index]
    bars = ax2.barh(means.index, means.values, color=colors)
    ax2.set_xlim(0.68, 0.75)
    ax2.set_xlabel("Unweighted mean fold AUC")
    ax2.set_title("B. Mean performance gap is modest")
    ax2.grid(axis="x", alpha=0.2)
    for bar, value in zip(bars, means.values):
        ax2.text(value + 0.001, bar.get_y() + bar.get_height() / 2, f"{value:.3f}", va="center")
    fig.suptitle(
        "Candidate-Model Selection Across the Same Six Survey-Cycle Holdouts",
        fontsize=15,
        fontweight="bold",
    )
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)


def markdown_table(df: pd.DataFrame, columns: Iterable[str] | None = None) -> str:
    view = df[list(columns)] if columns is not None else df
    headers = [str(column) for column in view.columns]
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]
    for row in view.itertuples(index=False, name=None):
        cells = []
        for value in row:
            if isinstance(value, (float, np.floating)):
                cells.append(f"{float(value):.4f}")
            else:
                cells.append(str(value))
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def write_report(
    *,
    attrition: pd.DataFrame,
    reproductive_reasons: pd.DataFrame,
    target_label_audit: pd.DataFrame,
    ig: pd.DataFrame,
    target_entropy: float,
    centroids: pd.DataFrame,
    validation: pd.DataFrame,
    k_scan: pd.DataFrame,
    perturbations: pd.DataFrame,
    seeds: pd.DataFrame,
    normal_summary: dict[str, float],
    menstrual_profiles: pd.DataFrame,
    menstrual_summary: dict[str, float],
    model_summary: pd.DataFrame,
    comparisons: pd.DataFrame,
    inner_selection: pd.DataFrame,
) -> None:
    centroid_view = centroids[
        [
            "raw_cluster_id",
            "assigned_proxy_label",
            "count",
            "percentage",
            "bmi",
            "triglycerides",
            "ldl",
            "hdl",
            "age",
            "waist_circumference",
            "lap_score",
            "lap_score_conventional_mmol_l",
            "naming_rule",
            "interpretation_boundary",
        ]
    ].copy()
    centroid_view = centroid_view.sort_values("raw_cluster_id")
    model_view = model_summary[
        ["model", "auc_mean", "auc_sd", "sensitivity_mean", "specificity_mean", "f1_mean"]
    ].sort_values("auc_mean", ascending=False)
    ig_view = ig[
        [
            "corrected_rank",
            "feature_label",
            "missing_pct",
            "conditional_entropy_h_y_given_x",
            "corrected_ig_missing_as_category",
            "corrected_ig_pct_of_h_y",
            "decision",
            "decision_reason",
        ]
    ]

    report = f"""# DIANA Minor-Revision Evidence Pack

Generated from the current repository dataset and frozen model artifacts. This pack is an audit and sensitivity-analysis supplement; it does not replace external clinical validation.

## Bottom-line findings

1. **The defensible clustering description is “model-clustered, researcher-named.”** Weighted K-Means assigned all 734 operational-label-positive profiles to raw groups C0-C3 by nearest weighted centroid. K=4, the weights, the operational-positive gate, and the semantic names were researcher-defined. The names were applied after fitting through a deterministic centroid waterfall.
2. **The existing clustering proof must be replaced.** It drops 48 records and visualizes only 686 complete cases. The tables and figures in this pack use the same imputer, scaler, frozen Weighted K-Means artifact, and all 734 records used by the active clustering pipeline.
3. **The current Information Gain table is not reliable.** Missing-heavy variables were inflated because NaN rows received no conditional-entropy contribution while remaining in the denominator. Missing-aware CRP IG is {ig.loc[ig['feature'].eq('crp'), 'corrected_ig_missing_as_category'].iloc[0]:.6f}, not {ig.loc[ig['feature'].eq('crp'), 'legacy_missing_unsafe_ig'].iloc[0]:.6f}; fasting-insulin IG is {ig.loc[ig['feature'].eq('fasting_insulin'), 'corrected_ig_missing_as_category'].iloc[0]:.6f}, not {ig.loc[ig['feature'].eq('fasting_insulin'), 'legacy_missing_unsafe_ig'].iloc[0]:.6f}.
4. **Logistic Regression is defensible but should not be called universally superior.** It had the highest held-out AUC in all 6/6 survey releases and was also the inner-development winner in all 6 folds. Its mean advantage was only about 0.02 AUC, and multiplicity-adjusted exploratory paired tests do not establish definitive superiority.
5. **The clusters are not proven menopause-specific.** A same-NHANES period-reported comparison group produced similar frozen-centroid profile proportions (chi-square p={menstrual_summary['chi_square_p']:.3f}, Cramer's V={menstrual_summary['cramers_v']:.3f}). This suggests the profiles are general metabolic patterns observed within a cohort selected by a no-period gate, not effects caused by menopause.
6. **The development cohort is operationally defined, not confirmed natural menopause.** RHQ031=2 means no menstrual period in the prior 12 months. In 2013-2023, the recorded reasons included 581 self-reported menopause/change-of-life responses, 310 hysterectomies, 70 other reasons, and 3 don't-know responses. In 2009-2012, 402 of 412 records used a questionnaire code that combined menopause and hysterectomy and cannot be separated retrospectively.

## 1. Dataset attrition

{markdown_table(attrition, ['stage', 'source_variable', 'previous_n', 'excluded_n', 'retained_n', 'retained_pct_of_raw', 'criterion'])}

The exact observed path is 61,626 -> 31,518 -> 4,922 -> 2,826 -> 2,736 -> 1,376. The final Normal/At-Risk split must use DIQ010 plus the HbA1c override. FBS is a fasting-lab eligibility gate, not a second outcome-label rule.

![NHANES cohort attrition](dataset_attrition.png)

### 1.1 Why the no-period gate is not synonymous with natural menopause

{markdown_table(reproductive_reasons, ['era', 'source_variable', 'response_code', 'recorded_reason', 'count', 'percentage_within_era', 'era_total_n'])}

The two questionnaire eras must remain separate. `RHD043` distinguishes hysterectomy from a self-reported menopause/change-of-life reason in 2013-2023, whereas `RHD042` code 7 combines menopause and hysterectomy in 2009-2012. The manuscript should therefore describe the 1,376 records as the **no-period-in-prior-year operational development cohort**. A self-reported menopause/change-of-life subgroup analysis is possible only for the later cycles, would not recover the older combined-code records, and would still not be clinically adjudicated.

![Recorded reasons for the no-period gate](reproductive_status_reason_audit.png)

### 1.2 Target-label source agreement is not target validation

{markdown_table(target_label_audit)}

DIQ010-only status and HbA1c-only status agree for 831/1,376 records (60.4%). The hybrid operational target and HbA1c-only status agree for 1,295/1,376 (94.1%), but this higher value is circular by construction because HbA1c is used to create the hybrid target. It may be reported as a consistency check, not as independent evidence of target validity.

## 2. Entropy and corrected Information Gain

Target entropy: **H(Y) = {target_entropy:.6f} bits**.

{markdown_table(ig_view)}

IG is a univariate relevance audit, not the sole feature-selection rule. The final feature contract also used non-circularity, availability, redundancy, accessibility, and clinical covariate rationale. Do not say that all nine deployed features were retained because they had the top nine IG scores.

![Missing-aware Information Gain audit](information_gain_missingness_audit.png)

## 3. Model-selection evidence

{markdown_table(model_view)}

{markdown_table(comparisons)}

Inner-development selection, which does not consult each held-out test cycle:

{markdown_table(inner_selection)}

Recommended claim: Logistic Regression was the best-supported current candidate under the implemented survey-cycle-blocked validation design. It ranked first in AUC in every held-out cycle and every inner-development selection. The gap was modest, there were only six cycle groups, and the analysis was not preregistered; interpretability is a secondary reason for retaining LR, not evidence that it was predetermined to win.

![Candidate model performance by cycle](model_selection_by_cycle.png)

## 4. Exact centroid-to-label proof

{markdown_table(centroid_view)}

The implementation's `lap_score` multiplies waist by triglycerides in mg/dL. Conventional female LAP formulas use triglycerides in mmol/L, so the additional column converts TG by 88.57. This constant conversion does not change which centroid ranks first, but the raw code value must be called a **LAP-style ranking score**, not a standard clinical LAP magnitude.

Only BMI and age directly overlap with the original Ahlqvist clustering variables. The original study also used age at diagnosis, HbA1c, GAD antibodies, HOMA2-B, and HOMA2-IR. DIANA's lipid/waist profiles therefore cannot be described as a replication. Safer primary names are **TG-waist dominant**, **LDL-dominant/atherogenic**, **obesity-dominant**, and **lower-metabolic-burden residual**, with Ahlqvist-inspired names in parentheses.

![Centroid naming waterfall](cluster_centroid_naming_waterfall.png)

## 5. Clustering validity and stability

{markdown_table(validation)}

The active algorithm minimizes weighted squared distance, so weighted-space metrics are the geometry-matched validation figures. The legacy unweighted values may be retained only if explicitly labeled as a secondary standardized-space view.

Weighted-geometry sensitivity across candidate values of K:

{markdown_table(k_scan)}

K=2 had the highest silhouette and Calinski-Harabasz scores, while K=4 had the lowest Davies-Bouldin index and retained the intended four-profile granularity. K=4 is therefore a documented design trade-off, not a uniquely proven optimum.

Across one-weight-at-a-time perturbations of +/-10% and +/-20% on all 734 records, minimum ARI was **{perturbations['adjusted_rand_index'].min():.4f}** and minimum semantic agreement was **{perturbations['semantic_label_agreement'].min() * 100:.2f}%**. Across 30 initialization seeds, minimum ARI was **{seeds['adjusted_rand_index'].min():.4f}**. This supports initialization and local-weight robustness, not full sampling stability or external reproducibility.

![Full-cohort cluster stability](cluster_stability_full_734.png)

## 6. Why normal-glycemic records were excluded from subtyping

Fitting K=4 to all 1,376 records changed the operational-positive partition to ARI **{normal_summary['at_risk_assignment_ari']:.3f}** relative to the operational-positive-only solution. Matched centroids shifted by **{normal_summary['mean_matched_centroid_shift_weighted_sd']:.3f} weighted SD units on average**, and one all-cohort cluster was **{normal_summary['maximum_normal_concentration_pct']:.1f}% normal**. This is empirical ablation evidence that including normals consumes cluster capacity and materially changes the four operational-positive profiles. It does not prove that every centroid is “contaminated.”

![Normal-inclusion ablation](normal_inclusion_ablation.png)

## 7. Exploratory comparison with women reporting a period in the prior year

No-period-in-prior-year development cohort: {int(menstrual_summary['development_eligible_n'])} eligible / {int(menstrual_summary['development_at_risk_n'])} operational-label positive. Period-reported comparison cohort: {int(menstrual_summary['menstruating_eligible_n'])} eligible / {int(menstrual_summary['menstruating_at_risk_n'])} operational-label positive.

{markdown_table(menstrual_profiles[['group', 'profile', 'count', 'percentage', *CLUSTER_FEATURES]])}

The metabolic shapes are visually similar, while age shifts because the groups are not age matched. This is an internal exploratory comparison only; a defensible menopause-effect study would require age matching or adjustment, a prespecified hypothesis, and an independent cohort.

![Exploratory menstrual-status comparison](menstrual_status_profile_comparison.png)

## 8. Minimum manuscript corrections before submission

1. Correct Figure 3.1's final label split: DIQ010 + HbA1c override, not HbA1c + FBS.
2. Replace “postmenopausal cohort” with “no-period-in-prior-year operational development cohort,” and show the reproductive-reason audit unless a confirmed natural-menopause subgroup is used.
3. Replace any 94.1% “label validation” claim with the two-source audit and state that hybrid-versus-HbA1c agreement is circular by construction.
4. Replace Table 4.5 with the missing-aware IG table and define IG%, H(Y), H(Y|X), missingness, and exclusion reason.
5. Replace the 686-case clustering proof with the 734-case waterfall, validation, and stability evidence here.
6. State explicitly which steps were researcher choices and which step was unsupervised membership assignment.
7. Add the raw-cluster ID -> centroid calculation -> proxy label crosswalk.
8. Report LR's 6/6 cycle ranking and inner-only selection audit, but call the differences modest and the statistical comparison exploratory.
9. Reframe “MARD-like” as a residual lower-metabolic-burden proxy, “SIDD-like” as LDL-dominant rather than insulin-deficient, and MOD-like as obesity-dominant because BMI 42.05 is not mild obesity.
10. Rebuild Chapter 5 from the canonical Chapter 3-4 truth. Remove claims of diagnosis, personalized treatment, validated biological subtypes, clinical validity, or proven superiority.
11. Map each limitation to a specific next study: Philippine prospective validation/recalibration; corrected IG; externally nested model-family selection and OOF calibration; age-matched reproductive-status comparison; independent centroid replication with HOMA2/C-peptide/GAD markers; consensus/bootstrap clustering; K=2 versus K=4 sensitivity; and formal UAT/expert/accessibility/security/load testing.

## Ready-to-say defense answers

**How were the clusters made and labeled?**

> “The 734 operational-label-positive records were grouped automatically by Weighted K-Means using nearest-centroid distance in six standardized features. After those raw groups were fixed, we assigned human-readable proxy names through a deterministic centroid-level waterfall. So the membership was model-generated, while the names were researcher-defined. We now state that distinction directly.”

**Why Logistic Regression?**

> “We did not choose Logistic Regression because one sensitivity or F1 value looked better afterward. Under the implemented primary AUC rule, it ranked first in all six held-out NHANES cycles. An additional inner-development audit also selected it in all six folds before each outer test result was consulted. Its advantage was only about 0.02 AUC, so we call it the best-supported current choice because of consistent discrimination and coefficient-level interpretability, not a universally superior model.”

**Are the clusters specific to menopause?**

> “No. They are metabolic patterns observed within a development cohort defined by no reported period in the prior year, which included self-reported menopause/change of life, hysterectomy, and other reasons. An exploratory same-NHANES comparison found similar patterns among women who reported a period, so we cannot claim that menopause caused or uniquely defined the clusters. That requires a correctly phenotyped, age-matched external comparison.”

## Primary methodological references

- Ahlqvist et al. (2018), original adult-onset diabetes subgroup study: https://doi.org/10.1016/S2213-8587(18)30051-2
- Collins et al. (2024), TRIPOD+AI reporting guidance: https://doi.org/10.1136/bmj-2023-078378
"""
    (OUTPUT_DIR / "README.md").write_text(report, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATA_PATH)

    raw = reconstruct_raw_nhanes()
    attrition = build_attrition(raw)
    attrition.to_csv(OUTPUT_DIR / "dataset_attrition.csv", index=False)
    plot_attrition(attrition, OUTPUT_DIR / "dataset_attrition.png")

    reproductive_reasons = build_reproductive_status_reason_audit(raw)
    reproductive_reasons.to_csv(
        OUTPUT_DIR / "reproductive_status_reason_audit.csv", index=False
    )
    plot_reproductive_status_reason_audit(
        reproductive_reasons,
        OUTPUT_DIR / "reproductive_status_reason_audit.png",
    )

    target_label_audit = build_target_label_source_audit(raw)
    target_label_audit.to_csv(
        OUTPUT_DIR / "target_label_source_audit.csv", index=False
    )

    ig, target_entropy = build_information_gain_audit(df)
    ig.to_csv(OUTPUT_DIR / "information_gain_missingness_audit.csv", index=False)
    plot_information_gain(ig, OUTPUT_DIR / "information_gain_missingness_audit.png")

    cluster = load_cluster_inputs(df)
    centroids, mapping = build_centroid_evidence(cluster)
    centroids.to_csv(OUTPUT_DIR / "cluster_centroid_label_crosswalk.csv", index=False)
    plot_centroid_waterfall(centroids, OUTPUT_DIR / "cluster_centroid_naming_waterfall.png")

    validation = cluster_validation_metrics(cluster)
    validation.to_csv(OUTPUT_DIR / "cluster_validation_geometry.csv", index=False)
    k_scan = weighted_k_sensitivity_scan(cluster)
    k_scan.to_csv(OUTPUT_DIR / "cluster_weighted_k_sensitivity.csv", index=False)
    perturbations, seeds = build_cluster_stability(cluster, mapping)
    perturbations.to_csv(OUTPUT_DIR / "cluster_weight_perturbation_full_734.csv", index=False)
    seeds.to_csv(OUTPUT_DIR / "cluster_seed_stability_full_734.csv", index=False)
    plot_cluster_stability(
        perturbations,
        seeds,
        OUTPUT_DIR / "cluster_stability_full_734.png",
    )

    normal_ablation, normal_summary = build_normal_inclusion_ablation(df, cluster)
    normal_ablation.to_csv(OUTPUT_DIR / "normal_inclusion_ablation.csv", index=False)
    plot_normal_inclusion_ablation(
        normal_ablation,
        normal_summary,
        OUTPUT_DIR / "normal_inclusion_ablation.png",
    )

    menstrual_profiles, _, menstrual_summary = build_menstrual_comparator(
        raw, cluster, mapping
    )
    menstrual_profiles.to_csv(
        OUTPUT_DIR / "menstrual_status_profile_comparison.csv", index=False
    )
    plot_menstrual_comparison(
        menstrual_profiles,
        cluster,
        menstrual_summary,
        OUTPUT_DIR / "menstrual_status_profile_comparison.png",
    )

    fold_metrics = pd.read_csv(RESULTS_DIR / "logo_fold_metrics.csv")
    model_summary, comparisons, inner_selection = build_model_selection_evidence(
        fold_metrics
    )
    model_summary.to_csv(OUTPUT_DIR / "model_selection_summary.csv", index=False)
    comparisons.to_csv(OUTPUT_DIR / "model_selection_paired_auc.csv", index=False)
    inner_selection.to_csv(OUTPUT_DIR / "model_selection_inner_only.csv", index=False)
    plot_model_selection(fold_metrics, OUTPUT_DIR / "model_selection_by_cycle.png")

    evidence_summary = {
        "dataset": {
            "raw_n": int(attrition.iloc[0]["retained_n"]),
            "analytic_n": int(attrition.iloc[-1]["retained_n"]),
            "at_risk_n": int(len(cluster["labels"])),
            "reproductive_reason_counts": {
                f"{row.era}:{row.source_variable}:{row.response_code}": int(row.count)
                for row in reproductive_reasons.itertuples(index=False)
            },
            "target_label_source_agreement": {
                row.comparison: {
                    "eligible_valid_pair_n": int(row.eligible_valid_pair_n),
                    "agreement_n": int(row.agreement_n),
                    "agreement_pct": float(row.agreement_pct),
                }
                for row in target_label_audit.itertuples(index=False)
            },
        },
        "information_gain": {
            "target_entropy": target_entropy,
            "crp_corrected": float(
                ig.loc[ig["feature"].eq("crp"), "corrected_ig_missing_as_category"].iloc[0]
            ),
            "fasting_insulin_corrected": float(
                ig.loc[
                    ig["feature"].eq("fasting_insulin"),
                    "corrected_ig_missing_as_category",
                ].iloc[0]
            ),
            "family_history_corrected": float(
                ig.loc[
                    ig["feature"].eq("family_history_diabetes"),
                    "corrected_ig_missing_as_category",
                ].iloc[0]
            ),
            "family_history_missingness_indicator_ig": float(
                ig.loc[
                    ig["feature"].eq("family_history_diabetes"),
                    "missingness_indicator_ig",
                ].iloc[0]
            ),
        },
        "clustering": {
            "counts_sum": int(centroids["count"].sum()),
            "weighted_k_scan": {
                str(int(row.k)): {
                    "silhouette": float(row.silhouette_weighted_geometry),
                    "davies_bouldin": float(row.davies_bouldin_weighted_geometry),
                    "calinski_harabasz": float(
                        row.calinski_harabasz_weighted_geometry
                    ),
                }
                for row in k_scan.itertuples(index=False)
            },
            "minimum_weight_perturbation_ari": float(
                perturbations["adjusted_rand_index"].min()
            ),
            "minimum_weight_perturbation_semantic_agreement": float(
                perturbations["semantic_label_agreement"].min()
            ),
            "minimum_seed_ari": float(seeds["adjusted_rand_index"].min()),
            **normal_summary,
        },
        "menstrual_comparison": menstrual_summary,
        "model_selection": {
            "lr_outer_auc_wins": int(
                comparisons["lr_wins_out_of_6"].min()
            ),
            "lr_inner_selection_count": int(
                inner_selection["inner_selected_model"]
                .eq("Logistic Regression")
                .sum()
            ),
        },
    }
    (OUTPUT_DIR / "evidence_summary.json").write_text(
        json.dumps(evidence_summary, indent=2), encoding="utf-8"
    )

    write_report(
        attrition=attrition,
        reproductive_reasons=reproductive_reasons,
        target_label_audit=target_label_audit,
        ig=ig,
        target_entropy=target_entropy,
        centroids=centroids,
        validation=validation,
        k_scan=k_scan,
        perturbations=perturbations,
        seeds=seeds,
        normal_summary=normal_summary,
        menstrual_profiles=menstrual_profiles,
        menstrual_summary=menstrual_summary,
        model_summary=model_summary,
        comparisons=comparisons,
        inner_selection=inner_selection,
    )
    print(f"Minor-revision evidence written to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
