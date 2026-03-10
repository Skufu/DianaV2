

import pandas as pd
from ..training.train_binary_v2_no_bp import engineer_features as engineer_features_reduced
from ..common.feature_constants import CLINICAL_FEATURES_NO_BP


def create_test_df(**kwargs: object) -> pd.DataFrame:
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
        'alcohol_use': 'Light',
        'waist_circumference': 85.0,
        'family_history_diabetes': 0.0,
        'crp': 0.5,
    }
    if kwargs:
        defaults = {**defaults, **kwargs}
    n = 1
    for v in defaults.values():
        if isinstance(v, list):
            n = len(v)
            break
    normalized: dict[str, list[object]] = {}
    for key, value in defaults.items():
        normalized[str(key)] = list(value) if isinstance(value, list) else [value] * n
    return pd.DataFrame(normalized)


def test_bmi_categorization_underweight():
    df = create_test_df(bmi=[16.5, 17.0, 18.4])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 0), "All underweight BMIs should be category 0"


def test_bmi_categorization_normal():
    df = create_test_df(bmi=[19.0, 20.0, 22.9])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 1), "All normal BMIs should be category 1"


def test_bmi_categorization_overweight():
    df = create_test_df(bmi=[23.1, 24.0, 24.9])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 2), "All overweight BMIs should be category 2"


def test_bmi_categorization_obese():
    df = create_test_df(bmi=[25.1, 30.0, 35.0])
    result = engineer_features_reduced(df)
    
    assert all(result['bmi_category'] == 3), "All obese BMIs should be category 3"


def test_bmi_categorization_boundary():
    df = pd.DataFrame({
        'bmi': [18.49, 18.5, 22.99, 23.0, 24.99, 25.0],
        'triglycerides': [150.0] * 6,
        'hdl': [50.0] * 6,
    })
    result = engineer_features_reduced(df)
    
    expected = [0.0, 1.0, 1.0, 2.0, 2.0, 3.0]
    assert list(result['bmi_category']) == expected, \
        f"Boundary values incorrect: {list(result['bmi_category'])} vs {expected}"


def test_tg_hdl_ratio_calculation():
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
    df = pd.DataFrame({
        'triglycerides': [100.0],
        'hdl': [0.0],
        'bmi': [25.0],
    })
    result = engineer_features_reduced(df)
    
    assert bool(pd.isna(result['tg_hdl_ratio'].iloc[0])), "HDL=0 should result in NaN for TG/HDL ratio"


def test_metabolic_syndrome_scoring():
    df = pd.DataFrame({
        'triglycerides': [160.0, 140.0, 200.0, 40.0],
        'hdl': [45.0, 55.0, 30.0, 60.0],
        'systolic': [135.0, 125.0, 140.0, 120.0],
        'bmi': [26.0, 24.0, 26.0, 24.0],
        'waist_circumference': [90.0, 70.0, 95.0, 75.0],  # >=80 adds 1
    })
    result = engineer_features_reduced(df)
    
    expected_scores = [4, 0, 4, 0]
    assert list(result['metabolic_syndrome_score']) == expected_scores, \
        f"Metabolic syndrome scores incorrect: {list(result['metabolic_syndrome_score'])} vs {expected_scores}"


def test_metabolic_syndrome_without_waist():
    df = pd.DataFrame({
        'triglycerides': [160.0],
        'hdl': [45.0],
        'systolic': [135.0],
        'bmi': [26.0],
    })
    result = engineer_features_reduced(df)
    
    expected = [3]
    assert list(result['metabolic_syndrome_score']) == expected, \
        f"Score without waist incorrect: {list(result['metabolic_syndrome_score'])} vs {expected}"


def test_smoking_encoding():
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
        'alcohol_use': ['Light', 'None'],
        'waist_circumference': [85.0, 95.0],
        'family_history_diabetes': [0.0, 1.0],
        'crp': [0.5, 2.0],
    })
    result = engineer_features_reduced(df)
    
    # Verify all expected derived features are present
    expected_features = [
        'bmi_category', 'tg_hdl_ratio',
        'smoking_encoded', 'activity_encoded', 'alcohol_encoded',
        'metabolic_syndrome_score',
    ]
    
    for feature in expected_features:
        assert feature in result.columns, \
            f"Expected derived feature '{feature}' not found in result"
        assert len(result[feature]) == 2, \
            f"Feature '{feature}' should have 2 values"


def test_no_bp_features_list():
    """Test that no-bp model uses the expected feature set."""
    assert len(CLINICAL_FEATURES_NO_BP) == 9, f"Expected 9 features, got {len(CLINICAL_FEATURES_NO_BP)}"

    expected_features = [
        "bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference",
        "smoking_encoded", "activity_encoded", "alcohol_encoded",
    ]

    for feat in expected_features:
        assert feat in CLINICAL_FEATURES_NO_BP, f"Expected feature '{feat}' not in CLINICAL_FEATURES_NO_BP"
