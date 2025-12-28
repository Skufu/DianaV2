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

Set these environment variables for the Go backend:
```bash
MODEL_URL=http://localhost:5000/predict
MODEL_VERSION=1063
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

Expected response:
```json
{
  "cluster": "MOD-like",
  "risk_score": 100,
  "risk_level": "MODERATE",
  "confidence": 1.0
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Single prediction |
| `/predict/batch` | POST | Multiple predictions |
| `/model/info` | GET | Model metadata |

## Required Input Fields

| Field | Type | Unit | Example |
|-------|------|------|---------|
| `hba1c` | float | % | 6.5 |
| `fbs` | float | mg/dL | 126 |
| `bmi` | float | kg/m² | 28.0 |
| `triglycerides` | float | mg/dL | 150 |
| `ldl` | float | mg/dL | 130 |
| `hdl` | float | mg/dL | 45 |

## Running Both Services

Open two terminals:

**Terminal 1 - ML Server:**
```bash
python scripts/ml_server.py
```

**Terminal 2 - Go Backend:**
```bash
MODEL_URL=http://localhost:5000/predict go run ./cmd/server
```

## Production Deployment

For production, run the ML server behind a reverse proxy:
- Consider using Gunicorn: `gunicorn -w 4 -b 0.0.0.0:5000 scripts.ml_server:app`
- Or containerize both services with Docker Compose
