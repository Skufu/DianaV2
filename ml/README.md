# ML Module - DIANA Machine Learning Server

> **Purpose**: Flask API server for diabetes risk prediction using trained ML models  
> **Framework**: Flask | **ML**: scikit-learn, XGBoost  
> **Port**: 5000

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
ml/
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
| `/analytics/metrics` | GET | Model performance | AUC, accuracy, etc. |
| `/analytics/metrics/clinical` | GET | Clinical model metrics | Clinical-only metrics |
| `/analytics/clusters` | GET | Cluster distribution | Counts per cluster |
| `/analytics/information-gain` | GET | Feature importance | IG scores |
| `/analytics/visualizations/<name>` | GET | PNG images | Binary image |
| `/ab-tests` | GET/POST | A/B testing | Test management |
| `/ab-tests/<id>/results` | GET | A/B test results | Comparison data |
| `/monitoring/drift` | GET | Drift status | Drift monitoring |
| `/monitoring/alerts` | GET | Drift alerts | Alert list |
| `/models` | GET | Model versions | MLflow versions |

---

## Key Classes

### DianaPredictor (`predict.py`)
```python
class DianaPredictor:
    """ADA-based diabetes predictor using all biomarkers including HbA1c."""
    
    FEATURES = ['hba1c', 'fbs', 'bmi', 'triglycerides', 'ldl', 'hdl', 'age']
    
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
    "age": 58,
    "smoking_status": 0,
    "physical_activity": 1,
    "alcohol_use": 0
}
```

## Prediction Response Format

```json
{
    "prediction": "Pre-diabetic",
    "probability": [0.15, 0.70, 0.15],
    "cluster": "MOD",
    "risk_score": 65,
    "model_type": "clinical",
    "model_version": "v2.1"
}
```

---

## Model Types

| Type | Query Param | Features | Use Case |
|------|-------------|----------|----------|
| ADA | `?model_type=ada` | 6 biomarkers (hba1c, fbs, bmi, tg, ldl, hdl) | Diagnostic confirmation |
| Clinical | `?model_type=clinical` | 5 features (bmi, tg, ldl, hdl, age) | Screening without lab test |

---

## Training Pipeline

```bash
cd ml

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
| `roc_curve` | `/analytics/visualizations/roc_curve` | ROC-AUC curve |
| `confusion_matrix` | `/analytics/visualizations/confusion_matrix` | Classification matrix |
| `feature_importance` | `/analytics/visualizations/feature_importance` | Bar chart |
| `cluster_distribution` | `/analytics/visualizations/cluster_distribution` | Cluster counts |

---

## Dependencies

```
flask>=2.0.0
numpy>=1.21.0
pandas>=1.3.0
scikit-learn>=1.0.0
xgboost>=1.5.0
joblib>=1.1.0
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
