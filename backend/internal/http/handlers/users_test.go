package handlers

import (
	"bytes"
	"context"
	"encoding/json"
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

type mockUsersStore struct {
	user *mockUserRepo
}

func (m *mockUsersStore) Users() store.UserRepository {
	return m.user
}

func (m *mockUsersStore) Close() {}

func (m *mockUsersStore) Patients() store.PatientRepository           { return nil }
func (m *mockUsersStore) Assessments() store.AssessmentRepository     { return nil }
func (m *mockUsersStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockUsersStore) Cohort() store.CohortRepository              { return nil }
func (m *mockUsersStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockUsersStore) AuditEvents() store.AuditEventRepository     { return nil }
func (m *mockUsersStore) ModelRuns() store.ModelRunRepository         { return nil }

type mockUserRepo struct {
	user *models.User
}

func (m *mockUserRepo) GetLatestAssessmentByUser(ctx context.Context, userID int64) (*models.Assessment, error) {
	return &models.Assessment{
		ID:        1,
		UserID:    123,
		HbA1c:     6.5,
		RiskScore: 45,
		Cluster:   "SIRD",
		CreatedAt: time.Now(),
	}, nil
}

func (m *mockUserRepo) GetAssessmentCountByUser(ctx context.Context, userID int64) (int, error) {
	return 1, nil
}

func (m *mockUserRepo) Update(ctx context.Context, user models.User) (*models.User, error) {
	if m.user != nil {
		*m.user = user
	}
	return m.user, nil
}

func (m *mockUserRepo) UpdateUser(ctx context.Context, user models.User) (*models.User, error) {
	if m.user != nil {
		*m.user = user
	}
	return m.user, nil
}

func (m *mockUserRepo) UpdateUserConsent(ctx context.Context, userID int64, settings models.ConsentSettings) error {
	return nil
}

func (m *mockUserRepo) UpdateUserOnboarding(ctx context.Context, userID int64, completed bool) error {
	return nil
}

func (m *mockUserRepo) GetUserByID(ctx context.Context, id int32) (*models.User, error) {
	if m.user != nil {
		return m.user, nil
	}
	return nil, nil
}

func (m *mockUserRepo) SoftDeleteUser(ctx context.Context, userID int64) error {
	m.user = nil
	return nil
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.user != nil && m.user.Email == email {
		return m.user, nil
	}
	return nil, nil
}

func (m *mockUserRepo) FindByID(ctx context.Context, id int32) (*models.User, error) {
	return m.GetUserByID(ctx, id)
}

func (m *mockUserRepo) List(ctx context.Context, params models.UserListParams) ([]models.User, int, error) {
	if m.user != nil {
		return []models.User{*m.user}, 1, nil
	}
	return nil, 0, nil
}

func (m *mockUserRepo) Create(ctx context.Context, user models.User) (*models.User, error) {
	m.user = &user
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

func (m *mockUserRepo) GetUserTrends(ctx context.Context, userID int64, months int) (*models.TrendData, error) {
	return nil, nil
}

func (m *mockUserRepo) GetUsersForNotification(ctx context.Context) ([]models.UserForNotification, error) {
	return nil, nil
}

func setupTestRouter() (*gin.Engine, *UsersHandler, *mockUsersStore) {
	gin.SetMode(gin.TestMode)
	user := &models.User{
		ID:                           123,
		Email:                        "test@example.com",
		Role:                         "user",
		ConsentPersonalData:          true,
		ConsentResearchParticipation: true,
		ConsentEmailUpdates:          true,
		ConsentAnalytics:             true,
	}
	mockUserRepo := &mockUserRepo{user: user}
	mockStore := &mockUsersStore{user: mockUserRepo}
	handler := NewUsersHandler(mockStore)

	router := gin.New()
	// No global user claim here so AuthRequired tests can fail as expected

	return router, handler, mockStore
}

func TestUsersHandler_GetUserProfile_Success(t *testing.T) {
	router, handler, _ := setupTestRouter()
	group := router.Group("/api/v1")
	group.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "test@example.com",
			Role:   "user",
		})
	})
	handler.Register(group)

	req, _ := http.NewRequest("GET", "/api/v1/profile", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")

	var response models.UserProfile
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, int64(123), response.User.ID)
	assert.Equal(t, "test@example.com", response.User.Email)
}

func TestUsersHandler_GetUserProfile_AuthRequired(t *testing.T) {
	router, handler, _ := setupTestRouter()
	// No middleware here, so it should fail
	handler.Register(router.Group("/api/v1"))

	req, _ := http.NewRequest("GET", "/api/v1/profile", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "authentication required")
}

func TestUsersHandler_UpdateUserProfile_Success(t *testing.T) {
	router, handler, _ := setupTestRouter()
	group := router.Group("/api/v1")
	group.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "test@example.com",
			Role:   "user",
		})
	})
	handler.Register(group)

	body := `{"first_name":"Jane","last_name":"Doe","assessment_frequency_months":6}`
	req, _ := http.NewRequest("PUT", "/api/v1/profile", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.User
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, "Jane", response.FirstName)
	assert.Equal(t, "Doe", response.LastName)
	assert.Equal(t, 6, response.AssessmentFrequencyMonths)
}

func TestUsersHandler_CompleteOnboarding_Success(t *testing.T) {
	router, handler, _ := setupTestRouter()
	group := router.Group("/api/v1")
	group.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "test@example.com",
			Role:   "user",
		})
	})
	handler.Register(group)

	body := `{
		"first_name": "Test",
		"last_name": "User",
		"consent_personal_data": true,
		"consent_research_participation": true,
		"consent_email_updates": true,
		"consent_analytics": true,
		"date_of_birth": "1990-01-01",
		"menopause_status": "post",
		"years_menopause": 10,
		"assessment_frequency_months": 3
	}`

	req, _ := http.NewRequest("POST", "/api/v1/onboarding", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, "onboarding completed", response["status"])
}

func TestUsersHandler_CompleteOnboarding_MissingConsent(t *testing.T) {
	router, handler, _ := setupTestRouter()
	group := router.Group("/api/v1")
	group.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "test@example.com",
			Role:   "user",
		})
	})
	handler.Register(group)

	body := `{
		"first_name": "Test",
		"last_name": "User",
		"date_of_birth": "1990-01-01",
		"menopause_status": "post",
		"years_menopause": 10,
		"assessment_frequency_months": 3
	}`

	req, _ := http.NewRequest("POST", "/api/v1/onboarding", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "consent to personal data usage is required")
}

func TestUsersHandler_GetConsentSettings_Success(t *testing.T) {
	router, handler, _ := setupTestRouter()
	group := router.Group("/api/v1")
	group.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "test@example.com",
			Role:   "user",
		})
	})
	handler.Register(group)

	req, _ := http.NewRequest("GET", "/api/v1/consent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.ConsentSettings
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.True(t, response.ConsentPersonalData)
	assert.True(t, response.ConsentResearchParticipation)
	assert.True(t, response.ConsentEmailUpdates)
	assert.True(t, response.ConsentAnalytics)
}

func TestUsersHandler_GetConsentSettings_AuthRequired(t *testing.T) {
	router, handler, _ := setupTestRouter()
	handler.Register(router.Group("/api/v1"))

	req, _ := http.NewRequest("GET", "/api/v1/consent", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "authentication required")
}

func TestUsersHandler_UpdateConsentSettings_Success(t *testing.T) {
	router, handler, _ := setupTestRouter()
	group := router.Group("/api/v1")
	group.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "test@example.com",
			Role:   "user",
		})
	})
	handler.Register(group)

	body := `{
		"consent_personal_data": false,
		"consent_research_participation": true,
		"consent_email_updates": true,
		"consent_analytics": false
	}`

	req, _ := http.NewRequest("PUT", "/api/v1/consent", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.ConsentSettings
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.False(t, response.ConsentPersonalData)
	assert.True(t, response.ConsentResearchParticipation)
	assert.True(t, response.ConsentEmailUpdates)
	assert.False(t, response.ConsentAnalytics)
}

func TestUsersHandler_DeleteAccount_Success(t *testing.T) {
	router, handler, _ := setupTestRouter()
	group := router.Group("/api/v1")
	group.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 123,
			Email:  "test@example.com",
			Role:   "user",
		})
	})
	handler.Register(group)

	req, _ := http.NewRequest("DELETE", "/api/v1/account", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.NewDecoder(w.Body).Decode(&response)
	assert.NoError(t, err)
	assert.Equal(t, "account deleted", response["status"])
}

func TestUsersHandler_DeleteAccount_AuthRequired(t *testing.T) {
	router, handler, _ := setupTestRouter()
	handler.Register(router.Group("/api/v1"))

	req, _ := http.NewRequest("DELETE", "/api/v1/account", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "authentication required")
}
