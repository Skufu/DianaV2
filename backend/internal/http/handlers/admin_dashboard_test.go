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
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type mockAdminDashboardClinicRepo struct {
	stats         *models.SystemStats
	statsErr      error
	clinics       []models.Clinic
	listErr       error
	comparison    []models.ClinicComparison
	comparisonErr error
}

func (m *mockAdminDashboardClinicRepo) List(ctx context.Context) ([]models.Clinic, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.clinics, nil
}

func (m *mockAdminDashboardClinicRepo) Get(ctx context.Context, id int32) (*models.Clinic, error) {
	return nil, nil
}

func (m *mockAdminDashboardClinicRepo) Create(ctx context.Context, name, address string) (*models.Clinic, error) {
	return nil, nil
}

func (m *mockAdminDashboardClinicRepo) ListUserClinics(ctx context.Context, userID int32) ([]models.UserClinic, error) {
	return nil, nil
}

func (m *mockAdminDashboardClinicRepo) IsClinicAdmin(ctx context.Context, userID, clinicID int32) (bool, error) {
	return false, nil
}

func (m *mockAdminDashboardClinicRepo) ClinicAggregate(ctx context.Context, clinicID int32) (*models.ClinicAggregate, error) {
	return nil, nil
}

func (m *mockAdminDashboardClinicRepo) AdminSystemStats(ctx context.Context) (*models.SystemStats, error) {
	if m.statsErr != nil {
		return nil, m.statsErr
	}
	if m.stats == nil {
		return &models.SystemStats{}, nil
	}
	return m.stats, nil
}

func (m *mockAdminDashboardClinicRepo) AdminClinicComparison(ctx context.Context) ([]models.ClinicComparison, error) {
	if m.comparisonErr != nil {
		return nil, m.comparisonErr
	}
	return m.comparison, nil
}

type mockAdminDashboardAssessmentRepo struct {
	clusterDist []models.ClusterInsights
	trends      []models.TrendPoint
	clusterErr  error
	trendErr    error
}

func (m *mockAdminDashboardAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	if m.clusterErr != nil {
		return nil, m.clusterErr
	}
	return m.clusterDist, nil
}

func (m *mockAdminDashboardAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	if m.trendErr != nil {
		return nil, m.trendErr
	}
	return m.trends, nil
}

func (m *mockAdminDashboardAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	return nil, 0, nil
}

func (m *mockAdminDashboardAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) Delete(ctx context.Context, id int32) error {
	return nil
}

func (m *mockAdminDashboardAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockAdminDashboardAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	return nil, nil
}

type mockAdminDashboardStore struct {
	clinics     store.ClinicRepository
	assessments store.AssessmentRepository
}

func (m *mockAdminDashboardStore) Clinics() store.ClinicRepository {
	return m.clinics
}

func (m *mockAdminDashboardStore) Assessments() store.AssessmentRepository {
	return m.assessments
}

func (m *mockAdminDashboardStore) Close() {}

func (m *mockAdminDashboardStore) Users() store.UserRepository                 { return nil }
func (m *mockAdminDashboardStore) Patients() store.PatientRepository           { return nil }
func (m *mockAdminDashboardStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockAdminDashboardStore) Cohort() store.CohortRepository              { return nil }
func (m *mockAdminDashboardStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockAdminDashboardStore) ModelRuns() store.ModelRunRepository         { return nil }
func (m *mockAdminDashboardStore) BeginTx(ctx context.Context) (store.TxStore, error) {
	return nil, fmt.Errorf("mock store does not support transactions")
}

func setupAdminDashboardRouter(role string, clinics store.ClinicRepository, assessments store.AssessmentRepository) *gin.Engine {
	gin.SetMode(gin.TestMode)

	store := &mockAdminDashboardStore{
		clinics:     clinics,
		assessments: assessments,
	}
	handler := NewAdminDashboardHandler(store)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 1,
			Email:  "admin@example.com",
			Role:   role,
		})
	})
	handler.Register(router.Group("/admin"))

	return router
}

func TestAdminDashboardHandler_GetDashboard_Success(t *testing.T) {
	clinics := &mockAdminDashboardClinicRepo{
		stats: &models.SystemStats{
			TotalUsers:           10,
			TotalPatients:        8,
			TotalAssessments:     20,
			TotalClinics:         2,
			AvgRiskScore:         42.5,
			HighRiskCount:        4,
			AssessmentsThisMonth: 6,
			NewUsersThisMonth:    3,
		},
	}
	assessments := &mockAdminDashboardAssessmentRepo{
		clusterDist: []models.ClusterInsights{
			{Cluster: "low_risk", Count: 12},
			{Cluster: "high_risk", Count: 8},
		},
		trends: []models.TrendPoint{
			{Label: "2024-01", BMI: 25.0, RiskScore: 30.0},
			{Label: "2024-02", BMI: 26.5, RiskScore: 50.0},
			{Label: "2024-03", BMI: 28.0, RiskScore: 70.0},
		},
	}
	router := setupAdminDashboardRouter("admin", clinics, assessments)

	req, _ := http.NewRequest("GET", "/admin/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)

	stats, ok := payload["stats"].(map[string]any)
	assert.True(t, ok)
	assert.Equal(t, float64(10), stats["total_users"])
	assert.Equal(t, float64(2), stats["total_clinics"])

	clusterDist, ok := payload["cluster_distribution"].([]any)
	assert.True(t, ok)
	assert.Len(t, clusterDist, 2)

	trends, ok := payload["trends"].([]any)
	assert.True(t, ok)
	assert.Len(t, trends, 3)
}

func TestAdminDashboardHandler_GetDashboard_Forbidden(t *testing.T) {
	clinics := &mockAdminDashboardClinicRepo{}
	assessments := &mockAdminDashboardAssessmentRepo{}
	router := setupAdminDashboardRouter("user", clinics, assessments)

	req, _ := http.NewRequest("GET", "/admin/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestAdminDashboardHandler_GetDashboard_StoreError(t *testing.T) {
	clinics := &mockAdminDashboardClinicRepo{
		statsErr: errors.New("stats failed"),
	}
	assessments := &mockAdminDashboardAssessmentRepo{}
	router := setupAdminDashboardRouter("admin", clinics, assessments)

	req, _ := http.NewRequest("GET", "/admin/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to load system statistics")
}

func TestAdminDashboardHandler_ListAllClinics_Success(t *testing.T) {
	clinics := &mockAdminDashboardClinicRepo{
		clinics: []models.Clinic{
			{ID: 1, Name: "Clinic A", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: 2, Name: "Clinic B", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
	}
	assessments := &mockAdminDashboardAssessmentRepo{}
	router := setupAdminDashboardRouter("admin", clinics, assessments)

	req, _ := http.NewRequest("GET", "/admin/clinics", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.Clinic
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 2)
}

func TestAdminDashboardHandler_ListAllClinics_StoreError(t *testing.T) {
	clinics := &mockAdminDashboardClinicRepo{
		listErr: errors.New("list failed"),
	}
	assessments := &mockAdminDashboardAssessmentRepo{}
	router := setupAdminDashboardRouter("admin", clinics, assessments)

	req, _ := http.NewRequest("GET", "/admin/clinics", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to load clinics")
}

func TestAdminDashboardHandler_GetClinicComparison_Success(t *testing.T) {
	clinics := &mockAdminDashboardClinicRepo{
		comparison: []models.ClinicComparison{
			{ClinicID: 1, ClinicName: "Clinic A", PatientCount: 5, AssessmentCount: 10, AvgRiskScore: 45.2, HighRiskCount: 2},
		},
	}
	assessments := &mockAdminDashboardAssessmentRepo{}
	router := setupAdminDashboardRouter("admin", clinics, assessments)

	req, _ := http.NewRequest("GET", "/admin/clinics/comparison", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.ClinicComparison
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 1)
	assert.Equal(t, int64(1), response[0].ClinicID)
}

func TestAdminDashboardHandler_GetClinicComparison_StoreError(t *testing.T) {
	clinics := &mockAdminDashboardClinicRepo{
		comparisonErr: errors.New("comparison failed"),
	}
	assessments := &mockAdminDashboardAssessmentRepo{}
	router := setupAdminDashboardRouter("admin", clinics, assessments)

	req, _ := http.NewRequest("GET", "/admin/clinics/comparison", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to load clinic comparison")
}
