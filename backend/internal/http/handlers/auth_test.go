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
	h := NewAuthHandler(cfg, fakeStoreAuth)

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

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["access_token"] == nil {
		t.Fatal("expected access_token in response")
	}
	if response["refresh_token"] == nil {
		t.Fatal("expected refresh_token in response")
	}
	if response["token_type"] != "Bearer" {
		t.Fatalf("expected token_type 'Bearer', got %v", response["token_type"])
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
			h := NewAuthHandler(cfg, fakeStoreAuth)

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

			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)
			if response["error"] == nil {
				t.Fatal("expected error in response")
			}
		})
	}
}

func TestAuthHandler_Login_InvalidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := config.Config{JWTSecret: "test-secret-key-for-testing-only"}
	h := NewAuthHandler(cfg, &fakeStoreAuth{})

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
	h := NewAuthHandler(cfg, fakeStoreAuth)

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

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["access_token"] == nil {
		t.Fatal("expected access_token in response")
	}
	if response["refresh_token"] == nil {
		t.Fatal("expected refresh_token in response")
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
			h := NewAuthHandler(cfg, fakeStoreAuth)

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
	h := NewAuthHandler(cfg, fakeStoreAuth)

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
	h := NewAuthHandler(cfg, &fakeStoreAuth{})

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
	h := NewAuthHandler(cfg, fakeStoreAuth)
	r.POST("/login", h.login)

	body := `{"email":"test@example.com","password":"password123"}`
	req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	accessToken := response["access_token"].(string)
	token, err := jwt.Parse(accessToken, func(token *jwt.Token) (interface{}, error) {
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
