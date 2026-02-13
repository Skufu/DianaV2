#!/usr/bin/env python3
"""Test the updated ClinicalPredictor with 13 features"""
import sys
sys.path.insert(0, '.')
from Ian_ML.predict import ClinicalPredictor, CLINICAL_FEATURES

print('Testing ClinicalPredictor with updated 13 features...')
print(f'Total features used: {len(CLINICAL_FEATURES)}')
print(f'Features: {CLINICAL_FEATURES}')

# Test data - only base features needed
test_patient = {
    'bmi': 29.4,
    'triglycerides': 180,
    'ldl': 132,
    'hdl': 48,
    'age': 55,
    'systolic': 130,
    'diastolic': 85,
    'smoking_status': 'Never',
    'physical_activity': 'Moderate',
    'alcohol_use': 'Light'
}

try:
    predictor = ClinicalPredictor()
    result = predictor.predict(test_patient)
    if result.get('success'):
        print('\n✓ Prediction successful!')
        print(f"  Status: {result['predicted_status']}")
        print(f"  Risk Score: {result['risk_score']}")
        print(f"  Probability: {result['probability']}")
        print(f"  Model: {result['model_info']['classifier']}")
        print(f"  AUC: {result['model_info']['auc_roc']}")
    else:
        print(f"\n✗ Prediction failed: {result.get('error')}")
except FileNotFoundError as e:
    print(f'\n⚠ Model files not found (need to train first): {e}')
    print('   Run: python Ian_ML/train.py')
except Exception as e:
    print(f'\n✗ Error: {e}')
    import traceback
    traceback.print_exc()
