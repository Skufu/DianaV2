package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type mockExportUserRepo struct {
	user   *models.User
	getErr error
}

func (m *mockExportUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	return nil, nil
}

func (m *mockExportUserRepo) FindByID(ctx context.Context, id int32) (*models.User, error) {
	return m.GetUserByID(ctx, id)
}

func (m *mockExportUserRepo) GetUserByID(ctx context.Context, id int32) (*models.User, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	return m.user, nil
}

func (m *mockExportUserRepo) List(ctx context.Context, params models.UserListParams) ([]models.User, int, error) {
	return nil, 0, nil
}

func (m *mockExportUserRepo) Create(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (m *mockExportUserRepo) Update(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (m *mockExportUserRepo) UpdateUser(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (m *mockExportUserRepo) Deactivate(ctx context.Context, id int32) error {
	return nil
}

func (m *mockExportUserRepo) Activate(ctx context.Context, id int32) error {
	return nil
}

func (m *mockExportUserRepo) UpdateLastLogin(ctx context.Context, id int32) error {
	return nil
}

func (m *mockExportUserRepo) GetLatestAssessmentByUser(ctx context.Context, userID int64) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockExportUserRepo) GetAssessmentCountByUser(ctx context.Context, userID int64) (int, error) {
	return 0, nil
}

func (m *mockExportUserRepo) GetUserTrends(ctx context.Context, userID int64, months int) (*models.TrendData, error) {
	return nil, nil
}

func (m *mockExportUserRepo) SoftDeleteUser(ctx context.Context, userID int64) error {
	return nil
}

func (m *mockExportUserRepo) UpdateUserOnboarding(ctx context.Context, userID int64, completed bool) error {
	return nil
}

func (m *mockExportUserRepo) UpdateUserConsent(ctx context.Context, userID int64, consent models.ConsentSettings) error {
	return nil
}

func (m *mockExportUserRepo) GetUsersForNotification(ctx context.Context) ([]models.UserForNotification, error) {
	return nil, nil
}

type mockExportAssessmentRepo struct {
	assessments []models.Assessment
	listErr     error
}

func (m *mockExportAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	return nil, 0, nil
}

func (m *mockExportAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) Delete(ctx context.Context, id int32) error {
	return nil
}

func (m *mockExportAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (m *mockExportAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.assessments, nil
}

func (m *mockExportAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	return nil, nil
}

type mockExportStore struct {
	users       store.UserRepository
	assessments store.AssessmentRepository
}

func (m *mockExportStore) Users() store.UserRepository {
	return m.users
}

func (m *mockExportStore) Assessments() store.AssessmentRepository {
	return m.assessments
}

func (m *mockExportStore) Close() {}

func (m *mockExportStore) Patients() store.PatientRepository           { return nil }
func (m *mockExportStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockExportStore) Cohort() store.CohortRepository              { return nil }
func (m *mockExportStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockExportStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockExportStore) ModelRuns() store.ModelRunRepository         { return nil }

type mockPDFGenerator struct {
	data []byte
	err  error
}

func (m *mockPDFGenerator) GenerateHealthReport(user models.UserProfile, assessments []models.Assessment) ([]byte, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.data, nil
}

type capturePDFGenerator struct {
	data            []byte
	called          bool
	lastUser        models.UserProfile
	lastAssessments []models.Assessment
}

func (m *capturePDFGenerator) GenerateHealthReport(user models.UserProfile, assessments []models.Assessment) ([]byte, error) {
	m.called = true
	m.lastUser = user
	m.lastAssessments = assessments
	return m.data, nil
}

func setupExportRouter(role string, store store.Store, pdf PDFReportGenerator) *gin.Engine {
	gin.SetMode(gin.TestMode)

	handler := &ExportHandler{
		store:      store,
		pdfService: pdf,
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 1,
			Email:  "user@example.com",
			Role:   role,
		})
	})
	handler.Register(router.Group("/export"))

	return router
}

func TestExportHandler_ExportPDF_Success(t *testing.T) {
	user := &models.User{
		ID:        1,
		FirstName: "Jane",
		LastName:  "Doe",
		Email:     "jane.doe@example.com",
	}
	usersRepo := &mockExportUserRepo{user: user}
	assessmentsRepo := &mockExportAssessmentRepo{
		assessments: []models.Assessment{
			{ID: 1, UserID: 1, HbA1c: 6.5, CreatedAt: time.Now()},
		},
	}
	pdf := &mockPDFGenerator{data: []byte("pdf-data")}
	store := &mockExportStore{users: usersRepo, assessments: assessmentsRepo}
	router := setupExportRouter("user", store, pdf)

	req, _ := http.NewRequest("GET", "/export/pdf", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/pdf", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Header().Get("Content-Disposition"), "diana_health_report_Jane_Doe_")
	assert.True(t, strings.HasSuffix(w.Header().Get("Content-Disposition"), ".pdf\""))
	assert.Equal(t, "pdf-data", w.Body.String())
}

func TestExportHandler_ExportPDF_Unauthorized(t *testing.T) {
	usersRepo := &mockExportUserRepo{}
	assessmentsRepo := &mockExportAssessmentRepo{}
	pdf := &mockPDFGenerator{data: []byte("pdf-data")}
	store := &mockExportStore{users: usersRepo, assessments: assessmentsRepo}

	gin.SetMode(gin.TestMode)
	handler := &ExportHandler{store: store, pdfService: pdf}
	router := gin.New()
	handler.Register(router.Group("/export"))

	req, _ := http.NewRequest("GET", "/export/pdf", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestExportHandler_ExportPDF_UserFetchError(t *testing.T) {
	usersRepo := &mockExportUserRepo{getErr: errors.New("user error")}
	assessmentsRepo := &mockExportAssessmentRepo{}
	pdf := &mockPDFGenerator{data: []byte("pdf-data")}
	store := &mockExportStore{users: usersRepo, assessments: assessmentsRepo}
	router := setupExportRouter("user", store, pdf)

	req, _ := http.NewRequest("GET", "/export/pdf", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to fetch user profile")
}

func TestExportHandler_ExportPDF_AssessmentError(t *testing.T) {
	usersRepo := &mockExportUserRepo{user: &models.User{ID: 1, FirstName: "Jane", LastName: "Doe"}}
	assessmentsRepo := &mockExportAssessmentRepo{listErr: errors.New("assessment error")}
	pdf := &mockPDFGenerator{data: []byte("pdf-data")}
	store := &mockExportStore{users: usersRepo, assessments: assessmentsRepo}
	router := setupExportRouter("user", store, pdf)

	req, _ := http.NewRequest("GET", "/export/pdf", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to fetch assessments")
}

func TestExportHandler_ExportPDF_GenerationError(t *testing.T) {
	usersRepo := &mockExportUserRepo{user: &models.User{ID: 1, FirstName: "Jane", LastName: "Doe"}}
	assessmentsRepo := &mockExportAssessmentRepo{
		assessments: []models.Assessment{{ID: 1, UserID: 1, HbA1c: 6.5}},
	}
	pdf := &mockPDFGenerator{err: errors.New("pdf error")}
	store := &mockExportStore{users: usersRepo, assessments: assessmentsRepo}
	router := setupExportRouter("user", store, pdf)

	req, _ := http.NewRequest("GET", "/export/pdf", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to generate PDF report")
}

func TestExportHandler_ExportPDF_UsesStoredAssessmentContract(t *testing.T) {
	user := &models.User{
		ID:        1,
		FirstName: "Jane",
		LastName:  "Doe",
		Email:     "jane.doe@example.com",
	}
	storedAssessment := models.Assessment{
		ID:                 7,
		UserID:             1,
		RiskScore:          68,
		RiskLevel:          "medium",
		RiskLabel:          "Moderate Risk",
		Cluster:            "SIRD",
		ClusterDescription: "Insulin resistance dominant pattern",
		TreatmentFocus:     "insulin sensitivity",
		AtRiskProbability:  0.68,
		PredictedStatus:    "at-risk",
		ValidationStatus:   "validated_within_range",
		ModelVersion:       "binary_v2_no_bp",
		FBS:                114,
		HbA1c:              6.1,
		LDL:                128,
		HDL:                49,
		Triglycerides:      176,
		BMI:                29.2,
		CreatedAt:          time.Now(),
	}

	usersRepo := &mockExportUserRepo{user: user}
	assessmentsRepo := &mockExportAssessmentRepo{assessments: []models.Assessment{storedAssessment}}
	pdf := &capturePDFGenerator{data: []byte("pdf-data")}
	st := &mockExportStore{users: usersRepo, assessments: assessmentsRepo}
	router := setupExportRouter("user", st, pdf)

	req, _ := http.NewRequest("GET", "/export/pdf", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, pdf.called)
	assert.Equal(t, int64(1), pdf.lastUser.User.ID)
	assert.Len(t, pdf.lastAssessments, 1)
	assert.Equal(t, storedAssessment.ID, pdf.lastAssessments[0].ID)
	assert.Equal(t, storedAssessment.RiskScore, pdf.lastAssessments[0].RiskScore)
	assert.Equal(t, storedAssessment.Cluster, pdf.lastAssessments[0].Cluster)
	assert.Equal(t, storedAssessment.ClusterDescription, pdf.lastAssessments[0].ClusterDescription)
	assert.Equal(t, storedAssessment.TreatmentFocus, pdf.lastAssessments[0].TreatmentFocus)
	assert.Equal(t, storedAssessment.ModelVersion, pdf.lastAssessments[0].ModelVersion)
	assert.Equal(t, storedAssessment.ValidationStatus, pdf.lastAssessments[0].ValidationStatus)
}
