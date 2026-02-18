"""
Test suite for Ian_ML/training/train.py - Feature Engineering Logic
Tests clinical thresholds, ratios, and encoding functions
"""

import pandas as pd
import numpy as np
from train import engineer_features


def create_test_df(**kwargs):
    """Helper to create test DataFrame with all required columns."""
    defaults = {
        'bmi': 25.0,
        'triglycerides': 150.0,
        'hdl': 50.0,
        'ldl': 130.0,
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
    result = engineer_features(df)
    
    assert all(result['bmi_category'] == 0), "All underweight BMIs should be category 0"


def test_bmi_categorization_normal():
    """Test 18.5 <= BMI < 25 returns 1 (Normal)."""
    df = create_test_df(bmi=[18.5, 20.0, 24.9])
    result = engineer_features(df)
    
    assert all(result['bmi_category'] == 1), "All normal BMIs should be category 1"


def test_bmi_categorization_overweight():
    """Test 25 <= BMI < 30 returns 2 (Overweight)."""
    df = create_test_df(bmi=[25.0, 27.0, 29.9])
    result = engineer_features(df)
    
    assert all(result['bmi_category'] == 2), "All overweight BMIs should be category 2"


def test_bmi_categorization_obese():
    """Test BMI >= 30 returns 3 (Obese)."""
    df = create_test_df(bmi=[30.0, 35.0, 40.0])
    result = engineer_features(df)
    
    assert all(result['bmi_category'] == 3), "All obese BMIs should be category 3"


def test_bmi_categorization_boundary():
    """Test BMI category boundaries."""
    df = pd.DataFrame({'bmi': [18.49, 18.5, 24.99, 25.0, 29.99, 30.0]})
    result = engineer_features(df)
    
    expected = [0, 1, 1, 2, 2, 3]
    assert list(result['bmi_category']) == expected, \
        f"Boundary values incorrect: {list(result['bmi_category'])} vs {expected}"


def test_bmi_categorization_null():
    """Test null BMI returns NaN."""
    df = pd.DataFrame({'bmi': [np.nan, None]})
    result = engineer_features(df)
    
    assert pd.isna(result['bmi_category']).all(), "Null BMIs should result in NaN category"


def test_tg_hdl_ratio_calculation():
    """Test TG/HDL ratio calculation (insulin resistance marker)."""
    df = pd.DataFrame({
        'triglycerides': [150.0, 200.0, 100.0],
        'hdl': [50.0, 40.0, 25.0]
    })
    result = engineer_features(df)
    
    expected_ratios = [3.0, 5.0, 4.0]
    assert list(result['tg_hdl_ratio']) == expected_ratios, \
        f"TG/HDL ratios incorrect: {list(result['tg_hdl_ratio'])} vs {expected_ratios}"


def test_tg_hdl_ratio_zero_hdl():
    """Test TG/HDL ratio with HDL = 0 (div by zero protection)."""
    df = pd.DataFrame({
        'triglycerides': [100.0],
        'hdl': [0.0]
    })
    result = engineer_features(df)
    
    assert pd.isna(result['tg_hdl_ratio'][0]), "HDL=0 should result in NaN for TG/HDL ratio"


def test_ldl_hdl_ratio_calculation():
    """Test LDL/HDL ratio calculation (cardiovascular risk)."""
    df = pd.DataFrame({
        'ldl': [130.0, 160.0, 100.0],
        'hdl': [50.0, 40.0, 50.0]
    })
    result = engineer_features(df)
    
    expected_ratios = [2.6, 4.0, 2.0]
    assert list(result['ldl_hdl_ratio']) == expected_ratios, \
        f"LDL/HDL ratios incorrect: {list(result['ldl_hdl_ratio'])} vs {expected_ratios}"


def test_vldl_calculation():
    df = pd.DataFrame({'triglycerides': [100.0, 150.0, 200.0]})
    result = engineer_features(df)
    
    expected_vldl = [20.0, 30.0, 40.0]
    assert list(result['vldl']) == expected_vldl, \
        f"VLDL values incorrect: {list(result['vldl'])} vs {expected_vldl}"


def test_non_hdl_calculation():
    df = pd.DataFrame({
        'ldl': [100.0, 120.0],
        'triglycerides': [100.0, 150.0]
    })
    result = engineer_features(df)
    
    expected_non_hdl = [120.0, 150.0]
    assert list(result['non_hdl']) == expected_non_hdl, \
        f"Non-HDL values incorrect: {list(result['non_hdl'])} vs {expected_non_hdl}"


def test_bp_categorization_normal():
    """Test BP < 120/80 returns 0 (Normal)."""
    df = pd.DataFrame({
        'systolic': [115.0, 119.0, 110.0],
        'diastolic': [75.0, 79.0, 70.0]
    })
    result = engineer_features(df)
    
    assert all(result['bp_category'] == 0), "All normal BPs should be category 0"


def test_bp_categorization_elevated():
    """Test 120 <= systolic < 130 and diastolic < 80 returns 1 (Elevated)."""
    df = pd.DataFrame({
        'systolic': [120.0, 125.0, 129.0],
        'diastolic': [75.0, 79.0, 78.0]
    })
    result = engineer_features(df)
    
    assert all(result['bp_category'] == 1), "All elevated BPs should be category 1"


def test_bp_categorization_stage1():
    """Test systolic >= 130 OR diastolic >= 90 returns 2 (Stage 1)."""
    df = pd.DataFrame({
        'systolic': [130.0, 140.0, 120.0],
        'diastolic': [85.0, 85.0, 90.0]
    })
    result = engineer_features(df)
    
    assert all(result['bp_category'] == 2), "All Stage 1 BPs should be category 2"


def test_bp_categorization_stage2():
    """Test systolic >= 140 AND diastolic >= 90 returns 3 (Stage 2)."""
    df = pd.DataFrame({
        'systolic': [140.0, 150.0, 160.0],
        'diastolic': [90.0, 95.0, 100.0]
    })
    result = engineer_features(df)
    
    assert all(result['bp_category'] == 3), "All Stage 2 BPs should be category 3"


def test_hypertension_classification():
    """Test hypertension binary classification."""
    df = pd.DataFrame({
        'systolic': [135.0, 145.0, 130.0],
        'diastolic': [88.0, 92.0, 89.0]
    })
    result = engineer_features(df)
    
    expected = [False, True, True]  # 130-85 (No), 145-92 (Yes), 130-89 (Yes)
    assert list(result['hypertension']) == expected, \
        f"Hypertension classification incorrect: {list(result['hypertension'])} vs {expected}"


def test_metabolic_syndrome_scoring():
    df = pd.DataFrame({
        'triglycerides': [160.0, 140.0, 200.0, 40.0],
        'hdl': [45.0, 55.0, 30.0, 60.0],
        'systolic': [135.0, 125.0, 140.0, 120.0],
        'bmi': [32.0, 28.0, 30.0, 29.0]
    })
    result = engineer_features(df)
    
    expected_scores = [3, 0, 3, 0]
    assert list(result['metabolic_syndrome_score']) == expected_scores, \
        f"Metabolic syndrome scores incorrect: {list(result['metabolic_syndrome_score'])} vs {expected_scores}"


def test_smoking_encoding():
    """Test smoking status encoding."""
    df = pd.DataFrame({
        'smoking_status': ['Never', 'Former', 'Current', 'Unknown']
    })
    result = engineer_features(df)
    
    expected = [0, 1, 2, 1]
    assert list(result['smoking_encoded']) == expected, \
        f"Smoking encoding incorrect: {list(result['smoking_encoded'])} vs {expected}"


def test_physical_activity_encoding():
    """Test physical activity level encoding."""
    df = pd.DataFrame({
        'physical_activity': ['Sedentary', 'Moderate', 'Active', 'Unknown']
    })
    result = engineer_features(df)
    
    expected = [0, 1, 2, 1]
    assert list(result['activity_encoded']) == expected, \
        f"Activity encoding incorrect: {list(result['activity_encoded'])} vs {expected}"


def test_alcohol_use_encoding():
    """Test alcohol use level encoding."""
    df = pd.DataFrame({
        'alcohol_use': ['None', 'Light', 'Moderate', 'Heavy']
    })
    result = engineer_features(df)
    
    expected = [0, 1, 2, 3]
    assert list(result['alcohol_encoded']) == expected, \
        f"Alcohol encoding incorrect: {list(result['alcohol_encoded'])} vs {expected}"


def test_cholesterol_hdl_ratio_squared():
    """Test TG/HDL ratio squared (captures non-linear relationship)."""
    df = pd.DataFrame({
        'triglycerides': [150.0],
        'hdl': [50.0]
    })
    result = engineer_features(df)
    
    expected = 9.0  # (150/50)^2 = 3^2 = 9
    assert result['tg_hdl_ratio_sq'][0] == expected, \
        f"TG/HDL ratio squared incorrect: {result['tg_hdl_ratio_sq'][0]} vs {expected}"


def test_clinical_safety_zero_handling():
    """Test zero handling in division calculations."""
    df = pd.DataFrame({
        'triglycerides': [100.0, 100.0],
        'hdl': [0.0, 10.0],
        'ldl': [130.0, 130.0],
    })
    result = engineer_features(df)
    
    # First row: HDL=0 should cause NaN in ratios
    assert pd.isna(result['tg_hdl_ratio'][0]), "HDL=0 should result in NaN TG/HDL"
    assert pd.isna(result['ldl_hdl_ratio'][0]), "HDL=0 should result in NaN LDL/HDL"
    assert pd.isna(result['cholesterol_hdl_ratio'][0]), "HDL=0 should result in NaN total/HDL"
    
    # Second row: HDL=10 should work
    assert not pd.isna(result['tg_hdl_ratio'][1]), "HDL=10 should result in valid TG/HDL"
    assert result['tg_hdl_ratio'][1] == 10.0, "100/10 should equal 10"


def test_missing_feature_handling():
    """Test handling of missing biomarker features."""
    df = pd.DataFrame({
        'bmi': [25.0, np.nan],
        'triglycerides': [np.nan, 150.0],
        'hdl': [50.0, np.nan],
    })
    result = engineer_features(df)
    
    # Should handle missing values gracefully
    assert pd.isna(result['bmi_category'][1]), "Missing BMI should result in NaN category"
    assert pd.isna(result['tg_hdl_ratio'][0]), "Missing TG should result in NaN ratio"
    assert pd.isna(result['tg_hdl_ratio'][1]), "Missing HDL should result in NaN ratio"


def test_feature_engineering_consistency():
    """Test that all derived features are created consistently."""
    df = pd.DataFrame({
        'bmi': [28.0, 32.0],
        'triglycerides': [150.0, 200.0],
        'hdl': [45.0, 40.0],
        'ldl': [130.0, 150.0],
        'systolic': [135.0, 145.0],
        'diastolic': [85.0, 92.0],
        'smoking_status': ['Former', 'Current'],
        'physical_activity': ['Moderate', 'Sedentary'],
        'alcohol_use': ['Light', 'None']
    })
    result = engineer_features(df)
    
    # Verify all expected features are present
    expected_features = [
        'bmi_category', 'tg_hdl_ratio', 'ldl_hdl_ratio',
        'vldl', 'non_hdl', 'cholesterol_hdl_ratio', 'tg_hdl_ratio_sq',
        'bp_category', 'hypertension', 'metabolic_syndrome_score',
        'smoking_encoded', 'activity_encoded', 'alcohol_encoded'
    ]
    
    for feature in expected_features:
        assert feature in result.columns, \
            f"Expected derived feature '{feature}' not found in result"
        assert len(result[feature]) == 2, \
            f"Feature '{feature}' should have 2 values"
