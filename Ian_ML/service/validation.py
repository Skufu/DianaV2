# Input validation for ML predictions
# Validates that input values are within training data ranges

TRAINING_DATA_RANGES = {
    'bmi': (15.0, 60.0),
    'triglycerides': (20.0, 800.0),
    'ldl': (20.0, 300.0),
    'hdl': (10.0, 120.0),
    'age': (18, 100),
    'waist_circumference': (50.0, 180.0),
    'hba1c': (3.5, 15.0),
    'fbs': (50.0, 400.0),
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
