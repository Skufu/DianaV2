"""
Test suite for Ian_ML/training/train_v2.py - Feature Engineering Logic
Tests clinical thresholds, ratios, and encoding functions for v2 reduced features
"""

import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add training directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "training"))
from train_v2 import engineer_features_reduced


def create_test_df(**kwargs):
    """Helper to create test DataFrame with all required columns."""
    defaults = {
        'bmi': 25.0,
        'triglycerides': 150.0,
        'hdl': 50.0,
        'ldl': 130.0,
        'age': 55.0,
        'systolic': 120.0,
        'diastolic': 80.0,
        'smoking_status': 'Never',
        'physical_activity': 'Moderate',
        'alcohol_use': 'Light'
    }
    defaults.update(kwargs)
    return pd.DataFrame([defaults])


def test_bmi_categorization_underweight():
    """Test BMI < 18.5 returns 0 (Underweight)."""
    df = create_test_df(bmi=[16.5, 17.0, 18.4])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 0), "All underweight BMIs should be category 0"


def test_bmi_categorization_normal():
    """Test 18.5 <= BMI < 25 returns 1 (Normal)."""
    df = create_test_df(bmi=[18.5, 20.0, 24.9])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 1), "All normal BMIs should be category 1"


def test_bmi_categorization_overweight():
    """Test 25 <= BMI < 30 returns 2 (Overweight)."""
    df = create_test_df(bmi=[25.0, 27.0, 29.9])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 2), "All overweight BMIs should be category 2"


def test_bmi_categorization_obese():
    """Test BMI >= 30 returns 3 (Obese)."""
    df = create_test_df(bmi=[30.0, 35.0, 40.0])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 3), "All obese BMIs should be category 3"


def test_bmi_categorization_boundary():
    """Test BMI category boundaries."""
    df = pd.DataFrame({
        'bmi': [18.49, 18.5, 24.99, 25.0, 29.99, 30.0],
        'triglycerides': [150.0] * 6,
        'hdl': [50.0] * 6,
    })
    result = engineer_features_reduced(df)
    
    expected = [0, 1, 1, 2, 2, 3]
    assert list(result['bmi_category']) == expected, \
        f"Boundary values incorrect: {list(result['bmi_category'])} vs {expected}"


def test_tg_hdl_ratio_calculation():
    """Test TG/HDL ratio calculation (insulin resistance marker)."""
    df = pd.DataFrame({
        'triglycerides': [150.0, 200.0, 100.0],
        'hdl': [50.0, 40.0, 25.0],
        'bmi': [25.0] * 3,
    })
    result = engineer_features_reduced(df)
    
    expected_ratios = [3.0, 5.0, 4.0]
    assert list(result['tg_hdl_ratio']) == expected_ratios, \
        f"TG/HDL ratios incorrect: {list(result['tg_hdl_ratio'])} vs {expected_ratios}"


def test_tg_hdl_ratio_zero_hdl():
    """Test TG/HDL ratio with HDL = 0 (div by zero protection)."""
    df = pd.DataFrame({
        'triglycerides': [100.0],
        'hdl': [0.0],
        'bmi': [25.0],
    })
    result = engineer_features_reduced(df)
    
    assert pd.isna(result['tg_hdl_ratio'][0]), "HDL=0 should result in NaN for TG/HDL ratio"


def test_metabolic_syndrome_scoring():
    """Test metabolic syndrome score calculation (ATP III criteria)."""
    df = pd.DataFrame({
        'triglycerides': [160.0, 140.0, 200.0, 40.0],
        'hdl': [45.0, 55.0, 30.0, 60.0],
        'systolic': [135.0, 125.0, 140.0, 120.0],
        'bmi': [32.0, 28.0, 30.0, 29.0]
    })
    result = engineer_features_reduced(df)
    
    expected_scores = [3, 0, 3, 0]
    assert list(result['metabolic_syndrome_score']) == expected_scores, \
        f"Metabolic syndrome scores incorrect: {list(result['metabolic_syndrome_score'])} vs {expected_scores}"


def test_smoking_encoding():
    """Test smoking status encoding."""
    df = pd.DataFrame({
        'smoking_status': ['Never', 'Former', 'Current', 'Unknown'],
        'bmi': [25.0] * 4,
        'triglycerides': [150.0] * 4,
        'hdl': [50.0] * 4,
    })
    result = engineer_features_reduced(df)
    
    expected = [0, 1, 2, 1]
    assert list(result['smoking_encoded']) == expected, \
        f"Smoking encoding incorrect: {list(result['smoking_encoded'])} vs {expected}"


def test_physical_activity_encoding():
    """Test physical activity level encoding."""
    df = pd.DataFrame({
        'physical_activity': ['Sedentary', 'Moderate', 'Active', 'Unknown'],
        'bmi': [25.0] * 4,
        'triglycerides': [150.0] * 4,
        'hdl': [50.0] * 4,
    })
    result = engineer_features_reduced(df)
    
    expected = [0, 1, 2, 1]
    assert list(result['activity_encoded']) == expected, \
        f"Activity encoding incorrect: {list(result['activity_encoded'])} vs {expected}"


def test_alcohol_use_encoding():
    """Test alcohol use level encoding."""
    df = pd.DataFrame({
        'alcohol_use': ['None', 'Light', 'Moderate', 'Heavy'],
        'bmi': [25.0] * 4,
        'triglycerides': [150.0] * 4,
        'hdl': [50.0] * 4,
    })
    result = engineer_features_reduced(df)
    
    expected = [0, 1, 2, 3]
    assert list(result['alcohol_encoded']) == expected, \
        f"Alcohol encoding incorrect: {list(result['alcohol_encoded'])} vs {expected}"


def test_feature_engineering_consistency():
    """Test that all derived features are created consistently."""
    df = pd.DataFrame({
        'bmi': [28.0, 32.0],
        'triglycerides': [150.0, 200.0],
        'hdl': [45.0, 40.0],
        'ldl': [130.0, 150.0],
        'age': [55.0, 60.0],
        'systolic': [135.0, 145.0],
        'diastolic': [85.0, 92.0],
        'smoking_status': ['Former', 'Current'],
        'physical_activity': ['Moderate', 'Sedentary'],
        'alcohol_use': ['Light', 'None']
    })
    result = engineer_features_reduced(df)
    
    # Verify all expected features are present (v2 reduced set)
    expected_features = [
        'bmi_category', 'tg_hdl_ratio',
        'smoking_encoded', 'activity_encoded', 'alcohol_encoded',
        'metabolic_syndrome_score'
    ]
    
    for feature in expected_features:
        assert feature in result.columns, \
            f"Expected derived feature '{feature}' not found in result"
        assert len(result[feature]) == 2, \
            f"Feature '{feature}' should have 2 values"


def test_v2_reduced_features_list():
    """Test that v2 uses the 13-feature reduced set."""
    from train_v2 import REDUCED_FEATURES
    
    assert len(REDUCED_FEATURES) == 13, f"Expected 13 features, got {len(REDUCED_FEATURES)}"
    
    expected_features = [
        "bmi", "triglycerides", "ldl", "hdl", "age",
        "systolic", "diastolic",
        "bmi_category", "tg_hdl_ratio",
        "smoking_encoded", "activity_encoded", "alcohol_encoded",
        "metabolic_syndrome_score",
    ]
    
    for feat in expected_features:
        assert feat in REDUCED_FEATURES, f"Expected feature '{feat}' not in REDUCED_FEATURES"
