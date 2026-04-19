import numpy as np
import pytest

from ..service.predict import ClinicalPredictor


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
        return np.array([[1.0 - self.at_risk_probability, self.at_risk_probability]], dtype=float)


class _RecordingKMeans:
    def __init__(self, cluster_id):
        self.cluster_id = int(cluster_id)
        self.calls = 0

    def predict(self, _x):
        self.calls += 1
        return np.array([self.cluster_id], dtype=int)


def _default_cluster_labels(cluster_id):
    return {
        str(cluster_id): {
            "label": "MARD",
            "risk_level": "MODERATE",
            "risk_label": "Moderate Risk",
            "subtype": "MARD",
            "subtype_full": "Mild Age-Related Diabetes",
            "description": "Older age at diagnosis, mild metabolic dysfunction",
            "treatment_focus": "Conservative management, slower progression",
            # API contract fields (read by _get_cluster_info)
            "characteristics": "Older age at diagnosis, mild metabolic dysfunction",
            "clinical_implication": "Conservative management, slower progression",
        }
    }


def _build_stub_predictor(at_risk_probability, *, threshold, cluster_id=2, cluster_labels=None):
    predictor = object.__new__(ClinicalPredictor)
    predictor.model_type = "binary_v2_no_bp"
    predictor.features = ["bmi", "triglycerides", "ldl", "hdl", "age"]
    predictor.cluster_features = [
        "bmi",
        "triglycerides",
        "ldl",
        "hdl",
        "age",
        "waist_circumference",
    ]
    predictor.metrics = {}
    predictor.decision_thresholds = {} if threshold is None else {"at_risk": float(threshold)}
    predictor.classifier = _FixedBinaryClassifier(at_risk_probability)
    predictor.scaler = None
    predictor.imputer = None
    predictor.cluster_imputer = _IdentityTransformer()
    predictor.cluster_scaler = _IdentityTransformer()
    predictor.kmeans = _RecordingKMeans(cluster_id)
    predictor.cluster_labels = cluster_labels or _default_cluster_labels(cluster_id)
    predictor.cluster_analysis = {}

    predictor._build_feature_vector = lambda data: np.zeros((1, 5), dtype=float)
    predictor._transform_features = lambda X: X
    predictor._build_cluster_vector = lambda data: np.zeros((1, 6), dtype=float)
    return predictor


@pytest.fixture
def patient_input():
    # Use values that do NOT trigger metabolic syndrome boost
    # Metabolic syndrome criteria: TG>=150, HDL<50, BMI>=25, Age 45-60
    # This patient has: TG=140 (<150), HDL=55 (>=50), BMI=24 (<25), Age=40 (<45)
    # 0 criteria met = no boost
    return {
        "bmi": 24.0,
        "triglycerides": 140.0,
        "ldl": 131.0,
        "hdl": 55.0,
        "age": 40,
        "waist_circumference": 80.0,
    }


@pytest.fixture
def cluster_fixture():
    return {
        "2": {
            "label": "SIRD",
            "risk_level": "HIGH",
            "risk_label": "High Risk",
            "subtype": "SIRD",
            "subtype_full": "Severe Insulin-Resistant Diabetes",
            "description": "Insulin resistance dominant profile",
            "treatment_focus": "Insulin sensitivity and triglyceride control",
            # API contract fields (read by _get_cluster_info)
            "characteristics": "Insulin resistance dominant profile",
            "clinical_implication": "Insulin sensitivity and triglyceride control",
        }
    }


class TestClinicalPredictorClusterGatingRegression:
    @pytest.mark.parametrize(
        "proba, expected_status, expected_kmeans_calls",
        [
            (ACTIVE_AT_RISK_THRESHOLD - EPSILON, "Normal", 0),
            (ACTIVE_AT_RISK_THRESHOLD, "At-Risk", 1),
            (ACTIVE_AT_RISK_THRESHOLD + EPSILON, "At-Risk", 1),
        ],
    )
    def test_threshold_boundary_t_minus_e_t_t_plus_e(
        self,
        patient_input,
        proba,
        expected_status,
        expected_kmeans_calls,
    ):
        predictor = _build_stub_predictor(proba, threshold=ACTIVE_AT_RISK_THRESHOLD)

        result = predictor.predict(patient_input)

        assert result["success"] is True
        assert result["predicted_status"] == expected_status
        kmeans_calls = getattr(predictor.kmeans, "calls", None)
        assert isinstance(kmeans_calls, int)
        assert kmeans_calls == expected_kmeans_calls

    def test_threshold_gating_uses_raw_probability_before_rounding(self, patient_input):
        below = _build_stub_predictor(
            ACTIVE_AT_RISK_THRESHOLD - EPSILON,
            threshold=ACTIVE_AT_RISK_THRESHOLD,
        )
        at_threshold = _build_stub_predictor(
            ACTIVE_AT_RISK_THRESHOLD,
            threshold=ACTIVE_AT_RISK_THRESHOLD,
        )

        below_result = below.predict(patient_input)
        at_threshold_result = at_threshold.predict(patient_input)

        # Probability is rounded to 3 decimal places; compare against rounded threshold
        ROUNDED_THRESHOLD = round(ACTIVE_AT_RISK_THRESHOLD, 3)
        assert below_result["at_risk_probability"] == ROUNDED_THRESHOLD
        assert at_threshold_result["at_risk_probability"] == ROUNDED_THRESHOLD
        assert below_result["predicted_status"] == "Normal"
        assert at_threshold_result["predicted_status"] == "At-Risk"

    def test_threshold_source_falls_back_to_point_five_when_missing(self, patient_input):
        below_fallback = _build_stub_predictor(0.5 - EPSILON, threshold=None)
        at_fallback = _build_stub_predictor(0.5, threshold=None)

        below_result = below_fallback.predict(patient_input)
        at_result = at_fallback.predict(patient_input)

        assert below_result["predicted_status"] == "Normal"
        assert at_result["predicted_status"] == "At-Risk"

    def test_normal_prediction_returns_neutral_cluster_fields(self, patient_input):
        predictor = _build_stub_predictor(
            ACTIVE_AT_RISK_THRESHOLD - EPSILON,
            threshold=ACTIVE_AT_RISK_THRESHOLD,
        )

        result = predictor.predict(patient_input)

        assert result["predicted_status"] == "Normal"
        kmeans_calls = getattr(predictor.kmeans, "calls", None)
        assert isinstance(kmeans_calls, int)
        assert kmeans_calls == 0
        assert result["risk_cluster"] == "N/A"
        assert result["metabolic_subtype"] == "N/A"
        assert result["metabolic_subtype_full"] == "N/A"
        assert result["cluster_description"] == ""
        assert result["treatment_focus"] == ""

    def test_at_risk_path_preserves_subtype_mapping_for_eligible_case(self, patient_input, cluster_fixture):
        predictor = _build_stub_predictor(
            ACTIVE_AT_RISK_THRESHOLD + 0.2,
            threshold=ACTIVE_AT_RISK_THRESHOLD,
            cluster_id=2,
            cluster_labels=cluster_fixture,
        )

        result = predictor.predict(patient_input)

        expected_cluster_fields = {
            "risk_cluster": "SIRD",
            "risk_level": "HIGH",
            "risk_label": "High Risk",
            "metabolic_subtype": "SIRD",
            "metabolic_subtype_full": "Severe Insulin-Resistant Diabetes",
            "cluster_description": "Insulin resistance dominant profile",
            "treatment_focus": "Insulin sensitivity and triglyceride control",
        }

        assert result["predicted_status"] == "At-Risk"
        kmeans_calls = getattr(predictor.kmeans, "calls", None)
        assert isinstance(kmeans_calls, int)
        assert kmeans_calls == 1
        assert {k: result[k] for k in expected_cluster_fields} == expected_cluster_fields
