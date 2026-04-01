# ML Predict Load Tests

Load tests for the DIANA ML prediction endpoint using k6.

## Target

- **p95 latency < 100ms** for `POST /predict` endpoint
- **p99 latency < 150ms**
- **Success rate >= 99%**
- **No cold start penalties** after warmup

## Prerequisites

1. Install k6:
   ```bash
   brew install k6
   ```

2. Start the ML service:
   ```bash
   cd Ian_ML && python service/server.py
   ```

3. Verify the service is healthy:
   ```bash
   curl http://localhost:5000/health
   ```

4. Warmup the service (optional, automatic on startup):
   ```bash
   curl -X POST http://localhost:5000/warmup
   ```

## Running Tests

### Standard Load Test (50 VUs, 3 minutes)

```bash
# Using makefile commands from project root
make load-test-ml-predict

# Or directly with k6
k6 run Ian_ML/load_tests/predict_load_test.js
```

### Quick Test (10 VUs, 30 seconds)

```bash
k6 run --vus 10 --duration 30s Ian_ML/load_tests/predict_load_test.js
```

### Stress Test (100 VUs, 5 minutes)

```bash
k6 run --vus 100 --duration 5m Ian_ML/load_tests/predict_load_test.js
```

## Environment Variables

- `ML_URL`: ML service URL (default: `http://localhost:5000`)
- `ML_API_KEY`: API key for authentication (optional in dev)

Example:
```bash
ML_URL=http://localhost:5000 k6 run Ian_ML/load_tests/predict_load_test.js
```

## Metrics

The test tracks:

- `predict_latency`: End-to-end prediction latency
- `predict_success`: Success rate of predictions
- `predict_errors`: Error rate
- `cold_start_detected`: Cold start detection rate (should be 0%)
- `predictions_made`: Total predictions count

## Thresholds

| Metric | Threshold |
|--------|-----------|
| p95 latency | < 100ms |
| p99 latency | < 150ms |
| Success rate | >= 99% |
| Error rate | < 1% |
| Cold starts | < 1% |

## Interpreting Results

### Good Results
```
✓ predict successful................: 99.50%
✓ latency under 100ms...............: 95.23%
✓ latency under 150ms...............: 99.10%
predict_latency.....................: avg=45ms p95=78ms p99=112ms
```

### Bad Results (needs optimization)
```
✗ predict successful................: 85.20%
✗ latency under 100ms...............: 62.30%
predict_latency.....................: avg=125ms p95=230ms p99=450ms
```

## Optimization Strategies

If latency exceeds targets:

1. **Check model preloading**: Ensure models are loaded at startup
2. **SHAP optimization**: Use TreeExplainer instead of KernelExplainer when possible
3. **Background data**: Ensure `shap_background.joblib` exists for KernelExplainer
4. **Resource limits**: Check CPU/memory constraints

## Related Files

- `predict_load_test.js` - Load test script
- `../service/server.py` - ML server with warmup endpoint
- `../service/explainability.py` - SHAP optimization
