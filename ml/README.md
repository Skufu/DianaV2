# ML Module - DIANA Machine Learning

This folder contains all Python code for the DIANA diabetes risk prediction system.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start the ML server
python ml/server.py

# The server runs on http://localhost:5000
```

## Files

| File | Description |
|------|-------------|
| `server.py` | Flask API server for predictions |
| `predict.py` | Core prediction logic (load models, make predictions) |
| `train.py` | Train and save ML models |
| `clustering.py` | K-means clustering analysis |
| `data_processing.py` | Prepare NHANES data for training |
| `requirements.txt` | Python dependencies |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check if server is running |
| `/predict` | POST | Predict for one patient |
| `/predict/batch` | POST | Predict for multiple patients |
| `/analytics/metrics` | GET | Get model performance metrics |

## Training a New Model

```bash
# 1. Process raw data
python ml/data_processing.py

# 2. Train models
python ml/train.py

# 3. Start server with new models
python ml/server.py
```

## Models Used

- **Random Forest** - Primary classifier
- **XGBoost** - Secondary classifier  
- **K-means (K=3)** - Risk clustering (Low/Moderate/High)
