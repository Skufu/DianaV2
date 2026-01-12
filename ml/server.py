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
    python ml/server.py
    
Environment:
    ML_PORT: Port to run on (default: 5000)
"""

import os
import sys
import json
import logging
import threading
import functools
import time
from collections import defaultdict
import numpy as np
from flask import Flask, request, jsonify, g
from flask_cors import CORS

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.predict import DianaPredictor, ClinicalPredictor, REQUIRED_FEATURES, CLINICAL_FEATURES

# Configuration
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB max request size
MAX_BATCH_SIZE = 1000  # Maximum patients per batch request
API_KEY = os.environ.get('ML_API_KEY', '')  # API key for authentication

# Import new ML infrastructure modules
try:
    from ml.explainability import SHAPExplainer, format_for_clinician
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

try:
    from ml.ab_testing import get_ab_manager, ABTestConfig
    AB_TESTING_AVAILABLE = True
except ImportError:
    AB_TESTING_AVAILABLE = False

try:
    from ml.drift_detection import get_drift_monitor
    DRIFT_AVAILABLE = True
except ImportError:
    DRIFT_AVAILABLE = False

try:
    from ml.mlflow_config import get_mlflow_manager
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False

logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:8080,http://localhost:5173').split(',')
CORS(app, origins=ALLOWED_ORIGINS if os.environ.get('ENV') == 'production' else '*')


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
    requests_per_minute=int(os.environ.get('ML_RATE_LIMIT_MINUTE', 120)),
    requests_per_second=int(os.environ.get('ML_RATE_LIMIT_SECOND', 20))
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
                    self._predictor = DianaPredictor()
        return self._predictor

    def get_clinical_predictor(self):
        """Get clinical predictor (thread-safe)."""
        if self._clinical_predictor is None:
            with self._lock:
                if self._clinical_predictor is None:
                    try:
                        self._clinical_predictor = ClinicalPredictor()
                    except FileNotFoundError:
                        return None
        return self._clinical_predictor


# Global predictor manager
_predictor_manager = PredictorManager()

# Global SHAP explainer instance (lazy-loaded per model)
shap_explainer = None


def get_predictor():
    """Lazy load ADA baseline predictor."""
    return _predictor_manager.get_predictor()


def get_clinical_predictor():
    """Lazy load clinical (non-circular) predictor."""
    return _predictor_manager.get_clinical_predictor()


def require_api_key(f):
    """Decorator to require API key authentication for endpoints."""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip authentication if no API key is configured (development mode)
        if not API_KEY:
            return f(*args, **kwargs)

        # Check for API key in header
        provided_key = request.headers.get('X-API-Key', '')
        if not provided_key or provided_key != API_KEY:
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


@app.route('/predict', methods=['POST'])
@require_api_key
@rate_limit
def predict():
    """
    Predict diabetes risk for a single patient.

    Query params:
        model_type: "clinical" (default) or "ada"

    For clinical model (non-circular, recommended):
        Required: bmi, triglycerides, ldl, hdl, age

    For ADA baseline:
        Required: hba1c, fbs, bmi, triglycerides, ldl, hdl
    """
    try:
        data = request.get_json()
        model_type = request.args.get('model_type', 'clinical')
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        if model_type == 'clinical':
            # Use clinical model (non-circular)
            clin_predictor = get_clinical_predictor()
            if clin_predictor is None:
                return jsonify({
                    "error": "Clinical model not trained. Run train_models_v2.py first."
                }), 503
            
            patient_data = {
                "bmi": data.get("bmi"),
                "triglycerides": data.get("triglycerides"),
                "ldl": data.get("ldl"),
                "hdl": data.get("hdl"),
                "age": data.get("age", 54)  # Default age if not provided
            }
            result = clin_predictor.predict(patient_data)
        else:
            # Use ADA baseline model
            patient_data = {
                "hba1c": data.get("hba1c"),
                "fbs": data.get("fbs"),
                "bmi": data.get("bmi"),
                "triglycerides": data.get("triglycerides"),
                "ldl": data.get("ldl"),
                "hdl": data.get("hdl")
            }
            result = get_predictor().predict(patient_data)
        
        if not result.get("success"):
            return jsonify({"error": result.get("error")}), 400
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/predict/explain', methods=['POST'])
@require_api_key
@rate_limit
def predict_explain():
    """
    Predict with SHAP explanation for clinicians.

    Query params:
        model_type: "clinical" (default) or "ada"
        format: "full" (default) or "clinician" (simplified)

    Returns prediction results with SHAP-based feature contributions.
    """
    global shap_explainer
    
    if not SHAP_AVAILABLE:
        return jsonify({"error": "SHAP not available. Install shap package."}), 503
    
    try:
        data = request.get_json()
        model_type = request.args.get('model_type', 'clinical')
        output_format = request.args.get('format', 'full')
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get predictor and make prediction
        if model_type == 'clinical':
            clin_predictor = get_clinical_predictor()
            if clin_predictor is None:
                return jsonify({"error": "Clinical model not available"}), 503
            
            patient_data = {
                "bmi": data.get("bmi"),
                "triglycerides": data.get("triglycerides"),
                "ldl": data.get("ldl"),
                "hdl": data.get("hdl"),
                "age": data.get("age", 54)
            }
            
            # Make prediction
            result = clin_predictor.predict(patient_data)
            
            # Get SHAP explanation
            if shap_explainer is None or shap_explainer.model != clin_predictor.model:
                shap_explainer = SHAPExplainer(clin_predictor.model, model_type="tree")
            
            features = np.array([patient_data[f] for f in CLINICAL_FEATURES])
            explanation = shap_explainer.explain(features, CLINICAL_FEATURES)
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
            
            if shap_explainer is None or shap_explainer.model != ada_predictor.model:
                shap_explainer = SHAPExplainer(ada_predictor.model, model_type="tree")
            
            features = np.array([patient_data[f] for f in REQUIRED_FEATURES])
            explanation = shap_explainer.explain(features, REQUIRED_FEATURES)
        
        # Format response
        if output_format == 'clinician':
            result['explanation'] = format_for_clinician(explanation)
        else:
            result['explanation'] = explanation
        
        result['model_type'] = model_type
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Explain prediction failed: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================================================
# A/B TESTING ENDPOINTS
# =============================================================================

@app.route('/ab-tests', methods=['GET', 'POST'])
def ab_tests():
    """List or create A/B tests."""
    if not AB_TESTING_AVAILABLE:
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
def ab_test_detail(test_id):
    """Get, update, or delete a specific A/B test."""
    if not AB_TESTING_AVAILABLE:
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
def ab_test_results(test_id):
    """Get comparison results for an A/B test."""
    if not AB_TESTING_AVAILABLE:
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
def drift_status():
    """Get current drift monitoring status."""
    if not DRIFT_AVAILABLE:
        return jsonify({"error": "Drift detection not available"}), 503
    
    monitor = get_drift_monitor()
    return jsonify(monitor.get_status())


@app.route('/monitoring/drift/check', methods=['POST'])
def check_drift():
    """Check for drift in provided data."""
    if not DRIFT_AVAILABLE:
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
        logger.error(f"Drift check failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/monitoring/drift/reference', methods=['POST'])
def set_drift_reference():
    """Set reference data for drift detection."""
    if not DRIFT_AVAILABLE:
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
        
        monitor.set_reference(reference_data)
        
        return jsonify({"success": True, "features": list(reference_data.keys())})
        
    except Exception as e:
        logger.error(f"Set reference failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/monitoring/alerts', methods=['GET'])
def get_alerts():
    """Get recent drift alerts."""
    if not DRIFT_AVAILABLE:
        return jsonify({"error": "Drift detection not available"}), 503
    
    monitor = get_drift_monitor()
    unacked_only = request.args.get('unacknowledged', 'false').lower() == 'true'
    limit = int(request.args.get('limit', 50))
    
    alerts = monitor.get_alerts(unacknowledged_only=unacked_only, limit=limit)
    return jsonify({"alerts": alerts})


@app.route('/monitoring/alerts/<timestamp>/acknowledge', methods=['POST'])
def acknowledge_alert(timestamp):
    """Acknowledge a drift alert."""
    if not DRIFT_AVAILABLE:
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
def list_models():
    """List all model versions from MLflow registry."""
    if not MLFLOW_AVAILABLE:
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
def list_model_runs(name):
    """List training runs for a model."""
    if not MLFLOW_AVAILABLE:
        return jsonify({"error": "MLflow not available"}), 503
    
    manager = get_mlflow_manager()
    
    if not manager.is_available:
        return jsonify({"error": "MLflow not configured"}), 503
    
    max_results = int(request.args.get('limit', 20))
    runs = manager.list_runs(max_results=max_results)
    
    return jsonify({"runs": runs})


@app.route('/models/<name>/<int:version>/promote', methods=['POST'])
def promote_model(name, version):
    """Promote a model version to production."""
    if not MLFLOW_AVAILABLE:
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
def list_experiments():
    """List all MLflow experiments."""
    if not MLFLOW_AVAILABLE:
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

    Request body:
    {
        "patients": [
            {"hba1c": 6.5, "fbs": 126, ...},
            {"hba1c": 5.8, "fbs": 100, ...}
        ]
    }

    Maximum batch size is 1000 patients per request.
    """
    try:
        data = request.get_json()

        if not data or "patients" not in data:
            return jsonify({"error": "No patients provided"}), 400

        patients = data["patients"]

        # Validate batch size
        if len(patients) > MAX_BATCH_SIZE:
            return jsonify({
                "error": f"Batch size exceeds maximum of {MAX_BATCH_SIZE} patients"
            }), 400

        results = get_predictor().predict_batch(patients)
        
        return jsonify({
            "predictions": [
                {
                    "cluster": r["cluster_label"],
                    "risk_score": r["risk_score"],
                    "risk_level": r["risk_level"]
                } if r["success"] else {"error": r["error"]}
                for r in results
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/model/info', methods=['GET'])
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
        return jsonify({"error": str(e)}), 500


@app.route('/insights/metrics', methods=['GET'])
def get_metrics():
    """Get model performance metrics for dashboard - returns BOTH model sets."""
    try:
        import pandas as pd
        from pathlib import Path
        
        response = {"ada_baseline": {}, "clinical": {}}
        
        # ADA Baseline metrics
        ada_dir = Path("models/results")
        if (ada_dir / "model_comparison.csv").exists():
            response["ada_baseline"]["model_comparison"] = pd.read_csv(
                ada_dir / "model_comparison.csv"
            ).to_dict(orient='records')
        if (ada_dir / "best_model_report.json").exists():
            with open(ada_dir / "best_model_report.json") as f:
                response["ada_baseline"]["best_model"] = json.load(f)
        
        # Clinical model metrics
        clinical_dir = Path("models/clinical/results")
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
        return jsonify({"error": str(e)}), 500


@app.route('/insights/metrics/clinical', methods=['GET'])
def get_clinical_metrics():
    """Get clinical model metrics only."""
    try:
        import pandas as pd
        from pathlib import Path
        
        results_dir = Path("models/clinical/results")
        
        if not results_dir.exists():
            return jsonify({"error": "Clinical model not trained. Run train_models_v2.py first."}), 404
        
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
        return jsonify({"error": str(e)}), 500



@app.route('/insights/information-gain', methods=['GET'])
def get_information_gain():
    """Get Information Gain scores for feature importance."""
    try:
        from pathlib import Path
        
        ig_path = Path("models/results/information_gain_results.json")
        if ig_path.exists():
            with open(ig_path) as f:
                return jsonify(json.load(f))
        else:
            return jsonify({"error": "Information gain results not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/insights/clusters', methods=['GET'])
def get_clusters():
    """Get cluster analysis data."""
    try:
        from pathlib import Path
        
        cluster_path = Path("models/results/cluster_analysis.json")
        if cluster_path.exists():
            with open(cluster_path) as f:
                return jsonify(json.load(f))
        else:
            return jsonify({"error": "Cluster analysis not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/insights/visualizations/<name>', methods=['GET'])
def get_visualization(name):
    """Serve visualization images."""
    from flask import send_file
    from pathlib import Path
    
    allowed = ['confusion_matrix', 'roc_curve', 'information_gain_chart', 
               'cluster_heatmap', 'cluster_scatter', 'cluster_distribution', 
               'k_optimization', 'feature_importance', 'feature_importance_comparison']
    
    if name not in allowed:
        return jsonify({"error": "Visualization not found"}), 404
    
    # Use absolute path from project root (parent of ml/)
    project_root = Path(__file__).parent.parent
    viz_path = project_root / "models" / "clinical" / "visualizations" / f"{name}.png"
    
    if viz_path.exists():
        return send_file(str(viz_path), mimetype='image/png')
    else:
        return jsonify({"error": f"{name}.png not found"}), 404


if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5000))
    print(f"Starting DIANA ML Server on port {port}...")
    print(f"Health check: http://localhost:{port}/health")
    print(f"Predict endpoint: http://localhost:{port}/predict")
    print(f"Insights: http://localhost:{port}/insights/metrics")
    app.run(host='0.0.0.0', port=port, debug=False)
