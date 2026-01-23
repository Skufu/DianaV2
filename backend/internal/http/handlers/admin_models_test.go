package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

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
			activeRun: &models.ModelRun{ID: 2, ModelVersion: "v1.1.0"},
		},
	}

	handler := NewAdminModelsHandler(store)
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
	assert.Equal(t, 3, response.TotalPages)

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
	router, _ := setupAdminModelsRouter()
	router = gin.New()

	handler := NewAdminModelsHandler(&mockAdminStore{modelRuns: &mockModelRunRepo{}})
	handler.Register(router.Group("/admin"))

	req, _ := http.NewRequest("GET", "/admin/models", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
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
	router, _ := setupAdminModelsRouter()
	router = gin.New()

	handler := NewAdminModelsHandler(&mockAdminStore{modelRuns: &mockModelRunRepo{}})
	handler.Register(router.Group("/admin"))

	req, _ := http.NewRequest("GET", "/admin/models/active", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAdminModelsHandler_NonGETMethod(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("POST", "/admin/models", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
}

func TestAdminModelsHandler_ActiveEndpointNonGETMethod(t *testing.T) {
	router, _ := setupAdminModelsRouter()

	req, _ := http.NewRequest("POST", "/admin/models/active", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
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
		assert.Greater(t, 0, response.Total)
		assert.Greater(t, 0, response.TotalPages)
	})

	t.Run("active response structure", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/admin/models/active", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.ModelRun
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)

		assert.Greater(t, response.ID, int64(0))
		assert.NotEmpty(t, response.ModelVersion)
		assert.NotZero(t, response.CreatedAt)
	})
}
