package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
	"github.com/stretchr/testify/assert"
)

type mockStore struct {
	patientRepo *mockPatientRepo
	userRepo    *mockUserRepo
}

func (m *mockStore) Users() store.UserRepository                 { return m.userRepo }
func (m *mockStore) Patients() store.PatientRepository           { return m.patientRepo }
func (m *mockStore) Assessments() store.AssessmentRepository     { return &mockAssessmentRepo{} }
func (m *mockStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockStore) Cohort() store.CohortRepository              { return nil }
func (m *mockStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockStore) ModelRuns() store.ModelRunRepository         { return nil }
func (m *mockStore) Close()                                      {}

type mockPatientRepo struct {
	patients []models.Patient
}

func (m *mockPatientRepo) List(ctx context.Context, userID int32) ([]models.Patient, error) {
	return m.patients, nil
}

func (m *mockPatientRepo) ListPaginated(ctx context.Context, userID int32, limit, offset int) ([]models.Patient, int, error) {
	return m.patients, len(m.patients), nil
}

func (m *mockPatientRepo) ListWithLatestAssessment(ctx context.Context, userID int32) ([]models.PatientSummary, error) {
	return nil, nil
}

func (m *mockPatientRepo) ListWithLatestAssessmentPaginated(ctx context.Context, userID int32, limit, offset int) ([]models.PatientSummary, int, error) {
	return nil, 0, nil
}

func (m *mockPatientRepo) Get(ctx context.Context, id int32, userID int32) (*models.Patient, error) {
	for _, p := range m.patients {
		if p.ID == int64(id) && p.UserID == int64(userID) {
			return &p, nil
		}
	}
	return nil, nil
}

func (m *mockPatientRepo) Create(ctx context.Context, p models.Patient) (*models.Patient, error) {
	p.ID = int64(len(m.patients) + 1)
	m.patients = append(m.patients, p)
	return &p, nil
}

func (m *mockPatientRepo) Update(ctx context.Context, p models.Patient) (*models.Patient, error) {
	for i, pat := range m.patients {
		if pat.ID == p.ID {
			m.patients[i] = p
			return &p, nil
		}
	}
	return nil, nil
}

func (m *mockPatientRepo) Delete(ctx context.Context, id int32, userID int32) error {
	for i, p := range m.patients {
		if p.ID == int64(id) && p.UserID == int64(userID) {
			m.patients = append(m.patients[:i], m.patients[i+1:]...)
			return nil
		}
	}
	return nil
}

func (m *mockPatientRepo) ListAllLimited(ctx context.Context, userID int32, limit int) ([]models.Patient, error) {
	return m.patients, nil
}

type mockUserRepo struct{}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	return &models.User{ID: 1, Email: email}, nil
}

func (m *mockUserRepo) FindByID(ctx context.Context, id int32) (*models.User, error) {
	return &models.User{ID: int64(id), Email: "test@example.com"}, nil
}

func (m *mockUserRepo) List(ctx context.Context, params models.UserListParams) ([]models.User, int, error) {
	return nil, 0, nil
}

func (m *mockUserRepo) Create(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (m *mockUserRepo) Update(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (m *mockUserRepo) Deactivate(ctx context.Context, id int32) error {
	return nil
}

func (m *mockUserRepo) Activate(ctx context.Context, id int32) error {
	return nil
}

func (m *mockUserRepo) UpdateLastLogin(ctx context.Context, id int32) error {
	return nil
}

type mockAssessmentRepo struct{}

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
	return &a, nil
}

func (m *mockAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return &a, nil
}

func (m *mockAssessmentRepo) Delete(ctx context.Context, id int32) error {
	return nil
}

func (m *mockAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
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

func setupRouter(t *testing.T) (*gin.Engine, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	mockStore := &mockStore{
		patientRepo: &mockPatientRepo{},
		userRepo:    &mockUserRepo{},
	}
	handler := NewPatientsHandler(mockStore)

	router.GET("", handler.list)
	router.POST("", handler.create)
	router.GET("/:id", handler.get)
	router.PUT("/:id", handler.update)
	router.DELETE("/:id", handler.delete)

	recorder := httptest.NewRecorder()
	return router, recorder
}

func setupAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 1,
			Email:  "test@example.com",
			Role:   "clinician",
		})
		c.Next()
	}
}

func TestPatientsHandler_List(t *testing.T) {
	router, recorder := setupRouter(t)
	router.Use(setupAuthMiddleware())

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/patients", nil)
	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"total":1`)
}

func TestPatientsHandler_Create(t *testing.T) {
	router, recorder := setupRouter(t)
	router.Use(setupAuthMiddleware())

	newPatient := map[string]interface{}{
		"age": 55.0,
		"bmi": 28.5,
	}

	body, _ := json.Marshal(newPatient)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusCreated, recorder.Code)

	var response map[string]interface{}
	json.Unmarshal(recorder.Body.Bytes(), &response)

	assert.Contains(t, response, "id")
	assert.Equal(t, float64(1), response["user_id"])
}

func TestPatientsHandler_Create_ValidationError(t *testing.T) {
	router, recorder := setupRouter(t)
	router.Use(setupAuthMiddleware())

	invalidPatient := map[string]interface{}{
		"age": -1.0,
	}

	body, _ := json.Marshal(invalidPatient)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "error")
}

func TestPatientsHandler_Get(t *testing.T) {
	router, recorder := setupRouter(t)
	router.Use(setupAuthMiddleware())

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/patients/1", nil)

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)

	var response map[string]interface{}
	json.Unmarshal(recorder.Body.Bytes(), &response)

	assert.Contains(t, response, "age")
	assert.Equal(t, float64(55), response["id"])
}

func TestPatientsHandler_Delete(t *testing.T) {
	router, recorder := setupRouter(t)
	router.Use(setupAuthMiddleware())

	req, _ := http.NewRequest(http.MethodDelete, "/api/v1/patients/1", nil)
	req.Header.Set("Authorization", "Bearer test-token")

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)

	var response map[string]interface{}
	json.Unmarshal(recorder.Body.Bytes(), &response)

	assert.Equal(t, "deleted", response["message"])
}

func TestPatientsHandler_Unauthorized(t *testing.T) {
	router, recorder := setupRouter(t)
	router.Use(setupAuthMiddleware())

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/patients", nil)

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusUnauthorized, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "unauthorized")
}
