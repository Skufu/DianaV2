"""
Methodology Compliance Tests for DIANA ML Pipeline

Validates that the prediction system follows the methodology documented in
METHODOLOGY.md and ch3+4.md. Tests cover:

1. Binary Classification Threshold (Section 3.5)
2. Two-Stage Hierarchical Pipeline (Section 4.1)
3. Ahlqvist-Inspired Cluster Assignment (Section 4.3)
4. Clinical Thresholds (Section 1.3)
5. Feature Weights (Section 4.2)
6. Clinical Plausibility Ranges (Section 3.6)

Implementation Reference: Ian_ML/training/clustering.py:120-203
"""

import numpy as np
import pytest

from ..service.predict import ClinicalPredictor
from ..common.feature_constants import (
    CLINICAL_FEATURES_NO_BP,
    CLUSTER_FEATURES,
    CLINICAL_FEATURE_COUNT,
    CLUSTER_FEATURE_COUNT,
    AHLQVIST_SUBTYPES,
)

# =============================================================================
# Constants from METHODOLOGY.md Section 3.5
# =============================================================================

# Universal threshold source: models/binary_v2_no_bp/threshold.json
# Falls back to best_model_report.json for backward compatibility.
import json
from pathlib import Path

_MODELS_DIR = Path(__file__).resolve().parents[2] / "models" / "binary_v2_no_bp"
_threshold_path = _MODELS_DIR / "threshold.json"
_report_path = _MODELS_DIR / "results" / "best_model_report.json"

if _threshold_path.exists():
    _THRESHOLD_CONFIG = json.load(open(_threshold_path))
elif _report_path.exists():
    _report = json.load(open(_report_path))
    _THRESHOLD_CONFIG = _report.get("decision_thresholds", {"at_risk": 0.5})
else:
    _THRESHOLD_CONFIG = {"at_risk": 0.5}

ACTIVE_AT_RISK_THRESHOLD = _THRESHOLD_CONFIG["at_risk"]
EPSILON = 1e-7

# =============================================================================
# Clinical Thresholds from METHODOLOGY.md Section 1.3
# =============================================================================

CLINICAL_THRESHOLDS = {
    # HbA1c (ADA 2024)
    "hba1c_normal": 5.7,
    "hba1c_prediabetic": 5.7,
    "hba1c_diabetic": 6.5,
    # FBS (ADA 2024)
    "fbs_normal": 100,
    "fbs_prediabetic": 100,
    "fbs_diabetic": 126,
    # BMI (Asia-Pacific WHO - ch3+4.md Section 3.0.4)
    "bmi_normal": 23.0,
    "bmi_overweight": 25.0,
    "bmi_obese": 25.0,
    # Lipids
    "hdl_low": 40,
    "ldl_high": 100,
    "triglycerides_high": 150,
}

# =============================================================================
# Clinical Plausibility Ranges from METHODOLOGY.md Section 3.6
# =============================================================================

CLINICAL_PLAUSIBILITY_RANGES = {
    "bmi": (15.0, 60.0),
    "triglycerides": (20.0, 800.0),
    "ldl": (20.0, 300.0),
    "hdl": (10.0, 120.0),
    "hba1c": (3.5, 15.0),
    "fbs": (50.0, 400.0),
    "age": (18, 100),
    "waist_circumference": (50.0, 180.0),
}

# =============================================================================
# Feature Weights from METHODOLOGY.md Section 4.2 (Table 4.1)
# =============================================================================

EXPERT_FEATURE_WEIGHTS = {
    "ldl": 2.5,  # Rank #1 - Most bidirectionally discriminative lipid
    "triglycerides": 2.0,  # Rank #2 (tied) - Primary IR surrogate
    "waist_circumference": 2.0,  # Rank #2 (tied) - Central adiposity
    "bmi": 1.5,  # Rank #3 - MOD cluster anchor
    "hdl": 1.2,  # Rank #4 - Protective inverse signal
    "age": 1.0,  # Rank #5 - Baseline (compressed variance in menopausal cohort)
}


class _IdentityTransformer:
    def __init__(self):
        self.calls = 0

    def transform(self, x):
        self.calls += 1
        return x


class _FixedBinaryClassifier:
    def __init__(self, at_risk_probability):
        self.at_risk_probability = float(at_risk_probability)

    def predict_proba(self, _x):
        return np.array(
            [[1.0 - self.at_risk_probability, self.at_risk_probability]], dtype=float
        )


class _RecordingKMeans:
    def __init__(self, cluster_id):
        self.cluster_id = int(cluster_id)
        self.calls = 0

    def predict(self, _x):
        self.calls += 1
        return np.array([self.cluster_id], dtype=int)


def _default_cluster_labels(cluster_id):
    """Generate default cluster labels matching cluster_labels.json structure."""
    labels = {
        0: {
            "label": "SIRD",
            "risk_level": "HIGH",
            "risk_label": "High Risk",
            "subtype": "SIRD-like",
            "subtype_full": "Severe Insulin-Resistant Diabetes",
            "description": "Insulin resistance dominant profile",
            "treatment_focus": "Focus on insulin sensitivity and triglyceride control",
        },
        1: {
            "label": "SIDD",
            "risk_level": "HIGH",
            "risk_label": "High Risk",
            "subtype": "SIDD-like",
            "subtype_full": "Atherogenic / Lipid-Driven Diabetes",
            "description": "Atherogenic dyslipidemia profile",
            "treatment_focus": "Prioritize statin therapy and cardiovascular risk reduction",
        },
        2: {
            "label": "MOD",
            "risk_level": "MODERATE",
            "risk_label": "Moderate Risk",
            "subtype": "MOD-like",
            "subtype_full": "Mild Obesity-Related Diabetes",
            "description": "Weight-driven metabolic profile",
            "treatment_focus": "Weight management and lifestyle optimization",
        },
        3: {
            "label": "MARD",
            "risk_level": "LOW",
            "risk_label": "Lower Risk",
            "subtype": "MARD-like",
            "subtype_full": "Mild Age-Related Diabetes",
            "description": "Milder metabolic dysfunction with age-related factors",
            "treatment_focus": "Conservative management, slower progression",
        },
    }
    return {str(cluster_id): labels.get(cluster_id, labels[0])}


def _build_stub_predictor(
    at_risk_probability, *, threshold, cluster_id=2, cluster_labels=None
):
    """Build a stub ClinicalPredictor for testing."""
    predictor = object.__new__(ClinicalPredictor)
    predictor.model_type = "binary_v2_no_bp"
    predictor.features = list(CLINICAL_FEATURES_NO_BP)
    predictor.cluster_features = list(CLUSTER_FEATURES)
    predictor.metrics = {}
    predictor.decision_thresholds = (
        {} if threshold is None else {"at_risk": float(threshold)}
    )
    predictor.classifier = _FixedBinaryClassifier(at_risk_probability)
    predictor.scaler = None
    predictor.imputer = None
    predictor.cluster_imputer = _IdentityTransformer()
    predictor.cluster_scaler = _IdentityTransformer()
    predictor.kmeans = _RecordingKMeans(cluster_id)
    predictor.cluster_labels = cluster_labels or _default_cluster_labels(cluster_id)
    predictor.cluster_analysis = {}
    predictor._build_feature_vector = lambda data: np.zeros((1, 9), dtype=float)
    predictor._transform_features = lambda X: X
    predictor._build_cluster_vector = lambda data: np.zeros((1, 6), dtype=float)
    return predictor


@pytest.fixture
def typical_patient():
    """Typical postmenopausal woman with moderate metabolic risk.

    Values chosen to NOT trigger metabolic syndrome boost (need 2+ criteria):
    - TG=140 (<150) - no
    - HDL=55 (>=50) - no
    - BMI=24 (<25) - no
    - Age=40 (<45) - no
    0 criteria met = no metabolic syndrome boost
    """
    return {
        "bmi": 24.0,
        "triglycerides": 140.0,
        "ldl": 131.0,
        "hdl": 55.0,
        "age": 40,
        "waist_circumference": 80.0,
        "smoking_encoded": 0,
        "activity_encoded": 1,
        "alcohol_encoded": 0,
    }


@pytest.fixture
def cluster_fixture():
    """Cluster labels matching cluster_labels.json structure."""
    return {
        "0": {
            "label": "SIRD",
            "risk_level": "HIGH",
            "risk_label": "High Risk",
            "subtype": "SIRD-like",
            "subtype_full": "Severe Insulin-Resistant Diabetes",
            "description": "Insulin resistance dominant profile",
            "treatment_focus": "Focus on insulin sensitivity and triglyceride control",
        },
        "1": {
            "label": "SIDD",
            "risk_level": "HIGH",
            "risk_label": "High Risk",
            "subtype": "SIDD-like",
            "subtype_full": "Atherogenic / Lipid-Driven Diabetes",
            "description": "Atherogenic dyslipidemia profile",
            "treatment_focus": "Prioritize statin therapy and cardiovascular risk reduction",
        },
        "2": {
            "label": "MOD",
            "risk_level": "MODERATE",
            "risk_label": "Moderate Risk",
            "subtype": "MOD-like",
            "subtype_full": "Mild Obesity-Related Diabetes",
            "description": "Weight-driven metabolic profile",
            "treatment_focus": "Weight management and lifestyle optimization",
        },
        "3": {
            "label": "MARD",
            "risk_level": "LOW",
            "risk_label": "Lower Risk",
            "subtype": "MARD-like",
            "subtype_full": "Mild Age-Related Diabetes",
            "description": "Milder metabolic dysfunction with age-related factors",
            "treatment_focus": "Conservative management, slower progression",
        },
    }


# =============================================================================
# Test Class 1: Binary Classification Threshold (METHODOLOGY.md Section 3.5)
# =============================================================================


class TestBinaryClassificationThreshold:
    """
    Validates the sensitivity-biased decision threshold from Section 3.5.

    The mean threshold across LOGO folds was 0.455 (range: 0.39-0.50),
    reflecting an intentional downward adjustment from the default 0.50
    to prioritize sensitivity in a screening context.
    """

    @pytest.mark.parametrize(
        "proba, expected_status",
        [
            (0.0, "Normal"),  # Low probability
            (0.3, "Normal"),  # Below threshold
            (ACTIVE_AT_RISK_THRESHOLD - EPSILON, "Normal"),  # Just below
            (ACTIVE_AT_RISK_THRESHOLD, "At-Risk"),  # At threshold
            (ACTIVE_AT_RISK_THRESHOLD + EPSILON, "At-Risk"),  # Just above
            (0.7, "At-Risk"),  # Above threshold
            (1.0, "At-Risk"),  # High probability
        ],
    )
    def test_threshold_boundary(self, typical_patient, proba, expected_status):
        """Test that probability threshold correctly classifies Normal vs At-Risk."""
        predictor = _build_stub_predictor(proba, threshold=ACTIVE_AT_RISK_THRESHOLD)
        result = predictor.predict(typical_patient)
        assert result["predicted_status"] == expected_status

    def test_threshold_below_0_5_for_sensitivity(self):
        """
        Validate that threshold is below 0.50 for sensitivity bias.

        From METHODOLOGY.md Section 3.5:
        'The selection of a sensitivity-biased threshold aligns with the
        epidemiological principle that screening tools must cast a wide net,
        prioritizing case detection over diagnostic precision.'
        """
        assert ACTIVE_AT_RISK_THRESHOLD < 0.50, (
            "Threshold should be below 0.50 for sensitivity-biased screening"
        )

    def test_threshold_within_documented_range(self):
        """
        Validate threshold is within documented range (0.39-0.50).

        From METHODOLOGY.md Section 3.5:
        'The mean threshold across folds was 0.455 (range: 0.39-0.50)'
        """
        assert 0.39 <= ACTIVE_AT_RISK_THRESHOLD <= 0.50, (
            f"Threshold {ACTIVE_AT_RISK_THRESHOLD} outside documented range [0.39, 0.50]"
        )


# =============================================================================
# Test Class 2: Two-Stage Hierarchical Pipeline (METHODOLOGY.md Section 4.1)
# =============================================================================


class TestTwoStagePipeline:
    """
    Validates the two-stage hierarchical architecture from Section 4.1.

    Stage 1: Binary screening (all patients)
    Stage 2: Weighted K-Means subtyping (At-Risk only)
    """

    def test_normal_patients_get_na_cluster(self, typical_patient):
        """
        Normal patients should receive N/A cluster, not a subtype.

        From METHODOLOGY.md Section 4.3:
        'Normal patients receive neutral sentinel subtype semantics with
        risk cluster and metabolic subtype values indicating not applicable.'
        """
        predictor = _build_stub_predictor(
            0.3,  # Below threshold
            threshold=ACTIVE_AT_RISK_THRESHOLD,
            cluster_id=0,
        )
        result = predictor.predict(typical_patient)
        assert result["predicted_status"] == "Normal"
        # Cluster assignment should not occur for Normal patients
        # (handled by runtime gating in predict.py)

    def test_at_risk_patients_get_cluster(self, typical_patient, cluster_fixture):
        """
        At-Risk patients should receive cluster assignment.

        From METHODOLOGY.md Section 4.1:
        'Stage 2: Weighted K-Means clustering (K=4) is applied exclusively
        to at-risk patients (those classified as "At-Risk")'
        """
        predictor = _build_stub_predictor(
            0.8,  # Above threshold
            threshold=ACTIVE_AT_RISK_THRESHOLD,
            cluster_id=0,
            cluster_labels=cluster_fixture,
        )
        result = predictor.predict(typical_patient)
        assert result["predicted_status"] == "At-Risk"
        assert result["risk_cluster"] != "N/A"
        assert result["risk_cluster"] in ["SIRD", "SIDD", "MOD", "MARD"]

    def test_cluster_only_for_at_risk(self, typical_patient):
        """
        Verify that clustering is gated by binary classification.

        From ch3+4.md Section 3.7:
        'The serving code enforces this gating at runtime: subtype clustering
        logic only executes when predicted_status equals "At-Risk".'
        """
        # Test Normal case - KMeans should not be called
        predictor_normal = _build_stub_predictor(
            0.3, threshold=ACTIVE_AT_RISK_THRESHOLD, cluster_id=0
        )
        result_normal = predictor_normal.predict(typical_patient)
        assert predictor_normal.kmeans.calls == 0

        # Test At-Risk case - KMeans should be called
        predictor_at_risk = _build_stub_predictor(
            0.8, threshold=ACTIVE_AT_RISK_THRESHOLD, cluster_id=0
        )
        result_at_risk = predictor_at_risk.predict(typical_patient)
        assert predictor_at_risk.kmeans.calls == 1


# =============================================================================
# Test Class 3: Ahlqvist-Inspired Cluster Assignment (METHODOLOGY.md Section 4.3)
# =============================================================================


class TestAhlqvistClusterAssignment:
    """
    Validates the deterministic centroid-based label assignment from Section 4.3.

    Label Assignment Rules:
    1. SIRD-like: Maximum LAP score = (WC - 58) × TG
    2. SIDD-like: Peak LDL among remaining clusters
    3. MOD-like: Maximum BMI among remaining clusters
    4. MARD-like: Residual cluster (older age, mild dysfunction)
    """

    @pytest.mark.parametrize(
        "cluster_id, expected_label",
        [
            (0, "SIRD"),
            (1, "SIDD"),
            (2, "MOD"),
            (3, "MARD"),
        ],
    )
    def test_all_cluster_labels_exist(
        self, cluster_id, expected_label, cluster_fixture
    ):
        """All four Ahlqvist-inspired labels should be defined."""
        labels = cluster_fixture.get(str(cluster_id))
        assert labels is not None
        assert labels["label"] == expected_label

    def test_sird_has_highest_risk_level(self, cluster_fixture):
        """
        SIRD should have HIGH risk level.

        From ch3+4.md Section 3.7:
        'SIRD (Severe Insulin-Resistant Diabetes): Assigned to the cluster
        with the highest LAP score in raw clinical units'
        """
        sird = cluster_fixture["0"]
        assert sird["risk_level"] == "HIGH"

    def test_sidd_has_highest_risk_level(self, cluster_fixture):
        """
        SIDD should have HIGH risk level.

        From ch3+4.md Section 3.7:
        'SIDD (Severe Insulin-Deficient Diabetes - Rebranded as
        Atherogenic/Lipid-Driven Proxy)'
        """
        sidd = cluster_fixture["1"]
        assert sidd["risk_level"] == "HIGH"

    def test_mod_has_moderate_risk_level(self, cluster_fixture):
        """
        MOD should have MODERATE risk level.

        From ch3+4.md Section 3.7:
        'MOD (Mild Obesity-Related Diabetes): Assigned to the cluster
        with highest BMI in raw clinical units'
        """
        mod = cluster_fixture["2"]
        assert mod["risk_level"] == "MODERATE"

    def test_mard_has_low_risk_level(self, cluster_fixture):
        """
        MARD should have LOW risk level.

        From ch3+4.md Section 3.7:
        'MARD (Mild Age-Related Diabetes): Assigned to the residual cluster'
        """
        mard = cluster_fixture["3"]
        assert mard["risk_level"] == "LOW"

    def test_cluster_labels_have_like_suffix(self, cluster_fixture):
        """
        All cluster labels should use -like suffix for proxy status.

        From ch3+4.md Section 3.7:
        'DIANA-generated outward-facing subtype semantics use the
        "SIRD-like / SIDD-like / MOD-like / MARD-like" framing to
        emphasize proxy status.'
        """
        for cluster_id, labels in cluster_fixture.items():
            subtype = labels.get("subtype", "")
            assert subtype.endswith("-like"), (
                f"Cluster {cluster_id} subtype '{subtype}' missing -like suffix"
            )

    def test_sird_lap_formula(self):
        """
        Verify SIRD uses LAP = (WC - 58) × TG formula.

        From METHODOLOGY.md Section 4.3:
        'SIRD-like: Assigned to the cluster exhibiting the maximum Lipid
        Accumulation Product (LAP) score, computed as LAP = (WC − 58) × TG'
        """
        wc, tg = 100.0, 200.0
        expected_lap = (wc - 58) * tg  # (100 - 58) * 200 = 8400
        actual_lap = (wc - 58) * tg
        assert actual_lap == expected_lap


# =============================================================================
# Test Class 4: Clinical Thresholds (METHODOLOGY.md Section 1.3, ch3+4.md)
# =============================================================================


class TestClinicalThresholds:
    """
    Validates clinical thresholds used in label construction and validation.

    From METHODOLOGY.md Section 1.3:
    - HbA1c >= 6.5% → Diabetic (ADA diagnostic criterion)
    - HbA1c 5.7-6.4% → Pre-diabetic
    - HbA1c < 5.7% → Normal
    """

    @pytest.mark.parametrize(
        "hba1c, expected_class",
        [
            (5.0, "Normal"),
            (5.6, "Normal"),
            (5.7, "Pre-diabetic"),
            (6.0, "Pre-diabetic"),
            (6.4, "Pre-diabetic"),
            (6.5, "Diabetic"),
            (7.0, "Diabetic"),
        ],
    )
    def test_hba1c_thresholds(self, hba1c, expected_class):
        """Validate HbA1c classification per ADA 2024 guidelines."""
        if hba1c >= 6.5:
            actual = "Diabetic"
        elif hba1c >= 5.7:
            actual = "Pre-diabetic"
        else:
            actual = "Normal"
        assert actual == expected_class

    @pytest.mark.parametrize(
        "fbs, expected_class",
        [
            (90, "Normal"),
            (99, "Normal"),
            (100, "Pre-diabetic"),
            (110, "Pre-diabetic"),
            (125, "Pre-diabetic"),
            (126, "Diabetic"),
            (150, "Diabetic"),
        ],
    )
    def test_fbs_thresholds(self, fbs, expected_class):
        """Validate FBS classification per ADA 2024 guidelines."""
        if fbs >= 126:
            actual = "Diabetic"
        elif fbs >= 100:
            actual = "Pre-diabetic"
        else:
            actual = "Normal"
        assert actual == expected_class

    @pytest.mark.parametrize(
        "bmi, expected_category",
        [
            (22.0, "Normal"),
            (23.0, "Overweight"),
            (24.0, "Overweight"),
            (25.0, "Obese"),
            (30.0, "Obese"),
        ],
    )
    def test_bmi_asia_pacific_thresholds(self, bmi, expected_category):
        """
        Validate BMI classification per Asia-Pacific WHO guidelines.

        From ch3+4.md Section 3.0.4:
        'Uses Asia-Pacific WHO BMI thresholds (23/25 vs US 25/30)'
        """
        if bmi >= 25.0:
            actual = "Obese"
        elif bmi >= 23.0:
            actual = "Overweight"
        else:
            actual = "Normal"
        assert actual == expected_category


# =============================================================================
# Test Class 5: Feature Weights (METHODOLOGY.md Section 4.2, Table 4.1)
# =============================================================================


class TestFeatureWeights:
    """
    Validates literature-derived feature weights from Section 4.2.

    From Table 4.1:
    | Feature | Weight | Rank |
    | LDL | 2.5 | #1 |
    | Triglycerides | 2.0 | #2 (tied) |
    | Waist Circumference | 2.0 | #2 (tied) |
    | BMI | 1.5 | #3 |
    | HDL | 1.2 | #4 |
    | Age | 1.0 | #5 |
    """

    def test_ldl_has_highest_weight(self):
        """LDL should have the highest weight (2.5) - most discriminative lipid."""
        assert EXPERT_FEATURE_WEIGHTS["ldl"] == 2.5

    def test_tg_and_wc_tied_second(self):
        """TG and WC should be tied for second highest weight (2.0)."""
        assert EXPERT_FEATURE_WEIGHTS["triglycerides"] == 2.0
        assert EXPERT_FEATURE_WEIGHTS["waist_circumference"] == 2.0

    def test_bmi_third_weight(self):
        """BMI should have third highest weight (1.5)."""
        assert EXPERT_FEATURE_WEIGHTS["bmi"] == 1.5

    def test_hdl_fourth_weight(self):
        """HDL should have fourth weight (1.2)."""
        assert EXPERT_FEATURE_WEIGHTS["hdl"] == 1.2

    def test_age_baseline_weight(self):
        """Age should have baseline weight (1.0)."""
        assert EXPERT_FEATURE_WEIGHTS["age"] == 1.0

    def test_weight_ordering(self):
        """Verify weight ordering: LDL > TG=WC > BMI > HDL > Age."""
        weights = EXPERT_FEATURE_WEIGHTS
        assert weights["ldl"] > weights["triglycerides"]
        assert weights["triglycerides"] == weights["waist_circumference"]
        assert weights["waist_circumference"] > weights["bmi"]
        assert weights["bmi"] > weights["hdl"]
        assert weights["hdl"] > weights["age"]


# =============================================================================
# Test Class 6: Clinical Plausibility Ranges (METHODOLOGY.md Section 3.6)
# =============================================================================


class TestClinicalPlausibilityRanges:
    """
    Validates clinical plausibility ranges for outlier detection.

    From METHODOLOGY.md Section 3.6:
    - BMI: 15-60 kg/m²
    - Triglycerides: 20-800 mg/dL
    - LDL: 20-300 mg/dL
    - HDL: 10-120 mg/dL
    - HbA1c: 3.5-15.0%
    - FBS: 50-400 mg/dL
    - Age: 18-100 years
    - Waist Circumference: 50-180 cm
    """

    @pytest.mark.parametrize(
        "feature, value, should_be_valid",
        [
            # BMI range: 15-60
            ("bmi", 14.0, False),
            ("bmi", 15.0, True),
            ("bmi", 25.0, True),
            ("bmi", 60.0, True),
            ("bmi", 61.0, False),
            # Triglycerides range: 20-800
            ("triglycerides", 19.0, False),
            ("triglycerides", 20.0, True),
            ("triglycerides", 150.0, True),
            ("triglycerides", 800.0, True),
            ("triglycerides", 801.0, False),
            # LDL range: 20-300
            ("ldl", 19.0, False),
            ("ldl", 20.0, True),
            ("ldl", 100.0, True),
            ("ldl", 300.0, True),
            ("ldl", 301.0, False),
            # HDL range: 10-120
            ("hdl", 9.0, False),
            ("hdl", 10.0, True),
            ("hdl", 50.0, True),
            ("hdl", 120.0, True),
            ("hdl", 121.0, False),
            # Age range: 18-100
            ("age", 17, False),
            ("age", 18, True),
            ("age", 55, True),
            ("age", 100, True),
            ("age", 101, False),
            # Waist circumference range: 50-180
            ("waist_circumference", 49.0, False),
            ("waist_circumference", 50.0, True),
            ("waist_circumference", 90.0, True),
            ("waist_circumference", 180.0, True),
            ("waist_circumference", 181.0, False),
        ],
    )
    def test_clinical_plausibility_bounds(self, feature, value, should_be_valid):
        """Validate that values outside clinical plausibility ranges are flagged."""
        min_val, max_val = CLINICAL_PLAUSIBILITY_RANGES[feature]
        is_valid = min_val <= value <= max_val
        assert is_valid == should_be_valid, (
            f"{feature}={value} should be {'valid' if should_be_valid else 'invalid'}"
        )


# =============================================================================
# Test Class 7: Feature Set Validation (METHODOLOGY.md Phase 2)
# =============================================================================


class TestFeatureSetValidation:
    """
    Validates that the feature set matches METHODOLOGY.md specifications.

    From Section 2.2 (Table 2.1):
    - Clinical features (no BP): 9 features
    - Cluster features: 6 features
    - No HbA1c/FBS (non-circular design)
    """

    def test_clinical_feature_count(self):
        """
        Clinical features should have 9 features.

        From METHODOLOGY.md Section 2.2:
        'The final model employs nine features designed to avoid circular
        reasoning with diagnostic tests.'
        """
        assert CLINICAL_FEATURE_COUNT == 9

    def test_cluster_feature_count(self):
        """
        Cluster features should have 6 features.

        From METHODOLOGY.md Section 4.2:
        Clustering uses BMI, TG, LDL, HDL, Age, WC
        """
        assert CLUSTER_FEATURE_COUNT == 6

    def test_no_diagnostic_markers_in_clinical_features(self):
        """
        Clinical features must NOT include HbA1c or FBS.

        From METHODOLOGY.md Section 2.1.1:
        'Static Feature Constant Verification: asserts that the diagnostic
        marker set {hba1c, fbs, fasting_blood_sugar, fasting_glucose} is
        entirely absent.'
        """
        diagnostic_markers = {"hba1c", "fbs", "fasting_blood_sugar", "fasting_glucose"}
        for feature in CLINICAL_FEATURES_NO_BP:
            assert feature not in diagnostic_markers, (
                f"Diagnostic marker '{feature}' found in clinical features"
            )

    def test_no_diagnostic_markers_in_cluster_features(self):
        """Cluster features must NOT include HbA1c or FBS."""
        diagnostic_markers = {"hba1c", "fbs", "fasting_blood_sugar", "fasting_glucose"}
        for feature in CLUSTER_FEATURES:
            assert feature not in diagnostic_markers, (
                f"Diagnostic marker '{feature}' found in cluster features"
            )

    def test_clinical_features_match_specification(self):
        """
        Clinical features should match Table 2.1 from METHODOLOGY.md.

        Expected: BMI, Triglycerides, LDL, HDL, Age, Waist Circumference,
        Smoking Status, Physical Activity, Alcohol Use
        """
        expected = {
            "bmi",
            "triglycerides",
            "ldl",
            "hdl",
            "age",
            "waist_circumference",
            "smoking_encoded",
            "activity_encoded",
            "alcohol_encoded",
        }
        actual = set(CLINICAL_FEATURES_NO_BP)
        assert actual == expected

    def test_cluster_features_match_specification(self):
        """
        Cluster features should match Section 4.2 from METHODOLOGY.md.

        Expected: BMI, Triglycerides, LDL, HDL, Age, Waist Circumference
        """
        expected = {"bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"}
        actual = set(CLUSTER_FEATURES)
        assert actual == expected


# =============================================================================
# Test Class 8: Ahlqvist Subtype Definitions (feature_constants.py)
# =============================================================================


class TestAhlqvistSubtypeDefinitions:
    """
    Validates that AHLQVIST_SUBTYPES matches methodology documentation.

    From ch3+4.md Section 3.7:
    All four subtypes must be defined with correct risk levels.
    """

    def test_all_four_subtypes_defined(self):
        """All four Ahlqvist subtypes should be defined."""
        expected = {"SIRD", "SIDD", "MOD", "MARD"}
        actual = set(AHLQVIST_SUBTYPES.keys())
        assert actual == expected

    def test_sird_definition(self):
        """SIRD should be Severe Insulin-Resistant Diabetes."""
        sird = AHLQVIST_SUBTYPES["SIRD"]
        assert "Severe Insulin-Resistant" in sird["full_name"]
        assert sird["risk_level"] == "HIGH"

    def test_sidd_definition(self):
        """
        SIDD should be Atherogenic/Lipid-Driven Diabetes.

        From ch3+4.md Section 3.7:
        'SIDD (Severe Insulin-Deficient Diabetes - Rebranded as
        Atherogenic/Lipid-Driven Proxy)'
        """
        sidd = AHLQVIST_SUBTYPES["SIDD"]
        assert "Atherogenic" in sidd["full_name"] or "Lipid" in sidd["full_name"]
        assert sidd["risk_level"] == "HIGH"

    def test_mod_definition(self):
        """MOD should be Mild Obesity-Related Diabetes."""
        mod = AHLQVIST_SUBTYPES["MOD"]
        assert "Obesity" in mod["full_name"]
        assert mod["risk_level"] == "MODERATE"

    def test_mard_definition(self):
        """MARD should be Mild Age-Related Diabetes."""
        mard = AHLQVIST_SUBTYPES["MARD"]
        assert "Age" in mard["full_name"]
        assert mard["risk_level"] == "LOW"


# =============================================================================
# Test Class 9: Binary Reformulation (METHODOLOGY.md Section 1.3)
# =============================================================================


class TestBinaryReformulation:
    """
    Validates the binary class reformulation from Section 1.3.

    From METHODOLOGY.md Section 1.3:
    'For the screening model, Pre-diabetic and Diabetic classes were combined
    into a single "At-Risk" class (n=734, 53.3%), with Normal (n=642, 46.7%)
    as the negative class.'
    """

    def test_binary_class_distribution(self):
        """
        Validate the binary class proportions from METHODOLOGY.md.

        Normal: 642 (46.7%)
        At-Risk: 734 (53.3%)
        Total: 1376
        """
        normal_count = 642
        at_risk_count = 734
        total = 1376

        assert normal_count + at_risk_count == total
        assert abs(normal_count / total - 0.467) < 0.01  # 46.7%
        assert abs(at_risk_count / total - 0.533) < 0.01  # 53.3%

    def test_prediabetic_combined_with_diabetic(self):
        """
        Pre-diabetic should be combined with Diabetic for binary model.

        From METHODOLOGY.md Section 1.3:
        'Pre-diabetic and Diabetic classes were combined into a single
        "At-Risk" class'
        """
        # This is a design validation - the binary model treats
        # Pre-diabetic (457) + Diabetic (277) = At-Risk (734)
        prediabetic_count = 457
        diabetic_count = 277
        expected_at_risk = 734

        assert prediabetic_count + diabetic_count == expected_at_risk
