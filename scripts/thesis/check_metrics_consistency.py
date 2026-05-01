#!/usr/bin/env python3
"""Check thesis draft metric claims against binary_v2_no_bp artifacts.

This checker validates manuscript text against generated artifacts. It does not
compute new model metrics or alter the drafts.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Any

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = PROJECT_ROOT / "models" / "binary_v2_no_bp" / "results"
DATA_PATH = PROJECT_ROOT / "data" / "nhanes" / "processed" / "diana_dataset_final.csv"
DEFAULT_DOCS = [
    PROJECT_ROOT / "docs" / "07-research" / "thesis-drafts" / "ch3+4.md",
    PROJECT_ROOT / "docs" / "07-research" / "thesis-drafts" / "ch3+4_academic.md",
]


@dataclass(frozen=True)
class ExpectedClaim:
    label: str
    pattern: str
    expected: str


@dataclass
class CheckIssue:
    path: Path
    label: str
    expected: str


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def fmt3(value: float) -> str:
    return f"{value:.3f}"


def fmt4(value: float) -> str:
    return f"{value:.4f}"


def number_pattern(value: str) -> str:
    return rf"\*{{0,2}}{re.escape(value)}\*{{0,2}}"


def range_pattern(low: str, high: str) -> str:
    return rf"{number_pattern(low)}\s*[–-]\s*{number_pattern(high)}"


def ms_pattern(value: float) -> str:
    return rf"\*{{0,2}}{value:.2f}\s*ms\*{{0,2}}"


def line_pattern(cells: list[str]) -> str:
    escaped_cells = [rf"\s*{cell}\s*" for cell in cells]
    return r"\|\s*" + r"\s*\|\s*".join(escaped_cells) + r"\s*\|"


def compute_fold_summary(rows: list[dict[str, str]]) -> dict[str, dict[str, float]]:
    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    metrics = ["AUC_ROC", "Sensitivity", "Specificity", "F1", "Threshold"]
    for row in rows:
        model = row["Model"]
        for metric in metrics:
            grouped[model][metric].append(float(row[metric]))

    return {
        model: {metric: mean(values) for metric, values in metric_values.items()}
        for model, metric_values in grouped.items()
    }


def compute_information_gain_rows() -> list[dict[str, Any]]:
    sys.path.insert(0, str(PROJECT_ROOT))
    from Ian_ML.training.validate_no_leakage import rank_features_by_ig

    df = pd.read_csv(DATA_PATH)
    df["at_risk"] = (df["diabetes_label"] >= 1).astype(str)

    df["bmi_category"] = pd.cut(
        df["bmi"], bins=[0, 18.5, 23, 25, 100], labels=[0, 1, 2, 3]
    ).astype(float)
    df["tg_hdl_ratio"] = df["triglycerides"] / df["hdl"].replace(0, pd.NA)

    smoking_map = {"Never": 0, "Former": 1, "Current": 2, "Unknown": 1}
    df["smoking_encoded"] = df["smoking_status"].fillna("Unknown").map(
        lambda value: smoking_map.get(
            str(value).strip().title() if str(value).strip().lower() != "unknown" else "Unknown",
            1,
        )
    )

    activity_map = {"Sedentary": 0, "Moderate": 1, "Active": 2, "Unknown": 1}
    df["activity_encoded"] = df["physical_activity"].fillna("Unknown").map(
        lambda value: activity_map.get(
            str(value).strip().title() if str(value).strip().lower() != "unknown" else "Unknown",
            1,
        )
    )

    alcohol_map = {"None": 0, "Light": 1, "Moderate": 2, "Heavy": 3, "Unknown": 1}
    df["alcohol_encoded"] = df["alcohol_use"].fillna("Unknown").map(
        lambda value: alcohol_map.get(
            str(value).strip().title() if str(value).strip().lower() != "none" else "None",
            1,
        )
    )

    met_criteria = pd.DataFrame(
        {
            "high_tg": df["triglycerides"] > 150,
            "low_hdl": df["hdl"] < 50,
            "high_bmi": df["bmi"] >= 25,
            "high_waist": df["waist_circumference"] >= 80,
        }
    )
    df["metabolic_syndrome_score"] = met_criteria.sum(axis=1)

    features = [
        feature
        for feature in [
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
            "bmi_category",
            "tg_hdl_ratio",
            "smoking_encoded",
            "activity_encoded",
            "alcohol_encoded",
            "metabolic_syndrome_score",
        ]
        if feature in df.columns
    ]
    return rank_features_by_ig(df, features, "at_risk").to_dict(orient="records")


def expected_claims() -> list[ExpectedClaim]:
    report = load_json(RESULTS_DIR / "best_model_report.json")
    benchmark = load_json(RESULTS_DIR / "benchmark_comparison.json")
    calibration = load_json(RESULTS_DIR / "calibration_report.json")
    inference = load_json(RESULTS_DIR / "inference_benchmark.json")
    fold_rows = load_csv_rows(RESULTS_DIR / "logo_fold_metrics.csv")
    features_manifest = load_json(PROJECT_ROOT / "models" / "binary_v2_no_bp" / "features.json")
    model_features = set(features_manifest["features"])

    metrics = report["metrics"]
    auc_low, auc_high = metrics["auc_ci_95"]
    sens_low, sens_high = metrics["sensitivity_ci_95"]
    threshold = report["decision_thresholds"]["at_risk"]
    best_model = report["best_model"]

    best_fold_rows = [row for row in fold_rows if row["Model"] == best_model]
    fold_auc_values = [float(row["AUC_ROC"]) for row in best_fold_rows]
    guardrail_count = sum(row["Guardrail_Triggered"] == "True" for row in best_fold_rows)
    threshold_counts = Counter(row["Threshold_Strategy"] for row in best_fold_rows)
    fold_summary = compute_fold_summary(fold_rows)

    claims = [
        ExpectedClaim(
            "headline AUC and CI",
            rf"AUC-ROC of {number_pattern(fmt3(metrics['auc_roc']))}\s*"
            rf"\(95% CI:\s*{range_pattern(fmt3(auc_low), fmt3(auc_high))}\)",
            f"AUC {fmt3(metrics['auc_roc'])} [{fmt3(auc_low)}-{fmt3(auc_high)}]",
        ),
        ExpectedClaim(
            "headline sensitivity and CI",
            rf"sensitivity of {number_pattern(fmt3(metrics['sensitivity']))}\s*"
            rf"\(95% CI:\s*{range_pattern(fmt3(sens_low), fmt3(sens_high))}\)",
            f"sensitivity {fmt3(metrics['sensitivity'])} [{fmt3(sens_low)}-{fmt3(sens_high)}]",
        ),
        ExpectedClaim(
            "headline threshold",
            rf"threshold of {number_pattern(fmt3(threshold))}",
            f"threshold {fmt3(threshold)}",
        ),
        ExpectedClaim(
            "headline specificity",
            rf"Specificity was {number_pattern(fmt3(metrics['specificity']))}",
            f"specificity {fmt3(metrics['specificity'])}",
        ),
        ExpectedClaim(
            "headline F1",
            rf"F1 score of {number_pattern(fmt3(metrics['f1']))}",
            f"F1 {fmt3(metrics['f1'])}",
        ),
        ExpectedClaim(
            "fold AUC range",
            rf"fold-level AUC range of {number_pattern(fmt3(min(fold_auc_values)))}\s*[–-]\s*"
            rf"{number_pattern(fmt3(max(fold_auc_values)))}",
            f"fold AUC range {fmt3(min(fold_auc_values))}-{fmt3(max(fold_auc_values))}",
        ),
        ExpectedClaim(
            "sensitivity CI table row",
            line_pattern(
                [
                    "Sensitivity",
                    fmt4(metrics["sensitivity"]),
                    fmt3(sens_low),
                    fmt3(sens_high),
                    ".+?",
                ]
            ),
            f"Sensitivity row {fmt4(metrics['sensitivity'])} | {fmt3(sens_low)} | {fmt3(sens_high)}",
        ),
        ExpectedClaim(
            "AUC CI table row",
            line_pattern(
                [
                    "AUC-ROC",
                    fmt4(metrics["auc_roc"]),
                    fmt3(auc_low),
                    fmt3(auc_high),
                    ".+?",
                ]
            ),
            f"AUC row {fmt4(metrics['auc_roc'])} | {fmt3(auc_low)} | {fmt3(auc_high)}",
        ),
        ExpectedClaim(
            "guardrail fold count",
            rf"guardrail arbitration was activated in {number_pattern(str(guardrail_count))}\s+of\s+"
            rf"{number_pattern(str(len(best_fold_rows)))} LOGO folds",
            f"{guardrail_count} of {len(best_fold_rows)} guardrail folds",
        ),
        ExpectedClaim(
            "Youden threshold mode table row",
            line_pattern(["Youden's J", f"{threshold_counts['youden']}/{len(best_fold_rows)}", ".+?"]),
            f"Youden's J {threshold_counts['youden']}/{len(best_fold_rows)}",
        ),
        ExpectedClaim(
            "guardrail threshold mode table row",
            line_pattern(
                [
                    "Guardrail Shift Floor",
                    f"{threshold_counts['guardrail_shift_floor']}/{len(best_fold_rows)}",
                    ".+?",
                ]
            ),
            f"Guardrail Shift Floor {threshold_counts['guardrail_shift_floor']}/{len(best_fold_rows)}",
        ),
        ExpectedClaim(
            "calibration Brier score",
            line_pattern(["\\*{0,2}Brier Score\\*{0,2}", number_pattern(fmt4(calibration["brier_score"])), ".+?"]),
            f"Brier score {fmt4(calibration['brier_score'])}",
        ),
        ExpectedClaim(
            "calibration ECE",
            line_pattern(
                [
                    "\\*{0,2}Expected Calibration Error \\(ECE\\)\\*{0,2}",
                    number_pattern(fmt4(calibration["expected_calibration_error"])),
                    ".+?",
                ]
            ),
            f"ECE {fmt4(calibration['expected_calibration_error'])}",
        ),
        ExpectedClaim(
            "calibration Hosmer-Lemeshow",
            line_pattern(
                [
                    "\\*{0,2}Hosmer-Lemeshow χ²\\*{0,2}",
                    number_pattern(f"{calibration['hosmer_lemeshow_statistic']:.2f}"),
                    ".+?",
                ]
            ),
            f"Hosmer-Lemeshow {calibration['hosmer_lemeshow_statistic']:.2f}",
        ),
        ExpectedClaim(
            "LR inference latency",
            rf"LR inference averages {ms_pattern(inference['results']['Logistic Regression']['mean_ms'])}",
            f"LR inference {inference['results']['Logistic Regression']['mean_ms']:.2f} ms",
        ),
        ExpectedClaim(
            "RF inference latency",
            rf"{ms_pattern(inference['results']['Random Forest']['mean_ms'])} for RF",
            f"RF inference {inference['results']['Random Forest']['mean_ms']:.2f} ms",
        ),
        ExpectedClaim(
            "LightGBM inference latency",
            rf"{ms_pattern(inference['results']['LightGBM']['mean_ms'])} for LightGBM",
            f"LightGBM inference {inference['results']['LightGBM']['mean_ms']:.2f} ms",
        ),
    ]

    for model in ["Logistic Regression", "Random Forest", "LightGBM", "XGBoost"]:
        if model not in fold_summary:
            continue
        model_row = fold_summary[model]
        claims.append(
            ExpectedClaim(
                f"{model} mean fold comparison row",
                line_pattern(
                    [
                        re.escape(model),
                        number_pattern(fmt3(model_row["AUC_ROC"])),
                        ".+?",
                        number_pattern(fmt3(model_row["Sensitivity"])),
                        ".+?",
                        number_pattern(fmt3(model_row["Specificity"])),
                        number_pattern(fmt3(model_row["F1"])),
                        number_pattern(fmt3(model_row["Threshold"])),
                    ]
                ),
                (
                    f"{model}: AUC {fmt3(model_row['AUC_ROC'])}, "
                    f"sens {fmt3(model_row['Sensitivity'])}, spec {fmt3(model_row['Specificity'])}, "
                    f"F1 {fmt3(model_row['F1'])}, threshold {fmt3(model_row['Threshold'])}"
                ),
            )
        )

    feature_labels = {
        "fasting_insulin": "Fasting Insulin",
        "tg_hdl_ratio": "TG/HDL Ratio",
        "triglycerides": "Triglycerides",
        "hdl": "HDL",
        "waist_circumference": "Waist Circumference",
        "systolic": "Systolic BP",
        "diastolic": "Diastolic BP",
        "bmi": "BMI",
        "metabolic_syndrome_score": "Metabolic Syndrome Score",
        "ldl": "LDL",
        "bmi_category": "BMI Category",
        "total_cholesterol": "Total Cholesterol",
        "age": "Age",
        "smoking_encoded": "Smoking Status \\(encoded\\)",
        "activity_encoded": "Physical Activity \\(encoded\\)",
        "alcohol_encoded": "Alcohol Use \\(encoded\\)",
    }

    for row in compute_information_gain_rows():
        feature = str(row["Feature"])
        label = feature_labels.get(feature, re.escape(feature))
        in_model = "Yes" if feature in model_features else "No"
        claims.append(
            ExpectedClaim(
                f"{feature} information gain row",
                line_pattern(
                    [
                        str(int(row["Rank"])),
                        label,
                        ".+?",
                        f"{float(row['Information_Gain']):.6f}",
                        f"{float(row['IG_Percentage']):.2f}%",
                        in_model,
                    ]
                ),
                (
                    f"{row['Rank']} {feature}: IG {float(row['Information_Gain']):.6f}, "
                    f"IG% {float(row['IG_Percentage']):.2f}, in model {in_model}"
                ),
            )
        )

    diana = benchmark["diana"]
    benchmark_rows = [
        (
            "DIANA",
            diana["auc"],
            None,
            diana["sensitivity"],
            diana["specificity"],
        )
    ]
    for row in benchmark["benchmarks"]:
        benchmark_rows.append(
            (
                row["tool"],
                row["auc_mean"],
                row["auc_std"],
                row["sensitivity_mean"],
                row["specificity_mean"],
            )
        )

    benchmark_aliases = {
        "Simple Clinical Model": r"Simple Clinical(?: Model)?",
        "OmniRisk (Approximated)": r"OmniRisk(?: \(Approximated\))?",
    }

    for tool, auc, auc_std, sensitivity, specificity in benchmark_rows:
        tool_pattern = benchmark_aliases.get(tool, re.escape(tool))
        auc_cell = (
            rf"{fmt3(auc)}\s*\(±{fmt3(auc_std)}\)"
            if auc_std is not None
            else rf"{fmt3(auc)}\s*\[{fmt3(diana['auc_ci_low'])}\s*[–-]\s*{fmt3(diana['auc_ci_high'])}\]"
        )
        claims.append(
            ExpectedClaim(
                f"{tool} benchmark row",
                line_pattern(
                    [
                        rf".*{tool_pattern}.*",
                        auc_cell,
                        fmt3(sensitivity),
                        fmt3(specificity),
                        ".+?",
                    ]
                ),
                f"{tool}: AUC {fmt3(auc)}, sensitivity {fmt3(sensitivity)}, specificity {fmt3(specificity)}",
            )
        )

    return claims


def check_document(path: Path, claims: list[ExpectedClaim]) -> list[CheckIssue]:
    text = path.read_text(encoding="utf-8")
    issues: list[CheckIssue] = []
    for claim in claims:
        if not re.search(claim.pattern, text, flags=re.IGNORECASE | re.MULTILINE):
            issues.append(CheckIssue(path=path, label=claim.label, expected=claim.expected))
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "docs",
        nargs="*",
        type=Path,
        default=DEFAULT_DOCS,
        help="Markdown drafts to check",
    )
    args = parser.parse_args()

    claims = expected_claims()
    all_issues: list[CheckIssue] = []
    for doc in args.docs:
        path = doc if doc.is_absolute() else PROJECT_ROOT / doc
        if not path.exists():
            all_issues.append(CheckIssue(path=path, label="document exists", expected="file present"))
            continue
        all_issues.extend(check_document(path, claims))

    print("=" * 72)
    print("DIANA THESIS METRICS CONSISTENCY CHECK")
    print("=" * 72)
    print(f"Canonical artifacts: {RESULTS_DIR.relative_to(PROJECT_ROOT)}")
    print(f"Documents checked: {len(args.docs)}")
    print(f"Claims checked per document: {len(claims)}")

    if all_issues:
        print("\nStatus: FAIL")
        for issue in all_issues:
            rel = issue.path.relative_to(PROJECT_ROOT) if issue.path.is_absolute() else issue.path
            print(f"  - {rel}: {issue.label} expected {issue.expected}")
        return 1

    print("\nStatus: PASS")
    print("All checked manuscript metrics match the binary_v2_no_bp artifacts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
