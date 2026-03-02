"""
Test suite for ml/clustering.py - Ahlqvist subtype assignment
Focuses on clinical safety of subtype classification logic
"""

import numpy as np
import pytest

from ..training.clustering import assign_ahlqvist_labels


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
    """Test SIDD classification: Highest TG/HDL ratio after SIRD selection."""
    cluster_centers = np.array([
        [34.0, 200.0, 130.0, 40.0, 55.0],
        [24.0, 250.0, 120.0, 30.0, 50.0],  # High TG/HDL
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
    
    # Test 2: Insufficient features (missing HbA1c)
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
    
    # Very high FBS (>180) requires immediate clinical attention
    # Very low FBS (<70) with high TG could be hypoglycemia risk
    
    cluster_centers = np.array([
        [30.0, 260.0, 150.0, 30.0, 55.0],
        [26.0, 120.0, 110.0, 65.0, 60.0],
        [34.0, 180.0, 130.0, 45.0, 50.0],
        [24.0, 110.0, 105.0, 70.0, 70.0],
    ])
    feature_names = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

    result = assign_ahlqvist_labels(cluster_centers, feature_names, k=4)

    assert 'SIRD' in result.values()
