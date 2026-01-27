package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type fakeUserRepoAuth struct {
	usersByEmail map[string]*models.User
	usersByID    map[int32]*models.User
}

func (f *fakeUserRepoAuth) FindByEmail(_ context.Context, email string) (*models.User, error) {
	if f.usersByEmail == nil {
		return nil, errors.New("user not found")
	}
	if user, ok := f.usersByEmail[email]; ok {
		return user, nil
	}
	return nil, errors.New("user not found")
}

func (f *fakeUserRepoAuth) FindByID(_ context.Context, id int32) (*models.User, error) {
	if f.usersByID == nil {
		return nil, errors.New("user not found")
	}
	if user, ok := f.usersByID[id]; ok {
		return user, nil
	}
	return nil, errors.New("user not found")
}

func (f *fakeUserRepoAuth) GetUserByID(_ context.Context, id int32) (*models.User, error) {
	if f.usersByID == nil {
		return nil, errors.New("user not found")
	}
	if user, ok := f.usersByID[id]; ok {
		return user, nil
	}
	return nil, errors.New("user not found")
}

func (f *fakeUserRepoAuth) List(_ context.Context, _ models.UserListParams) ([]models.User, int, error) {
	return nil, 0, nil
}

func (f *fakeUserRepoAuth) Create(_ context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (f *fakeUserRepoAuth) Update(_ context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (f *fakeUserRepoAuth) UpdateUser(_ context.Context, user models.User) (*models.User, error) {
	return &user, nil
}

func (f *fakeUserRepoAuth) Deactivate(_ context.Context, _ int32) error {
	return nil
}

func (f *fakeUserRepoAuth) Activate(_ context.Context, _ int32) error {
	return nil
}

func (f *fakeUserRepoAuth) UpdateLastLogin(_ context.Context, _ int32) error {
	return nil
}

func (f *fakeUserRepoAuth) GetLatestAssessmentByUser(_ context.Context, _ int64) (*models.Assessment, error) {
	return nil, nil
}

func (f *fakeUserRepoAuth) GetAssessmentCountByUser(_ context.Context, _ int64) (int, error) {
	return 0, nil
}

func (f *fakeUserRepoAuth) GetUserTrends(_ context.Context, _ int64, _ int) (*models.TrendData, error) {
	return nil, nil
}

func (f *fakeUserRepoAuth) SoftDeleteUser(_ context.Context, _ int64) error {
	return nil
}

func (f *fakeUserRepoAuth) UpdateUserOnboarding(_ context.Context, _ int64, _ bool) error {
	return nil
}

func (f *fakeUserRepoAuth) UpdateUserConsent(_ context.Context, _ int64, _ models.ConsentSettings) error {
	return nil
}

func (f *fakeUserRepoAuth) GetUsersForNotification(_ context.Context) ([]models.UserForNotification, error) {
	return nil, nil
}

type fakeRefreshTokenRepoAuth struct {
	tokensByHash map[string]*models.RefreshToken
}

func (f *fakeRefreshTokenRepoAuth) CreateRefreshToken(_ context.Context, hash string, userID int32, expiresAt time.Time) (*models.RefreshToken, error) {
	token := &models.RefreshToken{
		TokenHash: hash,
		UserID:    int64(userID),
		ExpiresAt: expiresAt,
		Revoked:   false,
	}
	if f.tokensByHash == nil {
		f.tokensByHash = make(map[string]*models.RefreshToken)
	}
	f.tokensByHash[hash] = token
	return token, nil
}

func (f *fakeRefreshTokenRepoAuth) FindRefreshToken(_ context.Context, hash string) (*models.RefreshToken, error) {
	if f.tokensByHash == nil {
		return nil, errors.New("token not found")
	}
	if token, ok := f.tokensByHash[hash]; ok {
		return token, nil
	}
	return nil, errors.New("token not found")
}

func (f *fakeRefreshTokenRepoAuth) RevokeRefreshToken(_ context.Context, hash string) error {
	if f.tokensByHash != nil {
		if token := f.tokensByHash[hash]; token != nil {
			token.Revoked = true
		}
	}
	return nil
}

func (f *fakeRefreshTokenRepoAuth) RevokeAllUserTokens(_ context.Context, _ int32) error {
	return nil
}

func (f *fakeRefreshTokenRepoAuth) DeleteExpiredTokens(_ context.Context) error {
	return nil
}

type fakeStoreAuth struct {
	userRepo         *fakeUserRepoAuth
	refreshTokenRepo *fakeRefreshTokenRepoAuth
}

func (f *fakeStoreAuth) Users() store.UserRepository {
	return f.userRepo
}

func (f *fakeStoreAuth) Patients() store.PatientRepository {
	return &fakePatientRepo{}
}

func (f *fakeStoreAuth) Assessments() store.AssessmentRepository {
	return &fakeAssessmentRepo{}
}

func (f *fakeStoreAuth) RefreshTokens() store.RefreshTokenRepository {
	return f.refreshTokenRepo
}

func (f *fakeStoreAuth) Cohort() store.CohortRepository {
	return nil
}

func (f *fakeStoreAuth) Clinics() store.ClinicRepository {
	return nil
}

func (f *fakeStoreAuth) AuditEvents() store.AuditEventRepository {
	return nil
}

func (f *fakeStoreAuth) ModelRuns() store.ModelRunRepository {
	return nil
}

func (f *fakeStoreAuth) Close() {}

func TestAuthHandler_Login_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	userID := int32(1)
	user := models.User{
		ID:           int64(userID),
		Email:        "test@example.com",
		PasswordHash: string(hashedPassword),
		Role:         "clinician",
	}

	fakeStoreAuth := &fakeStoreAuth{
		userRepo: &fakeUserRepoAuth{
			usersByEmail: map[string]*models.User{user.Email: &user},
			usersByID:    map[int32]*models.User{userID: &user},
		},
		refreshTokenRepo: &fakeRefreshTokenRepoAuth{},
	}

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, fakeStoreAuth, nil)

	r := gin.New()
	r.POST("/login", h.login)

	body := `{"email":"test@example.com","password":"password123"}`
	req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]any
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["message"] != "login successful" {
		t.Fatalf("expected 'login successful' message, got %v", response["message"])
	}

	cookies := w.Result().Cookies()
	var dianaTokenCookie, dianaRefreshTokenCookie *http.Cookie
	for _, cookie := range cookies {
		if cookie.Name == "diana_token" {
			dianaTokenCookie = cookie
		}
		if cookie.Name == "diana_refresh_token" {
			dianaRefreshTokenCookie = cookie
		}
	}

	if dianaTokenCookie == nil {
		t.Fatal("expected diana_token cookie")
	}
	if dianaRefreshTokenCookie == nil {
		t.Fatal("expected diana_refresh_token cookie")
	}

	if !dianaTokenCookie.HttpOnly {
		t.Error("expected diana_token cookie to be HttpOnly")
	}
	if !dianaRefreshTokenCookie.HttpOnly {
		t.Error("expected diana_refresh_token cookie to be HttpOnly")
	}

	if dianaTokenCookie.Secure != true {
		t.Error("expected diana_token cookie to be Secure")
	}
	if dianaRefreshTokenCookie.Secure != true {
		t.Error("expected diana_refresh_token cookie to be Secure")
	}

	if dianaTokenCookie.SameSite != http.SameSiteStrictMode {
		t.Error("expected diana_token cookie to be SameSiteStrict")
	}
	if dianaRefreshTokenCookie.SameSite != http.SameSiteStrictMode {
		t.Error("expected diana_refresh_token cookie to be SameSiteStrict")
	}
}

func TestAuthHandler_Login_InvalidCredentials(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name     string
		email    string
		password string
		setup    *fakeUserRepoAuth
	}{
		{
			name:     "user not found",
			email:    "nonexistent@example.com",
			password: "password123",
			setup:    &fakeUserRepoAuth{},
		},
		{
			name:     "wrong password",
			email:    "test@example.com",
			password: "wrongpassword",
			setup: &fakeUserRepoAuth{
				usersByEmail: map[string]*models.User{
					"test@example.com": {
						ID:           1,
						Email:        "test@example.com",
						PasswordHash: hashedPassword("password123"),
					},
				},
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			fakeStoreAuth := &fakeStoreAuth{
				userRepo:         tc.setup,
				refreshTokenRepo: &fakeRefreshTokenRepoAuth{},
			}

			cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
			h := NewAuthHandler(cfg, fakeStoreAuth, nil)

			r := gin.New()
			r.POST("/login", h.login)

			body := `{"email":"` + tc.email + `","password":"` + tc.password + `"}`
			req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Fatalf("expected status 401, got %d: %s", w.Code, w.Body.String())
			}

			var response map[string]any
			json.Unmarshal(w.Body.Bytes(), &response)
			if response["message"] == nil {
				t.Fatal("expected error in response")
			}
		})
	}
}

func TestAuthHandler_Login_InvalidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, &fakeStoreAuth{}, nil)

	r := gin.New()
	r.POST("/login", h.login)

	tests := []struct {
		name string
		body string
	}{
		{"invalid JSON", "not json"},
		{"missing email", `{"password":"test"}`},
		{"missing password", `{"email":"test@example.com"}`},
		{"empty email", `{"email":"","password":"test"}`},
		{"empty password", `{"email":"test@example.com","password":""}`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest && w.Code != http.StatusUnauthorized {
				t.Fatalf("expected status 400 or 401, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestAuthHandler_Refresh_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	userID := int32(1)
	user := models.User{
		ID:    int64(userID),
		Email: "test@example.com",
		Role:  "clinician",
	}

	refreshTokenHash := hashTokenForTest("valid-refresh-token")
	now := time.Now()
	tokenRecord := models.RefreshToken{
		TokenHash: refreshTokenHash,
		UserID:    int64(user.ID),
		Revoked:   false,
		ExpiresAt: now.Add(7 * 24 * time.Hour),
	}

	fakeStoreAuth := &fakeStoreAuth{
		userRepo: &fakeUserRepoAuth{
			usersByID: map[int32]*models.User{userID: &user},
		},
		refreshTokenRepo: &fakeRefreshTokenRepoAuth{
			tokensByHash: map[string]*models.RefreshToken{refreshTokenHash: &tokenRecord},
		},
	}

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, fakeStoreAuth, nil)

	r := gin.New()
	r.POST("/refresh", h.refresh)

	body := `{"refresh_token":"valid-refresh-token"}`
	req, _ := http.NewRequest("POST", "/refresh", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var response map[string]any
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["message"] == nil {
		t.Fatal("expected message in response")
	}
	if response["user"] == nil {
		t.Fatal("expected user in response")
	}

	cookies := w.Result().Cookies()
	var foundAccessToken, foundRefreshToken bool
	for _, cookie := range cookies {
		if cookie.Name == "diana_token" {
			foundAccessToken = true
			if !cookie.HttpOnly {
				t.Error("expected diana_token cookie to be HttpOnly")
			}
			if !cookie.Secure {
				t.Error("expected diana_token cookie to be Secure")
			}
		}
		if cookie.Name == "diana_refresh_token" {
			foundRefreshToken = true
			if !cookie.HttpOnly {
				t.Error("expected diana_refresh_token cookie to be HttpOnly")
			}
			if !cookie.Secure {
				t.Error("expected diana_refresh_token cookie to be Secure")
			}
		}
	}

	if !foundAccessToken {
		t.Fatal("expected diana_token cookie to be set")
	}
	if !foundRefreshToken {
		t.Fatal("expected diana_refresh_token cookie to be set")
	}

	if !tokenRecord.Revoked {
		t.Fatal("expected old refresh token to be revoked")
	}
}

func TestAuthHandler_Refresh_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name      string
		token     string
		setupRepo *fakeRefreshTokenRepoAuth
	}{
		{
			name:      "missing token",
			token:     "",
			setupRepo: &fakeRefreshTokenRepoAuth{},
		},
		{
			name:      "token not found",
			token:     "nonexistent-token",
			setupRepo: &fakeRefreshTokenRepoAuth{},
		},
		{
			name:  "revoked token",
			token: "revoked-token",
			setupRepo: &fakeRefreshTokenRepoAuth{
				tokensByHash: map[string]*models.RefreshToken{
					hashTokenForTest("revoked-token"): {
						TokenHash: hashTokenForTest("revoked-token"),
						UserID:    1,
						Revoked:   true,
						ExpiresAt: time.Now().Add(1 * time.Hour),
					},
				},
			},
		},
		{
			name:  "expired token",
			token: "expired-token",
			setupRepo: &fakeRefreshTokenRepoAuth{
				tokensByHash: map[string]*models.RefreshToken{
					hashTokenForTest("expired-token"): {
						TokenHash: hashTokenForTest("expired-token"),
						UserID:    1,
						Revoked:   false,
						ExpiresAt: time.Now().Add(-1 * time.Hour),
					},
				},
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			fakeStoreAuth := &fakeStoreAuth{
				userRepo: &fakeUserRepoAuth{
					usersByID: map[int32]*models.User{
						1: {ID: 1, Email: "test@example.com", Role: "clinician"},
					},
				},
				refreshTokenRepo: tc.setupRepo,
			}

			cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
			h := NewAuthHandler(cfg, fakeStoreAuth, nil)

			r := gin.New()
			r.POST("/refresh", h.refresh)

			body := `{"refresh_token":"` + tc.token + `"}`
			req, _ := http.NewRequest("POST", "/refresh", bytes.NewBufferString(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized && w.Code != http.StatusBadRequest {
				t.Fatalf("expected status 400 or 401, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestAuthHandler_Logout_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	refreshTokenHash := hashTokenForTest("token-to-revoke")
	tokenRecord := models.RefreshToken{
		TokenHash: refreshTokenHash,
		UserID:    1,
		Revoked:   false,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}

	fakeStoreAuth := &fakeStoreAuth{
		refreshTokenRepo: &fakeRefreshTokenRepoAuth{
			tokensByHash: map[string]*models.RefreshToken{refreshTokenHash: &tokenRecord},
		},
	}

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, fakeStoreAuth, nil)

	r := gin.New()
	r.POST("/logout", h.logout)

	body := `{"refresh_token":"token-to-revoke"}`
	req, _ := http.NewRequest("POST", "/logout", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	if !tokenRecord.Revoked {
		t.Fatal("expected refresh token to be revoked")
	}
}

func TestAuthHandler_Logout_NoToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, &fakeStoreAuth{}, nil)

	r := gin.New()
	r.POST("/logout", h.logout)

	body := `{"refresh_token":""}`
	req, _ := http.NewRequest("POST", "/logout", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_JWTTokenGeneration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	userID := int32(1)
	user := models.User{
		ID:           int64(userID),
		Email:        "test@example.com",
		PasswordHash: string(hashedPassword),
		Role:         "clinician",
	}

	fakeStoreAuth := &fakeStoreAuth{
		userRepo: &fakeUserRepoAuth{
			usersByEmail: map[string]*models.User{user.Email: &user},
			usersByID:    map[int32]*models.User{userID: &user},
		},
		refreshTokenRepo: &fakeRefreshTokenRepoAuth{},
	}

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, fakeStoreAuth, nil)
	r.POST("/login", h.login)

	body := `{"email":"test@example.com","password":"password123"}`
	req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	cookies := w.Result().Cookies()
	var dianaTokenCookie *http.Cookie
	for _, cookie := range cookies {
		if cookie.Name == "diana_token" {
			dianaTokenCookie = cookie
			break
		}
	}

	if dianaTokenCookie == nil {
		t.Fatal("expected diana_token cookie to be set")
	}

	accessToken := dianaTokenCookie.Value
	token, err := jwt.Parse(accessToken, func(token *jwt.Token) (any, error) {
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		t.Fatalf("failed to parse JWT token: %v", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		t.Fatal("invalid token claims")
	}

	if claims["sub"] != "test@example.com" {
		t.Errorf("expected sub 'test@example.com', got %v", claims["sub"])
	}
	if claims["user_id"] != float64(1) {
		t.Errorf("expected user_id 1, got %v", claims["user_id"])
	}
	if claims["role"] != "clinician" {
		t.Errorf("expected role 'clinician', got %v", claims["role"])
	}
	if claims["scope"] != "diana" {
		t.Errorf("expected scope 'diana', got %v", claims["scope"])
	}

	if exp, ok := claims["exp"].(float64); ok {
		expTime := time.Unix(int64(exp), 0)
		if time.Until(expTime) > 16*time.Minute || time.Until(expTime) < 14*time.Minute {
			t.Errorf("expected token to expire in ~15 minutes, got %v", time.Until(expTime))
		}
	}
}

func hashedPassword(password string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash)
}

func hashTokenForTest(token string) string {
	return hashToken(token)
}

func TestHashToken(t *testing.T) {
	token := "test-token-12345"
	hash := hashToken(token)

	hash2 := hashToken(token)
	if hash != hash2 {
		t.Error("hashToken should be deterministic")
	}

	hash3 := hashToken("different-token")
	if hash == hash3 {
		t.Error("different tokens should produce different hashes")
	}
}

// TestLogin_EmptyEmail_ReturnsValidationError verifies that empty email returns a validation error
func TestLogin_EmptyEmail_ReturnsValidationError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, &fakeStoreAuth{}, nil)

	r := gin.New()
	r.POST("/login", h.login)

	tests := []struct {
		name           string
		body           string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "empty email with valid password",
			body:           `{"email":"","password":"password123"}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "whitespace only email",
			body:           `{"email":"   ","password":"password123"}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "missing email field",
			body:           `{"password":"password123"}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "invalid email format",
			body:           `{"email":"not-an-email","password":"password123"}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Fatalf("expected status %d, got %d: %s", tc.expectedStatus, w.Code, w.Body.String())
			}

			var response map[string]any
			json.Unmarshal(w.Body.Bytes(), &response)

			if response["message"] == nil {
				t.Fatal("expected message in response")
			}

			message := response["message"].(string)
			if message != tc.expectedError {
				t.Errorf("expected status %d, got %d: body=%s", tc.expectedStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestLogin_InvalidEmailFormat_ReturnsValidationError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, &fakeStoreAuth{}, nil)

	r := gin.New()
	r.POST("/login", h.login)

	tests := []struct {
		name           string
		email          string
		password       string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing @ symbol",
			email:          "not-an-email",
			password:       "password123",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "missing domain",
			email:          "user@",
			password:       "password123",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "missing local part",
			email:          "@example.com",
			password:       "password123",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "multiple @ symbols",
			email:          "user@name@example.com",
			password:       "password123",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "invalid characters",
			email:          "user name@example.com",
			password:       "password123",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "no TLD",
			email:          "user@example",
			password:       "password123",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			body := `{"email":"` + tc.email + `","password":"` + tc.password + `"}`
			req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Fatalf("expected status %d, got %d: %s", tc.expectedStatus, w.Code, w.Body.String())
			}

			var response map[string]any
			json.Unmarshal(w.Body.Bytes(), &response)

			if response["message"] == nil {
				t.Fatal("expected message in response")
			}

			message := response["message"].(string)
			if message != tc.expectedError {
				t.Errorf("expected error '%s', got '%s': body=%s", tc.expectedError, message, w.Body.String())
			}
		})
	}
}

// TestLogin_TooLongPassword_ReturnsValidationError verifies that passwords exceeding max length (128 chars) return validation error
func TestLogin_TooLongPassword_ReturnsValidationError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, &fakeStoreAuth{}, nil)

	r := gin.New()
	r.POST("/login", h.login)

	tests := []struct {
		name           string
		email          string
		password       string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "password exceeds max length by 1 char (129 chars)",
			email:          "test@example.com",
			password:       generatePassword(129),
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "password greatly exceeds max length (256 chars)",
			email:          "test@example.com",
			password:       generatePassword(256),
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
		{
			name:           "password greatly exceeds max length (512 chars)",
			email:          "test@example.com",
			password:       generatePassword(512),
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid payload",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			body := map[string]string{
				"email":    tc.email,
				"password": tc.password,
			}
			jsonBody, _ := json.Marshal(body)
			req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Fatalf("expected status %d, got %d: %s", tc.expectedStatus, w.Code, w.Body.String())
			}

			var response map[string]any
			json.Unmarshal(w.Body.Bytes(), &response)

			if response["message"] == nil {
				t.Fatal("expected message in response")
			}

			message := response["message"].(string)
			if message != tc.expectedError {
				t.Errorf("expected error '%s', got '%s': body=%s", tc.expectedError, message, w.Body.String())
			}
		})
	}
}

// generatePassword creates a password string of the specified length using valid ASCII characters
func generatePassword(length int) string {
	password := "a"
	for len(password) < length {
		password += "b"
	}
	return password[:length]
}
