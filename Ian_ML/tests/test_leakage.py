"""
Automated leakage detection tests for DIANA ML pipeline.

These tests verify at the code level that diagnostic features (HbA1c, FBS)
are never included in the non-circular feature sets used by the classifier
and clustering models.

Run: pytest Ian_ML/tests/test_leakage.py -v
"""

import pytest

from Ian_ML.common.feature_constants import (
    CLUSTER_FEATURES,
    CLINICAL_FEATURES,
    CLINICAL_FEATURES_NO_BP,
    CLINICAL_FEATURES_WITH_BP,
    ADA_FEATURES,
)


# Diagnostic features that must NEVER appear in non-circular feature sets
DIAGNOSTIC_FEATURES = {"hba1c", "fbs", "fasting_blood_sugar", "fasting_glucose"}


class TestNoLeakage:
    """Verify diagnostic features are excluded from non-circular feature sets."""

    def test_cluster_features_no_leakage(self):
        leaked = DIAGNOSTIC_FEATURES & set(CLUSTER_FEATURES)
        assert not leaked, (
            f"CLUSTER_FEATURES contains diagnostic features: {leaked}. "
            "K-Means must use non-circular biomarkers only."
        )

    def test_clinical_features_no_leakage(self):
        leaked = DIAGNOSTIC_FEATURES & set(CLINICAL_FEATURES)
        assert not leaked, (
            f"CLINICAL_FEATURES contains diagnostic features: {leaked}. "
            "Classifier must not use diagnostic markers to avoid circular reasoning."
        )

    def test_clinical_features_no_bp_no_leakage(self):
        leaked = DIAGNOSTIC_FEATURES & set(CLINICAL_FEATURES_NO_BP)
        assert not leaked, (
            f"CLINICAL_FEATURES_NO_BP contains diagnostic features: {leaked}."
        )

    def test_clinical_features_with_bp_no_leakage(self):
        leaked = DIAGNOSTIC_FEATURES & set(CLINICAL_FEATURES_WITH_BP)
        assert not leaked, (
            f"CLINICAL_FEATURES_WITH_BP contains diagnostic features: {leaked}."
        )

    def test_ada_features_contain_diagnostics(self):
        """ADA features SHOULD contain HbA1c and FBS (baseline comparator)."""
        ada_set = set(ADA_FEATURES)
        assert "hba1c" in ada_set, "ADA_FEATURES must include hba1c"
        assert "fbs" in ada_set, "ADA_FEATURES must include fbs"


class TestFeatureConsistency:
    """Verify feature definitions are internally consistent."""

    def test_cluster_features_are_subset_of_clinical(self):
        """All cluster features should be raw biomarkers present in clinical set."""
        cluster_set = set(CLUSTER_FEATURES)
        clinical_set = set(CLINICAL_FEATURES)
        # Cluster features should be a subset of clinical features
        # (cluster uses only base biomarkers, clinical adds engineered ones)
        missing = cluster_set - clinical_set
        assert not missing, (
            f"CLUSTER_FEATURES contains features not in CLINICAL_FEATURES: {missing}. "
            "This would cause the cluster scaler to fail on features the classifier doesn't know about."
        )

    def test_no_duplicate_features(self):
        """Feature lists should not have duplicates."""
        for name, features in [
            ("CLUSTER_FEATURES", CLUSTER_FEATURES),
            ("CLINICAL_FEATURES", CLINICAL_FEATURES),
            ("ADA_FEATURES", ADA_FEATURES),
        ]:
            assert len(features) == len(set(features)), (
                f"{name} has duplicate features: "
                f"{[f for f in features if features.count(f) > 1]}"
            )

    def test_feature_counts_match(self):
        """Feature count constants should match actual list lengths."""
        from Ian_ML.common.feature_constants import (
            CLUSTER_FEATURE_COUNT,
            CLINICAL_FEATURE_COUNT,
            ADA_FEATURE_COUNT,
        )
        assert CLUSTER_FEATURE_COUNT == len(CLUSTER_FEATURES)
        assert CLINICAL_FEATURE_COUNT == len(CLINICAL_FEATURES)
        assert ADA_FEATURE_COUNT == len(ADA_FEATURES)
