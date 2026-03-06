"""
Feature Parity Tests

This module ensures that the feature engineering logic used during model training
exactly matches the feature extraction logic used during model serving/inference.

Why is this important?
- Training often uses batch processing (e.g., Pandas DataFrames).
- Serving often uses single-record processing (e.g., dictionaries/JSON).
- If the calculations (like BMI categorization or TG/HDL ratio) differ even
  slightly between these two environments, it introduces "training-serving skew".
  This skew can cause a model to perform well in training but poorly in production.
  
These tests guarantee that given the same raw input data, both paths produce the 
exact same derived features.
"""
import pytest
import pandas as pd
import numpy as np

from Ian_ML.training.train_binary_v2_no_bp import engineer_features
from Ian_ML.service.predict import ClinicalPredictor
from Ian_ML.common.feature_constants import CLINICAL_FEATURES_NO_BP

@pytest.fixture
def predictor():
    # Bypass __init__ to avoid requiring model artifacts for testing structural parity
    # We only need _build_feature_vector and its dependencies
    pred = ClinicalPredictor.__new__(ClinicalPredictor)
    # The required properties for _build_feature_vector to run
    pred.features = CLINICAL_FEATURES_NO_BP
    return pred

def compare_parity(predictor, data: dict):
    # 1. Training path
    df = pd.DataFrame([data])
    df_eng = engineer_features(df)
    
    # 2. Serving path
    serve_vector = predictor._build_feature_vector(data)[0]
    
    # 3. Compare standard derived features
    features = predictor.features
    serve_dict = dict(zip(features, serve_vector))
    
    # Check bmi_category
    assert df_eng['bmi_category'].iloc[0] == serve_dict['bmi_category'], "BMI Category mismatch"
    
    # Check tg_hdl_ratio
    train_ratio = df_eng['tg_hdl_ratio'].iloc[0]
    serve_ratio = serve_dict['tg_hdl_ratio']
    if pd.isna(train_ratio):
        assert serve_ratio == 0 or pd.isna(serve_ratio), "TG/HDL ratio nan mismatch"
    else:
        assert np.isclose(train_ratio, serve_ratio), "TG/HDL ratio mismatch"
        
    # Check smoking_encoded
    assert df_eng['smoking_encoded'].iloc[0] == serve_dict['smoking_encoded'], "Smoking encoding mismatch"
    
    # Check activity_encoded
    assert df_eng['activity_encoded'].iloc[0] == serve_dict['activity_encoded'], "Activity encoding mismatch"
    
    # Check alcohol_encoded
    assert df_eng['alcohol_encoded'].iloc[0] == serve_dict['alcohol_encoded'], "Alcohol encoding mismatch"
    
    # Check metabolic_syndrome_score
    assert df_eng['metabolic_syndrome_score'].iloc[0] == serve_dict['metabolic_syndrome_score'], "Metabolic score mismatch"

def test_feature_parity_standard(predictor):
    data = {
        'bmi': 24.5,
        'triglycerides': 160.0,
        'ldl': 120.0,
        'hdl': 40.0,
        'age': 55.0,
        'waist_circumference': 85.0,
        'smoking_status': 'Former',
        'physical_activity': 'Moderate',
        'alcohol_use': 'Light',
        'family_history_diabetes': 0.0,
        'crp': 1.0,
        'systolic': 120.0,
        'diastolic': 80.0
    }
    compare_parity(predictor, data)

def test_feature_parity_edge_case_nan_hdl(predictor):
    data = {
        'bmi': 30.0,
        'triglycerides': 200.0,
        'ldl': 150.0,
        'hdl': 0.0,
        'age': 60.0,
        'waist_circumference': np.nan,
        'smoking_status': 'Unknown',
        'physical_activity': 'Unknown',
        'alcohol_use': 'Unknown',
    }
    compare_parity(predictor, data)

def test_feature_parity_boundary_bmi(predictor):
    data = {
        'bmi': 25.0,
        'triglycerides': 140.0,
        'ldl': 100.0,
        'hdl': 60.0,
        'age': 45.0,
        'waist_circumference': 79.0,
        'smoking_status': 'never',
        'physical_activity': 'active',
        'alcohol_use': 'none',
    }
    compare_parity(predictor, data)

def test_feature_parity_capitalization_and_missing(predictor):
    data = {
        'bmi': 22.0,
        'triglycerides': 140.0,
        'ldl': 100.0,
        'hdl': 60.0,
        'age': 45.0,
        'waist_circumference': 80.0,
        'smoking_status': 'NEVER',
        'physical_activity': 'ACTIVE',
        'alcohol_use': 'NONE',
    }
    compare_parity(predictor, data)
