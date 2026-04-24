"""
Face-validity audit: Do predictions make clinical sense?

These tests run the REAL model with realistic patient profiles and
PRINT detailed results. They are designed to be run with `pytest -s`
so the output is visible for manual clinical evaluation.

Scenario under investigation:
  BMI=21.5 (Normal), TG=100 (Normal), LDL=50 (Normal), HDL=40 (Low),
  Age=55, no waist, never smoked, no alcohol, sedentary.
  → Model says "At-Risk 59%". Is this scientifically defensible?
"""

import json
import numpy as np
import pytest
from pathlib import Path

from ..service.predict import ClinicalPredictor


_MODELS_DIR = Path(__file__).resolve().parents[2] / "models" / "binary_v2_no_bp"


@pytest.fixture(scope="module")
def predictor():
    return ClinicalPredictor(models_dir=_MODELS_DIR)


@pytest.fixture(scope="module")
def threshold():
    path = _MODELS_DIR / "threshold.json"
    if path.exists():
        return json.load(open(path))["at_risk"]
    return 0.5


def _print_result(label, result):
    """Pretty-print a prediction result for manual review."""
    prob = result.get("at_risk_probability", "?")
    status = result.get("predicted_status", "?")
    cluster = result.get("metabolic_subtype", "N/A")
    mets = result.get("metabolic_syndrome")
    boost = ""
    if mets and mets.get("boost_applied"):
        boost = f" [MetS boost: {mets['boost_type']}, {mets['criteria_met']} criteria]"
    conf = result.get("prediction_confidence", "?")
    print(f"  {label:50s} → prob={prob:.3f}  status={status:8s}  cluster={cluster:10s}  conf={conf}{boost}")


# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: The exact user scenario — all normal except HDL
# ═══════════════════════════════════════════════════════════════════════════

class TestExactUserScenario:
    """Your exact inputs: BMI=21.5, TG=100, LDL=50, HDL=40, Age=55,
    no waist, never smoked, no alcohol, sedentary."""

    def test_exact_user_inputs(self, predictor):
        """The EXACT scenario the user submitted."""
        result = predictor.predict({
            "bmi": 21.5,
            "triglycerides": 100.0,
            "ldl": 50.0,
            "hdl": 40.0,
            "age": 55,
            # No waist_circumference
            "smoking_status": "Never",
            "physical_activity": "Sedentary",
            "alcohol_use": "None",
        })
        assert result["success"]
        print("\n" + "="*80)
        print("TEST 1: EXACT USER SCENARIO")
        print("="*80)
        print("  Inputs: BMI=21.5, TG=100, LDL=50, HDL=40, Age=55")
        print("          No waist, Never smoked, Sedentary, No alcohol")
        _print_result("Result", result)
        print()

    def test_same_patient_with_optimal_hdl(self, predictor):
        """Same patient but HDL=60 (optimal) — does fixing HDL fix the result?"""
        result = predictor.predict({
            "bmi": 21.5,
            "triglycerides": 100.0,
            "ldl": 50.0,
            "hdl": 60.0,
            "age": 55,
            "smoking_status": "Never",
            "physical_activity": "Sedentary",
            "alcohol_use": "None",
        })
        assert result["success"]
        print("\n" + "-"*80)
        print("  Same patient but HDL fixed to 60 (optimal):")
        _print_result("HDL=60 (optimal)", result)

    def test_same_patient_younger(self, predictor):
        """Same patient but Age=45 — does age matter?"""
        result = predictor.predict({
            "bmi": 21.5,
            "triglycerides": 100.0,
            "ldl": 50.0,
            "hdl": 40.0,
            "age": 45,
            "smoking_status": "Never",
            "physical_activity": "Sedentary",
            "alcohol_use": "None",
        })
        assert result["success"]
        print("\n" + "-"*80)
        print("  Same patient but Age=45 (younger):")
        _print_result("Age=45", result)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 2: Isolate what's driving the risk — one feature at a time
# ═══════════════════════════════════════════════════════════════════════════

class TestFeatureIsolation:
    """Start from a perfectly healthy baseline and change ONE feature at a time."""

    HEALTHY_BASELINE = {
        "bmi": 22.0, "triglycerides": 80.0, "ldl": 90.0,
        "hdl": 65.0, "age": 45,
        "smoking_status": "Never",
        "physical_activity": "Active",
        "alcohol_use": "None",
    }

    def test_baseline_healthy(self, predictor):
        """The perfectly healthy baseline — should be clearly Normal."""
        result = predictor.predict(self.HEALTHY_BASELINE)
        assert result["success"]
        print("\n" + "="*80)
        print("TEST 2: FEATURE ISOLATION (change ONE thing from healthy baseline)")
        print("="*80)
        print("  Healthy baseline: BMI=22, TG=80, LDL=90, HDL=65, Age=45")
        print("                    Never smoked, Active, No alcohol")
        _print_result("Baseline (all optimal)", result)

    def test_only_drop_hdl_to_40(self, predictor):
        """Change ONLY HDL from 65→40. Everything else stays optimal."""
        data = {**self.HEALTHY_BASELINE, "hdl": 40.0}
        result = predictor.predict(data)
        assert result["success"]
        _print_result("Only HDL 65→40", result)

    def test_only_raise_age_to_55(self, predictor):
        """Change ONLY Age from 45→55. Everything else stays optimal."""
        data = {**self.HEALTHY_BASELINE, "age": 55}
        result = predictor.predict(data)
        assert result["success"]
        _print_result("Only Age 45→55", result)

    def test_only_hdl40_and_age55(self, predictor):
        """Change HDL→40 AND Age→55 together (the user's abnormal values)."""
        data = {**self.HEALTHY_BASELINE, "hdl": 40.0, "age": 55}
        result = predictor.predict(data)
        assert result["success"]
        _print_result("HDL=40 + Age=55 combined", result)

    def test_only_sedentary(self, predictor):
        """Change ONLY activity from Active→Sedentary."""
        data = {**self.HEALTHY_BASELINE, "physical_activity": "Sedentary"}
        result = predictor.predict(data)
        assert result["success"]
        _print_result("Only Sedentary", result)

    def test_hdl40_age55_sedentary(self, predictor):
        """HDL=40 + Age=55 + Sedentary — approaching the user's profile."""
        data = {**self.HEALTHY_BASELINE, "hdl": 40.0, "age": 55,
                "physical_activity": "Sedentary"}
        result = predictor.predict(data)
        assert result["success"]
        _print_result("HDL=40 + Age=55 + Sedentary", result)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 3: What does "missing waist" actually do?
# ═══════════════════════════════════════════════════════════════════════════

class TestWaistImputation:
    """The user left waist_circumference empty.
    The model imputes it. What value does it impute, and does it matter?"""

    BASE = {
        "bmi": 21.5, "triglycerides": 100.0, "ldl": 50.0,
        "hdl": 40.0, "age": 55,
        "smoking_status": "Never",
        "physical_activity": "Sedentary",
        "alcohol_use": "None",
    }

    def test_no_waist_vs_various_waist_values(self, predictor):
        """Compare: missing waist vs explicit waist=70, 80, 90, 100."""
        print("\n" + "="*80)
        print("TEST 3: WAIST IMPUTATION EFFECT")
        print("="*80)
        print("  Base: BMI=21.5, TG=100, LDL=50, HDL=40, Age=55, Never/Sedentary/None")

        r_missing = predictor.predict(self.BASE)
        _print_result("No waist (imputed)", r_missing)

        for waist in [70, 75, 80, 85, 90, 95, 100]:
            result = predictor.predict({**self.BASE, "waist_circumference": float(waist)})
            _print_result(f"Waist = {waist} cm", result)

        # The key question: does missing waist produce a suspiciously high probability?
        assert r_missing["success"]


# ═══════════════════════════════════════════════════════════════════════════
# TEST 4: HDL sensitivity — how much does HDL alone move the needle?
# ═══════════════════════════════════════════════════════════════════════════

class TestHDLDominance:
    """HDL has the 2nd strongest coefficient (-0.378).
    How much does it swing the probability when everything else is normal?"""

    BASE = {
        "bmi": 21.5, "triglycerides": 100.0, "ldl": 50.0,
        "age": 55,
        "smoking_status": "Never",
        "physical_activity": "Sedentary",
        "alcohol_use": "None",
    }

    def test_hdl_sweep(self, predictor, threshold):
        """Sweep HDL from 30 to 80 with all other values normal."""
        print("\n" + "="*80)
        print("TEST 4: HDL SENSITIVITY SWEEP")
        print(f"  (decision threshold = {threshold:.4f})")
        print("="*80)
        print("  Base: BMI=21.5, TG=100, LDL=50, Age=55, Never/Sedentary/None")

        for hdl in [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80]:
            result = predictor.predict({**self.BASE, "hdl": float(hdl)})
            _print_result(f"HDL = {hdl}", result)

        print(f"\n  Threshold = {threshold:.4f}")
        print("  Clinical normal HDL range: >40 mg/dL (men), >50 mg/dL (women)")
        print("  Optimal HDL: >60 mg/dL")


# ═══════════════════════════════════════════════════════════════════════════
# TEST 5: The "clearly healthy" patient grid
# ═══════════════════════════════════════════════════════════════════════════

class TestClearlyHealthyPatients:
    """A grid of patients who are unambiguously healthy.
    ALL of these should be classified Normal. Any At-Risk is a red flag."""

    HEALTHY_PATIENTS = [
        {"label": "Young, optimal everything",
         "data": {"bmi": 21.0, "triglycerides": 70.0, "ldl": 80.0, "hdl": 70.0, "age": 45,
                  "smoking_status": "Never", "physical_activity": "Active", "alcohol_use": "None"}},

        {"label": "Middle-aged, all normal",
         "data": {"bmi": 23.0, "triglycerides": 90.0, "ldl": 95.0, "hdl": 55.0, "age": 52,
                  "smoking_status": "Never", "physical_activity": "Moderate", "alcohol_use": "None"}},

        {"label": "Older, but excellent lipids",
         "data": {"bmi": 22.0, "triglycerides": 85.0, "ldl": 75.0, "hdl": 65.0, "age": 60,
                  "smoking_status": "Never", "physical_activity": "Active", "alcohol_use": "None"}},

        {"label": "Athletic, slim, age 55",
         "data": {"bmi": 20.5, "triglycerides": 65.0, "ldl": 70.0, "hdl": 72.0, "age": 55,
                  "smoking_status": "Never", "physical_activity": "Vigorous", "alcohol_use": "None"}},

        {"label": "User's profile but HDL=55",
         "data": {"bmi": 21.5, "triglycerides": 100.0, "ldl": 50.0, "hdl": 55.0, "age": 55,
                  "smoking_status": "Never", "physical_activity": "Sedentary", "alcohol_use": "None"}},
    ]

    def test_all_healthy_patients_are_normal(self, predictor):
        """Every clearly healthy patient should be Normal."""
        print("\n" + "="*80)
        print("TEST 5: CLEARLY HEALTHY PATIENT GRID")
        print("="*80)

        failures = []
        for patient in self.HEALTHY_PATIENTS:
            result = predictor.predict(patient["data"])
            assert result["success"]
            _print_result(patient["label"], result)
            if result["predicted_status"] != "Normal":
                failures.append(
                    f"  ❌ {patient['label']}: prob={result['at_risk_probability']}"
                )

        if failures:
            print("\n  ⚠️  FACE VALIDITY CONCERNS:")
            for f in failures:
                print(f)
        else:
            print("\n  ✅ All clearly healthy patients correctly classified Normal")


# ═══════════════════════════════════════════════════════════════════════════
# TEST 6: The model's coefficient reality check
# ═══════════════════════════════════════════════════════════════════════════

class TestModelCoefficients:
    """Extract and display the trained model's coefficients for manual review."""

    def test_print_model_coefficients(self, predictor):
        """Print the logistic regression coefficients for clinical review."""
        print("\n" + "="*80)
        print("TEST 6: MODEL COEFFICIENT AUDIT")
        print("="*80)

        classifier = predictor.classifier
        features = predictor.features

        if hasattr(classifier, "named_steps"):
            for name, step in classifier.named_steps.items():
                if hasattr(step, "coef_"):
                    coeffs = step.coef_[0]
                    intercept = step.intercept_[0]
                    print(f"\n  Logistic Regression (via pipeline step '{name}'):")
                    print(f"  Intercept: {intercept:+.4f}")
                    print(f"  {'Feature':30s} {'Coefficient':>12s}  Direction")
                    print(f"  {'-'*30} {'-'*12}  {'-'*30}")
                    for feat, coef in sorted(zip(features, coeffs),
                                             key=lambda x: abs(x[1]), reverse=True):
                        direction = "↑ risk" if coef > 0 else "↓ risk"
                        flag = ""
                        # Flag counter-intuitive directions
                        if feat == "alcohol_encoded" and coef < 0:
                            flag = " ⚠️  J-curve (epidemiologically known)"
                        if feat == "ldl" and coef < 0:
                            flag = " ⚠️  Counter-intuitive (but weak)"
                        print(f"  {feat:30s} {coef:+12.4f}  {direction}{flag}")

        print(f"\n  Decision threshold: {predictor.decision_thresholds.get('at_risk', 0.5):.4f}")
        print(f"  Total features: {len(features)}")
