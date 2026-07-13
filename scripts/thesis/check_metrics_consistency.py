#!/usr/bin/env python3
"""Check the canonical thesis draft against frozen model and revision artifacts.

This checker validates manuscript text against generated artifacts, including
the corrected post-defense missing-aware Information Gain audit. It does not
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

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = PROJECT_ROOT / "models" / "binary_v2_no_bp" / "results"
CORE_RETEST_RESULTS_DIR = (
    PROJECT_ROOT
    / "docs"
    / "07-research"
    / "model-experiments"
    / "core-retrain-20260712"
    / "results"
)
EVIDENCE_DIR = PROJECT_ROOT / "docs" / "07-research" / "minor-revision-evidence"
MODEL_EXPERIMENT_DIR = PROJECT_ROOT / "docs" / "07-research" / "model-experiments"
DEFAULT_DOCS = [
    PROJECT_ROOT
    / "docs"
    / "07-research"
    / "thesis-drafts"
    / "ch3+4-final-academic-draft.md",
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


def expected_claims() -> list[ExpectedClaim]:
    report = load_json(CORE_RETEST_RESULTS_DIR / "best_model_report.json")
    benchmark = load_json(RESULTS_DIR / "benchmark_comparison.json")
    calibration = load_json(RESULTS_DIR / "calibration_report.json")
    inference = load_json(RESULTS_DIR / "inference_benchmark.json")
    fold_rows = load_csv_rows(CORE_RETEST_RESULTS_DIR / "logo_fold_metrics.csv")
    corrected_ig_rows = load_csv_rows(EVIDENCE_DIR / "information_gain_missingness_audit.csv")
    model_summary_rows = load_csv_rows(EVIDENCE_DIR / "model_selection_summary.csv")
    expanded_rows = load_csv_rows(
        MODEL_EXPERIMENT_DIR / "expanded-non-circular" / "feature_set_comparison.csv"
    )
    expanded_imputer_rows = load_csv_rows(
        MODEL_EXPERIMENT_DIR
        / "expanded-non-circular"
        / "fold_fitted_imputer_statistics.csv"
    )
    k_scan_rows = load_csv_rows(
        MODEL_EXPERIMENT_DIR / "unlabeled-centroids" / "k_scan_all.csv"
    )
    expanded_centroid_rows = load_csv_rows(
        MODEL_EXPERIMENT_DIR
        / "unlabeled-centroids"
        / "expanded8_recent_equal"
        / "centroids_raw.csv"
    )

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
            rf"\((?:conditional\s+)?95% (?:CI|confidence interval \[CI\]):\s*"
            rf"{range_pattern(fmt3(auc_low), fmt3(auc_high))}\)",
            f"AUC {fmt3(metrics['auc_roc'])} [{fmt3(auc_low)}-{fmt3(auc_high)}]",
        ),
        ExpectedClaim(
            "headline sensitivity and CI",
            rf"(?:sensitivity of|sensitivity was) {number_pattern(fmt3(metrics['sensitivity']))}\s*"
            rf"\((?:conditional\s+)?95% CI:\s*{range_pattern(fmt3(sens_low), fmt3(sens_high))}\)",
            f"sensitivity {fmt3(metrics['sensitivity'])} [{fmt3(sens_low)}-{fmt3(sens_high)}]",
        ),
        ExpectedClaim(
            "headline threshold",
            line_pattern(["Mean of six fold-specific thresholds; deployment cutoff", number_pattern(fmt3(threshold))]),
            f"threshold {fmt3(threshold)}",
        ),
        ExpectedClaim(
            "headline specificity",
            rf"Specificity was {number_pattern(fmt3(metrics['specificity']))}",
            f"specificity {fmt3(metrics['specificity'])}",
        ),
        ExpectedClaim(
            "headline F1",
            rf"F1 (?:score of|was) {number_pattern(fmt3(metrics['f1']))}",
            f"F1 {fmt3(metrics['f1'])}",
        ),
        ExpectedClaim(
            "fold AUC range",
            rf"fold-level AUC (?:range of|ranged from) {number_pattern(fmt3(min(fold_auc_values)))}\s*(?:to|[–-])\s*"
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
            "threshold fallback fold count",
            rf"(?:specificity-collapse\s+)?nearest-feasible (?:threshold fallback|guardrail) was "
            rf"(?:activated|selected) in {number_pattern(str(guardrail_count))}\s+of\s+"
            rf"{number_pattern(str(len(best_fold_rows)))}(?:\s+LOGO)? folds",
            f"{guardrail_count} of {len(best_fold_rows)} threshold-fallback folds",
        ),
        ExpectedClaim(
            "Youden threshold mode table row",
            line_pattern(["Youden's J", f"{threshold_counts['youden']}/{len(best_fold_rows)}", ".+?"]),
            f"Youden's J {threshold_counts['youden']}/{len(best_fold_rows)}",
        ),
        ExpectedClaim(
            "severe-shift threshold floor table row",
            line_pattern(
                [
                    "(?:Severe-Shift )?Threshold Shift Floor|Severe-Shift Threshold Floor",
                    f"{threshold_counts['guardrail_shift_floor']}/{len(best_fold_rows)}",
                    ".+?",
                ]
            ),
            f"Severe-Shift Threshold Floor {threshold_counts['guardrail_shift_floor']}/{len(best_fold_rows)}",
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
                    number_pattern(f"{calibration['hosmer_lemeshow_statistic']:.2f}")
                    + r"[^|]*",
                    ".+?",
                ]
            ),
            f"Hosmer-Lemeshow {calibration['hosmer_lemeshow_statistic']:.2f}",
        ),
        ExpectedClaim(
            "LR inference latency",
            rf"(?:Logistic Regression averages (?:approximately\s+)?"
            rf"{ms_pattern(inference['results']['Logistic Regression']['mean_ms'])}|"
            rf"{ms_pattern(inference['results']['Logistic Regression']['mean_ms'])} for (?:the saved )?Logistic Regression)",
            f"LR inference {inference['results']['Logistic Regression']['mean_ms']:.2f} ms",
        ),
        ExpectedClaim(
            "RF inference latency",
            rf"(?:Random Forest averages (?:approximately\s+)?"
            rf"{ms_pattern(inference['results']['Random Forest']['mean_ms'])}|"
            rf"{ms_pattern(inference['results']['Random Forest']['mean_ms'])} for (?:a separately fitted )?Random Forest)",
            f"RF inference {inference['results']['Random Forest']['mean_ms']:.2f} ms",
        ),
        ExpectedClaim(
            "LightGBM inference latency",
            rf"(?:LightGBM averages (?:approximately\s+)?"
            rf"{ms_pattern(inference['results']['LightGBM']['mean_ms'])}|"
            rf"{ms_pattern(inference['results']['LightGBM']['mean_ms'])} for (?:a separately fitted )?LightGBM)",
            f"LightGBM inference {inference['results']['LightGBM']['mean_ms']:.2f} ms",
        ),
    ]

    summary_by_model = {row["model"]: row for row in model_summary_rows}
    fold_wins: Counter[str] = Counter()
    rows_by_fold: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in fold_rows:
        rows_by_fold[row["Fold"]].append(row)
    for rows in rows_by_fold.values():
        best_auc = max(float(row["AUC_ROC"]) for row in rows)
        for row in rows:
            if abs(float(row["AUC_ROC"]) - best_auc) < 1e-12:
                fold_wins[row["Model"]] += 1

    for model in ["Logistic Regression", "Random Forest", "XGBoost", "LightGBM"]:
        if model not in fold_summary or model not in summary_by_model:
            continue
        model_row = summary_by_model[model]
        threshold_mean = fold_summary[model]["Threshold"]
        claims.append(
            ExpectedClaim(
                f"{model} mean fold comparison row",
                line_pattern(
                    [
                        re.escape(model),
                        rf"{float(model_row['auc_mean']):.4f}\s*±\s*{float(model_row['auc_sd']):.4f}",
                        f"{float(model_row['sensitivity_mean']):.4f}",
                        f"{float(model_row['specificity_mean']):.4f}",
                        f"{float(model_row['f1_mean']):.4f}",
                        str(fold_wins[model]),
                        fmt3(threshold_mean),
                    ]
                ),
                (
                    f"{model}: AUC {float(model_row['auc_mean']):.4f} ± "
                    f"{float(model_row['auc_sd']):.4f}, sens "
                    f"{float(model_row['sensitivity_mean']):.4f}, spec "
                    f"{float(model_row['specificity_mean']):.4f}, F1 "
                    f"{float(model_row['f1_mean']):.4f}, wins {fold_wins[model]}, "
                    f"threshold {fmt3(threshold_mean)}"
                ),
            )
        )

    for row in corrected_ig_rows:
        feature = row["feature"]
        label = row["feature_label"]
        rank = int(row["corrected_rank"])
        missing_pct = float(row["missing_pct"])
        conditional_entropy = float(row["conditional_entropy_h_y_given_x"])
        information_gain = float(row["corrected_ig_missing_as_category"])
        ig_pct = float(row["corrected_ig_pct_of_h_y"])
        decision = row["decision"]
        claims.append(
            ExpectedClaim(
                f"{feature} corrected information gain row",
                line_pattern(
                    [
                        str(rank),
                        re.escape(label),
                        f"{missing_pct:.1f}%",
                        f"{conditional_entropy:.4f}",
                        f"{information_gain:.4f}",
                        f"{ig_pct:.2f}%",
                        re.escape(decision),
                        ".+?",
                    ]
                ),
                (
                    f"{rank} {feature}: missing {missing_pct:.1f}%, "
                    f"H(Y|X) {conditional_entropy:.4f}, IG {information_gain:.4f}, "
                    f"IG% {ig_pct:.2f}, decision {decision}"
                ),
            )
        )

    expanded_labels = {
        ("all_cycles", "baseline_9"): "All cycles: current-content baseline \\(9\\)",
        ("all_cycles", "expanded_all_15"): "All cycles: expanded complete \\(15\\)",
        ("all_cycles", "expanded_minus_crp"): "All cycles: expanded minus CRP \\(14\\)",
        ("all_cycles", "expanded_minus_insulin"): "All cycles: expanded minus fasting insulin \\(14\\)",
        ("all_cycles", "expanded_minus_total_cholesterol"): "All cycles: expanded minus total cholesterol \\(14\\)",
        ("all_cycles", "expanded_minus_bmi"): "All cycles: expanded minus BMI \\(14\\)",
        ("all_cycles", "expanded_minus_waist"): "All cycles: expanded minus waist \\(14\\)",
        ("crp_assayed_cycles", "expanded_all_15"): "CRP-assayed cycles: expanded complete \\(15\\)",
        ("crp_assayed_cycles", "expanded_minus_crp"): "CRP-assayed cycles: expanded minus CRP \\(14\\)",
    }
    for row in expanded_rows:
        key = (row["cohort"], row["feature_set"])
        if key not in expanded_labels:
            continue
        claims.append(
            ExpectedClaim(
                f"expanded feature row {row['cohort']} {row['feature_set']}",
                line_pattern(
                    [
                        expanded_labels[key],
                        f"{int(row['n']):,}",
                        rf"{float(row['mean_fold_roc_auc']):.4f}\s*±\s*"
                        rf"{float(row['sd_fold_roc_auc']):.4f}",
                        f"{float(row['aggregate_roc_auc']):.4f}",
                        f"{float(row['aggregate_pr_auc']):.4f}",
                        f"{float(row['aggregate_brier']):.4f}",
                        ".+?",
                    ]
                ),
                (
                    f"{key}: mean AUC {float(row['mean_fold_roc_auc']):.4f} ± "
                    f"{float(row['sd_fold_roc_auc']):.4f}, aggregate ROC "
                    f"{float(row['aggregate_roc_auc']):.4f}, PR "
                    f"{float(row['aggregate_pr_auc']):.4f}, Brier "
                    f"{float(row['aggregate_brier']):.4f}"
                ),
            )
        )

    baseline_imputers = [
        row
        for row in expanded_imputer_rows
        if row["cohort"] == "all_cycles" and row["feature_set"] == "baseline_9"
    ]
    bmi_medians = [float(row["median_bmi"]) for row in baseline_imputers]
    waist_medians = [float(row["median_waist_circumference"]) for row in baseline_imputers]
    claims.append(
        ExpectedClaim(
            "outer-fold BMI and waist imputer ranges",
            rf"BMI medians ranged from {min(bmi_medians):.2f} to {max(bmi_medians):.2f} kg/m² "
            rf"and waist medians from {min(waist_medians):.1f} to {max(waist_medians):.1f} cm",
            (
                f"BMI medians {min(bmi_medians):.2f}-{max(bmi_medians):.2f}; "
                f"waist medians {min(waist_medians):.1f}-{max(waist_medians):.1f}"
            ),
        )
    )

    k_labels = {
        "core6_all_equal": "Core 6, all records, equal weights",
        "core6_operational_positive_weighted": (
            "Core 6, operational-positive, current weights"
        ),
        "expanded8_recent_equal": (
            "Core 6 \\+ insulin \\+ CRP, assayed cycles, equal weights"
        ),
    }
    k_ranges = {
        "core6_all_equal": "2-20",
        "core6_operational_positive_weighted": "2-20",
        "expanded8_recent_equal": "2-15",
    }
    for specification, table_label in k_labels.items():
        spec_rows = [row for row in k_scan_rows if row["specification"] == specification]
        k2 = next(row for row in spec_rows if int(row["k"]) == 2)
        k4 = next(row for row in spec_rows if int(row["k"]) == 4)
        summary = load_json(
            MODEL_EXPERIMENT_DIR
            / "unlabeled-centroids"
            / specification
            / "summary.json"
        )
        claims.append(
            ExpectedClaim(
                f"anonymous K scan summary {specification}",
                line_pattern(
                    [
                        table_label,
                        f"{int(summary['n']):,}",
                        k_ranges[specification],
                        f"{float(summary['hopkins_median']):.3f}",
                        rf"2 \({float(k2['silhouette']):.4f}\)",
                        rf"2 \({float(k2['bootstrap_ari_median']):.4f}\)",
                        f"{float(k4['bootstrap_ari_median']):.4f}",
                        ".+?",
                    ]
                ),
                (
                    f"{specification}: n={summary['n']}, Hopkins "
                    f"{float(summary['hopkins_median']):.3f}, K2 silhouette "
                    f"{float(k2['silhouette']):.4f}, K2 bootstrap ARI "
                    f"{float(k2['bootstrap_ari_median']):.4f}, K4 bootstrap ARI "
                    f"{float(k4['bootstrap_ari_median']):.4f}"
                ),
            )
        )

    for row in expanded_centroid_rows:
        if int(row["k"]) != 5:
            continue
        claims.append(
            ExpectedClaim(
                f"expanded anonymous centroid {row['centroid_id']}",
                line_pattern(
                    [
                        re.escape(row["centroid_id"]),
                        rf"{int(row['n'])} \({float(row['share_percent']):.1f}%\)",
                        f"{float(row['centroid_bmi']):.2f}",
                        f"{float(row['centroid_triglycerides']):.2f}",
                        f"{float(row['centroid_ldl']):.2f}",
                        f"{float(row['centroid_hdl']):.2f}",
                        f"{float(row['centroid_age']):.2f}",
                        f"{float(row['centroid_waist_circumference']):.2f}",
                        f"{float(row['centroid_fasting_insulin']):.2f}",
                        f"{float(row['centroid_crp']):.2f}",
                    ]
                ),
                f"{row['centroid_id']} raw expanded K5 centroid",
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
        uncertainty_cell = (
            rf"Fold SD {fmt3(auc_std)}"
            if auc_std is not None
            else rf"Conditional row-bootstrap 95% CI "
            rf"{fmt3(diana['auc_ci_low'])}\s*[–-]\s*{fmt3(diana['auc_ci_high'])}"
        )
        claims.append(
            ExpectedClaim(
                f"{tool} benchmark row",
                line_pattern(
                    [
                        rf".*{tool_pattern}.*",
                        fmt3(auc),
                        uncertainty_cell,
                        ".+?",
                    ]
                ),
                f"{tool}: AUC {fmt3(auc)} with labeled uncertainty summary",
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
    print(
        "Core retrain artifacts: "
        f"{CORE_RETEST_RESULTS_DIR.relative_to(PROJECT_ROOT)}"
    )
    print(f"Ancillary active artifacts: {RESULTS_DIR.relative_to(PROJECT_ROOT)}")
    print(f"Documents checked: {len(args.docs)}")
    print(f"Claims checked per document: {len(claims)}")

    if all_issues:
        print("\nStatus: FAIL")
        for issue in all_issues:
            rel = issue.path.relative_to(PROJECT_ROOT) if issue.path.is_absolute() else issue.path
            print(f"  - {rel}: {issue.label} expected {issue.expected}")
        return 1

    print("\nStatus: PASS")
    print("All checked manuscript metrics match the canonical and revision evidence artifacts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
