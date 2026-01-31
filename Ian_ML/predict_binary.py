"""
Binary Risk Predictor for DIANA
Returns risk percentage (0-100%) for menopausal women
"""

import joblib
import numpy as np
import json
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models" / "binary"

# 11 features (same as training)
FEATURES = [
    'age', 'bmi', 'hdl', 'triglycerides', 'total_cholesterol',
    'systolic', 'diastolic', 'ldl',
    'smoking_status', 'physical_activity', 'alcohol_use'
]


class BinaryRiskPredictor:
    """
    Diabetes risk predictor for menopausal women.
    Returns risk percentage (0-100%).
    """
    
    def __init__(self):
        self.model = joblib.load(MODELS_DIR / "best_model.joblib")
        self.scaler = joblib.load(MODELS_DIR / "scaler.joblib")
        
        with open(MODELS_DIR / "results" / "binary_model_report.json") as f:
            self.metrics = json.load(f)
    
    def predict_risk(self, patient_data: dict) -> dict:
        """
        Predict diabetes risk percentage.
        
        Args:
            patient_data: Dict with keys: age, bmi, hdl, triglycerides,
                         total_cholesterol, systolic, diastolic, ldl,
                         smoking_status, physical_activity, alcohol_use
        
        Returns:
            Dict with risk_score (0-100), risk_level, probability
        """
        # Validate
        missing = [f for f in FEATURES if f not in patient_data]
        if missing:
            return {"error": f"Missing features: {missing}"}
        
        # Prepare features
        X = np.array([[patient_data[f] for f in FEATURES]])
        X_scaled = self.scaler.transform(X)
        
        # Predict
        proba = self.model.predict_proba(X_scaled)[0]
        risk_percent = int(proba[1] * 100)  # Probability of diabetic class
        
        # Risk level
        if risk_percent < 30:
            risk_level = "Low"
        elif risk_percent < 70:
            risk_level = "Moderate"
        else:
            risk_level = "High"
        
        return {
            "risk_score": risk_percent,
            "risk_level": risk_level,
            "probability_diabetic": round(proba[1], 4),
            "probability_non_diabetic": round(proba[0], 4),
            "model_auc": self.metrics["metrics"]["auc_roc"],
            "features_used": len(FEATURES)
        }


# Example usage
if __name__ == "__main__":
    predictor = BinaryRiskPredictor()
    
    # Example patient
    patient = {
        "age": 55,
        "bmi": 28.5,
        "hdl": 45,
        "triglycerides": 150,
        "total_cholesterol": 200,
        "systolic": 130,
        "diastolic": 85,
        "ldl": 130,
        "smoking_status": 0,  # Never
        "physical_activity": 1,  # Moderate
        "alcohol_use": 1  # Light
    }
    
    result = predictor.predict_risk(patient)
    print(f"\nRisk Assessment:")
    print(f"  Risk Score: {result['risk_score']}%")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Model AUC: {result['model_auc']}")
