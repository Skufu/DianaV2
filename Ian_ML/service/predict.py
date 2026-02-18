"""
DIANA ML Prediction Module (Updated)
Provides functions for making predictions on new patient data.
Returns BOTH medical status and risk cluster per paper requirements.

Usage:
    from Ian_ML.service.predict import DianaPredictor
    predictor = DianaPredictor()
    result = predictor.predict(patient_data)
"""

import hashlib
import logging
import os
import pandas as pd
import numpy as np
import joblib
import json
from pathlib import Path
from typing import Dict, Any, Optional
from Ian_ML.common.paths import MODELS_ROOT

logger = logging.getLogger(__name__)

MODELS_DIR = MODELS_ROOT / "legacy" / "artifacts"
RESULTS_DIR = MODELS_ROOT / "legacy" / "results"
MODEL_HASHES_FILE = MODELS_DIR / "model_hashes.json"


def resolve_clinical_models_dir(explicit_dir: Optional[Path] = None) -> Path:
    """
    Resolve which clinical model directory to use.
    Priority:
      1) explicit_dir argument
      2) CLINICAL_MODELS_DIR environment override
      3) models/clinical_v2 (required)
    """
    if explicit_dir is not None:
        explicit_dir = Path(explicit_dir)
        return _validate_clinical_v2_dir(explicit_dir)

    env_override = os.environ.get("CLINICAL_MODELS_DIR")
    if env_override:
        return _validate_clinical_v2_dir(Path(env_override))

    candidate = MODELS_ROOT / "clinical_v2"
    return _validate_clinical_v2_dir(candidate)


def _validate_clinical_v2_dir(path: Path) -> Path:
    """Ensure clinical_v2 artifacts are present and consistent."""
    model_path = path / "best_model.joblib"
    if not model_path.exists():
        raise FileNotFoundError(
            f"Clinical v2 model not found at {model_path}. clinical/ is deprecated."
        )

    features_path = path / "features.json"
    if not features_path.exists():
        raise FileNotFoundError(
            f"Clinical v2 feature manifest not found at {features_path}."
        )

    with open(features_path) as f:
        features_manifest = json.load(f)
    n_features = features_manifest.get("n_features")
    if n_features != 13:
        raise ValueError(
            f"Clinical v2 requires 13 features, found {n_features} in {features_path}."
        )

    return path

# Features expected by the model
REQUIRED_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
ALL_FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']


def compute_file_hash(filepath: Path) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def verify_model_integrity(filepath: Path) -> bool:
    if not MODEL_HASHES_FILE.exists():
        if os.environ.get('ENV') == 'production':
            logger.error(f"Model hashes file not found in production: {MODEL_HASHES_FILE}")
            return False
        logger.warning(f"Model hashes file not found, skipping integrity check: {MODEL_HASHES_FILE}")
        return True
    
    with open(MODEL_HASHES_FILE) as f:
        expected_hashes = json.load(f)
    
    filename = filepath.name
    if filename not in expected_hashes:
        if os.environ.get('ENV') == 'production':
            logger.error(f"No hash found for model file in production: {filename}")
            return False
        logger.warning(f"No hash found for model file, skipping check: {filename}")
        return True
    
    actual_hash = compute_file_hash(filepath)
    if actual_hash != expected_hashes[filename]:
        logger.error(f"Model integrity check failed for {filename}: hash mismatch")
        return False
    
    return True


def safe_load_model(filepath: Path):
    if not verify_model_integrity(filepath):
        raise SecurityError(f"Model integrity verification failed: {filepath}")
    return joblib.load(filepath)


class SecurityError(Exception):
    pass

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
        
        self.scaler = safe_load_model(self.models_dir / "scaler.joblib")
        n_scaler_features = self.scaler.n_features_in_
        
        rf_path = self.models_dir / "random_forest.joblib"
        best_path = self.models_dir / "best_model.joblib"
        
        if rf_path.exists():
            rf = safe_load_model(rf_path)
            if rf.n_features_in_ == n_scaler_features:
                self.classifier = rf
            elif best_path.exists():
                self.classifier = safe_load_model(best_path)
            else:
                self.classifier = rf
        elif best_path.exists():
            self.classifier = safe_load_model(best_path)
        else:
            raise FileNotFoundError("No classifier model found")
        # Backward compatibility for callers expecting `.model`.
        self.model = self.classifier
        
        self.kmeans = safe_load_model(self.models_dir / "kmeans_model.joblib")
        
        cluster_labels_path = self.models_dir / "cluster_labels.json"
        if cluster_labels_path.exists():
            with open(cluster_labels_path) as f:
                self.cluster_labels = json.load(f)
        else:
            self.cluster_labels = {"0": {"label": "HIGH", "risk_level": "HIGH"}, "1": {"label": "MODERATE", "risk_level": "MODERATE"}}
        
        metrics_path = self.models_dir / "model_metrics.json"
        if metrics_path.exists():
            with open(metrics_path) as f:
                self.metrics = json.load(f)
        else:
            self.metrics = {}

        self.decision_thresholds = self.metrics.get("decision_thresholds", {})
    
    def validate_input(self, data: Dict[str, float]) -> tuple[bool, list]:
        missing = [f for f in REQUIRED_FEATURES if f not in data or data[f] is None]
        if missing:
            return False, missing
        
        errors = []
        ranges = {
            'hba1c': (2.0, 20.0),
            'fbs': (20, 600),
            'bmi': (10, 80),
            'triglycerides': (20, 1500),
            'ldl': (10, 400),
            'hdl': (10, 150),
        }
        for feature, (min_val, max_val) in ranges.items():
            if feature in data and data[feature] is not None:
                val = data[feature]
                if val < min_val or val > max_val:
                    errors.append(f"{feature} value {val} out of range [{min_val}, {max_val}]")
        
        if errors:
            return False, errors
        return True, []
    
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
        X = pd.DataFrame([[data['hba1c'], data['fbs'], data['bmi'], 
                          data['triglycerides'], data['ldl'], data['hdl']]],
                         columns=REQUIRED_FEATURES)
        X_scaled = self.scaler.transform(X)
        
        # Get risk cluster from K-means
        cluster_id = int(self.kmeans.predict(X_scaled)[0])
        
        # Map cluster ID to label and risk level
        cluster_info = self.cluster_labels.get(str(cluster_id), {})
        cluster_label = cluster_info.get("label", f"Cluster-{cluster_id}")
        risk_level = cluster_info.get("risk_level", "UNKNOWN")
        
        # Get diabetes probability from classifier (0-100%)
        try:
            proba = self.classifier.predict_proba(X_scaled)[0]
            diabetes_prob = float(proba[0]) if len(proba) == 2 else float(max(proba))
            risk_score = int(diabetes_prob * 100)
            confidence = round(max(proba), 3)
        except (ValueError, IndexError, AttributeError) as e:
            import logging
            logging.warning(f"Classifier prediction failed: {e}")
            diabetes_prob = 0.5
            risk_score = 50
            confidence = 0.5
        
        return {
            "success": True,
            "medical_status": medical_status,
            "risk_cluster": cluster_label,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "probability": round(diabetes_prob, 3),
            "confidence": confidence,
            "model_info": {
                "n_clusters": self.metrics.get("n_clusters", 2),
                "classifier_accuracy": self.metrics.get("random_forest", {}).get("test_accuracy", 0)
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


# =============================================================================
# CLINICAL PREDICTOR (Non-Circular)
# Uses only metabolic features: BMI, TG, LDL, HDL, Age
# =============================================================================

# Base features required from user (engineered features computed from these)
CLINICAL_BASE_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'systolic', 'diastolic']

# Full feature set including engineered features
CLINICAL_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'systolic', 'diastolic', 
                     'bmi_category', 'tg_hdl_ratio', 'smoking_encoded', 
                     'activity_encoded', 'alcohol_encoded', 'metabolic_syndrome_score']
CLINICAL_MODELS_DIR = resolve_clinical_models_dir()
CLINICAL_RESULTS_DIR = CLINICAL_MODELS_DIR / "results"


class ClinicalPredictor:
    """
    Clinical diabetes risk prediction using metabolic biomarkers only.
    Does NOT use HbA1c or FBS as features (avoids circular reasoning).
    
    Features: BMI, Triglycerides, LDL, HDL, Age
    """
    
    def __init__(self, models_dir: Optional[Path] = None):
        """Load clinical model artifacts."""
        self.models_dir = resolve_clinical_models_dir(models_dir)
        self.results_dir = self.models_dir / "results"
        self.features = CLINICAL_FEATURES
        
        if not (self.models_dir / "best_model.joblib").exists():
            raise FileNotFoundError(
                f"Clinical models not found at {self.models_dir}. "
                "Run 'python Ian_ML/training/train_v2.py' or 'python scripts/train/train_quick.py' first."
            )
        
        self.scaler = safe_load_model(self.models_dir / "scaler.joblib")
        imputer_path = self.models_dir / "imputer.joblib"
        self.imputer = safe_load_model(imputer_path) if imputer_path.exists() else None

        self.cluster_scaler = None
        cluster_scaler_path = self.models_dir / "cluster_scaler.joblib"
        if cluster_scaler_path.exists():
            cluster_scaler = safe_load_model(cluster_scaler_path)
            expected_features = getattr(cluster_scaler, "n_features_in_", None)
            if expected_features == len(self.features):
                self.cluster_scaler = cluster_scaler
            else:
                logger.warning(
                    "Cluster scaler feature mismatch: expected %s features, got %d. Ignoring cluster scaler.",
                    expected_features,
                    len(self.features),
                )
        
        self.classifier = safe_load_model(self.models_dir / "best_model.joblib")
        # Backward compatibility for callers expecting `.model`.
        self.model = self.classifier

        # Prefer feature contract from artifact when available.
        features_path = self.models_dir / "features.json"
        if features_path.exists():
            try:
                with open(features_path) as f:
                    artifact_features = json.load(f).get("features", [])
                if artifact_features:
                    self.features = artifact_features
            except Exception:
                logger.warning("Failed to parse clinical features.json; using defaults")
        
        kmeans_path = self.models_dir / "kmeans_model.joblib"
        if kmeans_path.exists():
            self.kmeans = safe_load_model(kmeans_path)
            expected_features = getattr(self.kmeans, "n_features_in_", None)
            if expected_features is not None and expected_features != len(self.features):
                logger.warning(
                    "KMeans feature mismatch: model expects %d features, but ClinicalPredictor uses %d. "
                    "Disabling clustering.",
                    expected_features,
                    len(self.features),
                )
                self.kmeans = None
        else:
            self.kmeans = None
        
        # Load cluster analysis
        cluster_path = self.results_dir / "cluster_analysis.json"
        if cluster_path.exists():
            with open(cluster_path) as f:
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
        self.decision_thresholds = self.metrics.get("decision_thresholds", {})

    def _build_feature_vector(self, data: Dict[str, float]) -> np.ndarray:
        """Build the 13-feature clinical vector in training order."""
        bmi = data['bmi']
        tg = data['triglycerides']
        ldl = data['ldl']
        hdl = data['hdl']
        age = data['age']

        if bmi < 18.5:
            bmi_category = 0
        elif bmi < 25:
            bmi_category = 1
        elif bmi < 30:
            bmi_category = 2
        else:
            bmi_category = 3

        tg_hdl_ratio = tg / hdl if hdl > 0 else 0

        smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
        smoking_encoded = smoking_map.get(data.get('smoking_status', 'Unknown'), 1)

        activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
        activity_encoded = activity_map.get(data.get('physical_activity', 'Unknown'), 1)

        alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3, 'Unknown': 1}
        alcohol_raw = str(data.get('alcohol_use', 'Unknown') or 'Unknown').strip()
        alcohol_key = alcohol_raw.title() if alcohol_raw.lower() != 'none' else 'None'
        alcohol_encoded = alcohol_map.get(alcohol_key, 1)

        metabolic_score = 0
        if tg > 150:
            metabolic_score += 1
        if hdl < 50:
            metabolic_score += 1
        if data.get('systolic', 0) >= 130:
            metabolic_score += 1
        if bmi >= 30:
            metabolic_score += 1

        return np.array([[bmi, tg, ldl, hdl, age,
                          data.get('systolic', 120), data.get('diastolic', 80),
                          bmi_category, tg_hdl_ratio,
                          smoking_encoded, activity_encoded, alcohol_encoded,
                          metabolic_score]], dtype=float)

    def _transform_features(self, X: np.ndarray) -> np.ndarray:
        """Apply optional imputation and scaling in serving order."""
        X_work = self.imputer.transform(X) if self.imputer is not None else X
        return self.scaler.transform(X_work)
    
    def validate_input(self, data: Dict[str, float]) -> tuple[bool, list]:
        # Only check for base features - engineered features are computed
        missing = [f for f in CLINICAL_BASE_FEATURES if f not in data or data[f] is None]
        if missing:
            return False, missing
        
        errors = []
        ranges = {
            'bmi': (10, 80),
            'triglycerides': (20, 1500),
            'ldl': (10, 400),
            'hdl': (10, 150),
            'age': (18, 120),
            'systolic': (70, 250),
            'diastolic': (40, 150),
        }
        for feature, (min_val, max_val) in ranges.items():
            if feature in data and data[feature] is not None:
                val = data[feature]
                if val < min_val or val > max_val:
                    errors.append(f"{feature} value {val} out of range [{min_val}, {max_val}]")
        
        if errors:
            return False, errors
        return True, []
    
    def predict(self, data: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict diabetes risk using clinical (metabolic) features only.
        
        Returns realistic probabilities since HbA1c/FBS are NOT used.
        """
        valid, missing = self.validate_input(data)
        if not valid:
            return {
                "success": False,
                "error": f"Missing required features: {missing}"
            }
        
        # Prepare model feature vector in training order.
        X = self._build_feature_vector(data)

        X_imputed = self.imputer.transform(X) if self.imputer is not None else X
        X_scaled = self.scaler.transform(X_imputed)
        X_cluster_scaled = (
            self.cluster_scaler.transform(X_imputed)
            if self.cluster_scaler is not None
            else X_scaled
        )
        
        # Get prediction probabilities
        try:
            proba = self.classifier.predict_proba(X_scaled)[0]
            predicted_class = int(np.argmax(proba))
            diabetic_threshold = self.decision_thresholds.get("diabetic")
            pre_diabetic_threshold = self.decision_thresholds.get("pre_diabetic")
            if diabetic_threshold is not None and proba[2] >= float(diabetic_threshold):
                predicted_class = 2
            elif (
                pre_diabetic_threshold is not None
                and proba[1] >= float(pre_diabetic_threshold)
            ):
                predicted_class = 1
            diabetes_prob = float(proba[2] if len(proba) > 2 else max(proba))
            at_risk_prob = float((proba[1] + proba[2]) if len(proba) > 2 else max(proba))
            risk_score = int(at_risk_prob * 100)
            confidence = round(max(proba), 3)
        except Exception as e:
            return {"success": False, "error": str(e)}
        
        # Map predicted class to status
        status_map = {0: "Normal", 1: "Pre-diabetic", 2: "Diabetic"}
        predicted_status = status_map.get(predicted_class, "Unknown")
        
        # Get risk cluster info if kmeans is available
        if self.kmeans is not None:
            expected_features = getattr(self.kmeans, "n_features_in_", X_cluster_scaled.shape[1])
            if expected_features != X_cluster_scaled.shape[1]:
                logger.warning(
                    "Skipping KMeans clustering due to feature mismatch: expected %d, got %d.",
                    expected_features,
                    X_cluster_scaled.shape[1],
                )
                self.kmeans = None

        if self.kmeans is not None:
            cluster_id = int(self.kmeans.predict(X_cluster_scaled)[0])
            cluster_info = self._get_cluster_info(cluster_id)
            risk_cluster = cluster_info.get("label", f"Cluster-{cluster_id}")
            metabolic_subtype = cluster_info.get("metabolic_subtype", "N/A")
            metabolic_subtype_full = cluster_info.get("metabolic_subtype_full", "N/A")
            cluster_characteristics = cluster_info.get("characteristics", "")
            treatment_focus = cluster_info.get("treatment_focus", "")
        else:
            risk_cluster = "N/A"
            metabolic_subtype = "N/A"
            metabolic_subtype_full = "N/A"
            cluster_characteristics = ""
            treatment_focus = ""
        
        return {
            "success": True,
            "model_type": "clinical",
            "predicted_status": predicted_status,
            "risk_cluster": risk_cluster,
            "metabolic_subtype": metabolic_subtype,
            "metabolic_subtype_full": metabolic_subtype_full,
            "cluster_characteristics": cluster_characteristics,
            "treatment_focus": treatment_focus,
            "probability": float(round(diabetes_prob, 3)),
            "at_risk_probability": float(round(at_risk_prob, 3)),
            "risk_score": int(risk_score),
            "confidence": float(confidence),
            "model_info": {
                "classifier": self.metrics.get("best_model", "Unknown"),
                "auc_roc": float(self.metrics.get("metrics", {}).get("auc_roc", 0)),
                "features_used": self.features,
                "decision_thresholds": self.decision_thresholds,
                "note": "Non-circular model (no HbA1c/FBS in features)"
            }
        }
    
    def _get_cluster_info(self, cluster_id: int) -> Dict[str, str]:
        """Get full cluster info including risk level and metabolic subtype."""
        cluster_labels = self.cluster_analysis.get("cluster_labels", {})
        if str(cluster_id) in cluster_labels:
            return cluster_labels[str(cluster_id)]
        return {"label": f"Cluster-{cluster_id}"}
    
    def _get_risk_label(self, cluster_id: int) -> str:
        """Map cluster ID to risk label."""
        cluster_info = self._get_cluster_info(cluster_id)
        return cluster_info.get("label", f"Cluster-{cluster_id}")
    
    def predict_batch(self, patients: list[Dict[str, float]]) -> list[Dict[str, Any]]:
        """Predict for multiple patients."""
        return [self.predict(p) for p in patients]


# Singleton instances
_predictor = None
_clinical_predictor = None

def get_predictor() -> DianaPredictor:
    """Get or create singleton ADA predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = DianaPredictor()
    return _predictor


def get_clinical_predictor() -> ClinicalPredictor:
    """Get or create singleton clinical predictor instance."""
    global _clinical_predictor
    if _clinical_predictor is None:
        _clinical_predictor = ClinicalPredictor()
    return _clinical_predictor


def predict(data: Dict[str, float], model_type: str = "ada") -> Dict[str, Any]:
    """
    Convenience function for single prediction.
    
    Args:
        data: Patient data dictionary
        model_type: "clinical" for non-circular model, "ada" for baseline
    """
    if model_type == "clinical":
        return get_clinical_predictor().predict(data)
    return get_predictor().predict(data)


if __name__ == "__main__":
    # Test prediction with both models
    test_patient = {
        "hba1c": 6.5,
        "fbs": 126,
        "bmi": 28.0,
        "triglycerides": 150,
        "ldl": 130,
        "hdl": 45,
        "age": 55
    }
    
    print("Testing DIANA Predictors...")
    print(f"Input: {test_patient}")
    
    print("\n=== ADA Baseline Model ===")
    ada_result = predict(test_patient, model_type="ada")
    print(f"  Medical Status: {ada_result.get('medical_status')}")
    print(f"  Risk Cluster: {ada_result.get('risk_cluster')}")
    print(f"  Probability: {ada_result.get('probability', 0)*100:.1f}%")
    
    # Test Clinical model (if available)
    print("\n=== Clinical Model (Non-Circular) ===")
    try:
        clinical_result = predict(test_patient, model_type="clinical")
        print(f"  Predicted Status: {clinical_result.get('predicted_status')}")
        print(f"  Risk Cluster: {clinical_result.get('risk_cluster')}")
        print(f"  Probability: {clinical_result.get('probability', 0)*100:.1f}%")
        print(f"  Features Used: {clinical_result.get('model_info', {}).get('features_used')}")
    except FileNotFoundError as e:
        print(f"  [NOT TRAINED] {e}")
