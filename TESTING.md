# DianaV2 Testing Strategy

**Version:** 1.0  
**Last Updated:** 2026-04-01  
**Status:** Production Readiness Documentation

---

## Overview

This document defines the comprehensive testing strategy for DianaV2, a multi-tier medical AI platform for diabetes risk prediction in menopausal women. The platform consists of:

- **Backend**: Go API server (Gin + pgx + SQLC)
- **Frontend**: React 18 application (Vite)
- **ML Service**: Python Flask inference server

Each layer has distinct testing requirements and approaches documented below.

---

## Table of Contents

1. [Test Types Overview](#test-types-overview)
2. [Backend Testing (Go)](#backend-testing-go)
3. [Frontend Testing (React)](#frontend-testing-react)
4. [ML Service Testing (Python)](#ml-service-testing-python)
5. [Contract Testing](#contract-testing)
6. [Load Testing](#load-testing)
7. [Coverage Targets](#coverage-targets)
8. [Running Tests](#running-tests)
9. [Naming Conventions](#naming-conventions)
10. [Test Data Management](#test-data-management)
11. [CI/CD Integration](#cicd-integration)

---

## Test Types Overview

| Test Type | Backend | Frontend | ML Service |
|-----------|---------|----------|------------|
| Unit Tests | ✅ Table-driven | ⚠️ Limited | ✅ pytest |
| Integration Tests | ✅ Real DB | ❌ | ✅ |
| Contract Tests | ✅ API contracts | ⚠️ Planned | ✅ |
| E2E Tests | N/A | ⚠️ Playwright (stale) | N/A |
| Load Tests | ✅ k6 | N/A | ✅ |
| Benchmarks | ✅ Go benchmarks | ❌ | ❌ |

Legend: ✅ Implemented | ⚠️ Partial/Needs Work | ❌ Not Implemented

---

## Backend Testing (Go)

### Unit Tests

Backend unit tests use Go's built-in testing framework with table-driven patterns.

#### Test Structure

```go
func TestFunctionName(t *testing.T) {
    tests := []struct {
        name    string
        input   InputType
        want    OutputType
        wantErr bool
    }{
        {
            name:  "valid input returns expected output",
            input: InputType{Field: "value"},
            want:  OutputType{Result: "expected"},
        },
        {
            name:    "invalid input returns error",
            input:   InputType{Field: ""},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := FunctionName(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("FunctionName() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("FunctionName() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

#### Test File Organization

```
backend/
├── internal/
│   ├── http/
│   │   ├── handlers/
│   │   │   ├── assessments.go
│   │   │   ├── assessments_test.go      # Unit tests for handlers
│   │   │   ├── auth.go
│   │   │   ├── auth_test.go
│   │   │   └── ...
│   │   └── middleware/
│   │       ├── auth.go
│   │       ├── auth_test.go
│   │       └── ...
│   ├── ml/
│   │   ├── validation.go
│   │   ├── validation_test.go
│   │   └── ...
│   ├── services/
│   │   ├── pdf_export_service.go
│   │   ├── pdf_export_service_test.go
│   │   └── ...
│   └── store/
│       ├── postgres.go
│       ├── postgres_test.go             # Unit tests for helpers
│       └── integration_test.go          # Integration tests
```

#### Handler Testing Pattern

```go
func TestHandler_Create(t *testing.T) {
    gin.SetMode(gin.TestMode)

    // Setup fake dependencies
    repo := &fakeRepository{}
    handler := NewHandler(&fakeStore{repo: repo}, &fakePredictor{})

    // Create test router
    r := gin.New()
    r.Use(mockAuthMiddleware())
    r.POST("/resource", handler.Create)

    // Create request
    body := bytes.NewBufferString(`{"field": "value"}`)
    req := httptest.NewRequest(http.MethodPost, "/resource", body)
    req.Header.Set("Content-Type", "application/json")

    // Execute
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)

    // Assert
    if w.Code != http.StatusCreated {
        t.Fatalf("expected status 201, got %d", w.Code)
    }
}
```

#### Mock/Fake Implementations

Use interface-based fakes for testing:

```go
// Fake implementation for testing
type fakePredictor struct {
    lastModelType string
}

func (f *fakePredictor) Predict(ctx context.Context, input models.Assessment) (ml.Prediction, error) {
    return ml.Prediction{Cluster: "SIDD", RiskScore: 87}, nil
}

func (f *fakePredictor) PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (ml.Prediction, error) {
    f.lastModelType = modelType
    return ml.Prediction{}, nil
}
```

### Integration Tests

Integration tests use a real PostgreSQL database connection for comprehensive store layer testing.

#### Test Database Configuration

Integration tests connect to a real database specified by `TEST_DB_DSN` or fallback to development DSN:

```bash
# Set test database
export TEST_DB_DSN="postgres://user:pass@localhost:5432/diana_test?sslmode=disable"

# Run integration tests
cd backend && go test -v ./internal/store/...
```

#### Integration Test Pattern

```go
// integration_test.go
var testStore *PostgresStore
var testPool *pgxpool.Pool

func TestMain(m *testing.M) {
    dsn := getTestDBDSN()
    pool, err := pgxpool.New(context.Background(), dsn)
    if err != nil {
        log.Printf("Skipping integration tests - database not available")
        os.Exit(0) // Exit gracefully, don't fail
    }
    testPool = pool
    testStore = NewPostgresStore(pool)

    code := m.Run()
    cleanupTestData()
    pool.Close()
    os.Exit(code)
}

func TestIntegration_UserRepository_Create(t *testing.T) {
    if testStore == nil {
        t.Skip("Integration test database not available")
    }

    ctx := context.Background()
    repo := testStore.Users()

    user := models.User{
        Email:        "test@example.com",
        PasswordHash: "hashed",
        Role:         models.RoleUser,
    }

    created, err := repo.Create(ctx, user)
    if err != nil {
        t.Fatalf("Failed to create user: %v", err)
    }

    if created.ID == 0 {
        t.Error("Expected user ID to be set after creation")
    }
}
```

#### Transaction Testing

```go
func TestIntegration_Transaction_Commit(t *testing.T) {
    ctx := context.Background()

    txStore, err := testStore.BeginTx(ctx)
    if err != nil {
        t.Fatalf("Failed to begin transaction: %v", err)
    }

    // Perform operations in transaction
    user, err := txStore.Users().Create(ctx, models.User{Email: "tx@test.com"})
    if err != nil {
        txStore.Rollback(ctx)
        t.Fatalf("Failed to create user: %v", err)
    }

    // Commit
    if err := txStore.Commit(ctx); err != nil {
        t.Fatalf("Failed to commit: %v", err)
    }

    // Verify persistence
    found, err := testStore.Users().FindByID(ctx, int32(user.ID))
    if err != nil {
        t.Fatalf("User should exist after commit: %v", err)
    }
}
```

### Benchmarks

Use Go benchmarks for performance-critical code:

```go
func BenchmarkConcurrentMap(b *testing.B) {
    m := make(map[string]int)
    var mu sync.Mutex

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            mu.Lock()
            m["key"]++
            mu.Unlock()
        }
    })
}
```

Run benchmarks:
```bash
cd backend && go test -bench=. -benchmem ./...
```

---

## Frontend Testing (React)

### Current State

> ⚠️ **Note**: Frontend testing is limited. E2E tests (Playwright) are marked as **stale** in AGENTS.md and not actively maintained.

| Test Type | Status | Notes |
|-----------|--------|-------|
| Component Tests | ❌ Not configured | Vitest + React Testing Library recommended |
| E2E Tests | ⚠️ Stale | Playwright configured but not maintained |
| Linting | ✅ ESLint | `npm run lint` |
| Build | ✅ Vite | `npm run build` |

### Running Frontend Tests

```bash
cd frontend

# Lint
npm run lint

# Format check
npm run format:check

# Build
npm run build

# E2E tests (not recommended - stale)
# npx playwright test
```

### Recommended Testing Setup

For production readiness, implement:

1. **Vitest** for unit/component tests
2. **React Testing Library** for component testing
3. **MSW (Mock Service Worker)** for API mocking

Example `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**/*.{ts,tsx}'],
    },
  },
})
```

---

## ML Service Testing (Python)

### Test Structure

```
Ian_ML/
├── tests/
│   ├── test_predict.py           # Prediction endpoint tests
│   ├── test_server.py            # Flask server tests
│   ├── test_train.py             # Training pipeline tests
│   ├── test_clustering.py        # K-Means clustering tests
│   ├── test_leakage.py           # Data leakage prevention tests
│   └── test_methodology_compliance.py
└── pytest.ini                    # pytest configuration
```

### Running ML Tests

```bash
# Run all ML tests
make test-ml

# Or directly with pytest
cd Ian_ML && pytest tests/ -v

# Run specific test file
cd Ian_ML && pytest tests/test_predict.py -v

# Run with coverage
cd Ian_ML && pytest tests/ -v --cov=. --cov-report=html
```

### Test Patterns

#### Prediction Testing

```python
import pytest
from service.predict import DianaPredictor

def test_predictor_returns_valid_cluster():
    predictor = DianaPredictor()
    input_data = {
        'age': 55,
        'bmi': 28.5,
        'triglycerides': 180,
        'ldl': 120,
        'hdl': 45
    }
    
    result = predictor.predict(input_data)
    
    assert 'risk_cluster' in result
    assert result['risk_score'] >= 0
    assert result['risk_score'] <= 100
```

#### Clinical Validation Testing

```python
def test_biomarker_validation():
    """Ensure biomarker values are within clinical ranges."""
    validation_result = validate_biomarkers({
        'hba1c': 7.5,
        'fbs': 126,
        'bmi': 32
    })
    
    assert validation_result['hba1c']['status'] == 'diabetic'
    assert validation_result['fbs']['status'] == 'diabetic'
    assert validation_result['bmi']['status'] == 'obese'
```

---

## Contract Testing

Contract tests verify API compatibility between backend and frontend.

### Backend Contract Tests

Located in `backend/internal/http/handlers/contract_test.go`:

```go
func TestContract_AssessmentResponse(t *testing.T) {
    // Verify response structure matches frontend expectations
    response := createTestAssessmentResponse()
    
    // Assert required fields present
    assert.NotEmpty(t, response.ID)
    assert.NotEmpty(t, response.UserID)
    assert.NotEmpty(t, response.RiskScore)
    assert.NotEmpty(t, response.RiskLevel)
    assert.NotEmpty(t, response.Cluster)
}
```

### Running Contract Tests

```bash
# Run all contract tests
make test-contract

# Or directly
cd backend && go test -v -run "TestContract_" ./internal/http/handlers/
```

### Contract Test Requirements

Contract tests verify:

1. **Response Structure**: JSON fields match TypeScript interfaces
2. **Data Types**: Numbers, strings, booleans match expectations
3. **Required Fields**: All required fields are present
4. **Error Response Format**: `APIError` structure with code, message, details

---

## Load Testing

Load tests use k6 to verify performance requirements.

### Assessment Endpoint Load Test

```javascript
// backend/load_tests/assessment_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 50 },   // Ramp up
        { duration: '3m', target: 100 },  // Sustained load
        { duration: '1m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<200'], // 95% under 200ms
    },
};

export default function() {
    const payload = JSON.stringify({
        age: 55,
        bmi: 28,
        triglycerides: 150,
        ldl: 120,
        hdl: 50,
    });

    const res = http.post('http://localhost:8080/api/assessments', payload, {
        headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
        'status is 201': (r) => r.status === 201,
        'response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(1);
}
```

### Running Load Tests

```bash
# Quick load test (10 VUs, 30s)
make load-test-assessment-quick

# Standard load test (100 VUs, 5m)
make load-test-assessment

# Stress test (200 VUs, 5m)
make load-test-assessment-stress
```

### Performance Requirements

| Endpoint | p95 Latency | p99 Latency | Throughput |
|----------|-------------|-------------|------------|
| POST /api/assessments | < 200ms | < 500ms | 100 req/s |
| POST /predict (ML) | < 100ms | < 250ms | 50 req/s |
| GET /api/users | < 100ms | < 200ms | 200 req/s |

---

## Coverage Targets

### Backend Coverage Targets

| Package | Target | Current | Priority |
|---------|--------|---------|----------|
| `internal/store` | ≥ 70% | ~70% | ✅ Met |
| `internal/handlers` | ≥ 60% | ~55% | ⚠️ Near |
| `internal/ml` | ≥ 70% | ~65% | ⚠️ Near |
| `internal/services` | ≥ 60% | ~50% | ⚠️ Near |
| `internal/middleware` | ≥ 60% | ~60% | ✅ Met |

### Frontend Coverage Targets (Recommended)

| Component Area | Target | Priority |
|----------------|--------|----------|
| AssessmentForm | ≥ 50% | High |
| Login | ≥ 50% | High |
| Registration | ≥ 50% | High |
| Dashboard | ≥ 40% | Medium |

### ML Service Coverage Targets

| Module | Target | Priority |
|--------|--------|----------|
| predict.py | ≥ 80% | High |
| validation.py | ≥ 90% | Critical |
| train.py | ≥ 60% | Medium |

### Running Coverage Reports

```bash
# Backend
cd backend && go test -race -coverprofile=coverage.out ./...
go tool cover -func=coverage.out | grep total

# View HTML report
go tool cover -html=coverage.out -o coverage.html
open coverage.html

# ML Service
cd Ian_ML && pytest tests/ --cov=. --cov-report=html
open htmlcov/index.html
```

---

## Running Tests

### All Tests

```bash
# Run all backend tests
make test

# Run with coverage
cd backend && go test -race -coverprofile=coverage.out ./...
```

### Backend Tests

```bash
# Run all tests
cd backend && go test -v ./...

# Run specific package
cd backend && go test -v ./internal/ml

# Run specific test file
cd backend && go test -v ./internal/ml/mock_test.go -run TestMockPredictor_Predict

# Run specific test function
cd backend && go test -v ./internal/ml/mock_test.go -run TestMockPredictor_Predict/TestNewMockPredictor

# Run integration tests (requires database)
cd backend && go test -v ./internal/store/...

# Run contract tests
make test-contract
```

### Frontend Tests

```bash
cd frontend

# Lint
npm run lint

# Format check
npm run format:check

# Build
npm run build
```

### ML Tests

```bash
# Run all ML tests
make test-ml

# Run with pytest directly
cd Ian_ML && pytest tests/ -v

# Run specific test
cd Ian_ML && pytest tests/test_predict.py -v
```

### Linting

```bash
# Backend
make lint

# Or with golangci-lint directly
cd backend && golangci-lint run ./... --timeout=5m

# Frontend
cd frontend && npm run lint

# ML Service
cd Ian_ML && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
```

---

## Naming Conventions

### Test File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Unit Test | `*_test.go` | `assessments_test.go` |
| Integration Test | `*_test.go` or `integration_test.go` | `integration_test.go` |
| Contract Test | `contract_test.go` | `contract_test.go` |
| Benchmark | `*_test.go` with `Benchmark*` | `benchmark_test.go` |
| ML Test | `test_*.py` | `test_predict.py` |

### Test Function Naming

```go
// Unit test: Test<FunctionName>_<Scenario>
func TestCreateAssessment_ValidInput_ReturnsCreated(t *testing.T) {}
func TestCreateAssessment_InvalidInput_ReturnsBadRequest(t *testing.T) {}

// Integration test: TestIntegration_<Repository>_<Method>
func TestIntegration_UserRepository_Create(t *testing.T) {}
func TestIntegration_AssessmentRepository_List(t *testing.T) {}

// Contract test: TestContract_<API>_<Scenario>
func TestContract_AssessmentResponse_ContainsRequiredFields(t *testing.T) {}

// Benchmark: Benchmark<FunctionName>
func BenchmarkConcurrentMap(b *testing.B) {}
```

### Test Case Naming (Table-Driven)

```go
tests := []struct {
    name string
    // ...
}{
    {name: "valid input returns expected output"},
    {name: "invalid input returns error"},
    {name: "empty input returns validation error"},
}
```

---

## Test Data Management

### Backend Test Data

Integration tests generate unique test data with identifiable patterns:

```go
// Helper to generate unique test email
func testEmail(suffix string) string {
    return fmt.Sprintf("user_%d_%s@test.integration", time.Now().UnixNano(), suffix)
}

// Helper to generate unique test hash
func testHash(suffix string) string {
    return fmt.Sprintf("test_hash_%d_%s", time.Now().UnixNano(), suffix)
}
```

### Cleanup

```go
func cleanupTestData() {
    ctx := context.Background()
    testPool.Exec(ctx, "DELETE FROM users WHERE email LIKE '%@test.integration%'")
    testPool.Exec(ctx, "DELETE FROM assessments WHERE notes LIKE '%integration test%'")
    testPool.Exec(ctx, "DELETE FROM refresh_tokens WHERE token_hash LIKE 'test_hash_%'")
}
```

### ML Test Data

Use fixtures for consistent test data:

```python
# tests/fixtures/test_data.py
VALID_ASSESSMENT = {
    'age': 55,
    'bmi': 28.5,
    'triglycerides': 180,
    'ldl': 120,
    'hdl': 45,
    'systolic': 130,
    'diastolic': 85,
}

CLINICAL_RANGES = {
    'hba1c': {'min': 4.0, 'max': 15.0},
    'fbs': {'min': 50, 'max': 400},
    'bmi': {'min': 15, 'max': 50},
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on push and pull requests via `.github/workflows/ci.yml`:

```yaml
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: go test -v -race -coverprofile=coverage.out ./...
        env:
          DB_SOURCE: "postgres://postgres:postgres@localhost:5432/diana_test?sslmode=disable"
          ENVIRONMENT: "test"

      - name: Contract Tests
        run: go test -v -run "TestContract_" ./internal/http/handlers/

  frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Lint
        run: npm run lint
      - name: Build
        run: npm run build

  ml:
    runs-on: ubuntu-latest
    steps:
      - name: Lint with flake8
        run: flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
```

### Pre-commit Hooks (Recommended)

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run linting
make lint || exit 1

# Run quick tests
cd backend && go test -short ./... || exit 1
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `make test` | Run all backend tests |
| `make test-ml` | Run all ML tests |
| `make test-contract` | Run contract tests |
| `make lint` | Run backend linting |
| `make load-test-assessment` | Run assessment load test |
| `cd backend && go test -race -coverprofile=coverage.out ./...` | Run with coverage |
| `cd Ian_ML && pytest tests/ -v` | Run ML tests verbosely |
| `cd frontend && npm run lint` | Run frontend linting |

---

## Appendix: Test Anti-Patterns to Avoid

### ❌ Don't: Use Manual JSON in Handlers

```go
// Bad
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})

// Good
c.JSON(http.StatusBadRequest, APIError{
    Code:    "validation_error",
    Message: "Invalid input",
    Details: "Field 'email' is required",
})
```

### ❌ Don't: Skip Context in Long-Running Operations

```go
// Bad
func process(data []byte) error {
    for _, item := range data {
        processItem(item) // Can't be cancelled
    }
}

// Good
func process(ctx context.Context, data []byte) error {
    for _, item := range data {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            processItem(item)
        }
    }
}
```

### ❌ Don't: Use Resampled Data Without Calibration

```python
# Bad - SMOTE without calibration
X_resampled, y_resampled = SMOTE().fit_resample(X, y)
model.fit(X_resampled, y_resampled)

# Good - Calibrate after resampling
from sklearn.calibration import CalibratedClassifierCV
calibrated = CalibratedClassifierCV(model, cv='prefit')
calibrated.fit(X_val, y_val)
```

---

*This document is maintained as part of the DianaV2 Production Readiness Mission. For questions or updates, contact the development team.*
