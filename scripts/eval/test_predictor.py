#!/usr/bin/env python3
"""Test the updated ClinicalPredictor with 12 features."""
import sys
sys.path.insert(0, '.')
from Ian_ML.service.predict import ClinicalPredictor, CLINICAL_FEATURES

print('Testing ClinicalPredictor with updated 12 features...')
print(f'Total features used: {len(CLINICAL_FEATURES)}')
print(f'Features: {CLINICAL_FEATURES}')

# Test data - only base features needed
test_patient: dict[str, float] = {
    'bmi': 29.4,
    'triglycerides': 180,
    'ldl': 132,
    'hdl': 48,
    'age': 55,
    'waist_circumference': 86,
    'smoking_status': 0,
    'physical_activity': 1,
    'alcohol_use': 1
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
    print('   Run: python Ian_ML/training/train_binary_v2_no_bp.py')
except Exception as e:
    print(f'\n✗ Error: {e}')
    import traceback
    traceback.print_exc()
