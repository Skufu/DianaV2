"""
Test suite for ml/clustering.py - Ahlqvist subtype assignment
Focuses on clinical safety of subtype classification logic
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA


def test_assign_ahlqvist_labels_basic_sird():
    """Test SIRD classification: Highest HbA1c and BMI dominance."""
    # Create mock cluster centers
    cluster_centers = pd.DataFrame({
        'sird_bmi_high_hba1c': [7.5, 35.0],  # SIRD: High BMI, high HbA1c
        'sird_high_hba1c': [9.0, 32.0],       # SIRD: High HbA1c only
        'sird_high_bmi': [36.0, 29.0],       # SIRD: High HbA1c, high BMI
    })
    
    # Test: SIRD should be selected for high BMI + high HbA1c
    result = assign_ahlqvist_labels(cluster_centers)
    
    assert result == 'SIRD', f"Expected SIRD, got {result}"
    assert result['label'] == 'SIRD', f"Expected SIRD label"
    assert result['clinical_implication'] == 'Responds well to insulin sensitizers (metformin)', \
        f"Expected clinical implication for SIRD"


def test_assign_ahlqvist_labels_basic_sidd():
    """Test SIDD classification: Highest FBS + high TG."""
    # SIDD: Highest FBS (>=140 mg/dL)
    # SIRD also has FBS but SIDD prioritizes TG over HbA1c
    # Combined effect: metabolic inflexibility
    
    cluster_centers = pd.DataFrame({
        'sidd_high_fbs_tg': [180.0, 220.0],  # SIDD: Very high FBS, very high TG
        'sidd_high_fbs': [165.0, 140.0],       # SIDD: High FBS, high TG (less metabolic derangement than SIRD)
        })
    
    result = assign_ahlqvist_labels(cluster_centers)
    
    assert result == 'SIDD', f"Expected SIDD, got {result}"
    assert result['label'] == 'SIDD', f"Expected SIDD label"
    # Note: FBS and TG are high, but HbA1c is normal, so SIDD wins


def test_assign_ahlqvist_labels_basic_mod():
    """Test MOD classification: High BMI (>30) is primary."""
    # MOD is characterized by severe obesity (BMI > 30)
    
    cluster_centers = pd.DataFrame({
        'mod_high_bmi': [34.0, 36.0],  # MOD: Very high BMI
        'mod_high_bmi_age': [34.0, 70.0],  # MOD: High BMI, older age
        })
    
    result = assign_ahlqvist_labels(cluster_centers)
    
    assert result == 'MOD', f"Expected MOD, got {result}"
    assert result['label'] == 'MOD', f"Expected MOD label"


def test_assign_ahlqvist_labels_basic_mard():
    """Test MARD classification: Mild age-related diabetes."""
    # MARD is typically older onset with mild metabolic dysfunction
    # Also known as "Mild Age-Related Diabetes"
    
    cluster_centers = pd.DataFrame({
        'mard_mild': [70.0, 26.5],  # MARD: Older age, lower metabolic values
        'mard_mild_age': [75.0, 25.0],  # MARD: Older age still
        })
    
    result = assign_ahlqvist_labels(cluster_centers)
    
    assert result == 'MARD', f"Expected MARD, got {result}"
    assert result['label'] == 'MARD', f"Expected MARD label"


def test_assign_ahlqvist_labels_healthy():
    """Test healthy assignment (no clear winner)."""
    # All clusters have normal ranges
    cluster_centers = pd.DataFrame({
        'healthy_low': [5.5, 24.0, 95.0],  # Normal everything
        'healthy_med': [5.8, 26.0, 100.0],  # Normal HbA1c
        })
    
    result = assign_ahlqvist_labels(cluster_centers)
    
    # All clusters could be classified as healthy but function might choose one
    # For this test, we verify it doesn't crash and has reasonable behavior
    assert result in ['SIDD', 'SIRD', 'MOD', 'MARD'], \
        f"Result should be one of the valid subtypes"


def test_assign_ahlqvist_labels_edge_cases():
    """Test edge cases and boundary conditions."""
    
    # Test 1: Empty cluster centers
    cluster_centers = pd.DataFrame()
    try:
        result = assign_ahlqvist_labels(cluster_centers)
        assert False, "Should return error for empty input"
    except Exception:
        assert False, "Should raise exception for empty input"
    
    # Test 2: Insufficient features (missing HbA1c)
    cluster_centers = pd.DataFrame({
        'no_hba1c': [6.0, 24.0],  # Missing critical biomarker
    })
    
    try:
        result = assign_ahlqvist_labels(cluster_centers)
        # Should classify as metabolic error since HbA1c is missing
        assert result == 'metabolic_error', f"Expected metabolic error for missing HbA1c"
    except Exception:
        assert False, "Should handle missing biomarker gracefully"


def test_cluster_tiering_ahlqvist():
    """Test cluster ranking for Ahlqvist subtypes."""
    
    # SIRD should have higher priority than SIDD (more insulin resistant)
    # MOD should be prioritized over MARD (higher metabolic derangement)
    # MARD and SIDD are metabolic; MOD is obesity
    
    cluster_centers = pd.DataFrame({
        'tier_1_sird': [7.5, 35.0],      # SIRD: Should be tier 1
        'tier_2_sidd': [8.0, 30.0, 200.0],     # SIDD: Tier 2 (insulin resistant)
        'tier_3_mod': [35.0, 32.0],            # MOD: Tier 3 (obese)
        'tier_4_mard': [70.0, 26.5],            # MARD: Tier 4 (older age)
        })
    
    result = assign_ahlqvist_labels(cluster_centers)
    
    # Verify correct tiering
    assert result['tier'] == 1, f"SIRD should be tier 1"
    assert result['label'] == 'SIRD', f"Tier 1 should be SIRD"
    assert result['clinical_implication'] == 'Responds well to insulin sensitizers (metformin)', \
        f"Expected tier 1 clinical implication"
    
    # Test: Verify SIDD (tier 2) has correct clinical implication
    assert result['clinical_implication'] == 'May need early insulin therapy', \
        f"Expected tier 2 clinical implication for SIDD"


def test_cluster_distribution_reasonableness():
    """Test that all clusters receive reasonable assignments."""
    
    # Create synthetic data with mixed characteristics
    cluster_centers = pd.DataFrame({
        'sird': [7.5, 35.0, 0.96, 99.2],  # High BMI + high HbA1c
        'sidd': [9.0, 32.0, 0.88, 97.8],  # High FBS + high TG
        'mod': [35.0, 32.0, 0.92, 96.5],  # High BMI only
        'mard': [70.0, 26.5, 0.93, 95.8],  # Older age, normal values
        })
    
    result = assign_ahlqvist_labels(cluster_centers)
    
    # Verify distribution
    counts = result['label'].value_counts().sort_values(ascending=False)
    assert len(counts) == 4, f"Expected 4 cluster types"
    assert counts.index[0] == 'SIRD', f"Most common should be SIRD or SIDD"
    assert counts.values[0] >= 1, f"Each cluster should have at least 1 patient"


def test_clinical_safety():
    """Test that clinical assignment follows safety guidelines."""
    
    # Very high FBS (>180) requires immediate clinical attention
    # Very low FBS (<70) with high TG could be hypoglycemia risk
    
    cluster_centers = pd.DataFrame({
        'very_high_fbs_high_tg': [185.0, 210.0, 65.0],  # Dangerous: Very high FBS + very high TG
        })
    
    result = assign_ahlqvist_labels(cluster_centers)
    
    assert result['clinical_implication'] == 'Immediate medical attention required', \
        f"Very high FBS should trigger alert"
    assert result['risk_level'] == 'HIGH', f"Risk level should be HIGH"
