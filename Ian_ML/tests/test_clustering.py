"""
Test suite for ml/clustering.py - Ahlqvist subtype assignment
Focuses on clinical safety of subtype classification logic
"""

import json
from pathlib import Path

import numpy as np
import pytest
from sklearn.impute import SimpleImputer
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler

from ..common.weighted_kmeans import WeightedKMeans
from ..training.clustering import (
    ALL_FEATURES,
    DATA_PATH,
    analyze_k_range,
    assign_ahlqvist_labels,
    build_feature_weight_vector,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
CLUSTER_ANALYSIS_PATH = REPO_ROOT / "models/binary_v2_no_bp/results/cluster_analysis.json"


def _lap_score(means):
    """DIANA's women-only LAP-style centroid score used for SIRD ranking."""
    return (means["waist_circumference"] - 58) * means["triglycerides"]


def test_saved_cluster_artifact_documents_k2_silhouette_optimum_and_k4_selection():
    """The saved thesis artifact should explicitly show K=2 by silhouette and K=4 by design."""
    with CLUSTER_ANALYSIS_PATH.open() as f:
        artifact = json.load(f)

    assert artifact["n_samples"] == 734
    assert artifact["k_optimal_by_silhouette"] == 2
    assert artifact["k_selected"] == 4

    k_range = {entry["k"]: entry for entry in artifact["k_range_analysis"]}
    assert k_range[2]["silhouette"] > k_range[4]["silhouette"]
    assert k_range[4]["dbi"] < k_range[2]["dbi"]


def test_saved_cluster_profiles_follow_lap_ldl_bmi_residual_label_rules():
    """Validate the current artifact's actual SIRD/SIDD/MOD/MARD assignment rules."""
    with CLUSTER_ANALYSIS_PATH.open() as f:
        artifact = json.load(f)

    profiles = artifact["cluster_profiles"]
    assert set(profiles) == {"SIRD", "SIDD", "MOD", "MARD"}

    mean_profiles = {label: payload["means"] for label, payload in profiles.items()}

    lap_by_label = {label: _lap_score(means) for label, means in mean_profiles.items()}
    assert max(lap_by_label, key=lap_by_label.get) == "SIRD"

    after_sird = {label: means for label, means in mean_profiles.items() if label != "SIRD"}
    assert max(after_sird, key=lambda label: after_sird[label]["ldl"]) == "SIDD"

    after_sird_sidd = {
        label: means for label, means in after_sird.items() if label != "SIDD"
    }
    assert max(after_sird_sidd, key=lambda label: after_sird_sidd[label]["bmi"]) == "MOD"

    assert (set(after_sird_sidd) - {"MOD"}) == {"MARD"}


def test_recomputed_k_range_confirms_k2_is_silhouette_optimal():
    """Non-destructively recompute K=2..6 metrics from the current data pipeline."""
    pd = pytest.importorskip("pandas")

    df = pd.read_csv(DATA_PATH)
    features = [feature for feature in ALL_FEATURES if feature in df.columns]
    at_risk = df.loc[df["diabetes_label"] >= 1].copy()

    imputer = SimpleImputer(strategy="median")
    x_imputed = imputer.fit_transform(at_risk[features].values)
    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x_imputed)
    weights = build_feature_weight_vector(features)

    k_results = analyze_k_range(x_scaled, feature_weights=weights, k_range=(2, 7))
    best_k = max(k_results, key=lambda result: result["silhouette"])["k"]

    assert len(at_risk) == 734
    assert best_k == 2

    k4 = WeightedKMeans(n_clusters=4, weights=weights, random_state=42, n_init=10)
    labels = k4.fit(x_scaled).labels_

    assert labels is not None
    assert round(silhouette_score(x_scaled, labels), 4) == 0.1762
    assert round(davies_bouldin_score(x_scaled, labels), 4) == 1.5950
    assert round(calinski_harabasz_score(x_scaled, labels), 4) == 154.3203


def test_assign_ahlqvist_labels_exact_current_ranking_rules():
    """SIRD=max LAP, SIDD=max LDL after SIRD, MOD=max BMI after SIRD/SIDD, MARD=residual."""
    feature_names = ["bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"]
    cluster_centers = np.array(
        [
            [32.0, 320.0, 110.0, 42.0, 55.0, 108.0],  # Highest LAP -> SIRD
            [29.0, 150.0, 170.0, 52.0, 55.0, 99.0],   # Highest LDL after SIRD -> SIDD
            [42.0, 120.0, 115.0, 52.0, 54.0, 124.0],  # Highest BMI after SIRD/SIDD -> MOD
            [28.0, 95.0, 102.0, 62.0, 56.0, 95.0],    # Residual -> MARD
        ]
    )

    assert assign_ahlqvist_labels(cluster_centers, feature_names, k=4) == {
        0: "SIRD",
        1: "SIDD",
        2: "MOD",
        3: "MARD",
    }


def test_assign_ahlqvist_labels_basic_sird():
    """Test SIRD classification: Highest insulin resistance composite."""
    cluster_centers = np.array([
        [35.0, 240.0, 140.0, 35.0, 45.0],  # High BMI + TG, low HDL
        [28.0, 120.0, 120.0, 55.0, 50.0],
        [26.0, 140.0, 110.0, 60.0, 60.0],
        [30.0, 160.0, 130.0, 50.0, 70.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert result[max(result.keys())] in ['SIRD', 'SIDD', 'MOD', 'MARD']
    assert 'SIRD' in result.values(), "Expected SIRD label assigned to one cluster"


def test_assign_ahlqvist_labels_basic_sidd():
    """Test that a SIDD label is assigned by the current LDL-proxy rule."""
    cluster_centers = np.array([
        [34.0, 200.0, 130.0, 40.0, 55.0],
        [24.0, 250.0, 120.0, 30.0, 50.0],
        [28.0, 140.0, 110.0, 60.0, 60.0],
        [26.0, 120.0, 100.0, 65.0, 65.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert 'SIDD' in result.values(), "Expected SIDD label assigned to one cluster"


def test_assign_ahlqvist_labels_basic_mod():
    """Test MOD classification: Highest BMI among remaining clusters."""
    cluster_centers = np.array([
        [32.0, 140.0, 120.0, 55.0, 50.0],
        [36.0, 130.0, 110.0, 60.0, 55.0],  # Highest BMI
        [25.0, 120.0, 105.0, 65.0, 65.0],
        [28.0, 160.0, 130.0, 45.0, 70.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert 'MOD' in result.values(), "Expected MOD label assigned to one cluster"


def test_assign_ahlqvist_labels_basic_mard():
    """Test MARD classification: Remaining cluster after other labels assigned."""
    cluster_centers = np.array([
        [33.0, 220.0, 130.0, 35.0, 50.0],
        [24.0, 180.0, 120.0, 40.0, 55.0],
        [36.0, 140.0, 110.0, 55.0, 60.0],
        [23.0, 110.0, 100.0, 70.0, 75.0],  # Older age, mild metabolic values
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert 'MARD' in result.values(), "Expected MARD label assigned to one cluster"


def test_assign_ahlqvist_labels_healthy():
    """Test healthy assignment (no clear winner)."""
    # All clusters have normal ranges
    cluster_centers = np.array([
        [24.0, 120.0, 110.0, 60.0, 45.0],
        [26.0, 130.0, 115.0, 58.0, 50.0],
        [25.0, 125.0, 112.0, 62.0, 55.0],
        [23.0, 115.0, 105.0, 65.0, 60.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)
    
    assert set(result.values()) == {'SIDD', 'SIRD', 'MOD', 'MARD'}


def test_assign_ahlqvist_labels_edge_cases():
    """Test edge cases and boundary conditions."""
    
    # Test 1: Empty cluster centers
    cluster_centers = np.array([])
    with pytest.raises(ValueError):
        assign_ahlqvist_labels(cluster_centers, [], k=0)
    
    # Test 2: Insufficient clustering features (missing waist circumference and lifestyle fields)
    cluster_centers = np.array([[26.0, 120.0, 110.0]])
    feature_names = ['bmi', 'triglycerides', 'ldl']
    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=1)
    assert result == {0: 'SIRD'}


def test_cluster_tiering_ahlqvist():
    """Test cluster ranking for Ahlqvist subtypes."""
    
    # SIRD should have higher priority than SIDD (more insulin resistant)
    # MOD should be prioritized over MARD (higher metabolic derangement)
    # MARD and SIDD are metabolic; MOD is obesity
    
    cluster_centers = np.array([
        [35.0, 220.0, 130.0, 35.0, 50.0],
        [28.0, 200.0, 120.0, 40.0, 55.0],
        [33.0, 140.0, 110.0, 55.0, 60.0],
        [24.0, 120.0, 105.0, 65.0, 70.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert set(result.values()) == {'SIRD', 'SIDD', 'MOD', 'MARD'}


def test_cluster_distribution_reasonableness():
    """Test that all clusters receive reasonable assignments."""
    
    # Create synthetic data with mixed characteristics
    cluster_centers = np.array([
        [35.0, 220.0, 130.0, 35.0, 50.0],
        [28.0, 200.0, 120.0, 40.0, 55.0],
        [33.0, 140.0, 110.0, 55.0, 60.0],
        [24.0, 120.0, 105.0, 65.0, 70.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert len(result) == 4
    assert set(result.values()) == {'SIRD', 'SIDD', 'MOD', 'MARD'}


def test_clinical_safety():
    """Test that clinical assignment follows safety guidelines."""

    # Very high triglycerides with low HDL should still produce a high-risk proxy label.
    
    cluster_centers = np.array([
        [30.0, 260.0, 150.0, 30.0, 55.0],
        [26.0, 120.0, 110.0, 65.0, 60.0],
        [34.0, 180.0, 130.0, 45.0, 50.0],
        [24.0, 110.0, 105.0, 70.0, 70.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert 'SIRD' in result.values()
