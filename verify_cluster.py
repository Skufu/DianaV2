import json
from Ian_ML.service.predict import ClinicalPredictor
import os
os.environ["PYTHONPATH"] = os.getcwd()

predictor = ClinicalPredictor()
data = {
    "age": 58,
    "bmi": 34.5,
    "waist_circumference": 95,
    "triglycerides": 280,
    "hdl": 30,
    "ldl": 110,
    "smoking_status": "Current",
    "physical_activity": "Sedentary",
    "alcohol_use": "Moderate"
}

res = predictor.predict(data)
print(json.dumps(res, indent=2))
