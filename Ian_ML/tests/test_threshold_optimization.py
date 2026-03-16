import numpy as np
import pytest

from ..training.train_binary_v2_no_bp import optimize_binary_v2_no_bp_threshold


def _build_high_normal_prevalence_regression_case() -> tuple[np.ndarray, np.ndarray]:
    """
    Synthetic prevalence-shift fold analogous to 2021-2023 behavior:
    - High normal prevalence (~62.5%)
    - Overlapping score distributions that can trigger low-specificity thresholds
    """
    rng = np.random.default_rng(20260316)
    y_true = np.array([0] * 200 + [1] * 120, dtype=int)

    normal_scores = np.clip(
        rng.normal(0.4677076569131608, 0.13307207258125126, 200),
        0.0,
        1.0,
    )
    at_risk_scores = np.clip(
        rng.normal(0.49443303317656506, 0.07937248687566648, 120),
        0.0,
        1.0,
    )
    y_proba = np.concatenate([normal_scores, at_risk_scores]).astype(float)
    return y_true, y_proba


def test_prevalence_shift_regression_keeps_specificity_above_floor():
    """RED: under prevalence shift, selected threshold should avoid specificity collapse."""
    y_true, y_proba = _build_high_normal_prevalence_regression_case()

    normal_prevalence = float(np.mean(y_true == 0))
    assert normal_prevalence > 0.60

    result = optimize_binary_v2_no_bp_threshold(y_true, y_proba)
    selected_specificity = float(result["metrics"]["specificity"])

    # Safety expectation for screening under high-normal prevalence.
    assert selected_specificity >= 0.40


def test_prevalence_shift_prefers_nearest_feasible_threshold_over_blunt_default():
    """Guardrail should prefer nearest feasible threshold rather than jumping straight to 0.50."""
    y_true, y_proba = _build_high_normal_prevalence_regression_case()

    result = optimize_binary_v2_no_bp_threshold(y_true, y_proba)

    assert result["guardrail_triggered"] is True
    assert result["strategy"] == "guardrail_nearest_feasible"
    assert float(result["original_threshold"]) == pytest.approx(0.40)
    assert float(result["threshold"]) == pytest.approx(0.46)
    assert float(result["metrics"]["specificity"]) >= 0.45
    assert float(result["metrics"]["sensitivity"]) > 0.50


def test_screening_strategy_fallback_is_sane_when_constraints_fail():
    """If constraints are infeasible, screening strategy should stay neutral and bounded."""
    y_true = np.array([0] * 50 + [1] * 50, dtype=int)
    y_proba = np.full(100, 0.50, dtype=float)

    result = optimize_binary_v2_no_bp_threshold(y_true, y_proba, min_sensitivity=0.95)
    screening = result["all_strategies"]["screening"]

    assert float(screening["threshold"]) == pytest.approx(0.50)
    assert 0.0 <= float(screening["sensitivity"]) <= 1.0
    assert 0.0 <= float(screening["specificity"]) <= 1.0
    assert 0.0 <= float(screening["f1"]) <= 1.0


def test_optimize_threshold_is_deterministic_for_identical_inputs():
    y_true, y_proba = _build_high_normal_prevalence_regression_case()

    first = optimize_binary_v2_no_bp_threshold(y_true, y_proba, min_sensitivity=0.80)
    second = optimize_binary_v2_no_bp_threshold(y_true, y_proba, min_sensitivity=0.80)

    assert first == second


def test_low_variance_tie_prefers_neutral_threshold_over_floor_value():
    """RED: tie/low-variance case should not default to the 0.10 floor threshold."""
    y_true = np.array([0] * 50 + [1] * 50, dtype=int)
    y_proba = np.full(100, 0.50, dtype=float)

    result = optimize_binary_v2_no_bp_threshold(y_true, y_proba)

    assert float(result["threshold"]) == pytest.approx(0.50)
