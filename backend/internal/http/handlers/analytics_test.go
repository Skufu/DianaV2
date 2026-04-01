package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type mockAnalyticsAssessmentRepo struct {
	assessments []models.Assessment
	listErr     error
	clusterDist []models.ClusterInsights
	clusterErr  error
	trends      []models.TrendPoint
	trendErr    error
}

func (m *mockAnalyticsAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.assessments, nil
}

func (m *mockAnalyticsAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	if m.clusterErr != nil {
		return nil, m.clusterErr
	}
	return m.clusterDist, nil
}

func (m *mockAnalyticsAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	if m.trendErr != nil {
		return nil, m.trendErr
	}
	return m.trends, nil
}

func (m *mockAnalyticsAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAnalyticsAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	return nil, 0, nil
}

func (m *mockAnalyticsAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAnalyticsAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAnalyticsAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAnalyticsAssessmentRepo) Delete(ctx context.Context, id int32) error {
	return nil
}

func (m *mockAnalyticsAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockAnalyticsAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockAnalyticsAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAnalyticsAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	return nil, nil
}

type mockAnalyticsStore struct {
	assessments store.AssessmentRepository
}

func (m *mockAnalyticsStore) Assessments() store.AssessmentRepository {
	return m.assessments
}

func (m *mockAnalyticsStore) Close() {}
func (m *mockAnalyticsStore) Ping(ctx context.Context) error { return nil }

func (m *mockAnalyticsStore) Users() store.UserRepository                 { return nil }
func (m *mockAnalyticsStore) Patients() store.PatientRepository           { return nil }
func (m *mockAnalyticsStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockAnalyticsStore) Cohort() store.CohortRepository              { return nil }
func (m *mockAnalyticsStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockAnalyticsStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockAnalyticsStore) ModelRuns() store.ModelRunRepository         { return nil }
func (m *mockAnalyticsStore) BeginTx(ctx context.Context) (store.TxStore, error) {
	return nil, fmt.Errorf("mock store does not support transactions")
}

func setupAnalyticsRouter(withUser bool, assessments store.AssessmentRepository) *gin.Engine {
	gin.SetMode(gin.TestMode)

	store := &mockAnalyticsStore{assessments: assessments}
	handler := NewAnalyticsHandler(store, nil)

	router := gin.New()
	if withUser {
		router.Use(func(c *gin.Context) {
			c.Set("user", middleware.UserClaims{
				UserID: 1,
				Email:  "user@example.com",
				Role:   "user",
			})
		})
	}
	handler.Register(router.Group("/analytics"))

	return router
}

func TestAnalyticsHandler_GetSummary_Success(t *testing.T) {
	assessments := &mockAnalyticsAssessmentRepo{
		assessments: []models.Assessment{
			{ID: 1, UserID: 1},
			{ID: 2, UserID: 1},
		},
		clusterDist: []models.ClusterInsights{
			{Cluster: "low_risk", Count: 1},
			{Cluster: "high_risk", Count: 1},
		},
		trends: []models.TrendPoint{
			{Label: "2024-01", BMI: 24.0, RiskScore: 40.0},
			{Label: "2024-02", BMI: 24.5, RiskScore: 50.0},
		},
	}
	router := setupAnalyticsRouter(true, assessments)

	req, _ := http.NewRequest("GET", "/analytics/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)
	assert.Equal(t, float64(2), payload["assessment_count"])

	clusterDist, ok := payload["cluster_distribution"].([]any)
	assert.True(t, ok)
	assert.Len(t, clusterDist, 2)

	trends, ok := payload["trends"].([]any)
	assert.True(t, ok)
	assert.Len(t, trends, 2)
}

func TestAnalyticsHandler_GetSummary_Unauthorized(t *testing.T) {
	assessments := &mockAnalyticsAssessmentRepo{}
	router := setupAnalyticsRouter(false, assessments)

	req, _ := http.NewRequest("GET", "/analytics/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAnalyticsHandler_GetSummary_AssessmentsError(t *testing.T) {
	assessments := &mockAnalyticsAssessmentRepo{
		listErr: errors.New("assessments failed"),
	}
	router := setupAnalyticsRouter(true, assessments)

	req, _ := http.NewRequest("GET", "/analytics/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to load analytics summary")
}

func TestAnalyticsHandler_GetSummary_ClusterError(t *testing.T) {
	assessments := &mockAnalyticsAssessmentRepo{
		clusterErr: errors.New("cluster failed"),
	}
	router := setupAnalyticsRouter(true, assessments)

	req, _ := http.NewRequest("GET", "/analytics/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to load analytics summary")
}

func TestAnalyticsHandler_GetSummary_TrendsError(t *testing.T) {
	assessments := &mockAnalyticsAssessmentRepo{
		trendErr: errors.New("trends failed"),
	}
	router := setupAnalyticsRouter(true, assessments)

	req, _ := http.NewRequest("GET", "/analytics/summary", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to load analytics summary")
}
