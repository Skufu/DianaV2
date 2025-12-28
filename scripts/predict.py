"""
DIANA ML Prediction Module
Provides functions for making predictions on new patient data.

Usage:
    from scripts.predict import DianaPredictor
    predictor = DianaPredictor()
    result = predictor.predict(patient_data)
"""

import pandas as pd
import numpy as np
import joblib
import json
from pathlib import Path
from typing import Dict, Any, Optional

MODELS_DIR = Path(__file__).parent.parent / "models"

# Features expected by the model
REQUIRED_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']


class DianaPredictor:
    """
    Diabetes risk prediction model for menopausal women.
    Uses K-means clustering + Random Forest classification.
    """
    
    def __init__(self, models_dir: Optional[Path] = None):
        """Load all model artifacts."""
        self.models_dir = models_dir or MODELS_DIR
        
        # Load models
        self.scaler = joblib.load(self.models_dir / "scaler.joblib")
        self.kmeans = joblib.load(self.models_dir / "kmeans_model.joblib")
        self.classifier = joblib.load(self.models_dir / "random_forest.joblib")
        
        # Load XGBoost if available
        xgb_path = self.models_dir / "xgboost.joblib"
        self.xgboost = joblib.load(xgb_path) if xgb_path.exists() else None
        
        # Load cluster labels
        with open(self.models_dir / "cluster_labels.json") as f:
            self.cluster_labels = json.load(f)
        
        # Load metrics
        metrics_path = self.models_dir / "model_metrics.json"
        if metrics_path.exists():
            with open(metrics_path) as f:
                self.metrics = json.load(f)
        else:
            self.metrics = {}
    
    def validate_input(self, data: Dict[str, float]) -> tuple[bool, list]:
        """Validate input data has all required features."""
        missing = [f for f in REQUIRED_FEATURES if f not in data or data[f] is None]
        return len(missing) == 0, missing
    
    def predict(self, data: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict diabetes risk cluster for a patient.
        
        Args:
            data: Dictionary with patient biomarkers
                - hba1c: HbA1c percentage
                - fbs: Fasting blood sugar (mg/dL)
                - bmi: Body mass index
                - triglycerides: Triglycerides (mg/dL)
                - ldl: LDL cholesterol (mg/dL)
                - hdl: HDL cholesterol (mg/dL)
        
        Returns:
            Dictionary with prediction results
        """
        # Validate
        valid, missing = self.validate_input(data)
        if not valid:
            return {
                "success": False,
                "error": f"Missing required features: {missing}",
                "cluster": None,
                "risk_score": 0
            }
        
        # Prepare features
        X = np.array([[data[f] for f in REQUIRED_FEATURES]])
        
        # Scale
        X_scaled = self.scaler.transform(X)
        
        # Get cluster assignment (K-means)
        cluster = int(self.kmeans.predict(X_scaled)[0])
        
        # Get class probabilities (Random Forest)
        proba = self.classifier.predict_proba(X_scaled)[0]
        risk_score = int(max(proba) * 100)
        
        # Get cluster info
        cluster_info = self.cluster_labels.get(str(cluster), {
            "label": f"Cluster-{cluster}",
            "description": "Unknown",
            "risk_level": "UNKNOWN"
        })
        
        # Calculate feature contributions
        contributions = {}
        for i, feature in enumerate(REQUIRED_FEATURES):
            # How far from mean (in std units)
            z_score = X_scaled[0][i]
            contributions[feature] = round(z_score, 2)
        
        return {
            "success": True,
            "cluster": cluster,
            "cluster_label": cluster_info["label"],
            "description": cluster_info["description"],
            "risk_level": cluster_info["risk_level"],
            "risk_score": risk_score,
            "confidence": round(max(proba), 3),
            "contributions": contributions,
            "model_version": self.metrics.get("dataset_size", "unknown")
        }
    
    def predict_batch(self, patients: list[Dict[str, float]]) -> list[Dict[str, Any]]:
        """Predict for multiple patients."""
        return [self.predict(p) for p in patients]


# Singleton instance for quick access
_predictor = None

def get_predictor() -> DianaPredictor:
    """Get or create singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = DianaPredictor()
    return _predictor


def predict(data: Dict[str, float]) -> Dict[str, Any]:
    """Convenience function for single prediction."""
    return get_predictor().predict(data)


if __name__ == "__main__":
    # Test prediction
    test_patient = {
        "hba1c": 6.5,
        "fbs": 126,
        "bmi": 28.0,
        "triglycerides": 150,
        "ldl": 130,
        "hdl": 45
    }
    
    print("Testing DIANA Predictor...")
    print(f"Input: {test_patient}")
    
    result = predict(test_patient)
    print(f"\nResult:")
    print(f"  Cluster: {result['cluster_label']} ({result['risk_level']})")
    print(f"  Risk Score: {result['risk_score']}%")
    print(f"  Confidence: {result['confidence']}")
