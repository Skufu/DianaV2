import json
import logging
from Ian_ML.service.predict import get_clinical_predictor

logging.basicConfig(level=logging.DEBUG)

def run_test():
    try:
        predictor = get_clinical_predictor()
        if not predictor:
            print("Predictor not available")
            return
            
        patient_data = {
            "bmi": 60,
            "triglycerides": 300,
            "ldl": 111,
            "hdl": 123,
            "age": 54,
            "systolic": 120,
            "diastolic": 80,
            "smoking_status": "Never",
            "physical_activity": "Sedentary",
            "alcohol_use": "Unknown"
        }
        
        result = predictor.predict(patient_data)
        print("Prediction result:")
        print(json.dumps(result, indent=2))
        
        # also print features, scaled features, and coefficients
        features = predictor._build_feature_vector(patient_data)
        scaled = predictor._transform_features(features)
        print("\nFeatures:", features)
        print("Scaled:", scaled)
        print("Classifier Type:", type(predictor.classifier))
        
        # Try to find the actual estimator
        model = predictor.classifier
        if hasattr(model, 'named_steps'):
            print("Pipeline steps:", list(model.named_steps.keys()))
            # find the step that has predict
            for step_name, step_obj in model.named_steps.items():
                if hasattr(step_obj, 'coef_'):
                    model = step_obj
                    print(f"Found model with coef_ at step {step_name}")
                    break
            
        if hasattr(model, 'coef_'):
            print("Coefs:", model.coef_)
            print("Intercept:", model.intercept_)
            
            # calculate dot product
            dot = sum([c*x for c, x in zip(model.coef_[0], scaled[0])]) + model.intercept_[0]
            print("Logit:", dot)
        elif hasattr(model, 'calibrated_classifiers_'):
            print("Calibrated classfier CV detected")
            m = model.calibrated_classifiers_[0].estimator
            if hasattr(m, 'coef_'):
                print("Coefs:", m.coef_)
                print("Intercept:", m.intercept_)
                dot = sum([c*x for c, x in zip(m.coef_[0], scaled[0])]) + m.intercept_[0]
                print("Logit:", dot)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_test()
