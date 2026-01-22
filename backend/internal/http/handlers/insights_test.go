package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type mockInsightsStore struct {
	assessments *mockAssessmentRepo
}

func (m *mockInsightsStore) Assessments() store.AssessmentRepository {
	return m.assessments
}

func (m *mockInsightsStore) Close() {}

func (m *mockInsightsStore) Users() store.UserRepository                 { return nil }
func (m *mockInsightsStore) Patients() store.PatientRepository           { return nil }
func (m *mockInsightsStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockInsightsStore) Cohort() store.CohortRepository              { return nil }
func (m *mockInsightsStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockInsightsStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockInsightsStore) ModelRuns() store.ModelRunRepository         { return nil }

type mockAssessmentRepo struct {
	clusterCounts    *[]models.ClusterInsights
	trendAverages    *[]models.TrendPoint
	clusterCountsErr error
	trendAveragesErr error
}

func (m *mockAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	if m.clusterCountsErr != nil {
		return nil, m.clusterCountsErr
	}
	return *m.clusterCounts, nil
}

func (m *mockAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	if m.trendAveragesErr != nil {
		return nil, m.trendAveragesErr
	}
	return *m.trendAverages, nil
}

func (m *mockAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	return nil, 0, nil
}

func (m *mockAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) Delete(ctx context.Context, id int32) error {
	return nil
}

func (m *mockAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	return nil, nil
}

func setupInsightsRouter() (*gin.Engine, *mockInsightsStore) {
	gin.SetMode(gin.TestMode)

	assessments := &mockAssessmentRepo{
		clusterCounts: &[]models.ClusterInsights{
			{Cluster: "SIRD", Count: 45},
			{Cluster: "SIDD", Count: 32},
			{Cluster: "MOD", Count: 18},
			{Cluster: "MARD", Count: 5},
		},
		trendAverages: &[]models.TrendPoint{
			{Label: "HbA1c", HbA1c: 6.8, FBS: 120},
			{Label: "FBS", HbA1c: 6.8, FBS: 120},
			{Label: "BMI", HbA1c: 6.8, FBS: 120},
		},
	}

	store := &mockInsightsStore{assessments: assessments}
	handler := NewInsightsHandler(store)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "admin@example.com",
			Role:   "admin",
		})
	})
	handler.Register(router.Group("/insights"))

	return router, store
}

func TestInsightsHandler_ClusterDistribution_Success(t *testing.T) {
	router, _ := setupInsightsRouter()

	req, _ := http.NewRequest("GET", "/insights/cluster-distribution", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.ClusterInsights
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, 4, len(response))

	sird := response[0]
	assert.Equal(t, "SIRD", sird.Cluster)
	assert.Equal(t, 45, sird.Count)
}

func TestInsightsHandler_ClusterDistribution_AuthRequired(t *testing.T) {
	router, _ := setupInsightsRouter()
	router = gin.New()
	handler := NewInsightsHandler(&mockInsightsStore{
		assessments: &mockAssessmentRepo{},
	})
	handler.Register(router.Group("/insights"))

	req, _ := http.NewRequest("GET", "/insights/cluster-distribution", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestInsightsHandler_BiomarkerTrends_Success(t *testing.T) {
	router, _ := setupInsightsRouter()

	req, _ := http.NewRequest("GET", "/insights/biomarker-trends", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.TrendPoint
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, 3, len(response))

	hba1c := response[0]
	fbs := response[1]
	bmi := response[2]
	assert.Equal(t, "HbA1c", hba1c.Label)
	assert.Equal(t, 6.8, hba1c.HbA1c)
	assert.Equal(t, "FBS", fbs.Label)
	assert.Equal(t, float64(120), fbs.FBS)
	assert.Equal(t, "BMI", bmi.Label)
	assert.Equal(t, float64(6.8), bmi.HbA1c)
}

func TestInsightsHandler_BiomarkerTrends_AuthRequired(t *testing.T) {
	router, _ := setupInsightsRouter()
	router = gin.New()
	handler := NewInsightsHandler(&mockInsightsStore{
		assessments: &mockAssessmentRepo{},
	})
	handler.Register(router.Group("/insights"))

	req, _ := http.NewRequest("GET", "/insights/biomarker-trends", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestInsightsHandler_ClusterDistribution_StoreError(t *testing.T) {
	router, store := setupInsightsRouter()

	store.assessments.clusterCountsErr = assert.AnError

	req, _ := http.NewRequest("GET", "/insights/cluster-distribution", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response, "code")
	assert.Contains(t, response, "message")
}

func TestInsightsHandler_BiomarkerTrends_StoreError(t *testing.T) {
	router, store := setupInsightsRouter()

	store.assessments.trendAveragesErr = assert.AnError

	req, _ := http.NewRequest("GET", "/insights/biomarker-trends", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response, "code")
	assert.Contains(t, response, "message")
}

func TestInsightsHandler_ResponseStructure(t *testing.T) {
	router, _ := setupInsightsRouter()

	t.Run("cluster distribution", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/insights/cluster-distribution", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response []models.ClusterInsights
		_ = json.Unmarshal(w.Body.Bytes(), &response)

		for _, cluster := range response {
			assert.NotEmpty(t, cluster.Cluster)
			assert.GreaterOrEqual(t, cluster.Count, 0)
		}
	})

	t.Run("biomarker trends", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/insights/biomarker-trends", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response []models.TrendPoint
		_ = json.Unmarshal(w.Body.Bytes(), &response)

		for _, trend := range response {
			assert.NotEmpty(t, trend.Label)
			assert.GreaterOrEqual(t, trend.HbA1c, 0.0)
			assert.GreaterOrEqual(t, trend.FBS, 0.0)
		}
	})
}
