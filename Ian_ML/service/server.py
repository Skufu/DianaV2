"""
DIANA ML API Server
Flask REST API for diabetes risk prediction.

Endpoints:
    POST /predict - Single patient prediction
    POST /predict/batch - Multiple patients
    POST /predict/explain - Prediction with SHAP explanation
    GET /health - Health check
    
    # A/B Testing
    GET/POST /ab-tests - List or create A/B tests
    GET /ab-tests/<test_id>/results - Get comparison results
    
    # Model Monitoring
    GET /monitoring/drift - Get drift status
    POST /monitoring/drift/check - Check for drift
    GET /monitoring/alerts - Get recent alerts
    
    # Model Versioning
    GET /models - List model versions
    POST /models/<id>/promote - Promote to production

Usage:
    python Ian_ML/service/server.py
    
Environment:
    ML_PORT: Port to run on (default: 5000)
"""

import importlib
import os
import sys
import json
import logging
import threading
import functools
import time
import hmac
import math
from collections import defaultdict
from typing import Any
import numpy as np
flask_module = importlib.import_module("flask")
Flask = flask_module.Flask
request = flask_module.request
jsonify = flask_module.jsonify
g = flask_module.g

cors_module = importlib.import_module("flask_cors")
CORS = cors_module.CORS

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from Ian_ML.common.paths import MODELS_ROOT
from Ian_ML.service.predict import (
    DianaPredictor,
    ClinicalPredictor,
    REQUIRED_FEATURES,
    CLINICAL_FEATURES,
    resolve_clinical_models_dir,
    get_clinical_predictor_for,
)

# Configuration
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB max request size
MAX_BATCH_SIZE = 1000  # Maximum patients per batch request
API_KEY = os.environ.get('ML_API_KEY')  # API key for authentication (required in production)

# Import new ML infrastructure modules
try:
    from Ian_ML.service.explainability import SHAPExplainer, format_for_clinician, generate_waterfall_plot
    shap_module_available = True
except ImportError:
    SHAPExplainer = None
    format_for_clinician = None
    generate_waterfall_plot = None
    shap_module_available = False

try:
    from Ian_ML.service.ab_testing import get_ab_manager, ABTestConfig
    ab_testing_available = True
except ImportError:
    get_ab_manager = None
    ABTestConfig = None
    ab_testing_available = False

try:
    from Ian_ML.service.drift_detection import get_drift_monitor
    drift_available = True
except ImportError:
    get_drift_monitor = None
    drift_available = False

try:
    from Ian_ML.service.mlflow_config import get_mlflow_manager
    mlflow_available = True
except ImportError:
    get_mlflow_manager = None
    mlflow_available = False

logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:8080,http://localhost:4000').split(',')
CORS(app, origins=ALLOWED_ORIGINS if os.environ.get('ENV') == 'production' else '*')


def _dataset_hash_from_metrics(metrics):
    if isinstance(metrics, dict):
        value = metrics.get("dataset_hash")
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return os.environ.get("MODEL_DATASET_HASH", "").strip()


def _normalize_model_version(value: str) -> str:
    normalized = str(value or "").strip()
    aliases = {
        "binary_v2_with_bp": "binary_v2_bp",
    }
    return aliases.get(normalized, normalized)


def _resolve_model_version_for_lineage(resolved: str, predictor) -> str:
    model_version = _normalize_model_version(getattr(predictor, "model_type", ""))
    if model_version and model_version != "clinical":
        return model_version

    models_dir = getattr(predictor, "models_dir", None)
    models_dir_name = _normalize_model_version(getattr(models_dir, "name", ""))
    if models_dir_name and models_dir_name != "clinical":
        return models_dir_name

    if model_version:
        return model_version

    return _normalize_model_version(resolved)


def _lineage_for_model_type(model_type: str, clinical_predictor=None):
    resolved = model_type or "binary_v2_no_bp"
    if resolved in ('binary_v2_no_bp', 'binary_v2_bp'):
        predictor = clinical_predictor
        if predictor is None:
            predictor = get_clinical_predictor_for(resolved)
        if predictor is None:
            return (resolved, "", "")
        model_version = _resolve_model_version_for_lineage(resolved, predictor)
        dataset_hash = _dataset_hash_from_metrics(getattr(predictor, "metrics", {}))
        feature_schema_version = f"features:{len(getattr(predictor, 'features', []) or [])}"
        return (model_version, dataset_hash, feature_schema_version)

    predictor = get_predictor()
    model_version = "ada"
    dataset_hash = _dataset_hash_from_metrics(getattr(predictor, "metrics", {}))
    feature_schema_version = "features:6"
    return (model_version, dataset_hash, feature_schema_version)


def _drift_baseline_for_lineage(model_version: str, dataset_hash: str, feature_schema_version: str):
    default = {
        "baseline_id": "",
        "baseline_version": "",
        "model_version": model_version or "",
        "dataset_hash": dataset_hash or "",
        "feature_schema_version": feature_schema_version or "",
        "source_kind": "",
        "created_at": "",
        "refreshed_at": "",
        "stale_after": "",
        "sample_count": 0,
        "reference_features": [],
        "lineage_status": "missing_reference",
    }

    if not drift_available or get_drift_monitor is None:
        return default

    monitor = get_drift_monitor()
    baseline = monitor.get_baseline_metadata(
        active_model_version=model_version,
        active_dataset_hash=dataset_hash,
        active_feature_schema_version=feature_schema_version,
    )

    if model_version and not baseline.get("model_version"):
        baseline["model_version"] = model_version
    if dataset_hash and not baseline.get("dataset_hash"):
        baseline["dataset_hash"] = dataset_hash
    if feature_schema_version and not baseline.get("feature_schema_version"):
        baseline["feature_schema_version"] = feature_schema_version
    return baseline


class RateLimiter:
    def __init__(self, requests_per_minute=60, requests_per_second=10):
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_second
        self.minute_requests = defaultdict(list)
        self.second_requests = defaultdict(list)
        self._lock = threading.Lock()
    
    def _get_client_id(self):
        return request.headers.get('X-API-Key', request.remote_addr or 'unknown')
    
    def _cleanup_old(self, requests_list, window):
        now = time.time()
        cutoff = now - window
        return [t for t in requests_list if t > cutoff]
    
    def is_allowed(self):
        with self._lock:
            now = time.time()
            client_id = self._get_client_id()
            
            self.minute_requests[client_id] = self._cleanup_old(
                self.minute_requests[client_id], 60
            )
            self.second_requests[client_id] = self._cleanup_old(
                self.second_requests[client_id], 1
            )
            
            if len(self.minute_requests[client_id]) >= self.requests_per_minute:
                return False, "rate limit exceeded (per minute)"
            if len(self.second_requests[client_id]) >= self.requests_per_second:
                return False, "rate limit exceeded (per second)"
            
            self.minute_requests[client_id].append(now)
            self.second_requests[client_id].append(now)
            return True, None


rate_limiter = RateLimiter(
    requests_per_minute=int(os.environ.get('ML_RATE_LIMIT_MINUTE', 10000)),
    requests_per_second=int(os.environ.get('ML_RATE_LIMIT_SECOND', 1000))
)


def rate_limit(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        allowed, reason = rate_limiter.is_allowed()
        if not allowed:
            return jsonify({"error": reason}), 429
        return f(*args, **kwargs)
    return decorated_function


# Thread-safe predictor management
class PredictorManager:
    """Thread-safe singleton manager for ML predictors."""

    def __init__(self):
        self._predictor = None
        self._clinical_predictor = None
        self._lock = threading.Lock()

    def get_predictor(self):
        """Get ADA baseline predictor (thread-safe)."""
        if self._predictor is None:
            with self._lock:
                if self._predictor is None:
                    logger.info("Loading ADA baseline predictor (DianaPredictor)...")
                    self._predictor = DianaPredictor()
                    logger.info("✓ ADA baseline predictor loaded successfully")
        return self._predictor

    def get_clinical_predictor(self):
        """Get clinical predictor (thread-safe)."""
        if self._clinical_predictor is None:
            with self._lock:
                if self._clinical_predictor is None:
                    try:
                        logger.info("Loading clinical predictor (ClinicalPredictor)...")
                        self._clinical_predictor = ClinicalPredictor()
                        clin_dir = self._clinical_predictor.models_dir
                        logger.info("✓ Clinical predictor loaded: %s (features: %d)",
                                    clin_dir.name, len(self._clinical_predictor.features))
                    except FileNotFoundError as e:
                        logger.warning("Clinical model not found: %s", e)
                        return None
        return self._clinical_predictor


# Global predictor manager
_predictor_manager = PredictorManager()

# SHAP explainer cache scoped by (model_type, explainer_type, background_source)
# Key: (model_id, "tree"|"kernel", "saved"|"fallback")
_shap_explainer_cache: dict[tuple[str, str, str], Any] = {}


def _get_shap_cache_key(model_id: str, explainer_type: str, bg_source: str) -> tuple[str, str, str]:
    """Generate cache key for SHAP explainer."""
    return (model_id, explainer_type, bg_source)


def get_predictor():
    """Lazy load ADA baseline predictor."""
    return _predictor_manager.get_predictor()


def get_clinical_predictor():
    """Lazy load clinical (non-circular) predictor."""
    return _predictor_manager.get_clinical_predictor()


def get_clinical_results_dir():
    """Resolve active clinical results directory."""
    clin = get_clinical_predictor()
    if clin is not None:
        return clin.results_dir
    return resolve_clinical_models_dir() / "results"


def require_api_key(f):
    """Decorator to require API key authentication for endpoints.
    
    In testing mode, authentication is skipped to keep unit tests isolated.
    In development mode (ML_API_KEY not set), authentication is skipped.
    In production (ML_API_KEY is set), API key validation is enforced.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip API key validation in test mode
        if app.config.get("TESTING"):
            return f(*args, **kwargs)

        # Skip API key validation in development mode (when ML_API_KEY is not set)
        if not API_KEY:
            logger.debug("ML_API_KEY not configured - running in development mode (no auth)")
            return f(*args, **kwargs)

        # In production, validate the API key
        provided_key = request.headers.get('X-API-Key', '')
        if not provided_key or not hmac.compare_digest(provided_key, API_KEY):
            return jsonify({"error": "Invalid or missing API key"}), 401

        return f(*args, **kwargs)
    return decorated_function


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    clinical_available = get_clinical_predictor() is not None
    return jsonify({
        "status": "healthy",
        "model": "diana-v2",
        "models_available": {
            "ada_baseline": True,
            "clinical": clinical_available
        },
        "features": {
            "ada": REQUIRED_FEATURES,
            "clinical": CLINICAL_FEATURES
        }
    })


@app.route('/warmup', methods=['POST'])
@require_api_key
def warmup():
    """
    Warmup endpoint to preload models and SHAP explainers.
    
    Call this endpoint after server startup to eliminate cold start latency.
    This is especially important for production deployments where the first
    prediction should not experience model loading delays.
    
    Returns:
        JSON with warmup status and loaded model information.
    """
    warmup_results = {
        "status": "success",
        "models": {},
        "shap_explainers": {},
        "timing_ms": {}
    }
    
    start_time = time.time()
    
    # Warmup ADA baseline predictor
    try:
        ada_start = time.time()
        ada_predictor = get_predictor()
        # Make a dummy prediction to fully load the model
        dummy_data = {
            "hba1c": 5.5, "fbs": 95, "bmi": 25.0,
            "triglycerides": 120, "ldl": 100, "hdl": 50
        }
        ada_predictor.predict(dummy_data)
        warmup_results["models"]["ada_baseline"] = "loaded"
        warmup_results["timing_ms"]["ada_baseline"] = round((time.time() - ada_start) * 1000, 2)
    except Exception as e:
        warmup_results["models"]["ada_baseline"] = f"failed: {str(e)}"
        logger.warning("ADA baseline warmup failed: %s", e)
    
    # Warmup clinical predictor
    try:
        clin_start = time.time()
        clin_predictor = get_clinical_predictor_for('binary_v2_no_bp')
        if clin_predictor:
            # Make a dummy prediction to fully load the model
            dummy_data = {
                "bmi": 25.0, "triglycerides": 120, "ldl": 100, "hdl": 50,
                "age": 55, "waist_circumference": 85,
                "smoking_status": "Never", "physical_activity": "Moderate", 
                "alcohol_use": "None"
            }
            clin_predictor.predict(dummy_data)
            warmup_results["models"]["clinical"] = "loaded"
            warmup_results["timing_ms"]["clinical"] = round((time.time() - clin_start) * 1000, 2)
            
            # Preload SHAP explainer for clinical model if available
            if shap_module_available and SHAPExplainer is not None:
                try:
                    shap_start = time.time()
                    model_id = f"clinical_{id(clin_predictor.classifier)}"
                    cache_key = _get_shap_cache_key(model_id, "tree", "none")
                    
                    # Try TreeExplainer first
                    shap_explainer = _shap_explainer_cache.get(cache_key)
                    if shap_explainer is None:
                        shap_explainer = SHAPExplainer(clin_predictor.classifier, model_type="tree")
                        if shap_explainer.is_available:
                            _shap_explainer_cache[cache_key] = shap_explainer
                            warmup_results["shap_explainers"]["clinical_tree"] = "loaded"
                        else:
                            # Try KernelExplainer with saved background
                            bg_artifact = clin_predictor.get_shap_background()
                            if bg_artifact is not None:
                                cache_key = _get_shap_cache_key(model_id, "kernel", "saved_training_data")
                                shap_explainer = SHAPExplainer(
                                    clin_predictor.classifier,
                                    model_type="kernel",
                                    background_data=bg_artifact["background"]
                                )
                                if shap_explainer.is_available:
                                    _shap_explainer_cache[cache_key] = shap_explainer
                                    warmup_results["shap_explainers"]["clinical_kernel"] = "loaded"
                    else:
                        warmup_results["shap_explainers"]["clinical_tree"] = "already_cached"
                    
                    warmup_results["timing_ms"]["shap"] = round((time.time() - shap_start) * 1000, 2)
                except Exception as e:
                    warmup_results["shap_explainers"]["clinical"] = f"failed: {str(e)}"
                    logger.warning("SHAP warmup failed: %s", e)
        else:
            warmup_results["models"]["clinical"] = "not_available"
    except Exception as e:
        warmup_results["models"]["clinical"] = f"failed: {str(e)}"
        logger.warning("Clinical predictor warmup failed: %s", e)
    
    warmup_results["timing_ms"]["total"] = round((time.time() - start_time) * 1000, 2)
    
    return jsonify(warmup_results)


@app.route('/predict', methods=['POST'])
@require_api_key
@rate_limit
def predict():
    """
    Predict diabetes risk for a single patient.

    Query params:
        model_type: "clinical" (default), "binary_v2_no_bp", "binary_v2_bp", or "ada"

    For clinical model (non-circular, recommended):
        Base features (5): bmi, triglycerides, ldl, hdl, age
        Lifestyle (optional): smoking, activity, alcohol
        Engineered features computed automatically from base features

    For ADA baseline:
        Required: hba1c, fbs, bmi, triglycerides, ldl, hdl
    """
    try:
        data = request.get_json()
        model_type = request.args.get('model_type', 'clinical')
        lineage_model_version = ""
        lineage_dataset_hash = ""
        lineage_feature_schema_version = ""
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        if model_type in ('binary_v2_no_bp', 'binary_v2_bp', 'clinical'):
            # Use clinical model (binary_v2_no_bp is the final production model)
            clin_predictor = get_clinical_predictor_for('binary_v2_no_bp')
            if clin_predictor is None:
                return jsonify({
                    "error": "Clinical model not trained. Run Ian_ML/training/train_binary_v2_no_bp.py or scripts/train/train_quick.py first."
                }), 503

            # Extract base features + lifestyle data for clinical model
            patient_data = {
                "bmi": data.get("bmi"),
                "triglycerides": data.get("triglycerides"),
                "ldl": data.get("ldl"),
                "hdl": data.get("hdl"),
                "age": data.get("age", 54),
                "systolic": data.get("systolic"),
                "diastolic": data.get("diastolic"),
                "smoking_status": data.get("smoking", "Unknown"),
                "physical_activity": data.get("activity", "Unknown"),
                "alcohol_use": data.get("alcohol", "Unknown"),
                "waist_circumference": data.get("waist_circumference"),
                "family_history_diabetes": data.get("family_history_diabetes"),
            }
            result = clin_predictor.predict(patient_data)
            lineage_model_version, lineage_dataset_hash, lineage_feature_schema_version = _lineage_for_model_type(model_type, clin_predictor)
        else:
            # Use ADA baseline model
            ada_predictor = get_predictor()
            patient_data = {
                "hba1c": data.get("hba1c"),
                "fbs": data.get("fbs"),
                "bmi": data.get("bmi"),
                "triglycerides": data.get("triglycerides"),
                "ldl": data.get("ldl"),
                "hdl": data.get("hdl")
            }
            result = ada_predictor.predict(patient_data)
            lineage_model_version = "ada"
            lineage_dataset_hash = _dataset_hash_from_metrics(getattr(ada_predictor, "metrics", {}))
            lineage_feature_schema_version = "features:6"
        
        if not result.get("success"):
            return jsonify({"error": result.get("error")}), 400

        if not result.get("model_version"):
            result["model_version"] = lineage_model_version
        if not result.get("dataset_hash"):
            result["dataset_hash"] = lineage_dataset_hash

        lineage_model_version = result.get("model_version") or lineage_model_version
        lineage_dataset_hash = result.get("dataset_hash") or lineage_dataset_hash
        if not result.get("drift_baseline"):
            result["drift_baseline"] = _drift_baseline_for_lineage(
                lineage_model_version,
                lineage_dataset_hash,
                lineage_feature_schema_version,
            )

        result["model_type"] = model_type
        return jsonify(result)

    except Exception as e:
        logger.exception("Prediction failed")
        return jsonify({"error": "Prediction failed"}), 500


@app.route('/predict/explain', methods=['POST'])
@require_api_key
@rate_limit
def predict_explain():
    """
    Predict with SHAP explanation for clinicians.

    Query params:
        model_type: "clinical" (default), "binary_v2_no_bp", "binary_v2_bp", or "ada"
        format: "full" (default) or "clinician" (simplified)

    For clinical model (active no-BP contract = 9 features):
        Base features: bmi, triglycerides, ldl, hdl, age
        Lifestyle: smoking, activity, alcohol (optional)

    Returns prediction results with SHAP-based feature contributions.
    """
    if not shap_module_available or SHAPExplainer is None:
        return jsonify({"error": "SHAP not available. Install shap package."}), 503
    
    try:
        data = request.get_json()
        model_type = request.args.get('model_type', 'clinical')
        output_format = request.args.get('format', 'full')
        include_plot = request.args.get('include_plot', 'false').lower() == 'waterfall'
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Initialize provenance metadata
        explainer_type = "tree"
        bg_source = "none"
        background = None
        
        # Get predictor and make prediction
        if model_type in ('binary_v2_no_bp', 'binary_v2_bp'):
            clin_predictor = get_clinical_predictor_for(model_type)
            if clin_predictor is None:
                return jsonify({"error": "Clinical model not available"}), 503
            
            # Extract base features + lifestyle data for clinical screening model
            patient_data = {
                "bmi": data.get("bmi"),
                "triglycerides": data.get("triglycerides"),
                "ldl": data.get("ldl"),
                "hdl": data.get("hdl"),
                "age": data.get("age", 54),
                "smoking_status": data.get("smoking", "Unknown"),
                "physical_activity": data.get("activity", "Unknown"),
                "alcohol_use": data.get("alcohol", "Unknown"),
                "waist_circumference": data.get("waist_circumference"),
                "family_history_diabetes": data.get("family_history_diabetes"),
            }
            
            # Make prediction
            result = clin_predictor.predict(patient_data)
            
            # Get SHAP explanation with proper cache scoping
            model_id = f"clinical_{id(clin_predictor.classifier)}"
            
            # Try TreeExplainer first
            cache_key = _get_shap_cache_key(model_id, "tree", "none")
            shap_explainer = _shap_explainer_cache.get(cache_key)
            
            if shap_explainer is None:
                shap_explainer = SHAPExplainer(clin_predictor.classifier, model_type="tree")
                if shap_explainer.is_available:
                    _shap_explainer_cache[cache_key] = shap_explainer
                else:
                    shap_explainer = None
            
            # Fallback to KernelExplainer with saved background
            if shap_explainer is None or not shap_explainer.is_available:
                explainer_type = "kernel"
                
                # Try loading saved background
                bg_artifact = clin_predictor.get_shap_background()
                
                if bg_artifact is not None:
                    bg_source = "saved_training_data"
                    background = bg_artifact["background"]
                    logger.info("Using saved SHAP background from training (%d samples)", len(background))
                else:
                    bg_source = "patient_data_fallback"
                    logger.warning(
                        "No saved SHAP background found - using patient data (less reliable). "
                        "Re-run training to generate shap_background.joblib"
                    )
                    # Fallback: use patient data (degraded mode)
                    patient_features = clin_predictor._build_feature_vector(patient_data)
                    patient_scaled = clin_predictor._transform_features(patient_features)
                    background = np.repeat(patient_scaled, 16, axis=0)
                
                cache_key = _get_shap_cache_key(model_id, "kernel", bg_source)
                shap_explainer = _shap_explainer_cache.get(cache_key)
                
                if shap_explainer is None:
                    shap_explainer = SHAPExplainer(
                        clin_predictor.classifier,
                        model_type="kernel",
                        background_data=background,
                    )
                    if shap_explainer.is_available:
                        _shap_explainer_cache[cache_key] = shap_explainer
                    else:
                        shap_explainer = None

            if shap_explainer is None:
                return jsonify({"error": "SHAP explainer unavailable"}), 503

            clinical_features = clin_predictor._build_feature_vector(patient_data)
            clinical_features_scaled = clin_predictor._transform_features(clinical_features)
            explanation = shap_explainer.explain(
                clinical_features_scaled[0],
                clin_predictor.features,
                feature_values_override=clinical_features[0]
            )
        else:
            # ADA model
            ada_predictor = get_predictor()
            patient_data = {
                "hba1c": data.get("hba1c"),
                "fbs": data.get("fbs"),
                "bmi": data.get("bmi"),
                "triglycerides": data.get("triglycerides"),
                "ldl": data.get("ldl"),
                "hdl": data.get("hdl")
            }
            
            result = ada_predictor.predict(patient_data)
            
            model_id = f"ada_{id(ada_predictor.classifier)}"
            cache_key = _get_shap_cache_key(model_id, "tree", "none")
            shap_explainer = _shap_explainer_cache.get(cache_key)
            
            if shap_explainer is None:
                shap_explainer = SHAPExplainer(ada_predictor.classifier, model_type="tree")
                if shap_explainer.is_available:
                    _shap_explainer_cache[cache_key] = shap_explainer
                else:
                    shap_explainer = None

            if shap_explainer is None:
                return jsonify({"error": "SHAP explainer unavailable"}), 503

            features = np.array([[patient_data[f] for f in REQUIRED_FEATURES]], dtype=float)
            if ada_predictor.scaler is not None:
                features_scaled = ada_predictor.scaler.transform(features)
                explanation = shap_explainer.explain(
                    features_scaled[0],
                    REQUIRED_FEATURES,
                    feature_values_override=features[0]
                )
            else:
                explanation = shap_explainer.explain(
                    features[0],
                    REQUIRED_FEATURES,
                    feature_values_override=features[0]
                )
        
        # Format response
        if output_format == 'clinician':
            if format_for_clinician is None:
                return jsonify({"error": "SHAP formatter not available"}), 503
            result['explanation'] = format_for_clinician(explanation)
        else:
            if include_plot:
                if generate_waterfall_plot is None:
                    return jsonify({"error": "SHAP plotter not available"}), 503
                waterfall_plot = generate_waterfall_plot(explanation)
                if waterfall_plot:
                    explanation['waterfall_plot'] = waterfall_plot
            result['explanation'] = explanation
        
        # Add SHAP provenance metadata
        result['shap_metadata'] = {
            "explainer_type": explainer_type,
            "background_source": bg_source,
            "background_samples": len(background) if background is not None else None,
        }
        
        result['model_type'] = model_type
        return jsonify(result)
        
    except Exception as e:
        logger.exception("Explain prediction failed")
        return jsonify({"error": "Explain prediction failed"}), 500


# =============================================================================
# A/B TESTING ENDPOINTS
# =============================================================================

@app.route('/ab-tests', methods=['GET', 'POST'])
@require_api_key
@rate_limit
def ab_tests():
    """List or create A/B tests."""
    if not ab_testing_available or get_ab_manager is None:
        return jsonify({"error": "A/B testing not available"}), 503
    
    manager = get_ab_manager()
    
    if request.method == 'GET':
        status = request.args.get('status')  # Optional filter
        tests = manager.list_tests(status=status)
        return jsonify({
            "tests": [
                {
                    "test_name": t.test_name,
                    "baseline": t.baseline_version,
                    "challenger": t.challenger_version,
                    "traffic_split": t.traffic_split,
                    "status": t.status,
                    "created_at": t.created_at
                }
                for t in tests
            ]
        })
    else:  # POST
        try:
            data = request.get_json()
            test = manager.create_test(
                test_name=data['test_name'],
                baseline_version=data['baseline_version'],
                challenger_version=data['challenger_version'],
                traffic_split=data.get('traffic_split', 0.1),
                description=data.get('description', '')
            )
            return jsonify({"success": True, "test_name": test.test_name}), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except KeyError as e:
            return jsonify({"error": f"Missing required field: {e}"}), 400


@app.route('/ab-tests/<test_id>', methods=['GET', 'PATCH', 'DELETE'])
@require_api_key
@rate_limit
def ab_test_detail(test_id):
    """Get, update, or delete a specific A/B test."""
    if not ab_testing_available or get_ab_manager is None:
        return jsonify({"error": "A/B testing not available"}), 503
    
    manager = get_ab_manager()
    
    if request.method == 'GET':
        test = manager.get_test(test_id)
        if not test:
            return jsonify({"error": "Test not found"}), 404
        return jsonify({
            "test_name": test.test_name,
            "baseline": test.baseline_version,
            "challenger": test.challenger_version,
            "traffic_split": test.traffic_split,
            "status": test.status,
            "created_at": test.created_at,
            "description": test.description
        })
    elif request.method == 'PATCH':
        data = request.get_json()
        if 'status' in data:
            success = manager.update_test_status(test_id, data['status'])
            if success:
                return jsonify({"success": True})
            return jsonify({"error": "Test not found"}), 404
        return jsonify({"error": "No valid fields to update"}), 400
    else:  # DELETE
        delete_predictions = request.args.get('delete_predictions', 'false').lower() == 'true'
        success = manager.delete_test(test_id, delete_predictions=delete_predictions)
        if success:
            return jsonify({"success": True})
        return jsonify({"error": "Test not found"}), 404


@app.route('/ab-tests/<test_id>/results', methods=['GET'])
@require_api_key
@rate_limit
def ab_test_results(test_id):
    """Get comparison results for an A/B test."""
    if not ab_testing_available or get_ab_manager is None:
        return jsonify({"error": "A/B testing not available"}), 503
    
    manager = get_ab_manager()
    results = manager.get_comparison(test_id)
    
    if 'error' in results:
        return jsonify(results), 404
    
    return jsonify(results)


# =============================================================================
# DRIFT MONITORING ENDPOINTS
# =============================================================================

@app.route('/monitoring/drift', methods=['GET'])
@require_api_key
@rate_limit
def drift_status():
    """Get current drift monitoring status."""
    if not drift_available or get_drift_monitor is None:
        return jsonify({"error": "Drift detection not available"}), 503
    
    monitor = get_drift_monitor()
    model_version, dataset_hash, feature_schema_version = _lineage_for_model_type("clinical")
    status = monitor.get_status()
    status["active_lineage"] = {
        "model_version": model_version,
        "dataset_hash": dataset_hash,
        "feature_schema_version": feature_schema_version,
    }
    status["drift_baseline"] = _drift_baseline_for_lineage(model_version, dataset_hash, feature_schema_version)
    return jsonify(status)


@app.route('/monitoring/drift/check', methods=['POST'])
@require_api_key
@rate_limit
def check_drift():
    """Check for drift in provided data."""
    if not drift_available or get_drift_monitor is None:
        return jsonify({"error": "Drift detection not available"}), 503
    
    try:
        data = request.get_json()
        monitor = get_drift_monitor()
        
        if not data or 'features' not in data:
            return jsonify({"error": "No feature data provided"}), 400
        
        # Convert to numpy arrays
        current_data = {
            k: np.array(v) for k, v in data['features'].items()
        }
        
        report = monitor.check_feature_drift(current_data)
        
        # Create alert if drift detected
        if report.has_drift:
            monitor.create_alert(report)
        
        return jsonify(report.to_dict())
        
    except Exception as e:
        logger.exception("Drift check failed")
        return jsonify({"error": "Drift check failed"}), 500


@app.route('/monitoring/drift/reference', methods=['POST'])
@require_api_key
@rate_limit
def set_drift_reference():
    """Set reference data for drift detection."""
    if not drift_available or get_drift_monitor is None:
        return jsonify({"error": "Drift detection not available"}), 503
    
    try:
        data = request.get_json()
        monitor = get_drift_monitor()
        
        if not data or 'features' not in data:
            return jsonify({"error": "No feature data provided"}), 400
        
        # Convert to numpy arrays
        reference_data = {
            k: np.array(v) for k, v in data['features'].items()
        }

        requested_model_type = str(data.get("model_type") or request.headers.get("X-Model-Version") or "clinical")
        model_version, dataset_hash, feature_schema_version = _lineage_for_model_type(requested_model_type)
        metadata = dict(data.get("metadata") or {})
        if data.get("baseline_id") is not None:
            metadata["baseline_id"] = data.get("baseline_id")
        if data.get("baseline_version") is not None:
            metadata["baseline_version"] = data.get("baseline_version")
        if data.get("source_kind") is not None:
            metadata["source_kind"] = data.get("source_kind")
        if data.get("stale_after") is not None:
            metadata["stale_after"] = data.get("stale_after")
        if data.get("created_at") is not None:
            metadata["created_at"] = data.get("created_at")
        if data.get("refreshed_at") is not None:
            metadata["refreshed_at"] = data.get("refreshed_at")
        metadata.setdefault("model_version", model_version)
        metadata.setdefault("dataset_hash", dataset_hash)
        metadata.setdefault("feature_schema_version", feature_schema_version)
        metadata.setdefault("reference_features", list(reference_data.keys()))
        metadata.setdefault("sample_count", min((len(v) for v in reference_data.values()), default=0))

        monitor.set_reference(reference_data, metadata=metadata)
        baseline = monitor.get_baseline_metadata(
            active_model_version=model_version,
            active_dataset_hash=dataset_hash,
            active_feature_schema_version=feature_schema_version,
        )

        return jsonify({
            "success": True,
            "features": list(reference_data.keys()),
            "drift_baseline": baseline,
        })
        
    except Exception as e:
        logger.exception("Set reference failed")
        return jsonify({"error": "Set reference failed"}), 500


@app.route('/monitoring/alerts', methods=['GET'])
@require_api_key
@rate_limit
def get_alerts():
    """Get recent drift alerts."""
    if not drift_available or get_drift_monitor is None:
        return jsonify({"error": "Drift detection not available"}), 503
    
    monitor = get_drift_monitor()
    unacked_only = request.args.get('unacknowledged', 'false').lower() == 'true'
    limit = int(request.args.get('limit', 50))
    
    alerts = monitor.get_alerts(unacknowledged_only=unacked_only, limit=limit)
    return jsonify({"alerts": alerts})


@app.route('/monitoring/alerts/<timestamp>/acknowledge', methods=['POST'])
@require_api_key
@rate_limit
def acknowledge_alert(timestamp):
    """Acknowledge a drift alert."""
    if not drift_available or get_drift_monitor is None:
        return jsonify({"error": "Drift detection not available"}), 503
    
    monitor = get_drift_monitor()
    success = monitor.acknowledge_alert(timestamp)
    
    if success:
        return jsonify({"success": True})
    return jsonify({"error": "Alert not found"}), 404


# =============================================================================
# MODEL VERSIONING ENDPOINTS
# =============================================================================

@app.route('/models', methods=['GET'])
@require_api_key
@rate_limit
def list_models():
    """List all model versions from MLflow registry."""
    if not mlflow_available or get_mlflow_manager is None:
        return jsonify({"error": "MLflow not available"}), 503
    
    manager = get_mlflow_manager()
    
    if not manager.is_available:
        return jsonify({"error": "MLflow not configured"}), 503
    
    model_name = request.args.get('name', 'diana-clinical')
    versions = manager.get_model_versions(model_name)
    
    return jsonify({
        "model_name": model_name,
        "versions": versions
    })


@app.route('/models/<name>/runs', methods=['GET'])
@require_api_key
@rate_limit
def list_model_runs(name):
    """List training runs for a model."""
    if not mlflow_available or get_mlflow_manager is None:
        return jsonify({"error": "MLflow not available"}), 503
    
    manager = get_mlflow_manager()
    
    if not manager.is_available:
        return jsonify({"error": "MLflow not configured"}), 503
    
    max_results = int(request.args.get('limit', 20))
    runs = manager.list_runs(max_results=max_results)
    
    return jsonify({"runs": runs})


@app.route('/models/<name>/<int:version>/promote', methods=['POST'])
@require_api_key
@rate_limit
def promote_model(name, version):
    """Promote a model version to production."""
    if not mlflow_available or get_mlflow_manager is None:
        return jsonify({"error": "MLflow not available"}), 503
    
    manager = get_mlflow_manager()
    
    if not manager.is_available:
        return jsonify({"error": "MLflow not configured"}), 503
    
    data = request.get_json() or {}
    stage = data.get('stage', 'Production')
    
    success = manager.transition_model_stage(name, version, stage)
    
    if success:
        return jsonify({"success": True, "message": f"Model {name} v{version} promoted to {stage}"})
    return jsonify({"error": "Failed to promote model"}), 500


@app.route('/models/experiments', methods=['GET'])
@require_api_key
@rate_limit
def list_experiments():
    """List all MLflow experiments."""
    if not mlflow_available or get_mlflow_manager is None:
        return jsonify({"error": "MLflow not available"}), 503
    
    manager = get_mlflow_manager()
    
    if not manager.is_available:
        return jsonify({"error": "MLflow not configured"}), 503
    
    experiments = manager.list_experiments()
    return jsonify({"experiments": experiments})


@app.route('/predict/batch', methods=['POST'])
@require_api_key
@rate_limit
def predict_batch():
    """
    Predict for multiple patients.

    Query params:
        model_type: "clinical" (default) or "ada"

    For clinical model:
        Each patient needs: bmi, triglycerides, ldl, hdl, age
        Optional: smoking, activity, alcohol

    For ADA baseline:
        Each patient needs: hba1c, fbs, bmi, triglycerides, ldl, hdl

    Maximum batch size is 1000 patients per request.
    """
    try:
        data = request.get_json()
        model_type = request.args.get('model_type', 'clinical')

        if not data or "patients" not in data:
            return jsonify({"error": "No patients provided"}), 400

        patients = data["patients"]

        # Validate batch size
        if len(patients) > MAX_BATCH_SIZE:
            return jsonify({
                "error": f"Batch size exceeds maximum of {MAX_BATCH_SIZE} patients"
            }), 400

        if model_type in ('clinical', 'binary_v2_no_bp', 'binary_v2_bp'):
            # Use clinical model (binary_v2_no_bp is the final production model)
            clin_predictor = get_clinical_predictor_for('binary_v2_no_bp')
            if clin_predictor is None:
                return jsonify({
                    "error": "Clinical model not trained. Run Ian_ML/training/train_binary_v2_no_bp.py first."
                }), 503

            results = []
            for patient in patients:
                patient_data = {
                    "bmi": patient.get("bmi"),
                    "triglycerides": patient.get("triglycerides"),
                    "ldl": patient.get("ldl"),
                    "hdl": patient.get("hdl"),
                    "age": patient.get("age", 54),
                    "smoking_status": patient.get("smoking", "Unknown"),
                    "physical_activity": patient.get("activity", "Unknown"),
                    "alcohol_use": patient.get("alcohol", "Unknown"),
                    "waist_circumference": patient.get("waist_circumference"),
                    "family_history_diabetes": patient.get("family_history_diabetes"),
                }
                results.append(clin_predictor.predict(patient_data))
        else:
            # ADA baseline model
            results = get_predictor().predict_batch(patients)
        
        return jsonify({
            "predictions": [
                {
                    "cluster": r.get("risk_cluster", r.get("cluster_label")),
                    "risk_score": r.get("risk_score"),
                    "risk_level": r.get("risk_level", r.get("predicted_status", r.get("medical_status")))
                } if r.get("success") else {"error": r.get("error", "Prediction failed")}
                for r in results
            ]
        })
        
    except Exception as e:
        logger.exception("Batch prediction failed")
        return jsonify({"error": "Batch prediction failed"}), 500


@app.route('/model/info', methods=['GET'])
@require_api_key
@rate_limit
def model_info():
    """Get model information."""
    try:
        p = get_predictor()
        return jsonify({
            "dataset_size": p.metrics.get("dataset_size"),
            "n_clusters": p.metrics.get("n_clusters"),
            "accuracy": {
                "random_forest": p.metrics.get("random_forest", {}).get("test_accuracy"),
                "xgboost": p.metrics.get("xgboost", {}).get("test_accuracy")
            },
            "features": REQUIRED_FEATURES,
            "clusters": p.cluster_labels
        })
    except Exception as e:
        logger.exception("Model info failed")
        return jsonify({"error": "Model info failed"}), 500


@app.route('/model/active/metadata', methods=['GET'])
@require_api_key
@rate_limit
def active_model_metadata():
    """Get detailed metadata for the currently active clinical model."""
    try:
        clin_predictor = get_clinical_predictor()
        if clin_predictor is None:
             return jsonify({
                 "error": "Clinical model not available."
             }), 503
        
        model_version = _resolve_model_version_for_lineage("clinical", clin_predictor)
        dataset_hash = _dataset_hash_from_metrics(clin_predictor.metrics)
        feature_schema_version = f"features:{len(clin_predictor.features)}"

        cluster_supported = bool(
            clin_predictor.kmeans is not None
            and clin_predictor.cluster_scaler is not None
            and clin_predictor.cluster_imputer is not None
            and isinstance(clin_predictor.cluster_labels, dict)
            and len(clin_predictor.cluster_labels) > 0
        )

        feature_set = {
            "features": clin_predictor.features,
            "feature_count": len(clin_predictor.features),
            "source": "features.json",
        }

        cluster_capability = {
            "supported": cluster_supported,
            "required_inputs": clin_predictor.cluster_features,
            "output_field": "metabolic_subtype",
            "alias_field": "risk_cluster",
        }

        output_capabilities = {
            "predicted_status": True,
            "risk_score": True,
            "at_risk_probability": True,
            "prediction_confidence": True,
            "metabolic_subtype": cluster_supported,
            "risk_label": True,
            "cluster_description": cluster_supported,
            "treatment_focus": cluster_supported,
        }

        drift_baseline = _drift_baseline_for_lineage(model_version, dataset_hash, feature_schema_version)
            
        return jsonify({
            "model_version": model_version,
            "features": clin_predictor.features,
            "feature_set": feature_set,
            "cluster_capability": cluster_capability,
            "output_capabilities": output_capabilities,
            "metrics": clin_predictor.metrics,
            "dataset_hash": dataset_hash,
            "drift_baseline": drift_baseline,
            "notes": f"Active {model_version} screening model"
        })
    except Exception as e:
        logger.exception("Active model metadata failed")
        return jsonify({"error": "Failed to fetch active model metadata"}), 500



@app.route('/insights/metrics', methods=['GET'])
@require_api_key
@rate_limit
def get_metrics():
    """Get model performance metrics for dashboard - returns BOTH model sets."""
    try:
        import pandas as pd
        
        response = {"ada_baseline": {}, "clinical": {}}
        
        # ADA Baseline metrics
        ada_dir = MODELS_ROOT / "legacy" / "results"
        if (ada_dir / "model_comparison.csv").exists():
            response["ada_baseline"]["model_comparison"] = pd.read_csv(
                ada_dir / "model_comparison.csv"
            ).to_dict(orient='records')
        if (ada_dir / "best_model_report.json").exists():
            with open(ada_dir / "best_model_report.json") as f:
                response["ada_baseline"]["best_model"] = json.load(f)
        
        # Clinical model metrics
        clinical_dir = get_clinical_results_dir()
        if clinical_dir.exists():
            if (clinical_dir / "model_comparison.csv").exists():
                response["clinical"]["model_comparison"] = pd.read_csv(
                    clinical_dir / "model_comparison.csv"
                ).to_dict(orient='records')
            if (clinical_dir / "best_model_report.json").exists():
                with open(clinical_dir / "best_model_report.json") as f:
                    response["clinical"]["best_model"] = json.load(f)
        
        return jsonify(response)
    except Exception as e:
        logger.exception("Get metrics failed")
        return jsonify({"error": "Get metrics failed"}), 500


@app.route('/insights/metrics/clinical', methods=['GET'])
@require_api_key
@rate_limit
def get_clinical_metrics():
    """Get clinical model metrics only."""
    try:
        import pandas as pd
        
        results_dir = get_clinical_results_dir()
        
        if not results_dir.exists():
            return jsonify({"error": "Clinical model not trained. Run Ian_ML/training/train_binary_v2_no_bp.py or scripts/train/train_quick.py first."}), 404
        
        comparison_path = results_dir / "model_comparison.csv"
        if comparison_path.exists():
            comparison = pd.read_csv(comparison_path).to_dict(orient='records')
        else:
            comparison = []
        
        report_path = results_dir / "best_model_report.json"
        if report_path.exists():
            with open(report_path) as f:
                best_model = json.load(f)
        else:
            best_model = {}
        
        return jsonify({
            "model_comparison": comparison,
            "best_model": best_model
        })
    except Exception as e:
        logger.exception("Get clinical metrics failed")
        return jsonify({"error": "Get clinical metrics failed"}), 500



@app.route('/insights/information-gain', methods=['GET'])
@require_api_key
@rate_limit
def get_information_gain():
    """Get Information Gain scores for feature importance."""
    try:
        def safe_float(value):
            try:
                numeric = float(value)
            except (TypeError, ValueError):
                return 0.0
            if math.isnan(numeric) or math.isinf(numeric):
                return 0.0
            return numeric

        # First try binary_v2_no_bp (active model)
        ig_path = MODELS_ROOT / "binary_v2_no_bp" / "results" / "information_gain_results.json"
        if ig_path.exists():
            with open(ig_path) as f:
                return jsonify(json.load(f))
        
        # Then try clinical model
        clinical_dir = get_clinical_results_dir()
        ig_path = clinical_dir / "information_gain_results.json"
        if ig_path.exists():
            with open(ig_path) as f:
                return jsonify(json.load(f))
        
        # If no IG file exists, compute feature importance from the model
        clin = get_clinical_predictor()
        if clin is not None and hasattr(clin.classifier, 'coef_'):
            # For linear models, use absolute coefficients
            coefs = np.abs(clin.classifier.coef_[0]) if len(clin.classifier.coef_.shape) > 1 else np.abs(clin.classifier.coef_)
            features = clin.features
            # Normalize to 0-1 range (information gain-like)
            total = np.sum(coefs)
            if total > 0:
                ig_scores = coefs / total
            else:
                ig_scores = coefs
            
            feature_ranking = [
                {"feature": features[i], "ig": safe_float(ig_scores[i])}
                for i in range(len(features)) if i < len(coefs)
            ]
            feature_ranking.sort(key=lambda x: x["ig"], reverse=True)
            result = {
                "feature_ranking": feature_ranking,
                "method": "coefficient_magnitude",
                "model_type": clin.model_type or "clinical"
            }
            return jsonify(result)
        elif clin is not None and hasattr(clin.classifier, 'feature_importances_'):
            # For tree-based models, use feature_importances_
            importances = clin.classifier.feature_importances_
            features = clin.features
            feature_ranking = [
                {"feature": features[i], "ig": safe_float(importances[i])}
                for i in range(len(features)) if i < len(importances)
            ]
            feature_ranking.sort(key=lambda x: x["ig"], reverse=True)
            result = {
                "feature_ranking": feature_ranking,
                "method": "feature_importance",
                "model_type": clin.model_type or "clinical"
            }
            return jsonify(result)
        return jsonify({
            "feature_ranking": [],
            "method": "unavailable",
            "model_type": "clinical",
            "error": "Information gain results not found"
        })
    except Exception as e:
        logger.exception("Get information gain failed")
        return jsonify({"error": "Get information gain failed"}), 500


@app.route('/insights/clusters', methods=['GET'])
@require_api_key
@rate_limit
def get_clusters():
    """Get cluster analysis data."""
    try:
        cluster_path = get_clinical_results_dir() / "cluster_analysis.json"
        if cluster_path.exists():
            with open(cluster_path) as f:
                return jsonify(json.load(f))
        else:
            return jsonify({"error": "Cluster analysis not found"}), 404
    except Exception as e:
        logger.exception("Get clusters failed")
        return jsonify({"error": "Get clusters failed"}), 500


@app.route('/insights/visualizations/<name>', methods=['GET'])
@require_api_key
@rate_limit
def get_visualization(name):
    """Serve visualization images."""
    send_file = flask_module.send_file
    
    allowed = ['confusion_matrix', 'roc_curve', 'information_gain_chart', 
               'cluster_heatmap', 'cluster_scatter', 'cluster_distribution', 
               'k_optimization', 'feature_importance', 'feature_importance_comparison',
               'reliability_diagram', 'k2_vs_k4_comparison', 'decision_curve',
               'threshold_ablation', 'best_vs_logistic']
    
    if name not in allowed:
        return jsonify({"error": "Visualization not found"}), 404
    
    clin = get_clinical_predictor()
    if clin is not None:
        viz_path = clin.models_dir / "visualizations" / f"{name}.png"
    else:
        viz_path = resolve_clinical_models_dir() / "visualizations" / f"{name}.png"
    
    if viz_path.exists():
        return send_file(str(viz_path), mimetype='image/png')
    else:
        return jsonify({"error": f"{name}.png not found"}), 404


if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5000))
    skip_warmup = os.environ.get('ML_SKIP_WARMUP', '').lower() in ('1', 'true', 'yes')
    
    # Startup banner with model info
    print("=" * 60)
    print("  DIANA ML Server v2.0")
    print("=" * 60)
    print(f"  Port: {port}")
    print(f"  Health: http://localhost:{port}/health")
    print(f"  Predict: http://localhost:{port}/predict")
    print(f"  Warmup: http://localhost:{port}/warmup")
    
    # Preload models at startup to eliminate cold start latency
    if not skip_warmup:
        print("\n  Preloading models...")
        warmup_start = time.time()
        
        # Load clinical predictor (primary model)
        try:
            clinical = get_clinical_predictor()
            if clinical:
                # Make a dummy prediction to fully initialize the model
                dummy_data = {
                    "bmi": 25.0, "triglycerides": 120, "ldl": 100, "hdl": 50,
                    "age": 55, "waist_circumference": 85,
                    "smoking_status": "Never", "physical_activity": "Moderate", 
                    "alcohol_use": "None"
                }
                clinical.predict(dummy_data)
                warmup_time = round((time.time() - warmup_start) * 1000, 0)
                print(f"  [OK] Clinical model: {clinical.models_dir.name} ({len(clinical.features)} features) - {warmup_time}ms")
                
                # Preload SHAP explainer
                if shap_module_available and SHAPExplainer is not None:
                    try:
                        model_id = f"clinical_{id(clinical.classifier)}"
                        cache_key = _get_shap_cache_key(model_id, "tree", "none")
                        shap_explainer = SHAPExplainer(clinical.classifier, model_type="tree")
                        if shap_explainer.is_available:
                            _shap_explainer_cache[cache_key] = shap_explainer
                            print(f"  [OK] SHAP TreeExplainer preloaded")
                        else:
                            # Try with saved background data
                            bg_artifact = clinical.get_shap_background()
                            if bg_artifact is not None:
                                cache_key = _get_shap_cache_key(model_id, "kernel", "saved_training_data")
                                shap_explainer = SHAPExplainer(
                                    clinical.classifier,
                                    model_type="kernel",
                                    background_data=bg_artifact["background"]
                                )
                                if shap_explainer.is_available:
                                    _shap_explainer_cache[cache_key] = shap_explainer
                                    print(f"  [OK] SHAP KernelExplainer preloaded with saved background")
                    except Exception as e:
                        print(f"  [WARN] SHAP warmup skipped: {e}")
            else:
                print(f"  [!!] Clinical model: NOT FOUND (run training first)")
        except FileNotFoundError as e:
            print(f"  [!!] Clinical model: NOT FOUND - {e}")
        except Exception as e:
            print(f"  [!!] Clinical model warmup failed: {e}")
        
        # Load ADA baseline predictor
        try:
            ada = get_predictor()
            dummy_data = {
                "hba1c": 5.5, "fbs": 95, "bmi": 25.0,
                "triglycerides": 120, "ldl": 100, "hdl": 50
            }
            ada.predict(dummy_data)
            print(f"  [OK] ADA baseline model loaded")
        except Exception as e:
            print(f"  [WARN] ADA baseline warmup skipped: {e}")
        
        total_warmup = round((time.time() - warmup_start) * 1000, 0)
        print(f"\n  Warmup completed in {total_warmup}ms")
    else:
        print("  [SKIP] Warmup disabled (ML_SKIP_WARMUP=true)")
        clinical = get_clinical_predictor()
        if clinical:
            print(f"  [OK] Clinical model: {clinical.models_dir.name} ({len(clinical.features)} features)")
        else:
            print(f"  [!!] Clinical model: NOT FOUND")
    
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=port, debug=False)
