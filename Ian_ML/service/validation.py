# Input validation for ML predictions
# Validates that input values are within training data ranges

from Ian_ML.common.feature_constants import CLINICAL_PLAUSIBILITY_RANGES

# Merge centralized plausibility ranges with BP-specific ranges
# (BP ranges are not in the centralized set because BP is not in
# the active no-BP model's feature list)
TRAINING_DATA_RANGES = {
    **CLINICAL_PLAUSIBILITY_RANGES,
    'systolic': (50, 300),
    'diastolic': (30, 200),
}


def validate_input_ranges(data: dict) -> list:
    """
    Validate input values against training data ranges.
    Returns warnings for out-of-distribution values.
    """
    warnings = []
    
    for field, (min_val, max_val) in TRAINING_DATA_RANGES.items():
        value = data.get(field)
        if value is None:
            continue
        
        try:
            float_val = float(value)
            if float_val < min_val:
                warnings.append(f"{field}: {float_val} is below training range ({min_val}-{max_val}). Prediction may be unreliable.")
            elif float_val > max_val:
                warnings.append(f"{field}: {float_val} is above training range ({min_val}-{max_val}). Prediction may be unreliable.")
        except (ValueError, TypeError):
            continue
    
    return warnings
