"""
DIANA ML API Server
Flask REST API for diabetes risk prediction.

Endpoints:
    POST /predict - Single patient prediction
    POST /predict/batch - Multiple patients
    GET /health - Health check

Usage:
    python scripts/ml_server.py
    
Environment:
    ML_PORT: Port to run on (default: 5000)
"""

import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.predict import DianaPredictor, ClinicalPredictor, REQUIRED_FEATURES, CLINICAL_FEATURES

app = Flask(__name__)
CORS(app)

# Initialize predictors
predictor = None
clinical_predictor = None


def get_predictor():
    """Lazy load ADA baseline predictor."""
    global predictor
    if predictor is None:
        predictor = DianaPredictor()
    return predictor


def get_clinical_predictor():
    """Lazy load clinical (non-circular) predictor."""
    global clinical_predictor
    if clinical_predictor is None:
        try:
            clinical_predictor = ClinicalPredictor()
        except FileNotFoundError:
            return None
    return clinical_predictor


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


@app.route('/predict/batch', methods=['POST'])
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
    """
    try:
        data = request.get_json()
        
        if not data or "patients" not in data:
            return jsonify({"error": "No patients provided"}), 400
        
        results = get_predictor().predict_batch(data["patients"])
        
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


@app.route('/analytics/metrics', methods=['GET'])
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


@app.route('/analytics/metrics/clinical', methods=['GET'])
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



@app.route('/analytics/information-gain', methods=['GET'])
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


@app.route('/analytics/clusters', methods=['GET'])
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


@app.route('/analytics/visualizations/<name>', methods=['GET'])
def get_visualization(name):
    """Serve visualization images."""
    from flask import send_file
    from pathlib import Path
    
    allowed = ['confusion_matrix', 'roc_curve', 'information_gain_chart', 
               'cluster_heatmap', 'cluster_scatter', 'cluster_distribution', 'k_optimization']
    
    if name not in allowed:
        return jsonify({"error": "Visualization not found"}), 404
    
    viz_path = Path(f"models/visualizations/{name}.png")
    if viz_path.exists():
        return send_file(viz_path, mimetype='image/png')
    else:
        return jsonify({"error": f"{name}.png not found"}), 404


if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5000))
    print(f"Starting DIANA ML Server on port {port}...")
    print(f"Health check: http://localhost:{port}/health")
    print(f"Predict endpoint: http://localhost:{port}/predict")
    print(f"Analytics: http://localhost:{port}/analytics/metrics")
    app.run(host='0.0.0.0', port=port, debug=False)
