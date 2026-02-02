# Ian_ML Module - DIANA Machine Learning Server

> **Purpose**: Flask API server for diabetes risk prediction using trained ML models
> **Framework**: Flask | **ML**: scikit-learn, XGBoost, CatBoost, LightGBM
> **Port**: 5000 (default)

---

## Quick Search Index

| Topic | File Location |
|-------|---------------|
| Flask API Server | `server.py` |
| Prediction Logic | `predict.py` |
| Model Training | `train.py` |
| K-Means Clustering | `clustering.py` |
| Data Processing | `data_processing.py` |

---

## Directory Structure

```
Ian_ML/
├── server.py             # Flask API server (main entry)
├── predict.py            # DianaPredictor, ClinicalPredictor classes
├── train.py              # Train classification models
├── clustering.py         # K-Means cluster training
├── data_processing.py    # Prepare NHANES data for training
├── explainability.py     # SHAP explanations
├── explainer.py          # Explainer utilities
├── ab_testing.py         # A/B testing infrastructure
├── drift_detection.py    # Model drift monitoring
├── mlflow_config.py      # MLflow experiment tracking
└── requirements.txt      # Python dependencies
```

---

## API Endpoints

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/health` | GET | Health check | `{"status": "healthy"}` |
| `/predict` | POST | Single prediction | Prediction + cluster |
| `/predict/batch` | POST | Batch predictions | Array of predictions |
| `/predict/explain` | POST | Prediction with SHAP | Prediction + explanation |
| `/insights/metrics` | GET | Model performance | AUC, accuracy, etc. |
| `/insights/metrics/clinical` | GET | Clinical model metrics | Clinical-only metrics |
| `/insights/clusters` | GET | Cluster distribution | Counts per cluster |
| `/insights/information-gain` | GET | Feature importance | IG scores |
| `/insights/visualizations/<name>` | GET | PNG images | Binary image |
| `/ab-tests` | GET/POST | A/B testing | Test management |
| `/ab-tests/<id>/results` | GET | A/B test results | Comparison data |
| `/monitoring/drift` | GET | Drift status | Drift monitoring |
| `/monitoring/drift/check` | POST | Check for drift | Drift report |
| `/monitoring/alerts` | GET | Drift alerts | Alert list |
| `/models` | GET | Model versions | MLflow versions |
| `/models/<name>/runs` | GET | Model runs | Run history |
| `/model/info` | GET | Current model info | Dataset size, features |

---

## Key Classes

### DianaPredictor (`predict.py`)
```python
class DianaPredictor:
    """ADA-based diabetes predictor using all biomarkers including HbA1c."""
    
    FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl']
    
    def predict(self, features: dict) -> dict:
        """
        Args:
            features: Dict with keys matching FEATURES
        Returns:
            {
                'prediction': 'Diabetic'|'Pre-diabetic'|'Normal',
                'probability': [p_normal, p_prediabetic, p_diabetic],
                'cluster': 'MARD'|'MOD'|'SIDD'|'SIRD',
                'risk_score': 0-100
            }
        """
```

### ClinicalPredictor (`predict.py`)
```python
class ClinicalPredictor:
    """Non-circular predictor excluding HbA1c and FBS from features."""
    
    FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
```

---

## Prediction Request Format

```json
POST /predict?model_type=clinical
{
    "fbs": 126.0,
    "bmi": 28.5,
    "triglycerides": 180.0,
    "ldl": 130.0,
    "hdl": 45.0,
    "age": 58
}
```

## Prediction Response Format

```json
{
    "success": true,
    "model_type": "clinical",
    "predicted_status": "Pre-diabetic",
    "probability": 0.70,
    "risk_cluster": "MOD",
    "risk_score": 70,
    "confidence": 0.70,
    "model_info": { ... }
}
```

---

## Model Types

| Type | Query Param | Features | Use Case |
|------|-------------|----------|----------|
| ADA | `?model_type=ada` | 6 features (hba1c, fbs, bmi, tg, ldl, hdl) | Diagnostic confirmation |
| Clinical | `?model_type=clinical` | 5 features (bmi, tg, ldl, hdl, age) | Screening without lab test |

---

## Training Pipeline

```bash
cd Ian_ML

# 1. Process NHANES data
python data_processing.py

# 2. Train classifiers (RF, XGB, LR)
python train.py

# 3. Train K-Means clustering
python clustering.py

# 4. Start server
python server.py
```

---

## Available Visualizations

| Name | Endpoint | Description |
|------|----------|-------------|
| `roc_curve` | `/insights/visualizations/roc_curve` | ROC-AUC curve |
| `confusion_matrix` | `/insights/visualizations/confusion_matrix` | Classification matrix |
| `feature_importance` | `/insights/visualizations/feature_importance` | Bar chart |
| `cluster_distribution` | `/insights/visualizations/cluster_distribution` | Cluster counts |
| `cluster_heatmap` | `/insights/visualizations/cluster_heatmap` | Cluster centroids heatmap |
| `cluster_scatter` | `/insights/visualizations/cluster_scatter` | PCA scatter plot |
| `k_optimization` | `/insights/visualizations/k_optimization` | Elbow/Silhouette plots |

---

## Dependencies

```
pandas==2.2.0
pyreadstat==1.2.7
scikit-learn==1.4.0
numpy==1.26.3
joblib==1.3.2
xgboost==2.0.3
flask==3.0.1
flask-cors==4.0.0
imbalanced-learn==0.12.0
mlflow==2.10.2
shap==0.44.1
scipy==1.12.0
lightgbm==4.3.0
```

---

## Running

```bash
# Install dependencies
pip install -r requirements.txt

# Start server (development)
python server.py

# Server runs on http://localhost:5000
```

---

## Search Keywords

`Flask` `API` `prediction` `diabetes` `machine learning` `scikit-learn` `XGBoost` `Random Forest` `K-Means` `clustering` `biomarkers` `HbA1c` `clinical` `ADA` `risk score` `SIRD` `SIDD` `MOD` `MARD` `analytics` `visualizations` `ROC` `feature importance`
