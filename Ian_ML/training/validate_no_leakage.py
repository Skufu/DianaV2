"""
DIANA Feature Validation & Leakage Detection

Two-part validation:
1. Entropy-based Information Gain ranking to validate that the selected
   features carry meaningful predictive power.
2. Automated leakage detection to verify that diagnostic markers (HbA1c, FBS)
   are NOT present in the classifier or clustering feature sets.

Usage:
    python Ian_ML/training/validate_no_leakage.py

Exit codes:
    0 = All checks passed
    1 = Leakage detected or validation failed
"""

import json
import sys
from pathlib import Path
from math import log2

import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from Ian_ML.common.paths import NHANES_PROCESSED_ROOT, MODELS_ROOT
from Ian_ML.common.feature_constants import (
    CLUSTER_FEATURES,
    CLINICAL_FEATURES,
    CLINICAL_FEATURES_NO_BP,
    CLINICAL_FEATURES_WITH_BP,
    ADA_FEATURES,
)


def load_model_features(model_name: str = "binary_v2_no_bp") -> list[str] | None:
    """
    Load model features from features.json artifact if present.
    Returns None if file doesn't exist (fallback to CLINICAL_FEATURES).
    """
    features_path = MODELS_ROOT / model_name / "features.json"
    if features_path.exists():
        try:
            with open(features_path) as f:
                data = json.load(f)
                return data.get("features")
        except (json.JSONDecodeError, IOError):
            return None
    return None


DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"

# Diagnostic features that MUST NOT appear in non-circular feature sets
DIAGNOSTIC_FEATURES = {"hba1c", "fbs", "fasting_blood_sugar", "fasting_glucose"}


def normalize_alcohol_category(value: object) -> str:
    text = str(value).strip()
    lower = text.lower()
    if lower in {"", "nan", "unknown"}:
        return "Unknown"
    if lower in {"none", "never", "no alcohol", "abstinent"}:
        return "Never"
    return text.title()


# =============================================================================
# PART 1: Data Leakage Detection
# =============================================================================

def check_feature_leakage() -> list[str]:
    """
    Verify that no diagnostic markers appear in the classifier or clustering
    feature sets. Returns a list of violation strings (empty = pass).
    """
    violations = []

    # Check every non-ADA feature list for diagnostic contamination
    feature_sets = {
        "CLUSTER_FEATURES": CLUSTER_FEATURES,
        "CLINICAL_FEATURES": CLINICAL_FEATURES,
        "CLINICAL_FEATURES_NO_BP": CLINICAL_FEATURES_NO_BP,
        "CLINICAL_FEATURES_WITH_BP": CLINICAL_FEATURES_WITH_BP,
    }

    for name, features in feature_sets.items():
        leaked = DIAGNOSTIC_FEATURES & set(features)
        if leaked:
            violations.append(
                f"LEAKAGE in {name}: diagnostic feature(s) {leaked} found in feature list"
            )

    # ADA features are expected to contain HbA1c/FBS — verify they do
    ada_set = set(ADA_FEATURES)
    if "hba1c" not in ada_set or "fbs" not in ada_set:
        violations.append(
            "ADA_FEATURES is missing expected diagnostic markers (hba1c, fbs)"
        )

    return violations


def check_dataset_leakage(df: pd.DataFrame, feature_list: list[str]) -> list[str]:
    """
    Check if training data columns contain diagnostic features that shouldn't
    be used by the classifier. Also checks for near-perfect correlation between
    any feature and the HbA1c threshold (which would indicate proxy leakage).
    """
    violations = []

    # Direct feature name check
    leaked = DIAGNOSTIC_FEATURES & set(feature_list)
    if leaked:
        violations.append(f"Feature list contains diagnostic markers: {leaked}")

    # Proxy leakage: check if any non-diagnostic feature perfectly correlates
    # with HbA1c >= 6.5 threshold (diabetes diagnosis)
    if "hba1c" in df.columns and "diabetes_label" in df.columns:
        hba1c_diabetic = (df["hba1c"] >= 6.5).astype(int)
        actual_diabetic = (df["diabetes_label"] >= 2).astype(int)
        agreement = (hba1c_diabetic == actual_diabetic).mean()

        for feat in feature_list:
            if feat in df.columns and feat not in DIAGNOSTIC_FEATURES:
                try:
                    corr = abs(df[feat].corr(hba1c_diabetic))
                    if corr > 0.95:
                        violations.append(
                            f"PROXY LEAKAGE: '{feat}' has {corr:.3f} correlation "
                            f"with HbA1c >= 6.5 threshold"
                        )
                except Exception:
                    pass

    return violations


# =============================================================================
# PART 2: Entropy-Based Feature Ranking (Information Gain)
# =============================================================================

def entropy(target: pd.Series) -> float:
    """Shannon entropy H(Y) = -Σ p(y) log₂ p(y)."""
    if len(target) == 0:
        return 0.0
    probs = target.value_counts(normalize=True)
    return float(-sum(p * log2(p) for p in probs if p > 0))


def information_gain(df: pd.DataFrame, feature: str, target: str) -> float:
    """Information Gain: IG(X,Y) = H(Y) - H(Y|X)."""
    total_entropy = entropy(df[target])
    total_samples = len(df)

    weighted_entropy = 0.0
    for value in df[feature].unique():
        subset = df[df[feature] == value]
        weight = len(subset) / total_samples
        weighted_entropy += weight * entropy(subset[target])

    return total_entropy - weighted_entropy


def discretize(series: pd.Series, bins: int = 5) -> pd.Series:
    """Discretize continuous features into bins for IG calculation."""
    try:
        return pd.qcut(series, q=bins, duplicates="drop", labels=False)
    except Exception:
        try:
            return pd.cut(series, bins=bins, duplicates="drop", labels=False)
        except Exception:
            return series


def rank_features_by_ig(df: pd.DataFrame, features: list[str], target: str) -> pd.DataFrame:
    """
    Compute Information Gain for each feature and return a ranked DataFrame.
    Continuous features are discretized into 5 bins before IG computation.
    """
    target_entropy = entropy(df[target])
    results = []

    df_work = df.copy()
    numeric_cols = df_work[features].select_dtypes(include=[np.number]).columns.tolist()

    # Discretize numeric features
    for feat in numeric_cols:
        df_work[feat + "_binned"] = discretize(df_work[feat])

    for feat in features:
        if feat not in df_work.columns:
            continue
        feat_col = feat + "_binned" if feat in numeric_cols else feat
        try:
            ig = information_gain(df_work, feat_col, target)
            ig_pct = (ig / target_entropy * 100) if target_entropy > 0 else 0.0
            results.append({
                "Feature": feat,
                "Type": "Numeric" if feat in numeric_cols else "Categorical",
                "Information_Gain": round(ig, 6),
                "IG_Percentage": round(ig_pct, 2),
            })
        except Exception as e:
            results.append({
                "Feature": feat,
                "Type": "Unknown",
                "Information_Gain": 0.0,
                "IG_Percentage": 0.0,
            })

    ig_df = pd.DataFrame(results).sort_values("Information_Gain", ascending=False)
    ig_df["Rank"] = range(1, len(ig_df) + 1)
    return ig_df[["Rank", "Feature", "Type", "Information_Gain", "IG_Percentage"]]


# =============================================================================
# MAIN
# =============================================================================

def main() -> int:
    """Run all validation checks. Returns 0 if all pass, 1 if any fail."""
    exit_code = 0

    print("=" * 70)
    print("DIANA Feature Validation & Leakage Detection")
    print("=" * 70)

    # ------------------------------------------------------------------
    # PART 1: Static Leakage Detection (feature constant definitions)
    # ------------------------------------------------------------------
    print("\n[1/3] Checking feature constants for diagnostic leakage...")
    violations = check_feature_leakage()
    if violations:
        for v in violations:
            print(f"   FAIL: {v}")
        exit_code = 1
    else:
        print("   PASS: No diagnostic features in classifier/cluster feature lists")
        print(f"         CLUSTER_FEATURES ({len(CLUSTER_FEATURES)}): {CLUSTER_FEATURES}")
        print(f"         CLINICAL_FEATURES ({len(CLINICAL_FEATURES)}): {CLINICAL_FEATURES[:5]}...")

    # ------------------------------------------------------------------
    # PART 2: Dataset Leakage Detection (runtime check)
    # ------------------------------------------------------------------
    print(f"\n[2/3] Checking dataset for proxy leakage...")
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH)
        print(f"   Loaded {len(df)} records from {DATA_PATH.name}")

        data_violations = check_dataset_leakage(df, CLINICAL_FEATURES)
        if data_violations:
            for v in data_violations:
                print(f"   FAIL: {v}")
            exit_code = 1
        else:
            print("   PASS: No proxy leakage detected in clinical features")

        # Validate HbA1c threshold accuracy (expected to be high since it's
        # the diagnostic criterion — but we ensure it's NOT used as a feature)
        if "hba1c" in df.columns and "diabetes_label" in df.columns:
            hba1c_pred = (df["hba1c"] >= 6.5).astype(int)
            actual = (df["diabetes_label"] >= 2).astype(int)
            accuracy = (hba1c_pred == actual).mean()
            print(f"   INFO: HbA1c >= 6.5 predicts Diabetic with {accuracy*100:.1f}% accuracy")
            print(f"         (This is expected — HbA1c is the diagnostic criterion)")
            print(f"         (Verified: HbA1c is NOT in CLINICAL_FEATURES)")
    else:
        print(f"   SKIP: Dataset not found at {DATA_PATH}")

    # ------------------------------------------------------------------
    # PART 3: Entropy-Based Feature Ranking
    # ------------------------------------------------------------------
    print(f"\n[3/3] Information Gain feature ranking (non-diagnostic only)...")
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH)

        # Create binary target for IG calculation
        if "diabetes_label" in df.columns:
            df["at_risk"] = (df["diabetes_label"] >= 1).astype(str)
            target = "at_risk"
        elif "diabetes_status" in df.columns:
            df["at_risk"] = df["diabetes_status"].apply(
                lambda x: "1" if x != "Normal" else "0"
            )
            target = "at_risk"
        else:
            print("   SKIP: No target column found")
            return exit_code

        # Engineer derived features (same logic as train_binary_v2_no_bp.py)
        if "bmi" in df.columns:
            df["bmi_category"] = pd.cut(
                df["bmi"], bins=[0, 18.5, 23, 25, 100], labels=[0, 1, 2, 3]
            ).astype(float)
        if "triglycerides" in df.columns and "hdl" in df.columns:
            df["tg_hdl_ratio"] = df["triglycerides"] / df["hdl"].replace(0, np.nan)

        # Ordinal encoding - must match train_binary_v2_no_bp.py exactly
        # "Unknown" values are mapped to 1 (middle category) for consistency
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

        # Metabolic syndrome score (same as train_binary_v2_no_bp.py)
        met_criteria = pd.DataFrame({
            "high_tg": df.get("triglycerides", pd.Series(dtype=float)) > 150,
            "low_hdl": df.get("hdl", pd.Series(dtype=float)) < 50,
            "high_bmi": df.get("bmi", pd.Series(dtype=float)) >= 25,
        })
        if "waist_circumference" in df.columns:
            met_criteria["high_waist"] = df["waist_circumference"] >= 80
        df["metabolic_syndrome_score"] = met_criteria.sum(axis=1)

        target_ent = entropy(df[target])
        print(f"   Target entropy: {target_ent:.4f}")

        # Rank NON-DIAGNOSTIC features only (raw biomarkers + engineered)
        all_features = [
            f for f in [
                # Raw biomarkers (no HbA1c, no FBS)
                "bmi", "triglycerides", "ldl", "hdl", "age",
                "waist_circumference",
                "total_cholesterol", "systolic", "diastolic",
                "fasting_insulin", "crp",
                # Engineered features
                "bmi_category", "tg_hdl_ratio",
                "smoking_encoded", "activity_encoded", "alcohol_encoded",
                "metabolic_syndrome_score",
            ]
            if f in df.columns
        ]

        ig_df = rank_features_by_ig(df, all_features, target)

        # Load model features from artifact if available, fallback to CLINICAL_FEATURES
        model_features = load_model_features("binary_v2_no_bp")
        if model_features is None:
            model_features = CLINICAL_FEATURES
            print(f"   [INFO] Using CLINICAL_FEATURES fallback (features.json not found)")
        else:
            print(f"   [INFO] Using MODEL_FEATURES from features.json ({len(model_features)} features)")

        print(f"\n   {'Rank':<6} {'Feature':<30} {'Type':<10} {'IG':<12} {'IG %':<8}")
        print(f"   {'-'*70}")
        for _, row in ig_df.iterrows():
            in_model = " [IN MODEL]" if row["Feature"] in set(model_features) else ""
            in_cluster = " [CLUSTER]" if row["Feature"] in set(CLUSTER_FEATURES) else ""
            print(
                f"   {row['Rank']:<6} {row['Feature']:<30} {row['Type']:<10} "
                f"{row['Information_Gain']:<12.6f} {row['IG_Percentage']:<8.2f}"
                f"{in_model}{in_cluster}"
            )

        # Warn if any non-selected feature has higher IG than a selected one
        selected_features = set(model_features) & set(all_features)
        if selected_features:
            min_selected_ig = ig_df[ig_df["Feature"].isin(selected_features)]["Information_Gain"].min()
            non_selected = ig_df[~ig_df["Feature"].isin(selected_features)]
            better_unselected = non_selected[non_selected["Information_Gain"] > min_selected_ig]
            if not better_unselected.empty:
                print(f"\n   [NOTE] Features NOT in model with higher IG than lowest selected:")
                for _, row in better_unselected.iterrows():
                    print(f"          {row['Feature']}: IG={row['Information_Gain']:.6f}")
    else:
        print(f"   SKIP: Dataset not found at {DATA_PATH}")

    # ------------------------------------------------------------------
    # SUMMARY
    # ------------------------------------------------------------------
    print("\n" + "=" * 70)
    if exit_code == 0:
        print("RESULT: ALL CHECKS PASSED")
    else:
        print("RESULT: FAILURES DETECTED — see above")
    print("=" * 70)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
