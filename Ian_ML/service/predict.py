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
from typing import Dict, Any, Optional, Mapping
from Ian_ML.common.paths import MODELS_ROOT
from Ian_ML.common.feature_constants import (
    CLUSTER_FEATURES,
    CLINICAL_FEATURES,
    CLINICAL_FEATURES_NO_BP,
    CLINICAL_FEATURES_WITH_BP,
    CLUSTER_FEATURE_COUNT,
    CLINICAL_FEATURE_COUNT,
    ADA_FEATURES,
    ADA_FEATURE_COUNT,
    KMEANS_K,
    MIN_CLINICAL_FEATURES,
    MAX_CLINICAL_FEATURES,
)


logger = logging.getLogger(__name__)

MODELS_DIR = MODELS_ROOT / "binary"
RESULTS_DIR = MODELS_ROOT / "binary" / "results"
WEIGHTED_KMEANS_FILE = "weighted_kmeans_model.joblib"
FEATURE_WEIGHTS_FILE = "feature_weights.json"


def resolve_clinical_models_dir(explicit_dir: Optional[Path] = None) -> Path:
    """
    Resolve which clinical model directory to use.
    Priority:
      1) explicit_dir argument
      2) CLINICAL_MODELS_DIR environment override
      3) models/binary (default - binary at-risk screening model)
    """
    if explicit_dir is not None:
        explicit_dir = Path(explicit_dir)
        return _validate_model_dir(explicit_dir)

    env_override = os.environ.get("CLINICAL_MODELS_DIR")
    if env_override:
        return _validate_model_dir(Path(env_override))

    # Default to binary_v2_no_bp (binary at-risk screening model with AUC 0.72)
    candidate = MODELS_ROOT / "binary_v2_no_bp"
    return _validate_model_dir(candidate)


def _validate_model_dir(path: Path) -> Path:
    """Ensure model artifacts are present and consistent."""
    model_path = path / "best_model.joblib"
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found at {model_path}. Run training first."
        )

    features_path = path / "features.json"
    if not features_path.exists():
        raise FileNotFoundError(
            f"Feature manifest not found at {features_path}."
        )

    with open(features_path) as f:
        features_manifest = json.load(f)
    # Artifact-driven validation: accept feature count from features.json when present
    n_features = features_manifest.get("n_features") or len(
        features_manifest.get("features", [])
    )
    if n_features is None or n_features == 0:
        raise ValueError(
            f"Model requires valid features manifest, found {n_features} features in {features_path}."
        )

    return path

# Features expected by the model (binary - no hba1c/fbs to avoid circular reasoning, no BP)
# Updated to 9 LR-safe features: 6 continuous + 3 ordinal (no derived ratios/scores)
REQUIRED_FEATURES = [
    'bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference',
    'smoking_encoded', 'activity_encoded', 'alcohol_encoded'
]

# Raw input features (before engineering)
RAW_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age',
                'smoking_status', 'physical_activity', 'alcohol_use',
                'waist_circumference']


def compute_file_hash(filepath: Path) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def verify_model_integrity(filepath: Path) -> bool:
    model_hashes_file = filepath.parent / "model_hashes.json"
    
    if not model_hashes_file.exists():
        if os.environ.get('ENV') == 'production':
            logger.error(f"Model hashes file not found in production: {model_hashes_file}")
            return False
        logger.warning(f"Model hashes file not found, skipping integrity check: {model_hashes_file}")
        return True
    
    with open(model_hashes_file) as f:
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
    model = joblib.load(filepath)
    return _patch_sklearn_compat(model)


class SecurityError(Exception):
    pass


def _patch_simple_imputer(imputer) -> None:
    if not hasattr(imputer, "_fill_dtype"):
        if hasattr(imputer, "_fit_dtype"):
            imputer._fill_dtype = imputer._fit_dtype
        elif hasattr(imputer, "statistics_"):
            imputer._fill_dtype = np.array(imputer.statistics_).dtype
        else:
            imputer._fill_dtype = np.float64
    if not hasattr(imputer, "_fit_dtype"):
        if hasattr(imputer, "_fill_dtype"):
            imputer._fit_dtype = imputer._fill_dtype
        elif hasattr(imputer, "statistics_"):
            imputer._fit_dtype = np.array(imputer.statistics_).dtype
        else:
            imputer._fit_dtype = np.float64


def _patch_sklearn_compat(model):
    try:
        from sklearn.impute import SimpleImputer
    except Exception:
        SimpleImputer = None

    def _walk(obj):
        if obj is None:
            return
        if SimpleImputer is not None and isinstance(obj, SimpleImputer):
            _patch_simple_imputer(obj)
            return
        if hasattr(obj, "named_steps"):
            for step in obj.named_steps.values():
                _walk(step)
        if hasattr(obj, "steps"):
            for _, step in obj.steps:
                _walk(step)
        if hasattr(obj, "transformers"):
            for _, transformer, _ in obj.transformers:
                _walk(transformer)
        if hasattr(obj, "estimator"):
            _walk(obj.estimator)

    _walk(model)
    return model

# Medical status thresholds (ADA guidelines)
def get_medical_status(hba1c):
    """Classify diabetes status based on HbA1c."""
    if hba1c < 5.7:
        return "Normal"
    elif hba1c < 6.5:
        return "Pre-diabetic"
    else:
        return "Diabetic"


def _engineer_ada_features(data: Mapping[str, Any]):
    """Engineer ADA predictor features in REQUIRED_FEATURES order."""
    smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3, 'Unknown': 1}

    smoking_raw = str(data.get('smoking_status', 'Unknown') or 'Unknown').strip()
    smoking_key = smoking_raw.title() if smoking_raw.lower() != 'unknown' else 'Unknown'
    smoking_encoded = smoking_map.get(smoking_key, 1)

    activity_raw = str(data.get('physical_activity', 'Unknown') or 'Unknown').strip()
    activity_key = activity_raw.title() if activity_raw.lower() != 'unknown' else 'Unknown'
    activity_encoded = activity_map.get(activity_key, 1)

    alcohol_raw = str(data.get('alcohol_use', 'Unknown') or 'Unknown').strip()
    alcohol_key = alcohol_raw.title() if alcohol_raw.lower() != 'none' else 'None'
    alcohol_encoded = alcohol_map.get(alcohol_key, 1)

    waist = data.get('waist_circumference', np.nan)
    if waist is None or waist == 0:
        waist = np.nan

    feature_map = {
        'bmi': data.get('bmi', 0),
        'triglycerides': data.get('triglycerides', 0),
        'ldl': data.get('ldl', 0),
        'hdl': data.get('hdl', 0),
        'age': data.get('age', 0),
        'waist_circumference': waist,
        'smoking_encoded': smoking_encoded,
        'activity_encoded': activity_encoded,
        'alcohol_encoded': alcohol_encoded,
    }
    return np.array([[feature_map[f] for f in REQUIRED_FEATURES]], dtype=float)


class DianaPredictor:
    """
    ADA Baseline Comparator (not the primary DIANA model).
    
    Uses HbA1c/FBS thresholds per ADA guidelines for rule-based classification.
    Exists as a baseline comparator for the thesis — the primary DIANA prediction
    model is ClinicalPredictor, which uses ML on non-circular metabolic features.
    
    Returns:
    - Medical Status (Normal/Pre-diabetic/Diabetic) from HbA1c thresholds
    - Risk Cluster (from K-means, if artifacts available)
    - Probability from supervised classifier (if artifacts available)
    """
    
    def __init__(self, models_dir: Optional[Path] = None):
        """Load ADA baseline model artifacts when available."""
        self.models_dir = models_dir or MODELS_DIR
        self.results_dir = RESULTS_DIR
        self.model_loaded = False
        self.scaler = None
        self.classifier = None
        self.kmeans = None
        self.cluster_labels = {"0": {"label": "ADA Baseline", "risk_level": "MODERATE"}}
        self.metrics = {}
        self.decision_thresholds = {}
        self.cluster_analysis = {}

        try:
            scaler_path = self.models_dir / "scaler.joblib"
            if not scaler_path.exists():
                raise FileNotFoundError(f"Scaler not found at {scaler_path}")
            self.scaler = safe_load_model(scaler_path)
            n_scaler_features = getattr(self.scaler, "n_features_in_", None)

            rf_path = self.models_dir / "random_forest.joblib"
            best_path = self.models_dir / "best_model.joblib"

            if rf_path.exists():
                rf = safe_load_model(rf_path)
                if n_scaler_features is None or rf.n_features_in_ == n_scaler_features:
                    self.classifier = rf
                elif best_path.exists():
                    self.classifier = safe_load_model(best_path)
                else:
                    self.classifier = rf
            elif best_path.exists():
                self.classifier = safe_load_model(best_path)
            else:
                raise FileNotFoundError("No classifier model found")

            self.model = self.classifier

            kmeans_path = self.models_dir / "kmeans_model.joblib"
            if kmeans_path.exists():
                self.kmeans = safe_load_model(kmeans_path)

            cluster_labels_path = self.models_dir / "cluster_labels.json"
            if cluster_labels_path.exists():
                with open(cluster_labels_path) as f:
                    self.cluster_labels = json.load(f)

            metrics_path = self.models_dir / "model_metrics.json"
            if metrics_path.exists():
                with open(metrics_path) as f:
                    self.metrics = json.load(f)
            self.decision_thresholds = self.metrics.get("decision_thresholds", {})
            self.model_loaded = True
        except FileNotFoundError as e:
            logger.warning("ADA model artifacts missing, using ADA baseline rules: %s", e)
    
    def validate_input(self, data: Mapping[str, Any]) -> tuple[bool, list[str]]:
        missing = [f for f in ADA_FEATURES if f not in data or data[f] is None]
        if missing:
            return False, missing
        
        errors = []
        ranges = {
            'bmi': (10, 80),
            'triglycerides': (20, 1500),
            'ldl': (10, 400),
            'hdl': (10, 150),
            'age': (18, 100),
        }
        for feature, (min_val, max_val) in ranges.items():
            if feature in data and data[feature] is not None:
                val = data[feature]
                if val < min_val or val > max_val:
                    errors.append(f"{feature} value {val} out of range [{min_val}, {max_val}]")
        
        if errors:
            return False, errors
        return True, []

    def predict(self, data: Mapping[str, Any]) -> Dict[str, Any]:
        """
        Predict diabetes risk for a patient.
        
        Returns:
            Dictionary with:
            - medical_status: Normal/Pre-diabetic/Diabetic (based on HbA1c/FBS thresholds or classifier)
            - risk_cluster: Cluster label from K-means if available, otherwise "ADA Baseline"
            - risk_level: HIGH/MODERATE/LOW based on cluster labels or computed from probability
            - probability: Diabetes probability (from classifier)
        """
        valid, missing = self.validate_input(data)
        if not valid:
            return {
                "success": False,
                "error": f"Missing required features: {missing}"
            }

        if not self.model_loaded or self.scaler is None or self.classifier is None:
            hba1c = data.get("hba1c")
            fbs = data.get("fbs")
            status_by_hba1c = get_medical_status(hba1c) if hba1c is not None else "Normal"
            status_by_fbs = "Normal"
            if fbs is not None:
                if fbs >= 126:
                    status_by_fbs = "Diabetic"
                elif fbs >= 100:
                    status_by_fbs = "Pre-diabetic"
            if "Diabetic" in (status_by_hba1c, status_by_fbs):
                medical_status = "Diabetic"
                risk_score = 85
                at_risk_probability = 0.9
                risk_level = "HIGH"
            elif "Pre-diabetic" in (status_by_hba1c, status_by_fbs):
                medical_status = "Pre-diabetic"
                risk_score = 55
                at_risk_probability = 0.6
                risk_level = "MODERATE"
            else:
                medical_status = "Normal"
                risk_score = 20
                at_risk_probability = 0.2
                risk_level = "LOW"
            return {
                "success": True,
                "model_type": "ada",
                "medical_status": medical_status,
                "predicted_status": medical_status,
                "risk_cluster": "ADA Baseline",
                "risk_level": risk_level,
                "risk_label": risk_level,
                "risk_score": risk_score,
                "probability": round(at_risk_probability, 3),
                "at_risk_probability": round(at_risk_probability, 3),
                "confidence": round(at_risk_probability, 3),
                "model_info": {
                    "note": "ADA baseline rule-based screening",
                    "features_used": ADA_FEATURES,
                },
            }

        X = _engineer_ada_features(data)
        X_scaled = self.scaler.transform(X)

        cluster_label = "ADA Baseline"
        risk_level = "UNKNOWN"
        ada_kmeans_model = self.kmeans
        if ada_kmeans_model is not None:
            ada_predict_cluster = getattr(ada_kmeans_model, "predict", None)
            if ada_predict_cluster is not None:
                cluster_id = int(ada_predict_cluster(X_scaled)[0])
            else:
                cluster_id = -1
            cluster_info = self.cluster_labels.get(str(cluster_id), {})
            cluster_label = cluster_info.get("label", f"Cluster-{cluster_id}")
            risk_level = cluster_info.get("risk_level", "UNKNOWN")
        try:
            proba = self.classifier.predict_proba(X_scaled)[0]
            diabetes_prob = float(proba[2]) if len(proba) == 3 else float(max(proba))
            risk_score = int(diabetes_prob * 100)
            confidence = round(max(proba), 3)
        except (ValueError, IndexError, AttributeError) as e:
            logger.warning("Classifier prediction failed: %s", e)
            diabetes_prob = 0.5
            risk_score = 50
            confidence = 0.5

        if diabetes_prob < 0.33:
            medical_status = "Normal"
        elif diabetes_prob < 0.66:
            medical_status = "Pre-diabetic"
        else:
            medical_status = "Diabetic"

        # Apply confidence threshold per Tanabe et al. (2024) Diabetologia
        CONFIDENCE_THRESHOLD = 0.60
        if confidence < CONFIDENCE_THRESHOLD:
            prediction_confidence = "Indeterminate"
            confidence_note = f"Low confidence prediction ({confidence:.0%}). Consider clinical follow-up."
        else:
            prediction_confidence = "Confident"
            confidence_note = None

        return {
            "success": True,
            "model_type": "ada",
            "medical_status": medical_status,
            "predicted_status": medical_status,
            "prediction_confidence": prediction_confidence,
            "confidence_note": confidence_note,
            "risk_cluster": cluster_label,
            "risk_level": risk_level,
            "probability": round(diabetes_prob, 3),
            "at_risk_probability": round(diabetes_prob, 3),
            "confidence": confidence,
            "model_info": {
                "n_clusters": self.metrics.get("n_clusters", 2),
                "classifier_accuracy": self.metrics.get("random_forest", {}).get("test_accuracy", 0),
            },
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
    
    def predict_batch(self, patients: list[Mapping[str, Any]]) -> list[Dict[str, Any]]:
        """Predict for multiple patients."""
        return [self.predict(p) for p in patients]


# =============================================================================
# CLINICAL PREDICTOR (Non-Circular)
# Uses only metabolic features: BMI, TG, LDL, HDL, Age
# =============================================================================

# Base features required from user (engineered features computed from these)
CLINICAL_BASE_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

# Optional enrichment features (model works without them via imputation)
CLINICAL_ENRICHMENT_FEATURES = ['waist_circumference']

# Full feature set for active no-BP classifier (9 features, no BP)
# IMPORTED from Ian_ML.common.feature_constants - DO NOT HARDCODE
# CLINICAL_FEATURES is now imported at the top of the file

# Features used for KMeans clustering (6 base clinical biomarkers)
# IMPORTED from Ian_ML.common.feature_constants - DO NOT HARDCODE
# CLUSTER_FEATURES is now imported at the top of the file

CLINICAL_MODELS_DIR = resolve_clinical_models_dir()
CLINICAL_RESULTS_DIR = CLINICAL_MODELS_DIR / "results"


class ClinicalPredictor:
    """
    Primary DIANA ML Model — Clinical diabetes risk prediction.
    
    Uses metabolic biomarkers only (BMI, TG, LDL, HDL, Age, waist circumference)
    without HbA1c or FBS to avoid circular reasoning with the diabetes diagnosis target.
    This is the thesis contribution model; DianaPredictor is the ADA baseline comparator.
    """
    
    def __init__(self, models_dir: Optional[Path] = None, model_type: Optional[str] = None):
        """Load clinical model artifacts."""
        self.models_dir = resolve_clinical_models_dir(models_dir)
        self.model_type = model_type or "clinical"
        self.results_dir = self.models_dir / "results"
        if self.model_type == "binary_v2_bp":
            self.features = CLINICAL_FEATURES_WITH_BP
        else:
            self.features = CLINICAL_FEATURES_NO_BP

        if not (self.models_dir / "best_model.joblib").exists():
            raise FileNotFoundError(
                f"Clinical models not found at {self.models_dir}. "
                "Run 'python Ian_ML/training/train_binary_v2_no_bp.py' or 'python scripts/train/train_quick.py' first."
            )
        
        # Load or extract scaler (may be separate file or embedded in pipeline)
        scaler_path = self.models_dir / "scaler.joblib"
        if scaler_path.exists():
            self.scaler = safe_load_model(scaler_path)
        else:
            self.scaler = None

        imputer_path = self.models_dir / "imputer.joblib"
        if imputer_path.exists():
            self.imputer = safe_load_model(imputer_path)
        else:
            self.imputer = None

        # Cluster scaler is fitted on CLUSTER_FEATURES (6 features), not CLINICAL_FEATURES (12+)
        self.cluster_features = CLUSTER_FEATURES
        self.cluster_scaler = None
        self.cluster_imputer = None
        self.feature_weights = None
        self.weighted_artifacts_ready = False
        cluster_scaler_path = self.models_dir / "cluster_scaler.joblib"
        if cluster_scaler_path.exists():
            cluster_scaler = safe_load_model(cluster_scaler_path)
            expected_features = getattr(cluster_scaler, "n_features_in_", None)
            if expected_features == len(self.cluster_features):
                self.cluster_scaler = cluster_scaler
            else:
                logger.warning(
                    "Cluster scaler feature mismatch: expects %s features, got %d cluster features. "
                    "Clustering will be disabled.",
                    expected_features,
                    len(self.cluster_features),
                )
        
        # Load cluster imputer for handling missing values in clustering
        cluster_imputer_path = self.models_dir / "cluster_imputer.joblib"
        if cluster_imputer_path.exists():
            self.cluster_imputer = safe_load_model(cluster_imputer_path)

        feature_weights_path = self.models_dir / FEATURE_WEIGHTS_FILE
        if feature_weights_path.exists():
            try:
                with open(feature_weights_path) as f:
                    weights_payload = json.load(f)
                normalized_weights = self._normalize_feature_weights(weights_payload)
                if len(normalized_weights) == len(self.cluster_features):
                    self.feature_weights = normalized_weights
                else:
                    logger.warning(
                        "feature_weights.json length mismatch: expected %d, got %d. "
                        "Weighted subtype assignment will be disabled.",
                        len(self.cluster_features),
                        len(normalized_weights),
                    )
            except Exception as e:
                logger.warning("Failed to load feature_weights.json: %s", e)
        else:
            logger.warning(
                "%s not found at %s. "
                "Weighted subtype assignment will be disabled.",
                FEATURE_WEIGHTS_FILE,
                feature_weights_path,
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
        
        # Weighted KMeans model is fitted on CLUSTER_FEATURES (6 features)
        weighted_kmeans_path = self.models_dir / WEIGHTED_KMEANS_FILE
        self.kmeans = None
        if weighted_kmeans_path.exists():
            self.kmeans = safe_load_model(weighted_kmeans_path)
            expected_features = getattr(self.kmeans, "n_features_in_", None)
            if expected_features is not None and expected_features != len(self.cluster_features):
                logger.warning(
                    "Weighted KMeans feature mismatch: model expects %d features, but cluster features has %d. "
                    "Disabling clustering.",
                    expected_features,
                    len(self.cluster_features),
                )
                self.kmeans = None
        else:
            logger.warning(
                "%s not found at %s. "
                "Subtype assignment will remain neutral until weighted artifacts are available.",
                WEIGHTED_KMEANS_FILE,
                weighted_kmeans_path,
            )

        self.weighted_artifacts_ready = bool(self.kmeans is not None and self.feature_weights is not None)
        
        # Load cluster labels (with both Ahlqvist subtypes and risk levels)
        cluster_labels_path = self.models_dir / "cluster_labels.json"
        if cluster_labels_path.exists():
            with open(cluster_labels_path) as f:
                self.cluster_labels = json.load(f)
        else:
            self.cluster_labels = {}
        
        # Also load cluster_analysis for backward compat if it exists
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
        self.decision_thresholds = self.metrics.get("decision_thresholds", {})

    def _normalize_feature_weights(self, payload: Any) -> list[float]:
        """Normalize feature_weights.json payload to an ordered weight vector."""
        if isinstance(payload, dict) and "weights" in payload:
            payload = payload["weights"]

        if isinstance(payload, dict):
            return [float(payload[feature]) for feature in self.cluster_features]

        if isinstance(payload, list):
            return [float(value) for value in payload]

        raise ValueError("feature_weights.json must contain a list or mapping of weights")

    def _is_weighted_artifacts_ready(self) -> bool:
        """Compatibility-safe readiness check for fully and partially initialized predictors."""
        explicit = getattr(self, "weighted_artifacts_ready", None)
        if isinstance(explicit, bool):
            return explicit

        # Fallback for test doubles created via object.__new__(ClinicalPredictor)
        # that do not run __init__ and therefore don't have weighted_artifacts_ready.
        if hasattr(self, "feature_weights"):
            return bool(
                getattr(self, "kmeans", None) is not None
                and getattr(self, "feature_weights", None) is not None
            )
        # Legacy/stub compatibility path: pre-weighted test doubles may only provide kmeans.
        return bool(getattr(self, "kmeans", None) is not None)

    @staticmethod
    def _to_like_label(label: str) -> str:
        """Convert canonical subtype labels to proxy '-like' semantics for output."""
        if not isinstance(label, str):
            return label
        canonical = {"SIRD", "SIDD", "MOD", "MARD"}
        if label in canonical:
            return f"{label}-like"
        return label

    def _should_emit_like_labels(self) -> bool:
        """Emit '-like' labels for fully initialized weighted runtime path.

        Legacy/stub predictors (object.__new__) may omit weighted attributes and expect
        canonical labels; keep compatibility there.
        """
        explicit_ready = getattr(self, "weighted_artifacts_ready", None)
        return isinstance(explicit_ready, bool)

    def _build_feature_vector(self, data: Mapping[str, Any]):
        """Build the feature vector in training order (determined by features.json)."""
        bmi = data['bmi']
        tg = data['triglycerides']
        ldl = data['ldl']
        hdl = data['hdl']
        age = data['age']

        # Philippine (Asia-Pacific WHO) BMI cutoffs
        if bmi < 18.5:
            bmi_category = 0
        elif bmi < 23:
            bmi_category = 1
        elif bmi < 25:
            bmi_category = 2
        else:
            bmi_category = 3

        tg_hdl_ratio = tg / hdl if hdl > 0 else 0

        smoking_map = {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
        smoking_raw = str(data.get('smoking_status', 'Unknown') or 'Unknown').strip()
        smoking_key = smoking_raw.title() if smoking_raw.lower() != 'unknown' else 'Unknown'
        smoking_encoded = smoking_map.get(smoking_key, 1)

        activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
        activity_raw = str(data.get('physical_activity', 'Unknown') or 'Unknown').strip()
        activity_key = activity_raw.title() if activity_raw.lower() != 'unknown' else 'Unknown'
        activity_encoded = activity_map.get(activity_key, 1)

        alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3, 'Unknown': 1}
        alcohol_raw = str(data.get('alcohol_use', 'Unknown') or 'Unknown').strip()
        alcohol_key = alcohol_raw.title() if alcohol_raw.lower() != 'none' else 'None'
        alcohol_encoded = alcohol_map.get(alcohol_key, 1)

        metabolic_score = 0
        if tg > 150:
            metabolic_score += 1
        if hdl < 50:
            metabolic_score += 1
        if bmi >= 25:  # PH Asia-Pacific WHO obesity cutoff
            metabolic_score += 1
        waist = data.get('waist_circumference', np.nan) or np.nan
        if waist == 0:
            waist = np.nan
        # Add waist criterion to match training (metabolic syndrome requires waist >= 80)
        if not np.isnan(waist) and waist >= 80:
            metabolic_score += 1

        # Enrichment features with safe defaults
        family_history = data.get('family_history_diabetes', np.nan)
        if family_history == 0 or family_history is None:
            family_history = np.nan

        systolic = data.get('systolic', np.nan)
        diastolic = data.get('diastolic', np.nan)
        if systolic == 0 or systolic is None:
            systolic = np.nan
        if diastolic == 0 or diastolic is None:
            diastolic = np.nan

        crp = data.get('crp', np.nan)
        if crp == 0 or crp is None:
            crp = np.nan

        feature_map = {
            'bmi': bmi,
            'triglycerides': tg,
            'ldl': ldl,
            'hdl': hdl,
            'age': age,
            'systolic': systolic,
            'diastolic': diastolic,
            'bmi_category': bmi_category,
            'tg_hdl_ratio': tg_hdl_ratio,
            'smoking_encoded': smoking_encoded,
            'activity_encoded': activity_encoded,
            'alcohol_encoded': alcohol_encoded,
            'metabolic_syndrome_score': metabolic_score,
            'waist_circumference': waist,
            'family_history_diabetes': family_history,
        }

        feature_values = [feature_map.get(feature, np.nan) for feature in self.features]

        return np.array([feature_values], dtype=float)

    def _build_cluster_vector(self, data: Mapping[str, Any]):
        """Build the 6-feature cluster vector matching CLUSTER_FEATURES order."""
        values = []
        for feature in self.cluster_features:
            value = data.get(feature, np.nan)
            if value in (None, ""):
                value = np.nan
            # Missing cluster inputs must remain NaN so cluster_imputer can handle them.
            # Using 0 here causes face-validity drift (e.g., absent waist interpreted as real value).
            if feature == "waist_circumference" and value == 0:
                value = np.nan
            values.append(value)
        return np.array([values], dtype=float)

    def _transform_features(self, X):
        """Apply optional imputation and scaling in serving order."""
        if self.classifier is not None and hasattr(self.classifier, "named_steps"):
            # Pipeline model: use pipeline's imputer/scaler if separate ones not available
            pipeline = self.classifier
            X_work = X
            if self.imputer is None and "imputer" in pipeline.named_steps:
                X_work = pipeline.named_steps["imputer"].transform(X_work)
            elif self.imputer is not None:
                X_work = self.imputer.transform(X_work)
            if self.scaler is None and "scaler" in pipeline.named_steps:
                X_work = pipeline.named_steps["scaler"].transform(X_work)
            elif self.scaler is not None:
                X_work = self.scaler.transform(X_work)
            return X_work
        # Legacy: separate imputer/scaler files
        X_work = self.imputer.transform(X) if self.imputer is not None else X
        if self.scaler is not None:
            return self.scaler.transform(X_work)
        return X_work
    
    def validate_input(self, data: Mapping[str, Any]) -> tuple[bool, list[str]]:
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
        }
        for feature, (min_val, max_val) in ranges.items():
            if feature in data and data[feature] is not None:
                val = data[feature]
                if val < min_val or val > max_val:
                    errors.append(f"{feature} value {val} out of range [{min_val}, {max_val}]")
        
        if errors:
            return False, errors
        return True, []
    
    def predict(self, data: Mapping[str, Any]) -> Dict[str, Any]:
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
        
        # Prepare model feature vector in training order (features determined by features.json).
        X = self._build_feature_vector(data)

        # Transform features (handles both Pipeline and separate scaler/imputer)
        X_scaled = self._transform_features(X)

        # Build separate cluster feature vector (6 features for KMeans)
        X_cluster = self._build_cluster_vector(data)
        if self.cluster_scaler is not None and self.cluster_imputer is not None:
            # Impute NaNs first, then scale
            X_cluster_imputed = self.cluster_imputer.transform(X_cluster)
            X_cluster_scaled = self.cluster_scaler.transform(X_cluster_imputed)
        else:
            # SAFETY: Do NOT feed raw unscaled features to KMeans.
            # K-Means is distance-based; unscaled values (e.g. TG=150 vs Age=55)
            # would produce statistically meaningless cluster assignments.
            # Disable clustering entirely when scaler or imputer is unavailable.
            missing_artifact = "imputer" if self.cluster_imputer is None else "scaler"
            logger.warning(
                "Cluster %s unavailable — skipping KMeans prediction. "
                "Raw unscaled features would produce garbage cluster assignments.",
                missing_artifact
            )
            X_cluster_scaled = None

        # Get prediction probabilities
        try:
            # If classifier is a pipeline, it will handle imputation and scaling itself.
            # Otherwise, use the manually scaled features.
            if hasattr(self.classifier, "named_steps"):
                proba = self.classifier.predict_proba(X)[0]
            else:
                proba = self.classifier.predict_proba(X_scaled)[0]
            proba_arr = np.asarray(proba, dtype=float).reshape(-1)
            if proba_arr.size < 2:
                raise ValueError(f"Unexpected probability vector shape: {proba_arr.shape}")
                
            # Handle binary (2-class) vs multi-class (3-class) models
            if proba_arr.size == 2:
                # Binary model: proba[0] = Normal, proba[1] = At-Risk
                at_risk_prob = float(proba_arr[1])
                diabetes_prob = float(proba_arr[1])  # Same as at-risk for binary
                predicted_class = 1 if proba_arr[1] >= 0.5 else 0
                # Use optimized threshold if available
                threshold = self.decision_thresholds.get("at_risk", 0.5)
                predicted_class = 1 if proba_arr[1] >= float(threshold) else 0
                status_map = {0: "Normal", 1: "At-Risk"}
            else:
                # Multi-class model (3 classes)  # pyright: ignore[reportOptionalMemberAccess]
                predicted_class = int(np.argmax(proba_arr))
                thresholds = self.decision_thresholds or {}
                diabetic_threshold = thresholds.get("diabetic")
                pre_diabetic_threshold = thresholds.get("pre_diabetic")
                diabetic_prob = float(proba_arr[2]) if proba_arr.size > 2 else 0.0
                pre_diabetic_prob = float(proba_arr[1])
                if diabetic_threshold is not None and diabetic_prob >= float(diabetic_threshold):  # pyright: ignore[reportOptionalMemberAccess]
                    predicted_class = 2
                elif (
                    pre_diabetic_threshold is not None
                    and pre_diabetic_prob >= float(pre_diabetic_threshold)
                ):
                    predicted_class = 1
                diabetes_prob = diabetic_prob
                at_risk_prob = float(pre_diabetic_prob + diabetic_prob)
                status_map = {0: "Normal", 1: "Pre-diabetic", 2: "Diabetic"}
            predicted_status = status_map.get(predicted_class, "Unknown")
            risk_score = int(at_risk_prob * 100)
            confidence = round(float(np.max(proba_arr)), 3)
        except Exception as e:
            return {"success": False, "error": str(e)}
        
        # Neutral sentinel defaults for non-eligible predictions.
        risk_cluster = "N/A"
        risk_level = "UNKNOWN"
        risk_label = "N/A"
        metabolic_subtype = "N/A"
        metabolic_subtype_full = "N/A"
        cluster_description = ""
        treatment_focus = ""

        # Subtype enrichment is only emitted for eligible At-Risk predictions.
        subtype_eligible = predicted_status == "At-Risk"
        assignment_method = "none"
        weighted_artifacts_ready = self._is_weighted_artifacts_ready()
        
        if subtype_eligible and weighted_artifacts_ready and X_cluster_scaled is not None:
            try:
                kmeans_model = self.kmeans
                if kmeans_model is None:
                    raise ValueError("Weighted KMeans model unavailable at prediction time")
                predict_cluster = getattr(kmeans_model, "predict", None)
                if predict_cluster is None:
                    raise ValueError("Weighted KMeans predictor callable unavailable")
                cluster_id = int(predict_cluster(X_cluster_scaled)[0])
                cluster_info = self._get_cluster_info(cluster_id)
                emit_like = self._should_emit_like_labels()
                raw_label = cluster_info.get("label", f"Cluster-{cluster_id}")
                risk_cluster = self._to_like_label(raw_label) if emit_like else raw_label
                risk_level = cluster_info.get("risk_level", "UNKNOWN")
                raw_risk_label = cluster_info.get("risk_label", raw_label)
                risk_label = self._to_like_label(raw_risk_label) if emit_like else raw_risk_label
                # metabolic_subtype uses canonical label (SIDD, SIRD, MOD, MARD) for API compatibility
                # The 'subtype' field in cluster_labels.json contains aliases like 'ATH' for display only
                metabolic_subtype = self._to_like_label(raw_label) if emit_like else raw_label
                raw_subtype_full = cluster_info.get("subtype_full", cluster_info.get("full_name", "N/A"))
                metabolic_subtype_full = self._to_like_label(raw_subtype_full) if emit_like else raw_subtype_full
                cluster_description = cluster_info.get("description", "")
                treatment_focus = cluster_info.get("treatment_focus", "")
                assignment_method = "weighted_kmeans"
            except Exception as e:
                logger.warning("Weighted KMeans prediction failed: %s", e)
        
        model_type = self.model_type or "clinical"
        note_by_type = {
            "binary_v2_no_bp": "Binary at-risk screening model (no HbA1c/FBS).",
            "binary_v2_bp": "Binary at-risk screening model with BP features (no HbA1c/FBS).",
            "clinical": "Clinical screening model (no HbA1c/FBS).",
        }

        cluster_supported = bool(
            weighted_artifacts_ready
            and self.cluster_scaler is not None
            and self.cluster_imputer is not None
            and isinstance(self.cluster_labels, dict)
            and len(self.cluster_labels) > 0
        )

        output_capabilities = {
            "predicted_status": True,
            "risk_score": True,
            "at_risk_probability": True,
            "prediction_confidence": True,
            "metabolic_subtype": cluster_supported,
            "risk_label": True,
            "assignment_method": True,
            "cluster_description": cluster_supported,
            "treatment_focus": cluster_supported,
        }

        cluster_capability = {
            "supported": cluster_supported,
            "required_inputs": self.cluster_features,
            "output_field": "metabolic_subtype",
            "alias_field": "risk_cluster",
            "assignment_method": "weighted_kmeans",
            "weighted_model_artifact": WEIGHTED_KMEANS_FILE,
            "weights_artifact": FEATURE_WEIGHTS_FILE,
        }

        feature_set = {
            "features": self.features,
            "feature_count": len(self.features),
            "source": "features.json",
        }
        
        # Apply confidence threshold per Tanabe et al. (2024) Diabetologia
        # If max probability < 0.60, flag as Indeterminate (undecidable cluster)
        # This improves clinical validity by not forcing borderline predictions
        CONFIDENCE_THRESHOLD = 0.60
        if confidence < CONFIDENCE_THRESHOLD:
            prediction_confidence = "Indeterminate"
            confidence_note = f"Low confidence prediction ({confidence:.0%}). Consider clinical follow-up."
        else:
            prediction_confidence = "Confident"
            confidence_note = None
        
        return {
            "success": True,
            "model_type": model_type,
            "predicted_status": predicted_status,
            # Prediction confidence flag (per Tanabe 2024 "undecidable" concept)
            "prediction_confidence": prediction_confidence,
            "confidence_note": confidence_note,
            # Ahlqvist subtype schema
            "risk_cluster": risk_cluster,
            "metabolic_subtype": metabolic_subtype,
            "metabolic_subtype_full": metabolic_subtype_full,
            # Risk level schema
            "risk_level": risk_level,
            "risk_label": risk_label,
            "assignment_method": assignment_method,
            "cluster_description": cluster_description,
            "treatment_focus": treatment_focus,
            # Probabilities and scores
            "probability": float(round(diabetes_prob, 3)),
            "at_risk_probability": float(round(at_risk_prob, 3)),
            "risk_score": int(risk_score),
            "confidence": float(confidence),
            "feature_set": feature_set,
            "cluster_capability": cluster_capability,
            "output_capabilities": output_capabilities,
            "model_info": {
                "classifier": self.metrics.get("best_model", "Unknown"),
                "auc_roc": float(self.metrics.get("metrics", {}).get("auc_roc", 0)),
                "features_used": self.features,
                "cluster_features": self.cluster_features,
                "decision_thresholds": self.decision_thresholds,
                "weighted_subtyping_ready": weighted_artifacts_ready,
                "note": note_by_type.get(model_type, "Clinical screening model."),
            }
        }
    
    def _get_cluster_info(self, cluster_id: int) -> Dict[str, str]:
        """Get full cluster info including subtype and risk level.
        
        Reads from cluster_labels.json which contains both schemas:
        - Ahlqvist subtype: label, subtype, subtype_full
        - Risk level: risk_level, risk_label
        """
        # Primary source: cluster_labels.json (loaded as self.cluster_labels)
        if str(cluster_id) in self.cluster_labels:
            return self.cluster_labels[str(cluster_id)]
        # Fallback: cluster_analysis.json (backward compat)
        cluster_analysis_labels = self.cluster_analysis.get("cluster_labels", {})
        if str(cluster_id) in cluster_analysis_labels:
            return cluster_analysis_labels[str(cluster_id)]
        return {"label": f"Cluster-{cluster_id}", "risk_level": "UNKNOWN"}
    
    def _get_risk_label(self, cluster_id: int) -> str:
        """Map cluster ID to risk label."""
        cluster_info = self._get_cluster_info(cluster_id)
        return cluster_info.get("risk_label", cluster_info.get("label", f"Cluster-{cluster_id}"))
    
    def predict_batch(self, patients: list[Mapping[str, Any]]) -> list[Dict[str, Any]]:
        """Predict for multiple patients."""
        return [self.predict(p) for p in patients]

    @property
    def shap_background_path(self) -> Path:
        """Path to saved SHAP background data from training."""
        return self.models_dir / "shap_background.joblib"

    @property
    def shap_values_path(self) -> Path:
        """Path to pre-computed SHAP values (optional, for thesis)."""
        return self.models_dir / "shap_training_values.joblib"

    def get_shap_background(self):
        """
        Load saved SHAP background data with validation.

        Returns:
            Dict with 'background' (np.ndarray), 'feature_names', etc.
            None if file missing or validation fails.

        Validation:
            - File exists
            - artifact_version == "1.0"
            - background is 2D ndarray
            - background.shape[1] == len(self.features)
            - All values are finite (no NaN/Inf)
        """
        if not self.shap_background_path.exists():
            logger.debug("SHAP background file not found: %s", self.shap_background_path)
            return None

        try:
            artifact = joblib.load(self.shap_background_path)
        except Exception as e:
            logger.warning("Failed to load SHAP background: %s", e)
            return None

        if not isinstance(artifact, dict):
            logger.warning("SHAP background artifact is not a dict")
            return None

        required_keys = ["background", "feature_names", "n_features"]
        missing = [k for k in required_keys if k not in artifact]
        if missing:
            logger.warning("SHAP background missing keys: %s", missing)
            return None

        background = artifact["background"]

        if not isinstance(background, np.ndarray):
            logger.warning("SHAP background is not ndarray")
            return None

        if background.ndim != 2:
            logger.warning("SHAP background is not 2D: shape=%s", background.shape)
            return None

        if background.shape[1] != len(self.features):
            logger.warning(
                "SHAP background feature count mismatch: "
                "background has %d features, model expects %d",
                background.shape[1], len(self.features)
            )
            return None

        # Check feature order matches exactly
        artifact_feature_names = artifact.get("feature_names", [])
        if artifact_feature_names != self.features:
            logger.warning(
                "SHAP background feature order mismatch: "
                "artifact has %s, model expects %s",
                artifact_feature_names, self.features
            )
            return None

        if not np.all(np.isfinite(background)):
            logger.warning("SHAP background contains NaN/Inf values")
            return None

        artifact_n_features = artifact.get("n_features", 0)
        if artifact_n_features != len(artifact.get("feature_names", [])):
            logger.warning(
                "SHAP background n_features mismatch: n_features=%d, feature_names has %d",
                artifact_n_features, len(artifact.get("feature_names", []))
            )
            return None

        logger.info(
            "Loaded valid SHAP background: shape=%s, features=%d",
            background.shape, artifact["n_features"]
        )

        return artifact


_clinical_predictor = None
_clinical_predictors = {}
_predictor = None


def _resolve_model_type(model_type: Optional[str]) -> str:
    if not model_type:
        return "clinical"
    return model_type


def _resolve_clinical_models_dir_for_type(model_type: Optional[str]) -> Path:
    resolved_type = _resolve_model_type(model_type)
    if resolved_type == "binary_v2_no_bp":
        return _validate_model_dir(MODELS_ROOT / "binary_v2_no_bp")
    if resolved_type == "binary_v2_bp":
        return _validate_model_dir(MODELS_ROOT / "binary_v2_with_bp")
    return resolve_clinical_models_dir()

def get_predictor() -> DianaPredictor:
    """Get or create singleton ADA predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = DianaPredictor()
    assert _predictor is not None
    return _predictor


def get_clinical_predictor() -> ClinicalPredictor:
    """Get or create singleton clinical predictor instance."""
    global _clinical_predictor
    if _clinical_predictor is None:
        _clinical_predictor = ClinicalPredictor(model_type="clinical")
    assert _clinical_predictor is not None
    return _clinical_predictor


def get_clinical_predictor_for(model_type: Optional[str]) -> ClinicalPredictor:
    resolved_type = _resolve_model_type(model_type)
    if resolved_type in _clinical_predictors:
        predictor = _clinical_predictors[resolved_type]
        assert predictor is not None
        return predictor
    models_dir = _resolve_clinical_models_dir_for_type(resolved_type)
    predictor = ClinicalPredictor(models_dir=models_dir, model_type=resolved_type)
    _clinical_predictors[resolved_type] = predictor
    assert predictor is not None
    return predictor


def predict(data: Dict[str, float], model_type: str = "ada") -> Dict[str, Any]:
    """
    Convenience function for single prediction.

    Args:
        data: Patient data dictionary
        model_type: "binary_v2_no_bp" or "clinical" for binary at-risk screening model (default),
                   "ada" for baseline HbA1c/FBS-based model
    """
    if model_type in ("binary_v2_no_bp", "clinical", "binary_v2_bp"):
        clinical_predictor = get_clinical_predictor_for(model_type)
        predict_fn = getattr(clinical_predictor, "predict", None)
        if predict_fn is None:
            raise RuntimeError("Clinical predictor unavailable")
        return predict_fn(data)
    ada_predictor = get_predictor()
    predict_fn = getattr(ada_predictor, "predict", None)
    if predict_fn is None:
        raise RuntimeError("ADA predictor unavailable")
    return predict_fn(data)


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
