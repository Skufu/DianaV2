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

type mockClinicDashboardClinicRepo struct {
	userClinics  []models.UserClinic
	listErr      error
	isAdmin      bool
	isAdminErr   error
	clinic       *models.Clinic
	clinicErr    error
	aggregate    *models.ClinicAggregate
	aggregateErr error
}

func (m *mockClinicDashboardClinicRepo) List(ctx context.Context) ([]models.Clinic, error) {
	return nil, nil
}

func (m *mockClinicDashboardClinicRepo) Get(ctx context.Context, id int32) (*models.Clinic, error) {
	if m.clinicErr != nil {
		return nil, m.clinicErr
	}
	if m.clinic == nil {
		return nil, errors.New("not found")
	}
	return m.clinic, nil
}

func (m *mockClinicDashboardClinicRepo) Create(ctx context.Context, name, address string) (*models.Clinic, error) {
	return nil, nil
}

func (m *mockClinicDashboardClinicRepo) ListUserClinics(ctx context.Context, userID int32) ([]models.UserClinic, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.userClinics, nil
}

func (m *mockClinicDashboardClinicRepo) IsClinicAdmin(ctx context.Context, userID, clinicID int32) (bool, error) {
	if m.isAdminErr != nil {
		return false, m.isAdminErr
	}
	return m.isAdmin, nil
}

func (m *mockClinicDashboardClinicRepo) ClinicAggregate(ctx context.Context, clinicID int32) (*models.ClinicAggregate, error) {
	if m.aggregateErr != nil {
		return nil, m.aggregateErr
	}
	if m.aggregate == nil {
		return nil, errors.New("missing aggregate")
	}
	return m.aggregate, nil
}

func (m *mockClinicDashboardClinicRepo) AdminSystemStats(ctx context.Context) (*models.SystemStats, error) {
	return nil, nil
}

func (m *mockClinicDashboardClinicRepo) AdminClinicComparison(ctx context.Context) ([]models.ClinicComparison, error) {
	return nil, nil
}

type mockClinicDashboardAssessmentRepo struct {
	clusterDist []models.ClusterInsights
}

func (m *mockClinicDashboardAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	return m.clusterDist, nil
}

func (m *mockClinicDashboardAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	return nil, 0, nil
}

func (m *mockClinicDashboardAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) Delete(ctx context.Context, id int32) error {
	return nil
}

func (m *mockClinicDashboardAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockClinicDashboardAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	return nil, nil
}

type mockClinicDashboardStore struct {
	clinics     store.ClinicRepository
	assessments store.AssessmentRepository
}

func (m *mockClinicDashboardStore) Clinics() store.ClinicRepository {
	return m.clinics
}

func (m *mockClinicDashboardStore) Assessments() store.AssessmentRepository {
	return m.assessments
}

func (m *mockClinicDashboardStore) Close() {}

func (m *mockClinicDashboardStore) Users() store.UserRepository                 { return nil }
func (m *mockClinicDashboardStore) Patients() store.PatientRepository           { return nil }
func (m *mockClinicDashboardStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockClinicDashboardStore) Cohort() store.CohortRepository              { return nil }
func (m *mockClinicDashboardStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockClinicDashboardStore) ModelRuns() store.ModelRunRepository         { return nil }

func setupClinicDashboardRouter(role string, clinics store.ClinicRepository, assessments store.AssessmentRepository) *gin.Engine {
	gin.SetMode(gin.TestMode)

	store := &mockClinicDashboardStore{
		clinics:     clinics,
		assessments: assessments,
	}
	handler := NewClinicDashboardHandler(store)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 42,
			Email:  "user@example.com",
			Role:   role,
		})
	})
	handler.Register(router.Group("/clinics"))

	return router
}

func TestClinicDashboardHandler_ListClinics_Success(t *testing.T) {
	clinics := &mockClinicDashboardClinicRepo{
		userClinics: []models.UserClinic{
			{Clinic: models.Clinic{ID: 1, Name: "Clinic A", CreatedAt: time.Now(), UpdatedAt: time.Now()}, Role: "member"},
			{Clinic: models.Clinic{ID: 2, Name: "Clinic B", CreatedAt: time.Now(), UpdatedAt: time.Now()}, Role: "admin"},
		},
	}
	assessments := &mockClinicDashboardAssessmentRepo{}
	router := setupClinicDashboardRouter("user", clinics, assessments)

	req, _ := http.NewRequest("GET", "/clinics", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.UserClinic
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 2)
}

func TestClinicDashboardHandler_ListClinics_StoreError(t *testing.T) {
	clinics := &mockClinicDashboardClinicRepo{
		listErr: errors.New("list failed"),
	}
	assessments := &mockClinicDashboardAssessmentRepo{}
	router := setupClinicDashboardRouter("user", clinics, assessments)

	req, _ := http.NewRequest("GET", "/clinics", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to load clinics")
}

func TestClinicDashboardHandler_GetClinicDashboard_InvalidID(t *testing.T) {
	clinics := &mockClinicDashboardClinicRepo{}
	assessments := &mockClinicDashboardAssessmentRepo{}
	router := setupClinicDashboardRouter("user", clinics, assessments)

	req, _ := http.NewRequest("GET", "/clinics/abc/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid clinic ID")
}

func TestClinicDashboardHandler_GetClinicDashboard_AccessDenied(t *testing.T) {
	clinics := &mockClinicDashboardClinicRepo{
		isAdmin: false,
		clinic: &models.Clinic{
			ID:   1,
			Name: "Clinic A",
		},
		aggregate: &models.ClinicAggregate{
			TotalPatients:    12,
			TotalAssessments: 30,
			AvgRiskScore:     40.0,
		},
	}
	assessments := &mockClinicDashboardAssessmentRepo{}
	router := setupClinicDashboardRouter("user", clinics, assessments)

	req, _ := http.NewRequest("GET", "/clinics/1/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "access denied")
}

func TestClinicDashboardHandler_GetClinicDashboard_AdminBypass(t *testing.T) {
	clinics := &mockClinicDashboardClinicRepo{
		isAdmin: false,
		clinic: &models.Clinic{
			ID:   1,
			Name: "Clinic A",
		},
		aggregate: &models.ClinicAggregate{
			TotalPatients:    12,
			TotalAssessments: 30,
			AvgRiskScore:     40.0,
		},
	}
	assessments := &mockClinicDashboardAssessmentRepo{
		clusterDist: []models.ClusterInsights{
			{Cluster: "low_risk", Count: 8},
			{Cluster: "high_risk", Count: 4},
		},
	}
	router := setupClinicDashboardRouter("admin", clinics, assessments)

	req, _ := http.NewRequest("GET", "/clinics/1/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)
	assert.Equal(t, float64(1), payload["clinic_id"])
	assert.Equal(t, "Clinic A", payload["clinic_name"])
}

func TestClinicDashboardHandler_GetClinicDashboard_NotFound(t *testing.T) {
	clinics := &mockClinicDashboardClinicRepo{
		isAdmin:   true,
		clinicErr: errors.New("not found"),
	}
	assessments := &mockClinicDashboardAssessmentRepo{}
	router := setupClinicDashboardRouter("user", clinics, assessments)

	req, _ := http.NewRequest("GET", "/clinics/1/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "clinic not found")
}

func TestClinicDashboardHandler_GetClinicDashboard_StatsError(t *testing.T) {
	clinics := &mockClinicDashboardClinicRepo{
		isAdmin: true,
		clinic: &models.Clinic{
			ID:   1,
			Name: "Clinic A",
		},
		aggregateErr: errors.New("aggregate failed"),
	}
	assessments := &mockClinicDashboardAssessmentRepo{}
	router := setupClinicDashboardRouter("user", clinics, assessments)

	req, _ := http.NewRequest("GET", "/clinics/1/dashboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to load clinic statistics")
}
