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

	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type mockCohortRepo struct {
	clusterGroups    []models.CohortGroup
	riskGroups       []models.CohortGroup
	ageGroups        []models.CohortGroup
	menopauseGroups  []models.CohortGroup
	clusterErr       error
	riskErr          error
	ageErr           error
	menopauseErr     error
	totalPatients    int
	totalAssessments int
	lastCall         string
}

func (m *mockCohortRepo) StatsByCluster(ctx context.Context) ([]models.CohortGroup, error) {
	m.lastCall = "cluster"
	if m.clusterErr != nil {
		return nil, m.clusterErr
	}
	return m.clusterGroups, nil
}

func (m *mockCohortRepo) StatsByRiskLevel(ctx context.Context) ([]models.CohortGroup, error) {
	m.lastCall = "risk_level"
	if m.riskErr != nil {
		return nil, m.riskErr
	}
	return m.riskGroups, nil
}

func (m *mockCohortRepo) StatsByAgeGroup(ctx context.Context) ([]models.CohortGroup, error) {
	m.lastCall = "age_group"
	if m.ageErr != nil {
		return nil, m.ageErr
	}
	return m.ageGroups, nil
}

func (m *mockCohortRepo) StatsByMenopauseStatus(ctx context.Context) ([]models.CohortGroup, error) {
	m.lastCall = "menopause_status"
	if m.menopauseErr != nil {
		return nil, m.menopauseErr
	}
	return m.menopauseGroups, nil
}

func (m *mockCohortRepo) TotalPatientCount(ctx context.Context) (int, error) {
	return m.totalPatients, nil
}

func (m *mockCohortRepo) TotalAssessmentCount(ctx context.Context) (int, error) {
	return m.totalAssessments, nil
}

type mockCohortStore struct {
	cohort *mockCohortRepo
}

func (m *mockCohortStore) Cohort() store.CohortRepository {
	return m.cohort
}

func (m *mockCohortStore) Close() {}

func (m *mockCohortStore) Users() store.UserRepository                 { return nil }
func (m *mockCohortStore) Patients() store.PatientRepository           { return nil }
func (m *mockCohortStore) Assessments() store.AssessmentRepository     { return nil }
func (m *mockCohortStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockCohortStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockCohortStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockCohortStore) ModelRuns() store.ModelRunRepository         { return nil }
func (m *mockCohortStore) BeginTx(ctx context.Context) (store.TxStore, error) {
	return nil, fmt.Errorf("mock store does not support transactions")
}

func setupCohortRouter(repo *mockCohortRepo) (*gin.Engine, *mockCohortRepo) {
	gin.SetMode(gin.TestMode)

	store := &mockCohortStore{cohort: repo}
	handler := NewCohortHandler(store)

	router := gin.New()
	handler.Register(router.Group("/insights"))

	return router, repo
}

func TestCohortHandler_DefaultGroupByCluster(t *testing.T) {
	repo := &mockCohortRepo{
		clusterGroups: []models.CohortGroup{
			{Name: "low_risk", Count: 10},
			{Name: "high_risk", Count: 5},
		},
		totalPatients:    20,
		totalAssessments: 35,
	}
	router, repo := setupCohortRouter(repo)

	req, _ := http.NewRequest("GET", "/insights/cohort", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "cluster", repo.lastCall)

	var payload map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)
	assert.Equal(t, "cluster", payload["group_by"])
	assert.Equal(t, float64(20), payload["total_patients"])
	assert.Equal(t, float64(35), payload["total_assessments"])
}

func TestCohortHandler_InvalidGroupBy(t *testing.T) {
	router, _ := setupCohortRouter(&mockCohortRepo{})

	req, _ := http.NewRequest("GET", "/insights/cohort?groupBy=unknown", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid groupBy parameter")
}

func TestCohortHandler_GroupByError(t *testing.T) {
	repo := &mockCohortRepo{
		riskErr: errors.New("risk failed"),
	}
	router, _ := setupCohortRouter(repo)

	req, _ := http.NewRequest("GET", "/insights/cohort?groupBy=risk_level", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to load cohort statistics")
}
