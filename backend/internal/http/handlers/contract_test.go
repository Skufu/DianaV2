// Package handlers provides API contract tests for the DIANA backend.
// These tests verify that the API responses match the expected contract
// between frontend and backend, catching breaking changes automatically.
//
// Contract tests cover:
// - Response shape validation (required fields, types)
// - Status codes for various scenarios
// - Error response format consistency
// - Pagination response structure
//
// These tests are designed to run in CI to prevent breaking API changes.
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"

	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// =============================================================================
// CONTRACT DEFINITIONS
// =============================================================================

// AuthResponseContract defines the expected response shape for auth endpoints.
// This contract is used by frontend api.js loginApi and registerApi.
type AuthResponseContract struct {
	Message      string `json:"message"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID    int64  `json:"id"`
		Email string `json:"email"`
		Role  string `json:"role"`
	} `json:"user"`
}

// AssessmentContract defines the expected response shape for assessment endpoints.
// This contract is used by frontend api.js createAssessmentApi, getAssessmentsApi.
type AssessmentContract struct {
	ID                  int64          `json:"id"`
	UserID              int64          `json:"user_id"`
	RiskLevel           string         `json:"risk_level,omitempty"`
	RiskScore           int            `json:"risk_score,omitempty"`
	RiskLabel           string         `json:"risk_label,omitempty"`
	Cluster             string         `json:"cluster,omitempty"`
	ClusterDescription  string         `json:"cluster_description,omitempty"`
	TreatmentFocus      string         `json:"treatment_focus,omitempty"`
	ModelVersion        string         `json:"model_version,omitempty"`
	DatasetHash         string         `json:"dataset_hash,omitempty"`
	ValidationStatus    string         `json:"validation_status,omitempty"`
	FBS                 float64        `json:"fbs,omitempty"`
	HbA1c               float64        `json:"hba1c,omitempty"`
	Cholesterol         int            `json:"cholesterol,omitempty"`
	LDL                 int            `json:"ldl,omitempty"`
	HDL                 int            `json:"hdl,omitempty"`
	Triglycerides       int            `json:"triglycerides,omitempty"`
	Systolic            int            `json:"systolic,omitempty"`
	Diastolic           int            `json:"diastolic,omitempty"`
	WaistCircumference  float64        `json:"waist_circumference,omitempty"`
	BMI                 float64        `json:"bmi,omitempty"`
	Age                 int            `json:"age,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	FeatureSet          map[string]any `json:"feature_set,omitempty"`
	ClusterCapability   map[string]any `json:"cluster_capability,omitempty"`
	OutputCapabilities  map[string]any `json:"output_capabilities,omitempty"`
	DriftBaseline       map[string]any `json:"drift_baseline,omitempty"`
}

// APIErrorContract defines the standardized error response format.
// This contract is used across all API endpoints for error responses.
type APIErrorContract struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// ConsentSettingsContract defines the consent settings response shape.
type ConsentSettingsContract struct {
	ConsentPersonalData          bool `json:"consent_personal_data"`
	ConsentResearchParticipation bool `json:"consent_research_participation"`
	ConsentEmailUpdates          bool `json:"consent_email_updates"`
	ConsentAnalytics             bool `json:"consent_analytics"`
}

// AdminDashboardContract defines the admin dashboard response shape.
type AdminDashboardContract struct {
	TotalUsers           int     `json:"total_users"`
	TotalPatients        int     `json:"total_patients"`
	TotalAssessments     int     `json:"total_assessments"`
	TotalClinics         int     `json:"total_clinics"`
	AvgRiskScore         float64 `json:"avg_risk_score"`
	HighRiskCount        int     `json:"high_risk_count"`
	AssessmentsThisMonth int     `json:"assessments_this_month"`
	NewUsersThisMonth    int     `json:"new_users_this_month"`
}

// =============================================================================
// CONTRACT TEST UTILITIES
// =============================================================================

// contractTestStore implements store.Store for contract testing
type contractTestStore struct {
	user         *contractUserRepo
	assessment   *contractAssessmentRepo
	refreshToken *contractRefreshTokenRepo
}

func newContractTestStore() *contractTestStore {
	return &contractTestStore{
		user:         newContractUserRepo(),
		assessment:   newContractAssessmentRepo(),
		refreshToken: newContractRefreshTokenRepo(),
	}
}

func (m *contractTestStore) Users() store.UserRepository               { return m.user }
func (m *contractTestStore) Patients() store.PatientRepository         { return nil }
func (m *contractTestStore) Assessments() store.AssessmentRepository   { return m.assessment }
func (m *contractTestStore) RefreshTokens() store.RefreshTokenRepository { return m.refreshToken }
func (m *contractTestStore) Cohort() store.CohortRepository            { return nil }
func (m *contractTestStore) Clinics() store.ClinicRepository           { return nil }
func (m *contractTestStore) AuditEvents() store.AuditEventRepository   { return nil }
func (m *contractTestStore) ModelRuns() store.ModelRunRepository       { return nil }
func (m *contractTestStore) Close()                                    {}
func (m *contractTestStore) Ping(ctx context.Context) error            { return nil }

func (m *contractTestStore) BeginTx(ctx context.Context) (store.TxStore, error) {
	// Return self as TxStore for contract tests (no actual transaction needed)
	return &contractTxStore{contractTestStore: m}, nil
}

// contractTxStore wraps contractTestStore to implement TxStore
type contractTxStore struct {
	*contractTestStore
}

func (m *contractTxStore) Commit(ctx context.Context) error   { return nil }
func (m *contractTxStore) Rollback(ctx context.Context) error { return nil }
func (m *contractTxStore) Ping(ctx context.Context) error     { return nil }

type contractUserRepo struct {
	users map[int64]*models.User
}

func newContractUserRepo() *contractUserRepo {
	return &contractUserRepo{
		users: map[int64]*models.User{
			1: {
				ID:            1,
				Email:         "fixture@example.test",
				PasswordHash:  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.rsQ5pPjZ5yVlWK5WAe", // "password123"
				Role:          models.RoleUser,
				IsActive:      true,
				AccountStatus: "active",
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			},
		},
	}
}

func (m *contractUserRepo) FindByID(ctx context.Context, id int32) (*models.User, error) {
	if user, ok := m.users[int64(id)]; ok {
		return user, nil
	}
	return nil, fmt.Errorf("user not found")
}

func (m *contractUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (m *contractUserRepo) Create(ctx context.Context, user models.User) (*models.User, error) {
	user.ID = int64(len(m.users) + 1)
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	m.users[user.ID] = &user
	return &user, nil
}

func (m *contractUserRepo) GetUserByID(ctx context.Context, id int32) (*models.User, error) {
	return m.FindByID(ctx, id)
}

func (m *contractUserRepo) Update(ctx context.Context, user models.User) (*models.User, error) {
	if _, ok := m.users[user.ID]; ok {
		m.users[user.ID] = &user
		return &user, nil
	}
	return nil, fmt.Errorf("user not found")
}

func (m *contractUserRepo) UpdateUser(ctx context.Context, user models.User) (*models.User, error) {
	return m.Update(ctx, user)
}

func (m *contractUserRepo) UpdateLastLogin(ctx context.Context, id int32) error { return nil }
func (m *contractUserRepo) UpdateUserOnboarding(ctx context.Context, id int64, completed bool) error {
	return nil
}
func (m *contractUserRepo) UpdateUserConsent(ctx context.Context, id int64, consent models.ConsentSettings) error {
	return nil
}
func (m *contractUserRepo) GetLatestAssessmentByUser(ctx context.Context, id int64) (*models.Assessment, error) {
	return nil, nil
}
func (m *contractUserRepo) GetAssessmentCountByUser(ctx context.Context, id int64) (int, error) {
	return 0, nil
}
func (m *contractUserRepo) GetUserTrends(ctx context.Context, id int64, months int) (*models.TrendData, error) {
	return &models.TrendData{}, nil
}
func (m *contractUserRepo) SoftDeleteUser(ctx context.Context, id int64) error { return nil }
func (m *contractUserRepo) List(ctx context.Context, params models.UserListParams) ([]models.User, int, error) {
	return nil, 0, nil
}
func (m *contractUserRepo) Deactivate(ctx context.Context, id int32) error { return nil }
func (m *contractUserRepo) Activate(ctx context.Context, id int32) error   { return nil }
func (m *contractUserRepo) GetUsersForNotification(ctx context.Context) ([]models.UserForNotification, error) {
	return nil, nil
}

type contractAssessmentRepo struct{}

func newContractAssessmentRepo() *contractAssessmentRepo { return &contractAssessmentRepo{} }

func (m *contractAssessmentRepo) Create(ctx context.Context, assessment models.Assessment) (*models.Assessment, error) {
	assessment.ID = 1
	assessment.CreatedAt = time.Now()
	assessment.UpdatedAt = time.Now()
	return &assessment, nil
}
func (m *contractAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	return nil, fmt.Errorf("not found")
}
func (m *contractAssessmentRepo) Update(ctx context.Context, assessment models.Assessment) (*models.Assessment, error) {
	return &assessment, nil
}
func (m *contractAssessmentRepo) Delete(ctx context.Context, id int32) error { return nil }
func (m *contractAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	return nil, nil
}
func (m *contractAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}
func (m *contractAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	return nil, 0, nil
}
func (m *contractAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	return nil, nil
}
func (m *contractAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	return nil, nil
}
func (m *contractAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}
func (m *contractAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	return nil, nil
}
func (m *contractAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}
func (m *contractAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	return nil, nil
}

type contractRefreshTokenRepo struct{}

func newContractRefreshTokenRepo() *contractRefreshTokenRepo { return &contractRefreshTokenRepo{} }

func (m *contractRefreshTokenRepo) CreateRefreshToken(ctx context.Context, tokenHash string, userID int32, expiresAt time.Time) (*models.RefreshToken, error) {
	return &models.RefreshToken{ID: 1, UserID: int64(userID), TokenHash: tokenHash, ExpiresAt: expiresAt}, nil
}
func (m *contractRefreshTokenRepo) FindRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error) {
	return nil, fmt.Errorf("not found")
}
func (m *contractRefreshTokenRepo) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	return nil
}
func (m *contractRefreshTokenRepo) RevokeAllUserTokens(ctx context.Context, userID int32) error {
	return nil
}
func (m *contractRefreshTokenRepo) DeleteExpiredTokens(ctx context.Context) error {
	return nil
}

// setupContractTestRouter creates a test router with mock dependencies for contract testing.
func setupContractTestRouter() (*gin.Engine, *contractTestStore) {
	gin.SetMode(gin.TestMode)

	mockStore := newContractTestStore()
	// Don't use cache for contract tests - nil cache is handled gracefully by handlers

	cfg := config.Config{
		JWTSecret:    "test-secret-key-for-contract-tests",
		Env:          "test",
		ModelVersion: "binary_v2_no_bp",
		DatasetHash:  "test-hash",
		ClinicalThresholds: config.ClinicalThresholds{
			HbA1cNormal:      5.7,
			HbA1cPrediabetic: 6.5,
			HbA1cDiabetic:    6.5,
			FBSNormal:        100,
			FBSPrediabetic:   100,
			FBSDiabetic:      126,
		},
	}

	r := gin.New()

	api := r.Group("/api/v1")

	// Health endpoint
	RegisterHealth(api)

	// Auth endpoints
	authGroup := api.Group("/auth")
	authHandler := NewAuthHandler(cfg, mockStore, nil)
	authHandler.Register(authGroup)

	// Protected endpoints
	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret, mockStore.Users()))

	userGroup := protected.Group("/users/me")
	usersHandler := NewUsersHandler(mockStore, nil) // nil cache handled gracefully
	usersHandler.Register(userGroup)

	predictor := ml.NewMockPredictor()
	assessmentsHandler := NewAssessmentsHandler(mockStore, predictor, nil, cfg.ModelVersion, cfg.DatasetHash, cfg.ClinicalThresholds)
	assessmentsHandler.Register(userGroup.Group("/assessments"), nil)

	admin := protected.Group("/admin")
	admin.Use(middleware.RoleRequired(models.RoleAdmin))
	adminDashboardHandler := NewAdminDashboardHandler(mockStore)
	adminDashboardHandler.Register(admin)

	return r, mockStore
}

// generateTestToken creates a valid JWT token for testing
func generateTestToken(userID int64, email, role string) string {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":     email,
		"user_id": userID,
		"role":    role,
		"exp":     now.Add(15 * time.Minute).Unix(),
		"iat":     now.Unix(),
		"scope":   "diana",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte("test-secret-key-for-contract-tests"))
	return signed
}

// =============================================================================
// CONTRACT TESTS - ERROR FORMAT
// =============================================================================

func TestContract_ErrorResponseFormat(t *testing.T) {
	// Test all error helper functions produce consistent format
	t.Run("ErrUnauthorized", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		ErrUnauthorized(c)

		var body map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse: %v", err)
		}

		assert.Equal(t, "UNAUTHORIZED", body["code"], "error code should be UNAUTHORIZED")
		assert.Equal(t, "Authentication required", body["message"], "message should match")
	})

	t.Run("ErrBadRequest", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		ErrBadRequest(c, "Invalid input")

		var body map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse: %v", err)
		}

		assert.Equal(t, "BAD_REQUEST", body["code"], "error code should be BAD_REQUEST")
		assert.Equal(t, "Invalid input", body["message"], "message should match")
	})

	t.Run("ErrNotFound", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		ErrNotFound(c, "Assessment")

		var body map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse: %v", err)
		}

		assert.Equal(t, "NOT_FOUND", body["code"], "error code should be NOT_FOUND")
		assert.Equal(t, "Assessment not found", body["message"], "message should include resource name")
	})

	t.Run("ErrInternal", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		ErrInternal(c, "Database error")

		var body map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse: %v", err)
		}

		assert.Equal(t, "INTERNAL_ERROR", body["code"], "error code should be INTERNAL_ERROR")
		assert.Equal(t, "Database error", body["message"], "message should match")
	})

	t.Run("ErrForbidden", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		ErrForbidden(c)

		var body map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse: %v", err)
		}

		assert.Equal(t, "FORBIDDEN", body["code"], "error code should be FORBIDDEN")
	})

	t.Run("ErrValidation", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		ErrValidation(c, map[string]string{"email": "Invalid email"})

		var body map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse: %v", err)
		}

		assert.Equal(t, "VALIDATION_ERROR", body["code"], "error code should be VALIDATION_ERROR")
		assert.NotNil(t, body["details"], "validation error should have details")
	})
}

// =============================================================================
// CONTRACT TESTS - HEALTH ENDPOINT
// =============================================================================

func TestContract_HealthEndpoint(t *testing.T) {
	router, _ := setupContractTestRouter()

	req := httptest.NewRequest("GET", "/api/v1/healthz", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "health endpoint should return 200")

	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	assert.Equal(t, "ok", body["status"], "health status should be 'ok'")
}

// =============================================================================
// CONTRACT TESTS - AUTH ENDPOINTS
// =============================================================================

func TestContract_AuthLoginResponse(t *testing.T) {
	router, mockStore := setupContractTestRouter()

	// Create a test user with known password (bcrypt hash for "password123")
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	mockStore.user.users[1].PasswordHash = string(hashedPassword)

	tests := []struct {
		name           string
		payload        string
		expectStatus   int
		validateFields func(t *testing.T, body map[string]any)
	}{
		{
			name:         "successful login returns complete auth response",
			payload:      `{"email":"fixture@example.test","password":"password123"}`,
			expectStatus: http.StatusOK,
			validateFields: func(t *testing.T, body map[string]any) {
				// Verify all required fields exist
				requiredFields := []string{"message", "access_token", "refresh_token", "user"}
				for _, field := range requiredFields {
					assert.Contains(t, body, field, "login response should have '%s'", field)
				}

				// Verify user object structure
				user, ok := body["user"].(map[string]any)
				assert.True(t, ok, "user field should be an object")

				userFields := []string{"id", "email", "role"}
				for _, field := range userFields {
					assert.Contains(t, user, field, "user object should have '%s'", field)
				}

				// Verify types
				assert.IsType(t, "", body["access_token"], "access_token should be string")
				assert.IsType(t, "", body["refresh_token"], "refresh_token should be string")
				assert.IsType(t, float64(0), user["id"], "user.id should be number")
			},
		},
		{
			name:         "invalid credentials returns proper error format",
			payload:      `{"email":"fixture@example.test","password":"wrongpassword"}`,
			expectStatus: http.StatusUnauthorized,
			validateFields: func(t *testing.T, body map[string]any) {
				// Verify error response uses APIError format
				assert.Contains(t, body, "code", "error response should have 'code'")
				assert.Contains(t, body, "message", "error response should have 'message'")
				assert.Equal(t, "INVALID_CREDENTIALS", body["code"], "error code should be INVALID_CREDENTIALS")
			},
		},
		{
			name:         "missing email returns validation error",
			payload:      `{"email":"","password":"password123"}`,
			expectStatus: http.StatusBadRequest,
			validateFields: func(t *testing.T, body map[string]any) {
				assert.Equal(t, "VALIDATION_ERROR", body["code"], "should be validation error")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectStatus, w.Code, "status code should match expected")

			var body map[string]any
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatalf("failed to parse response body: %v", err)
			}

			tt.validateFields(t, body)
		})
	}
}

func TestContract_AuthRegisterResponse(t *testing.T) {
	router, _ := setupContractTestRouter()

	tests := []struct {
		name           string
		payload        string
		expectStatus   int
		validateFields func(t *testing.T, body map[string]any)
	}{
		{
			name:         "successful registration returns auth response",
			payload:      `{"email":"newuser@example.test","password":"Testpassword123"}`,
			expectStatus: http.StatusCreated,
			validateFields: func(t *testing.T, body map[string]any) {
				// Same structure as login
				requiredFields := []string{"message", "access_token", "refresh_token", "user"}
				for _, field := range requiredFields {
					assert.Contains(t, body, field, "register response should have '%s'", field)
				}

				user, _ := body["user"].(map[string]any)
				// Default role should be 'user'
				assert.Equal(t, models.RoleUser, user["role"], "new user should have role 'user'")
			},
		},
		{
			name:         "weak password returns validation error",
			payload:      `{"email":"fixture-user-2","password":"weak"}`,
			expectStatus: http.StatusBadRequest,
			validateFields: func(t *testing.T, body map[string]any) {
				assert.Equal(t, "VALIDATION_ERROR", body["code"], "should be validation error")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/v1/auth/register", strings.NewReader(tt.payload))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectStatus, w.Code, "status code should match expected")

			var body map[string]any
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatalf("failed to parse response body: %v", err)
			}

			tt.validateFields(t, body)
		})
	}
}

// =============================================================================
// CONTRACT TESTS - USER ENDPOINTS
// =============================================================================

func TestContract_UserProfileResponse(t *testing.T) {
	router, _ := setupContractTestRouter()

	token := generateTestToken(1, "fixture-user", models.RoleUser)

	req := httptest.NewRequest("GET", "/api/v1/users/me/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "profile endpoint should return 200")

	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	// Verify required fields
	requiredFields := []string{
		"id", "email", "onboarding_completed", "is_active", "is_admin", "role",
		"assessment_count",
	}
	for _, field := range requiredFields {
		assert.Contains(t, body, field, "profile response should have '%s'", field)
	}

	// Note: latest_assessment and current_risk_level are only added when user has assessments
	// These are optional fields that may not be present if assessment_count is 0
}

func TestContract_ConsentSettingsResponse(t *testing.T) {
	router, _ := setupContractTestRouter()

	token := generateTestToken(1, "fixture-user", models.RoleUser)

	req := httptest.NewRequest("GET", "/api/v1/users/me/consent", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "consent endpoint should return 200")

	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	// Verify all consent fields are boolean
	consentFields := []string{
		"consent_personal_data",
		"consent_research_participation",
		"consent_email_updates",
		"consent_analytics",
	}
	for _, field := range consentFields {
		assert.Contains(t, body, field, "consent response should have '%s'", field)
		assert.IsType(t, false, body[field], "consent field '%s' should be boolean", field)
	}
}

// =============================================================================
// CONTRACT TESTS - ASSESSMENT ENDPOINTS
// =============================================================================

func TestContract_AssessmentCreateResponse(t *testing.T) {
	router, _ := setupContractTestRouter()

	token := generateTestToken(1, "fixture-user", models.RoleUser)

	// Valid assessment payload matching frontend AssessmentForm
	payload := `{
		"fbs": 95.0,
		"hba1c": 5.8,
		"cholesterol": 180,
		"ldl": 100,
		"hdl": 50,
		"triglycerides": 120,
		"systolic": 120,
		"diastolic": 80,
		"waist_circumference": 85.0,
		"bmi": 24.5,
		"age": 50,
		"model_type": "binary_v2_no_bp"
	}`

	req := httptest.NewRequest("POST", "/api/v1/users/me/assessments", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// Should return 201 Created
	assert.Equal(t, http.StatusCreated, w.Code, "assessment creation should return 201")

	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	// Verify required fields for frontend display
	requiredFields := []string{
		"id", "user_id", "risk_score", "risk_level", "risk_label",
		"cluster", "model_version", "created_at",
	}
	for _, field := range requiredFields {
		assert.Contains(t, body, field, "assessment response should have '%s'", field)
	}

	// Verify biomarker fields are returned
	biomarkerFields := []string{
		"fbs", "hba1c", "cholesterol", "ldl", "hdl", "triglycerides",
		"systolic", "diastolic", "waist_circumference", "bmi", "age",
	}
	for _, field := range biomarkerFields {
		assert.Contains(t, body, field, "assessment response should have biomarker '%s'", field)
	}

	// Verify ML result fields
	mlFields := []string{
		"cluster", "risk_score", "risk_level", "risk_label",
		"model_version", "dataset_hash",
	}
	for _, field := range mlFields {
		assert.Contains(t, body, field, "assessment response should have ML field '%s'", field)
	}

	// Verify capability contract fields
	capabilityFields := []string{
		"feature_set", "cluster_capability", "output_capabilities", "drift_baseline",
	}
	for _, field := range capabilityFields {
		assert.Contains(t, body, field, "assessment response should have capability field '%s'", field)
	}
}

func TestContract_AssessmentListResponse(t *testing.T) {
	router, _ := setupContractTestRouter()

	token := generateTestToken(1, "fixture-user", models.RoleUser)

	req := httptest.NewRequest("GET", "/api/v1/users/me/assessments", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "assessment list should return 200")

	// Response should be an array
	var body []map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("expected array response, got: %v", err)
	}

	// Empty array is valid
	// If not empty, verify structure
	if len(body) > 0 {
		// Check first item has required fields
		requiredFields := []string{"id", "user_id", "created_at"}
		for _, field := range requiredFields {
			assert.Contains(t, body[0], field, "assessment item should have '%s'", field)
		}
	}
}

func TestContract_AssessmentValidationErrorResponse(t *testing.T) {
	router, _ := setupContractTestRouter()

	token := generateTestToken(1, "fixture-user", models.RoleUser)

	// Invalid age (outside 45-60 range)
	payload := `{
		"age": 30,
		"bmi": 24.5
	}`

	req := httptest.NewRequest("POST", "/api/v1/users/me/assessments", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "invalid assessment should return 400")

	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	// Should use standard error format
	assert.Contains(t, body, "code", "error response should have 'code'")
	assert.Contains(t, body, "message", "error response should have 'message'")
}

// =============================================================================
// CONTRACT TESTS - ROLE-BASED ACCESS
// =============================================================================

func TestContract_RoleBasedAccess(t *testing.T) {
	router, _ := setupContractTestRouter()

	tests := []struct {
		name         string
		role         string
		endpoint     string
		expectStatus int
	}{
		{
			name:         "user cannot access admin dashboard",
			role:         models.RoleUser,
			endpoint:     "/api/v1/admin/dashboard",
			expectStatus: http.StatusForbidden,
		},
		{
			name:         "user can access own profile",
			role:         models.RoleUser,
			endpoint:     "/api/v1/users/me/profile",
			expectStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := generateTestToken(1, "fixture-user", tt.role)

			req := httptest.NewRequest("GET", tt.endpoint, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectStatus, w.Code, "status should match expected for role %s", tt.role)
		})
	}
}

// =============================================================================
// CONTRACT TESTS - PAGINATION
// =============================================================================

func TestContract_PaginationHelper(t *testing.T) {
	t.Run("ParsePagination defaults", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test", nil)

		params := ParsePagination(c)

		assert.Equal(t, 1, params.Page, "default page should be 1")
		assert.Equal(t, 20, params.PageSize, "default page_size should be 20")
		assert.Equal(t, 0, params.Offset, "offset should be 0 for page 1")
	})

	t.Run("ParsePagination custom values", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test?page=2&page_size=50", nil)

		params := ParsePagination(c)

		assert.Equal(t, 2, params.Page, "page should be 2")
		assert.Equal(t, 50, params.PageSize, "page_size should be 50")
		assert.Equal(t, 50, params.Offset, "offset should be 50 for page 2")
	})

	t.Run("ParsePagination max limit", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test?page_size=200", nil)

		params := ParsePagination(c)

		assert.Equal(t, 100, params.PageSize, "page_size should be capped at 100")
	})

	t.Run("NewPaginatedResponse structure", func(t *testing.T) {
		data := []string{"item1", "item2"}
		params := PaginationParams{Page: 1, PageSize: 20}
		totalItems := 45

		resp := NewPaginatedResponse(data, params, totalItems)

		assert.Equal(t, data, resp.Data, "data should match")
		assert.Equal(t, 1, resp.Pagination.Page, "page should be 1")
		assert.Equal(t, 20, resp.Pagination.PageSize, "page_size should be 20")
		assert.Equal(t, 45, resp.Pagination.TotalItems, "total_items should be 45")
		assert.Equal(t, 3, resp.Pagination.TotalPages, "total_pages should be 3")
	})
}
