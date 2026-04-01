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

type mockAdminAuditRepo struct {
	events     []models.AuditEvent
	total      int
	listErr    error
	lastParams *models.AuditListParams
}

func (m *mockAdminAuditRepo) Create(ctx context.Context, event models.AuditEvent) error {
	return nil
}

func (m *mockAdminAuditRepo) List(ctx context.Context, params models.AuditListParams) ([]models.AuditEvent, int, error) {
	paramsCopy := params
	m.lastParams = &paramsCopy
	if m.listErr != nil {
		return nil, 0, m.listErr
	}
	total := m.total
	if total == 0 {
		total = len(m.events)
	}
	return m.events, total, nil
}

type mockAdminAuditStore struct {
	auditEvents *mockAdminAuditRepo
}

func (m *mockAdminAuditStore) AuditEvents() store.AuditEventRepository {
	return m.auditEvents
}

func (m *mockAdminAuditStore) Close() {}

func (m *mockAdminAuditStore) Users() store.UserRepository                 { return nil }
func (m *mockAdminAuditStore) Patients() store.PatientRepository           { return nil }
func (m *mockAdminAuditStore) Assessments() store.AssessmentRepository     { return nil }
func (m *mockAdminAuditStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockAdminAuditStore) Cohort() store.CohortRepository              { return nil }
func (m *mockAdminAuditStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockAdminAuditStore) ModelRuns() store.ModelRunRepository         { return nil }
func (m *mockAdminAuditStore) BeginTx(ctx context.Context) (store.TxStore, error) {
	return nil, fmt.Errorf("mock store does not support transactions")
}

func setupAdminAuditRouter(repo *mockAdminAuditRepo) (*gin.Engine, *mockAdminAuditRepo) {
	gin.SetMode(gin.TestMode)

	store := &mockAdminAuditStore{auditEvents: repo}
	handler := NewAdminAuditHandler(store)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 1,
			Email:  "admin@example.com",
			Role:   "admin",
		})
	})
	handler.Register(router.Group("/admin"))

	return router, repo
}

func TestAdminAuditHandler_ListAuditEvents_Success(t *testing.T) {
	repo := &mockAdminAuditRepo{
		events: []models.AuditEvent{
			{
				ID:         1,
				Actor:      "admin@example.com",
				Action:     "user.create",
				TargetID:   10,
				TargetType: "user",
				CreatedAt:  time.Date(2026, 1, 10, 10, 0, 0, 0, time.UTC),
			},
			{
				ID:         2,
				Actor:      "admin@example.com",
				Action:     "user.update",
				TargetID:   11,
				TargetType: "user",
				CreatedAt:  time.Date(2026, 1, 11, 10, 0, 0, 0, time.UTC),
			},
		},
		total: 25,
	}
	router, repo := setupAdminAuditRouter(repo)

	req, _ := http.NewRequest("GET", "/admin/audit?page=2&page_size=10&actor=admin@example.com&action=user.create&start_date=2026-01-10&end_date=2026-01-11", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.PaginatedResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 25, response.Total)
	assert.Equal(t, 2, response.Page)
	assert.Equal(t, 10, response.PageSize)
	assert.Equal(t, 3, response.TotalPages)

	assert.NotNil(t, repo.lastParams)
	assert.Equal(t, 2, repo.lastParams.Page)
	assert.Equal(t, 10, repo.lastParams.PageSize)
	assert.Equal(t, "admin@example.com", repo.lastParams.Actor)
	assert.Equal(t, "user.create", repo.lastParams.Action)
	assert.True(t, repo.lastParams.StartDate.Equal(time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC)))
	assert.True(t, repo.lastParams.EndDate.Equal(time.Date(2026, 1, 11, 23, 59, 59, 0, time.UTC)))
}

func TestAdminAuditHandler_ListAuditEvents_InvalidQuery(t *testing.T) {
	router, _ := setupAdminAuditRouter(&mockAdminAuditRepo{})

	req, _ := http.NewRequest("GET", "/admin/audit?page_size=0", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "invalid query parameters")
}

func TestAdminAuditHandler_ListAuditEvents_StoreError(t *testing.T) {
	repo := &mockAdminAuditRepo{
		listErr: errors.New("boom"),
	}
	router, _ := setupAdminAuditRouter(repo)

	req, _ := http.NewRequest("GET", "/admin/audit", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "failed to fetch audit events")
}
