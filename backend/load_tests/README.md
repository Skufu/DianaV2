# Assessment Endpoint Load Tests

This directory contains k6 load tests for the assessment creation endpoint (`POST /api/v1/users/me/assessments`).

## Test Script: `assessment_load_test.js`

### Test Configuration

The load test simulates **100 concurrent users** for **5 minutes** with the following stages:

- **Ramp-up**: 0 → 100 VUs over 30 seconds
- **Steady state**: 100 VUs for 4 minutes
- **Ramp-down**: 100 → 0 VUs over 30 seconds

### Performance Thresholds

The test enforces these thresholds per VAL-BT-004 validation contract:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| `http_req_duration` | p95 < 200ms | Overall HTTP request latency |
| `assessment_latency` | p95 < 200ms, p99 < 300ms | Assessment creation specific latency |
| `assessment_success` | rate >= 99% | Success rate must be 99% or higher |
| `assessment_errors` | rate < 1% | Error rate must be below 1% |

### Test Coverage

The load test validates:

1. **Full assessment flow**: Login → Create assessment → Receive ML prediction
2. **ML prediction timing**: Includes ML service round-trip in latency measurement
3. **Data validation**: Verifies response contains `risk_score`, `cluster`, `predicted_status`
4. **Realistic test data**: Generates biomarker values within clinical ranges for postmenopausal women (45-60 years)

### Running the Tests

#### Prerequisites

1. Backend service running on port 3100 (or configure `BASE_URL`)
2. ML service running on port 5000 (or mocked via `MODEL_URL=""`)
3. PostgreSQL database available
4. k6 installed: `brew install k6` (macOS) or see [k6 installation](https://k6.io/docs/getting-started/installation/)

#### Quick Test (10 VUs, 30 seconds)

```bash
# Via Makefile
make load-test-assessment-quick

# Via k6 directly
k6 run --vus 10 --duration 30s backend/load_tests/assessment_load_test.js
```

#### Standard Test (100 VUs, 5 minutes)

```bash
# Via Makefile
make load-test-assessment

# Via k6 directly
k6 run backend/load_tests/assessment_load_test.js

# Via services.yaml command
# (defined in .factory/services.yaml)
```

#### Stress Test (200 VUs, 5 minutes)

```bash
# Via Makefile
make load-test-assessment-stress

# Via k6 directly
k6 run --vus 200 --duration 5m backend/load_tests/assessment_load_test.js
```

#### Custom Configuration

```bash
# Override base URL
k6 run -e BASE_URL=http://localhost:8080 backend/load_tests/assessment_load_test.js

# Override test user credentials
k6 run -e TEST_USER_EMAIL=test@example.com -e TEST_USER_PASSWORD=Test123! backend/load_tests/assessment_load_test.js

# Custom VUs and duration
k6 run --vus 50 --duration 2m backend/load_tests/assessment_load_test.js
```

### Test User Setup

The load test automatically creates a test user if not exists:

- **Email**: `loadtest@example.com` (configurable via `TEST_USER_EMAIL`)
- **Password**: `LoadTest123!` (configurable via `TEST_USER_PASSWORD`)

### Custom Metrics

The script tracks these custom metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `assessment_errors` | Rate | Error rate for assessment creation |
| `assessment_latency` | Trend | Latency distribution for assessments |
| `assessment_success` | Rate | Success rate for assessment creation |
| `assessments_created` | Counter | Total number of assessments created |

### Interpreting Results

A successful test run will show:

```
✓ assessment created successfully
✓ response has risk_score
✓ response has cluster
✓ response has prediction
✓ latency under 200ms

http_req_duration.............: p(95)<200ms ✓
assessment_latency............: p(95)<200ms ✓, p(99)<300ms ✓
assessment_success............: rate>=0.99 ✓
assessment_errors.............: rate<0.01 ✓
```

If thresholds fail, investigate:

1. **ML service latency**: Check ML service health and response times
2. **Database connections**: Check PostgreSQL connection pool settings
3. **Resource limits**: Check CPU/memory utilization during test
4. **Network latency**: Check network between backend and ML service

### Related Documentation

- [Validation Contract](/.factory/missions/eda5c9b3-47c4-470d-a5eb-81e7b68ee211/validation-contract.md) - VAL-BT-004
- [Backend Testing Strategy](/TESTING.md) - Overall test approach
- [AGENTS.md](/AGENTS.md) - Project conventions and patterns
