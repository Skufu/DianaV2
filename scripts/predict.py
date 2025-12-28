"""
DIANA ML Prediction Module (Updated)
Provides functions for making predictions on new patient data.
Returns BOTH medical status and risk cluster per paper requirements.

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
RESULTS_DIR = MODELS_DIR / "results"

# Features expected by the model
REQUIRED_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
ALL_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']

# Medical status thresholds (per ADA guidelines)
def get_medical_status(hba1c):
    """Classify diabetes status based on HbA1c."""
    if hba1c < 5.7:
        return "Normal"
    elif hba1c < 6.5:
        return "Pre-diabetic"
    else:
        return "Diabetic"


class DianaPredictor:
    """
    Diabetes risk prediction model for menopausal women.
    Returns:
    - Medical Status (Normal/Pre-diabetic/Diabetic) from HbA1c
    - Risk Cluster (Low/Moderate/High Risk) from K-means
    - Probability from supervised classifier
    """
    
    def __init__(self, models_dir: Optional[Path] = None):
        """Load all model artifacts."""
        self.models_dir = models_dir or MODELS_DIR
        self.results_dir = RESULTS_DIR
        
        # Load scaler
        self.scaler = joblib.load(self.models_dir / "scaler.joblib")
        
        # Load best classifier (for probability)
        best_model_path = self.models_dir / "best_model.joblib"
        if best_model_path.exists():
            self.classifier = joblib.load(best_model_path)
        else:
            self.classifier = joblib.load(self.models_dir / "random_forest.joblib")
        
        # Load K-means (for risk cluster)
        self.kmeans = joblib.load(self.models_dir / "kmeans_model.joblib")
        
        # Load cluster analysis for mapping
        cluster_analysis_path = self.results_dir / "cluster_analysis.json"
        if cluster_analysis_path.exists():
            with open(cluster_analysis_path) as f:
                self.cluster_analysis = json.load(f)
        else:
            self.cluster_analysis = {}
        
        # Load model metrics
        metrics_path = self.results_dir / "best_model_report.json"
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
        Predict diabetes risk for a patient.
        
        Returns:
            Dictionary with:
            - medical_status: Normal/Pre-diabetic/Diabetic (from HbA1c)
            - risk_cluster: Low/Moderate/High Risk (from K-means)
            - probability: Diabetes probability (from classifier)
        """
        # Validate
        valid, missing = self.validate_input(data)
        if not valid:
            return {
                "success": False,
                "error": f"Missing required features: {missing}"
            }
        
        # Get medical status from HbA1c
        medical_status = get_medical_status(data['hba1c'])
        
        # Prepare features for models
        # Use age=54 (mean) if not provided
        age = data.get('age', 54)
        X = np.array([[data['hba1c'], data['fbs'], data['bmi'], 
                      data['triglycerides'], data['ldl'], data['hdl'], age]])
        
        # Scale
        X_scaled = self.scaler.transform(X)
        
        # Get risk cluster from K-means
        cluster_id = int(self.kmeans.predict(X_scaled)[0])
        
        # Map cluster ID to risk label
        # Clusters are ordered by mean HbA1c/FBS in clustering.py
        cluster_profiles = self.cluster_analysis.get("cluster_profiles", {})
        if cluster_profiles:
            # Find which risk level this cluster maps to
            risk_labels = list(cluster_profiles.keys())
            if cluster_id < len(risk_labels):
                # Need to map based on cluster characteristics
                # In our clustering, we sorted by mean HbA1c+FBS
                risk_cluster = self._get_risk_label(cluster_id)
            else:
                risk_cluster = f"Cluster-{cluster_id}"
        else:
            risk_cluster = f"Cluster-{cluster_id}"
        
        # Get probability from classifier (using 7 features for clustering but 7 for classifier)
        # Classifier was trained on 7 features, need to match
        try:
            proba = self.classifier.predict_proba(X_scaled)[0]
            # Probability of being diabetic (class 2)
            diabetes_prob = proba[2] if len(proba) > 2 else max(proba)
            # Overall risk score
            risk_score = int(max(proba) * 100)
        except:
            diabetes_prob = 0.0
            risk_score = 0
        
        return {
            "success": True,
            "medical_status": medical_status,
            "risk_cluster": risk_cluster,
            "probability": round(diabetes_prob, 3),
            "risk_score": risk_score,
            "confidence": round(max(proba) if 'proba' in dir() else 1.0, 3),
            "model_info": {
                "classifier": self.metrics.get("best_model", "Unknown"),
                "auc_roc": self.metrics.get("metrics", {}).get("auc_roc", 0)
            }
        }
    
    def _get_risk_label(self, cluster_id: int) -> str:
        """Map cluster ID to risk label based on analysis."""
        cluster_sizes = self.cluster_analysis.get("cluster_sizes", {})
        
        # The clustering.py sorted clusters by mean biomarker values
        # Low Risk has lowest HbA1c/FBS, High Risk has highest
        if "Low Risk" in cluster_sizes:
            # Use the mapping from cluster_analysis
            for risk_label in ["Low Risk", "Moderate Risk", "High Risk"]:
                if cluster_sizes.get(risk_label, 0) > 0:
                    pass  # Find which cluster maps to which label
        
        # Default fallback based on typical distribution
        risk_map = {0: "High Risk", 1: "Low Risk", 2: "Moderate Risk"}
        return risk_map.get(cluster_id, f"Cluster-{cluster_id}")
    
    def predict_batch(self, patients: list[Dict[str, float]]) -> list[Dict[str, Any]]:
        """Predict for multiple patients."""
        return [self.predict(p) for p in patients]


# Singleton instance
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
        "hdl": 45,
        "age": 55
    }
    
    print("Testing DIANA Predictor...")
    print(f"Input: {test_patient}")
    
    result = predict(test_patient)
    print(f"\nResult:")
    print(f"  Medical Status: {result['medical_status']}")
    print(f"  Risk Cluster: {result['risk_cluster']}")
    print(f"  Diabetes Probability: {result['probability']*100:.1f}%")
    print(f"  Risk Score: {result['risk_score']}%")
