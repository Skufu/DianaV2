#!/usr/bin/env python3
"""
Data quality gates for the DianaV2 NHANES lake.

Four gates (fail = exit 1, loud, actionable):

  1. RAW INTEGRITY     — every file in manifest.json hashes to its recorded SHA-256.
  2. COVERAGE          — every file the downloader spec requires exists in raw root
                         (and the manifest on disk is not stale vs the spec).
  3. PROCESSED CSV     — schema, null-rate, value-range, and row-floor checks on the
                         training CSVs. Deliberately does NOT validate
                         diana_dataset_imputed.csv as training input (leakage risk).
  4. LEAKAGE EXCLUSION — asserts the imputed artifact is excluded from training gates.

Usage:
    PYTHONPATH= .venv/bin/python scripts/data/quality_checks.py
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import pandas as pd

RAW_DIR = Path("data/nhanes/raw")
PROCESSED_DIR = Path("data/nhanes/processed")
MANIFEST_FILE = Path("data/nhanes/manifest.json")

# Import the downloader's canonical spec so coverage never drifts.
from download_nhanes_multi import expected_filenames

TRAINING_CSV = "diana_training_data_multi.csv"
LEAKAGE_ARTIFACT = "diana_dataset_imputed.csv"  # must NEVER be a training gate input

MIN_COMBINED_RECORDS = 500
REQUIRED_COLUMNS = [
    "SEQN", "age", "hba1c", "fbs", "bmi", "total_cholesterol", "ldl", "hdl",
    "triglycerides", "systolic", "diastolic", "waist_circumference",
    "fasting_insulin", "family_history_diabetes",
    "smoking_status", "physical_activity", "alcohol_use", "cycle",
]

# Upper bounds on null rates observed in the canonical run (2026-08-09).
# Values above this signal a silently-degraded ingestion (e.g. missing files).
NULL_RATE_LIMITS = {
    "fasting_insulin": 0.40,        # canonical 0.32
    "family_history_diabetes": 0.25,  # canonical 0.193
    "crp": 0.60,                    # canonical 0.483 (HSCRP is optional)
    "bmi": 0.05,
    "systolic": 0.10,
    "diastolic": 0.10,
}

RANGE_LIMITS = {
    "age": (45, 60),
    "hba1c": (3.0, 20.0),
    "fbs": (20.0, 600.0),
    "bmi": (10.0, 100.0),
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def gate_raw_integrity() -> list[str]:
    """Gate 1: on-disk files match manifest hashes."""
    if not MANIFEST_FILE.exists():
        return ["manifest.json missing — run generate_nhanes_manifest.py"]
    manifest = json.loads(MANIFEST_FILE.read_text())
    errors = []
    for rel, meta in manifest["files"].items():
        path = RAW_DIR / rel
        if not path.exists():
            errors.append(f"manifest entry missing on disk: {rel}")
            continue
        actual = sha256(path)
        if actual != meta["sha256"]:
            errors.append(f"SHA-256 mismatch: {rel}")
    return errors


def gate_coverage(skip_raw: bool = False) -> list[str]:
    """Gate 2: downloader spec fully covered in raw root; manifest fresh."""
    errors = []
    if not skip_raw:
        on_disk = {p.name for p in RAW_DIR.glob("*.XPT")}
        for name in expected_filenames():
            if name not in on_disk:
                errors.append(f"REQUIRED file missing from raw root: {name}")
    else:
        # CI mode: raw lake is not git-tracked (fetched by downloader).
        # Still verify expected names are recorded in the manifest.
        pass

    # Manifest freshness: every expected file must appear in the manifest.
    if MANIFEST_FILE.exists():
        manifest = json.loads(MANIFEST_FILE.read_text())
        manifest_files = set(manifest["files"])
        for name in expected_filenames():
            if name not in manifest_files:
                errors.append(f"manifest stale — {name} not in manifest (regen: generate_nhanes_manifest.py)")
    else:
        errors.append("manifest.json missing — run generate_nhanes_manifest.py")
    return errors


def gate_processed_csv() -> list[str]:
    """Gate 3: schema, null rates, ranges, row floor on the training CSV."""
    path = PROCESSED_DIR / TRAINING_CSV
    if not path.exists():
        return [f"training CSV missing: {path}"]
    df = pd.read_csv(path)
    errors = []

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        errors.append(f"schema drift — missing columns: {missing_cols}")
        return errors

    if len(df) < MIN_COMBINED_RECORDS:
        errors.append(f"row floor — {len(df)} rows < {MIN_COMBINED_RECORDS}")

    null_rates = df.isna().mean()
    for col, limit in NULL_RATE_LIMITS.items():
        if col not in df.columns:
            continue  # optional feature (e.g. crp/HSCRP) — not a schema violation
        rate = null_rates.get(col, 1.0)
        if rate > limit:
            errors.append(f"null rate {col}: {rate:.1%} > limit {limit:.0%} (silent degradation?)")

    for col, (lo, hi) in RANGE_LIMITS.items():
        if col not in df.columns:
            continue
        vals = df[col].dropna()
        if vals.empty:
            continue
        if vals.min() < lo or vals.max() > hi:
            errors.append(f"range {col}: [{vals.min()}, {vals.max()}] outside [{lo}, {hi}]")
    return errors


def gate_leakage_exclusion() -> list[str]:
    """Gate 4: the imputed artifact is never validated as a training input."""
    errors = []
    if (PROCESSED_DIR / LEAKAGE_ARTIFACT).exists():
        # Present on disk is fine; it must simply not be part of this gate set.
        pass
    # Explicit assertion of the exclusion contract.
    if TRAINING_CSV == LEAKAGE_ARTIFACT:
        errors.append("misconfiguration — imputed artifact is the training CSV")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="DianaV2 NHANES data quality gates")
    parser.add_argument("--skip-raw", action="store_true",
                        help="skip on-disk raw checks (CI mode: raw lake is not git-tracked)")
    args = parser.parse_args()

    print("=" * 60)
    print("DianaV2 NHANES Data Quality Gates" + (" (CI mode: --skip-raw)" if args.skip_raw else ""))
    print("=" * 60)
    failed = False
    gates: list[tuple[str, object]] = [
        ("RAW INTEGRITY", gate_raw_integrity),
        ("COVERAGE", gate_coverage),
        ("PROCESSED CSV", gate_processed_csv),
        ("LEAKAGE EXCLUSION", gate_leakage_exclusion),
    ]
    for name, fn in gates:
        if args.skip_raw and name == "RAW INTEGRITY":
            print(f"\n[SKIP] {name} (CI mode)")
            continue
        if args.skip_raw and name == "COVERAGE":
            errors = fn(skip_raw=True)  # type: ignore[operator]
        else:
            errors = fn()  # type: ignore[operator]
        if errors:
            failed = True
            print(f"\n[FAIL] {name}")
            for e in errors:
                print(f"  - {e}")
        else:
            print(f"\n[PASS] {name}")
    print("\n" + "=" * 60)
    if failed:
        print("RESULT: FAIL (see errors above)")
        return 1
    print("RESULT: ALL GATES PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
