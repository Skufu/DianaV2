#!/usr/bin/env python3
"""
Defensibility artifact verifier for binary_v2_no_bp.

This script does NOT generate synthetic metrics. It only validates that
evaluation artifacts produced by Ian_ML/training/train_binary_v2_no_bp.py are present and
internally consistent.
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MODELS_DIR = Path("models/binary_v2_no_bp")
RESULTS_DIR = MODELS_DIR / "results"
SUMMARY_PATH = RESULTS_DIR / "defensibility_validation_summary.json"

REQUIRED_ARTIFACTS = [
    "best_model_report.json",
    "logo_fold_metrics.csv",
    "threshold.json",
    "calibration_report.json",
    "cluster_analysis.json",
    "cluster_profiles.csv",
    "benchmark_comparison.json",
    "inference_benchmark.json",
]


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def check_required_files() -> tuple[list[str], list[str]]:
    found: list[str] = []
    missing: list[str] = []
    for filename in REQUIRED_ARTIFACTS:
        p = RESULTS_DIR / filename
        if p.exists():
            found.append(filename)
        else:
            missing.append(filename)
    return found, missing


def check_logo_fold_metrics(path: Path) -> list[str]:
    issues: list[str] = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = set(reader.fieldnames or [])
        required_cols = {"Fold", "Test_Cycle", "Model", "AUC_ROC"}
        missing_cols = sorted(required_cols - fieldnames)
        if missing_cols:
            issues.append(f"logo_fold_metrics.csv missing columns: {missing_cols}")
            return issues

        rows = list(reader)
        if len(rows) < 5:
            issues.append(
                f"logo_fold_metrics.csv has only {len(rows)} rows (expected >= 5 LOGO folds)"
            )
        cycles = {r.get("Test_Cycle", "").strip() for r in rows if r.get("Test_Cycle")}
        if len(cycles) < 5:
            issues.append(
                f"logo_fold_metrics.csv has only {len(cycles)} unique holdout cycles (expected >= 5)"
            )
    return issues


def check_threshold_consistency(report: dict[str, Any], thresholds: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    report_thresholds = report.get("decision_thresholds", {})
    rep_v = report_thresholds.get("at_risk")
    file_v = thresholds.get("at_risk")
    if rep_v is None or file_v is None:
        issues.append("Missing threshold 'at_risk' in report or threshold.json")
    elif abs(float(rep_v) - float(file_v)) > 1e-12:
        issues.append(f"Threshold mismatch for at_risk: report={rep_v} threshold.json={file_v}")
    return issues


def check_report_sanity(report: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    validation_method = str(report.get("validation_method", ""))
    if "Nested LOGO" not in validation_method:
        issues.append("best_model_report.json validation_method does not declare Nested LOGO")

    auc = report.get("metrics", {}).get("auc_roc")
    if auc is None:
        issues.append("best_model_report.json missing metrics.auc_roc")
    else:
        auc_val = float(auc)
        if auc_val < 0.5 or auc_val > 1.0:
            issues.append(f"best_model_report.json has invalid auc_roc={auc_val}")

    n_features = report.get("n_features")
    if n_features is None:
        issues.append("best_model_report.json missing n_features")
    elif int(n_features) <= 0:
        issues.append(f"best_model_report.json has invalid n_features={n_features}")
    elif int(n_features) != 9:
        issues.append(f"best_model_report.json has n_features={n_features}, expected 9")

    thresholds = report.get("decision_thresholds", {})
    if "at_risk" not in thresholds:
        issues.append("best_model_report.json missing decision_thresholds.at_risk")

    return issues


def check_clustering_consistency() -> list[str]:
    issues: list[str] = []
    cluster_analysis = load_json(RESULTS_DIR / "cluster_analysis.json")
    if int(cluster_analysis.get("k_selected", -1)) != 4:
        issues.append(f"cluster_analysis.json k_selected={cluster_analysis.get('k_selected')} (expected 4)")

    expected_features = {"bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"}
    actual_features = set(cluster_analysis.get("features_used", []))
    if actual_features != expected_features:
        issues.append(
            f"cluster_analysis.json features_used={sorted(actual_features)} "
            f"(expected {sorted(expected_features)})"
        )

    profiles = set(cluster_analysis.get("cluster_profiles", {}).keys())
    expected_profiles = {"SIRD", "SIDD", "MOD", "MARD"}
    if profiles != expected_profiles:
        issues.append(
            f"cluster_analysis.json cluster profiles={sorted(profiles)} "
            f"(expected {sorted(expected_profiles)})"
        )
    return issues


def main() -> int:
    print("=" * 72)
    print("BINARY V2 NO-BP DEFENSIBILITY ARTIFACT VERIFIER")
    print("=" * 72)
    print("This check validates artifacts generated by train_binary_v2_no_bp.py.")
    print("No synthetic metrics are produced by this script.")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    found, missing = check_required_files()

    issues: list[str] = []
    checks: dict[str, Any] = {
        "required_artifacts_found": found,
        "required_artifacts_missing": missing,
    }

    if missing:
        issues.append(
            "Missing required artifacts. Run 'python Ian_ML/training/train_binary_v2_no_bp.py' to regenerate."
        )
    else:
        report = load_json(RESULTS_DIR / "best_model_report.json")
        thresholds = load_json(RESULTS_DIR / "threshold.json")

        report_issues = check_report_sanity(report)
        threshold_issues = check_threshold_consistency(report, thresholds)
        logo_issues = check_logo_fold_metrics(RESULTS_DIR / "logo_fold_metrics.csv")
        clustering_issues = check_clustering_consistency()

        checks["report_sanity_issues"] = report_issues
        checks["threshold_consistency_issues"] = threshold_issues
        checks["logo_fold_metrics_issues"] = logo_issues
        checks["clustering_consistency_issues"] = clustering_issues
        checks["headline_metrics"] = {
            "best_model": report.get("best_model"),
            "auc_roc": report.get("metrics", {}).get("auc_roc"),
            "validation_method": report.get("validation_method"),
            "decision_thresholds": report.get("decision_thresholds"),
        }

        issues.extend(report_issues)
        issues.extend(threshold_issues)
        issues.extend(logo_issues)
        issues.extend(clustering_issues)

    status = "PASS" if not issues else "FAIL"
    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "checks": checks,
        "issues": issues,
        "note": (
            "This verifier checks for scientific traceability of existing artifacts. "
            "It does not compute new evaluation metrics."
        ),
    }

    with SUMMARY_PATH.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\nStatus: {status}")
    print(f"Summary: {SUMMARY_PATH}")
    if issues:
        print("\nIssues:")
        for item in issues:
            print(f"  - {item}")
        return 1

    print("\nAll required defensibility artifacts are present and consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
