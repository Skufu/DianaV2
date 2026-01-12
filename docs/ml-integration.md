# DIANA ML Integration Guide

## Quick Start (All-in-One)

```bash
# Run everything with one command
bash scripts/start-ml.sh
```

This script will:
1. Check Python installation
2. Install all ML dependencies
3. Download NHANES data (if not present)
4. Train models (if not trained)
5. Start the ML server on port 5000

## Manual Setup

Set these environment variables for Go backend (in `.env`):
```bash
MODEL_URL=http://localhost:5000
MODEL_VERSION=v1.0
MODEL_TIMEOUT_MS=5000
```

Or add to your `.env`:
```
MODEL_URL=http://localhost:5000/predict
MODEL_VERSION=1063
MODEL_TIMEOUT_MS=5000
```

### 3. Test the Connection

```bash
# Test ML server directly
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"hba1c": 6.5, "fbs": 126, "bmi": 28, "triglycerides": 150, "ldl": 130, "hdl": 45}'
```

Expected response (clinical model):
```json
{
  "cluster": "MOD-like",
  "risk_score": 100,
  "risk_level": "MODERATE",
  "confidence": 1.0
}
```

For clinical model (non-circular):
```bash
curl -X POST "http://localhost:5000/predict?model_type=clinical" \
  -H "Content-Type: application/json" \
  -d '{"bmi": 28, "triglycerides": 150, "ldl": 130, "hdl": 45, "age": 55}'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Single prediction (ADA model) |
| `/predict?model_type=clinical` | POST | Single prediction (Clinical model) |
| `/predict/batch` | POST | Multiple predictions |
| `/insights/metrics` | GET | Model performance metrics |
| `/insights/clusters` | GET | Cluster distribution data |
| `/predict/explain` | POST | Prediction with SHAP explanation |
| `/insights/metrics` | GET | Model performance metrics |
| `/insights/clusters` | GET | Cluster distribution data |
| `/insights/visualizations/<name>` | GET | PNG images |

## Required Input Fields

### ADA Model (default)
| Field | Type | Unit | Example |
|-------|------|------|---------|
| `hba1c` | float | % | 6.5 |
| `fbs` | float | mg/dL | 126 |
| `bmi` | float | kg/m² | 28.0 |
| `triglycerides` | float | mg/dL | 150 |
| `ldl` | float | mg/dL | 130 |
| `hdl` | float | mg/dL | 45 |

### Clinical Model (non-circular, for screening)
| Field | Type | Unit | Example |
|-------|------|------|---------|
| `bmi` | float | kg/m² | 28.0 |
| `triglycerides` | float | mg/dL | 150 |
| `ldl` | float | mg/dL | 130 |
| `hdl` | float | mg/dL | 45 |
| `age` | int | years | 55 |

## Running Both Services

Open two terminals:

**Terminal 1 - ML Server:**
```bash
# Using detected python (auto-detects venv/python3)
make ml
# OR explicitly using venv
./venv/bin/python ml/server.py
```

**Terminal 2 - Go Backend:**
```bash
MODEL_URL=http://localhost:5000 go run ./backend/cmd/server
```

**Terminal 2 - Go Backend:**
```bash
MODEL_URL=http://localhost:5000 go run ./backend/cmd/server
```

## Production Deployment

For production, run the ML server behind a reverse proxy:
- Consider using Gunicorn: `gunicorn -w 4 -b 0.0.0.0:5000 scripts.ml_server:app`
- Or containerize both services with Docker Compose

## Clinical Model (Non-Circular)

For screening without HbA1c/FBS (avoids circular reasoning):

```bash
curl -X POST "http://localhost:5000/predict?model_type=clinical" \
  -H "Content-Type: application/json" \
  -d '{"bmi": 28, "triglycerides": 150, "ldl": 130, "hdl": 45, "age": 55}'
```
