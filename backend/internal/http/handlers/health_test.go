package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// mockHealthStore is a mock store for health testing
type mockHealthStore struct {
	store.Store
	pingErr error
}

func (m *mockHealthStore) Ping(ctx context.Context) error { return m.pingErr }

func TestRegisterHealth_Healthz(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	RegisterHealth(router.Group("/api/v1"))

	req, _ := http.NewRequest("GET", "/api/v1/healthz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)
	assert.Equal(t, "ok", payload["status"])
}

func TestRegisterHealth_Livez(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	RegisterHealth(router.Group("/api/v1"))

	req, _ := http.NewRequest("GET", "/api/v1/livez", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)
	assert.Equal(t, "live", payload["status"])
}

func TestHealthHandler_Health_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockHealthStore{pingErr: nil}
	mockPredictor := ml.NewMockPredictor()

	router := gin.New()
	handler := NewHealthHandler(mockStore, mockPredictor)
	handler.Register(router.Group("/health"))

	req, _ := http.NewRequest("GET", "/health/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "healthy", response.Status)
	assert.NotEmpty(t, response.Timestamp)
	assert.Equal(t, "healthy", response.Dependencies["database"].Status)
	assert.Equal(t, "healthy", response.Dependencies["ml_service"].Status)
}

func TestHealthHandler_Health_DatabaseUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockHealthStore{pingErr: context.DeadlineExceeded}
	mockPredictor := ml.NewMockPredictor()

	router := gin.New()
	handler := NewHealthHandler(mockStore, mockPredictor)
	handler.Register(router.Group("/health"))

	req, _ := http.NewRequest("GET", "/health/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "unhealthy", response.Status)
	assert.Equal(t, "unhealthy", response.Dependencies["database"].Status)
	assert.NotEmpty(t, response.Dependencies["database"].Message)
}

func TestHealthHandler_Health_NoStore(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handler := NewHealthHandler(nil, ml.NewMockPredictor())
	handler.Register(router.Group("/health"))

	req, _ := http.NewRequest("GET", "/health/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "unhealthy", response.Status)
	assert.Equal(t, "unhealthy", response.Dependencies["database"].Status)
	assert.Equal(t, "store not configured", response.Dependencies["database"].Message)
}

func TestHealthHandler_Health_NoPredictor(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockHealthStore{pingErr: nil}

	router := gin.New()
	handler := NewHealthHandler(mockStore, nil)
	handler.Register(router.Group("/health"))

	req, _ := http.NewRequest("GET", "/health/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// No predictor should return OK (degraded status)
	assert.Equal(t, http.StatusOK, w.Code)

	var response HealthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "healthy", response.Status) // DB is healthy, ML is degraded but not critical
	assert.Equal(t, "degraded", response.Dependencies["ml_service"].Status)
	assert.Equal(t, "predictor not configured", response.Dependencies["ml_service"].Message)
}

func TestHealthHandler_Readyz_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockHealthStore{pingErr: nil}
	mockPredictor := ml.NewMockPredictor()

	router := gin.New()
	handler := NewHealthHandler(mockStore, mockPredictor)
	handler.Register(router.Group("/health"))

	req, _ := http.NewRequest("GET", "/health/readyz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	require.NoError(t, err)
	assert.Equal(t, "ready", payload["status"])
}

func TestHealthHandler_Readyz_DatabaseUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockStore := &mockHealthStore{pingErr: context.DeadlineExceeded}
	mockPredictor := ml.NewMockPredictor()

	router := gin.New()
	handler := NewHealthHandler(mockStore, mockPredictor)
	handler.Register(router.Group("/health"))

	req, _ := http.NewRequest("GET", "/health/readyz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var payload map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	require.NoError(t, err)
	assert.Equal(t, "not_ready", payload["status"])
	assert.Contains(t, payload["reason"], "database unavailable")
}

func TestHealthHandler_Readyz_NoStore(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handler := NewHealthHandler(nil, ml.NewMockPredictor())
	handler.Register(router.Group("/health"))

	req, _ := http.NewRequest("GET", "/health/readyz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var payload map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	require.NoError(t, err)
	assert.Equal(t, "not_ready", payload["status"])
	assert.Equal(t, "store not configured", payload["reason"])
}
