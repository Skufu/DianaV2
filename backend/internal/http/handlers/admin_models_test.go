package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type fakeAdminPredictor struct {
	status    *ml.DriftStatus
	statusErr error
	alerts    *ml.DriftAlertsEnvelope
	alertsErr error
}

func (f *fakeAdminPredictor) Predict(ctx context.Context, input models.Assessment) (ml.Prediction, error) {
	return ml.Prediction{}, nil
}

func (f *fakeAdminPredictor) PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (ml.Prediction, error) {
	return ml.Prediction{}, nil
}

func (f *fakeAdminPredictor) GetActiveModelMetadata(ctx context.Context) (*ml.ModelMetadata, error) {
	return (&ml.MockPredictor{}).GetActiveModelMetadata(ctx)
}

func (f *fakeAdminPredictor) GetDriftStatus(ctx context.Context) (*ml.DriftStatus, error) {
	if f.statusErr != nil {
		return nil, f.statusErr
	}
	if f.status != nil {
		return f.status, nil
	}
	return (&ml.MockPredictor{}).GetDriftStatus(ctx)
}

func (f *fakeAdminPredictor) GetDriftAlerts(ctx context.Context, unacknowledgedOnly bool, limit int) (*ml.DriftAlertsEnvelope, error) {
	if f.alertsErr != nil {
		return nil, f.alertsErr
	}
	if f.alerts != nil {
		return f.alerts, nil
	}
	return (&ml.MockPredictor{}).GetDriftAlerts(ctx, unacknowledgedOnly, limit)
}

type mockAdminStore struct {
	modelRuns *mockModelRunRepo
}

func (m *mockAdminStore) ModelRuns() store.ModelRunRepository {
	return m.modelRuns
}

func (m *mockAdminStore) Close() {}

func (m *mockAdminStore) Users() store.UserRepository                 { return nil }
func (m *mockAdminStore) Patients() store.PatientRepository           { return nil }
func (m *mockAdminStore) Assessments() store.AssessmentRepository     { return nil }
func (m *mockAdminStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockAdminStore) Cohort() store.CohortRepository              { return nil }
func (m *mockAdminStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockAdminStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockAdminStore) BeginTx(ctx context.Context) (store.TxStore, error) {
	return nil, fmt.Errorf("mock store does not support transactions")
}

type mockModelRunRepo struct {
	runs         []models.ModelRun
	activeRun    *models.ModelRun
	listErr      error
	getActiveErr error
}

func (m *mockModelRunRepo) List(ctx context.Context, limit, offset int) ([]models.ModelRun, int, error) {
	if m.listErr != nil {
		return nil, 0, m.listErr
	}
	return m.runs, len(m.runs), nil
}

func (m *mockModelRunRepo) GetActive(ctx context.Context) (*models.ModelRun, error) {
	if m.getActiveErr != nil {
		return nil, m.getActiveErr
	}
	if m.activeRun != nil {
		return m.activeRun, nil
	}
	return nil, errors.New("no active model run")
}

func (m *mockModelRunRepo) Create(ctx context.Context, run models.ModelRun) (*models.ModelRun, error) {
	return &run, nil
}

func (m *mockModelRunRepo) SetActive(ctx context.Context, id int32) error {
	return nil
}

func setupAdminModelsRouter() (*gin.Engine, *mockAdminStore) {
	gin.SetMode(gin.TestMode)

	store := &mockAdminStore{
		modelRuns: &mockModelRunRepo{
			runs: []models.ModelRun{
				{ID: 1, ModelVersion: "v1.0.0", CreatedAt: time.Date(2026, 1, 20, 10, 0, 0, 0, time.UTC)},
				{ID: 2, ModelVersion: "v1.1.0", CreatedAt: time.Date(2026, 1, 19, 10, 0, 0, 0, time.UTC)},
				{ID: 3, ModelVersion: "v1.2.0", CreatedAt: time.Date(2026, 1, 18, 10, 0, 0, 0, time.UTC)},
			},
			activeRun: &models.ModelRun{ID: 2, ModelVersion: "v1.1.0", CreatedAt: time.Date(2026, 1, 19, 10, 0, 0, 0, time.UTC)},
		},
	}

	handler := NewAdminModelsHandler(store, ml.NewMockPredictor())
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "admin@example.com",
			Role:   "admin",
		})
	})
	handler.Register(router.Group("/admin"))

	return router, store
}

func TestAdminModelsHandler_ListModelRuns_Success(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models?page=1&page_size=10", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, 3, response.Total)
	assert.Equal(t, 1, response.Page)
	assert.Equal(t, 10, response.PageSize)
	assert.Equal(t, 1, response.TotalPages)

	var dataMap []any
	dataBytes, _ := json.Marshal(response.Data)
	_ = json.Unmarshal(dataBytes, &dataMap)
	assert.Equal(t, 3, len(dataMap))
}

func TestAdminModelsHandler_ListModelRuns_DefaultPagination(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 1, response.Page)
	assert.Equal(t, 20, response.PageSize)
}

func TestAdminModelsHandler_ListModelRuns_SecondPage(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models?page=2&page_size=10", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 2, response.Page)
}

func TestAdminModelsHandler_ListModelRuns_PageSizeLimit(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models?page_size=150", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 100, response.PageSize)
}

func TestAdminModelsHandler_ListModelRuns_InvalidPage(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models?page=0", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, 1, response.Page)
}

func TestAdminModelsHandler_ListModelRuns_InvalidPageSize(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models?page_size=0", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, 20, response.PageSize)
}

func TestAdminModelsHandler_ListModelRuns_NegativePage(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models?page=-1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, 1, response.Page)
}

func TestAdminModelsHandler_ListModelRuns_StoreError(t *testing.T) {
	router, store := setupAdminModelsRouter()

	store.modelRuns.listErr = assert.AnError

	req, _ := http.NewRequest("GET", "/admin/models", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "INTERNAL_ERROR", response["code"])
	assert.Equal(t, "Failed to fetch model runs", response["message"])
}

func TestAdminModelsHandler_ListModelRuns_AuthRequired(t *testing.T) {
	_, _ = setupAdminModelsRouter()
	router := gin.New()

	handler := NewAdminModelsHandler(&mockAdminStore{modelRuns: &mockModelRunRepo{}}, ml.NewMockPredictor())
	handler.Register(router.Group("/admin"))

	req, _ := http.NewRequest("GET", "/admin/models", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminModelsHandler_GetActiveModel_Success(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("GET", "/admin/models/active", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.ModelRun
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, int64(2), response.ID)
	assert.Equal(t, "v1.1.0", response.ModelVersion)
}

func TestAdminModelsHandler_GetActiveModel_NotFound(t *testing.T) {
	router, store := setupAdminModelsRouter()

	store.modelRuns.activeRun = nil
	store.modelRuns.getActiveErr = errors.New("not found")

	req, _ := http.NewRequest("GET", "/admin/models/active", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "NOT_FOUND", response["code"])
	assert.Equal(t, "model runs not found", response["message"])
}

func TestAdminModelsHandler_GetActiveModel_StoreError(t *testing.T) {
	router, store := setupAdminModelsRouter()

	store.modelRuns.activeRun = nil
	store.modelRuns.getActiveErr = assert.AnError

	req, _ := http.NewRequest("GET", "/admin/models/active", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "INTERNAL_ERROR", response["code"])
	assert.Equal(t, "Failed to fetch active model", response["message"])
}

func TestAdminModelsHandler_GetActiveModel_AuthRequired(t *testing.T) {
	_, _ = setupAdminModelsRouter()
	router := gin.New()

	handler := NewAdminModelsHandler(&mockAdminStore{
		modelRuns: &mockModelRunRepo{
			activeRun: &models.ModelRun{ID: 1, ModelVersion: "v1.0.0"},
		},
	}, ml.NewMockPredictor())
	handler.Register(router.Group("/admin"))

	req, _ := http.NewRequest("GET", "/admin/models/active", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminModelsHandler_NonGETMethod(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("POST", "/admin/models", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestAdminModelsHandler_ActiveEndpointNonGETMethod(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("POST", "/admin/models/active", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestAdminModelsHandler_ResponseStructure(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	t.Run("list response structure", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/admin/models?page=1&page_size=5", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.PaginatedResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.NotEmpty(t, response.Data)
		assert.Greater(t, response.Total, 0)
		assert.Greater(t, response.TotalPages, 0)
	})

	t.Run("active response structure", func(t *testing.T) {
		router, _ := setupAdminModelsRouter()

		req, _ := http.NewRequest("GET", "/admin/models/active", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.ModelRun
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.Greater(t, response.ID, int64(0))
		assert.NotEmpty(t, response.ModelVersion)
		if response.CreatedAt.IsZero() {
			t.Error("expected CreatedAt to not be zero")
		}
	})
}

func TestAdminModelsHandler_GetDriftStatus_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{UserID: 123, Email: "admin@example.com", Role: "admin"})
	})

	lastCheck := "2026-03-08T09:00:00Z"
	handler := NewAdminModelsHandler(&mockAdminStore{modelRuns: &mockModelRunRepo{}}, &fakeAdminPredictor{
		status: &ml.DriftStatus{
			ReferenceFeatures:    []string{"bmi", "ldl"},
			ReferenceSet:         true,
			TotalAlerts:          4,
			UnacknowledgedAlerts: 2,
			LastCheck:            &lastCheck,
			ScipyAvailable:       true,
			ActiveLineage: ml.DriftActiveLineage{
				ModelVersion:         "binary_v2_no_bp",
				DatasetHash:          "dataset-123",
				FeatureSchemaVersion: "features:5",
			},
			DriftBaseline: ml.DriftBaselineMetadata{
				BaselineID:           "baseline-2026q1",
				BaselineVersion:      "7",
				ModelVersion:         "binary_v2_no_bp",
				DatasetHash:          "dataset-123",
				FeatureSchemaVersion: "features:5",
				SourceKind:           "release_holdout",
				CreatedAt:            "2026-03-01T00:00:00Z",
				StaleAfter:           "2026-06-01T00:00:00Z",
				SampleCount:          500,
				ReferenceFeatures:    []string{"bmi", "ldl"},
				LineageStatus:        "healthy",
			},
		},
	})
	handler.Register(router.Group("/admin"))

	req, _ := http.NewRequest("GET", "/admin/models/drift", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, true, response["reference_set"])
	assert.Equal(t, float64(4), response["total_alerts"])
	assert.Equal(t, float64(2), response["unacknowledged_alerts"])

	activeLineage, ok := response["active_lineage"].(map[string]any)
	if !ok {
		t.Fatalf("expected active_lineage object, got %#v", response["active_lineage"])
	}
	assert.Equal(t, "binary_v2_no_bp", activeLineage["model_version"])
	assert.Equal(t, "dataset-123", activeLineage["dataset_hash"])

	driftBaseline, ok := response["drift_baseline"].(map[string]any)
	if !ok {
		t.Fatalf("expected drift_baseline object, got %#v", response["drift_baseline"])
	}
	assert.Equal(t, "baseline-2026q1", driftBaseline["baseline_id"])
	assert.Equal(t, "7", driftBaseline["baseline_version"])
	assert.Equal(t, "healthy", driftBaseline["lineage_status"])
}

func TestAdminModelsHandler_GetDriftAlerts_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{UserID: 123, Email: "admin@example.com", Role: "admin"})
	})

	handler := NewAdminModelsHandler(&mockAdminStore{modelRuns: &mockModelRunRepo{}}, &fakeAdminPredictor{
		alerts: &ml.DriftAlertsEnvelope{
			Alerts: []ml.DriftAlert{
				{
					Timestamp:    "2026-03-08T09:00:00Z",
					AlertType:    "drift",
					Severity:     "high",
					Message:      "Drift detected in bmi",
					Details:      map[string]any{"features": []string{"bmi"}},
					Acknowledged: false,
				},
			},
			ActiveLineage: ml.DriftActiveLineage{
				ModelVersion:         "binary_v2_no_bp",
				DatasetHash:          "dataset-123",
				FeatureSchemaVersion: "features:5",
			},
			DriftBaseline: ml.DriftBaselineMetadata{
				BaselineID:           "baseline-2026q1",
				BaselineVersion:      "7",
				ModelVersion:         "binary_v2_no_bp",
				DatasetHash:          "dataset-123",
				FeatureSchemaVersion: "features:5",
				LineageStatus:        "healthy",
			},
		},
	})
	handler.Register(router.Group("/admin"))

	req, _ := http.NewRequest("GET", "/admin/models/drift/alerts?unacknowledged=true&limit=10", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &response)

	alerts, ok := response["alerts"].([]any)
	if !ok || len(alerts) != 1 {
		t.Fatalf("expected one alert, got %#v", response["alerts"])
	}
	alert, ok := alerts[0].(map[string]any)
	if !ok {
		t.Fatalf("expected alert object, got %#v", alerts[0])
	}
	assert.Equal(t, "high", alert["severity"])
	assert.Equal(t, "Drift detected in bmi", alert["message"])

	activeLineage, ok := response["active_lineage"].(map[string]any)
	if !ok {
		t.Fatalf("expected active_lineage object, got %#v", response["active_lineage"])
	}
	assert.Equal(t, "binary_v2_no_bp", activeLineage["model_version"])

	driftBaseline, ok := response["drift_baseline"].(map[string]any)
	if !ok {
		t.Fatalf("expected drift_baseline object, got %#v", response["drift_baseline"])
	}
	assert.Equal(t, "baseline-2026q1", driftBaseline["baseline_id"])
	assert.Equal(t, "7", driftBaseline["baseline_version"])
}
