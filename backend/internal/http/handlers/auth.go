package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt/v5"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/sse"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg    config.Config
	store  store.Store
	broker *sse.Broker
}

func NewAuthHandler(cfg config.Config, store store.Store, broker *sse.Broker) *AuthHandler {
	return &AuthHandler{cfg: cfg, store: store, broker: broker}
}

// isSecure returns true if cookies should use the Secure flag (HTTPS only).
// In development (http://localhost), Secure cookies are silently dropped by browsers.
func (h *AuthHandler) isSecure() bool {
	if h.cfg.Env == "production" || h.cfg.Env == "prod" {
		return true
	}
	if h.cfg.Env == "" {
		return true
	}
	return h.cfg.Env == "test"
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=8,max=128"`
}

type registerRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=8,max=128"`
}

func (h *AuthHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/login", h.login)
	rg.POST("/register", h.register)
	rg.POST("/refresh", h.refresh)
	rg.POST("/logout", h.logout)
}

// parseAuthValidationErrors converts Gin binding errors into user-friendly field-specific messages.
func parseAuthValidationErrors(err error) map[string]string {
	fieldErrors := make(map[string]string)
	var ve validator.ValidationErrors
	if !errors.As(err, &ve) {
		return nil // not a validation error
	}
	for _, fe := range ve {
		field := strings.ToLower(fe.Field())
		switch field {
		case "email":
			switch fe.Tag() {
			case "required":
				fieldErrors["email"] = "Email is required"
			case "email":
				fieldErrors["email"] = "Please enter a valid email address"
			case "max":
				fieldErrors["email"] = "Email must be at most 255 characters"
			default:
				fieldErrors["email"] = "Invalid email"
			}
		case "password":
			switch fe.Tag() {
			case "required":
				fieldErrors["password"] = "Password is required"
			case "min":
				fieldErrors["password"] = "Password must be at least 8 characters"
			case "max":
				fieldErrors["password"] = "Password must be at most 128 characters"
			default:
				fieldErrors["password"] = "Invalid password"
			}
		default:
			fieldErrors[field] = "Invalid value"
		}
	}
	return fieldErrors
}

// validatePasswordComplexity checks that a password contains at least one
// uppercase letter, one lowercase letter, and one digit.
func validatePasswordComplexity(password string) map[string]string {
	var hasUpper, hasLower, hasDigit bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if hasUpper && hasLower && hasDigit {
		return nil
	}
	missing := []string{}
	if !hasUpper {
		missing = append(missing, "an uppercase letter")
	}
	if !hasLower {
		missing = append(missing, "a lowercase letter")
	}
	if !hasDigit {
		missing = append(missing, "a number")
	}
	return map[string]string{
		"password": "Password must contain " + strings.Join(missing, ", "),
	}
}

func (h *AuthHandler) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if fieldErrors := parseAuthValidationErrors(err); fieldErrors != nil {
			ErrValidation(c, fieldErrors)
			return
		}
		ErrBadRequest(c, "invalid payload")
		return
	}

	// Normalize email
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Email == "" || req.Password == "" {
		ErrValidation(c, map[string]string{"email": "Email is required", "password": "Password is required"})
		return
	}
	user, err := h.store.Users().FindByEmail(c.Request.Context(), req.Email)
	if err != nil {
		log.Printf("[ERROR] Login failed for email %s: %v", req.Email, err)
		// Publish failed login event
		if h.broker != nil {
			h.broker.PublishAuthEvent("failed_login", req.Email, c.ClientIP(), c.GetHeader("User-Agent"), false, map[string]any{"reason": "user not found"})
		}
		ErrInvalidCredentials(c)
		return
	}
	if !user.IsActive || user.AccountStatus != "active" {
		log.Printf("[WARN] Login blocked for inactive user %s", req.Email)
		if h.broker != nil {
			h.broker.PublishAuthEvent("failed_login", req.Email, c.ClientIP(), c.GetHeader("User-Agent"), false, map[string]any{"reason": "account_inactive"})
		}
		ErrAccountInactive(c)
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("[WARN] Invalid password attempt for email %s", req.Email)
		// Publish failed login event
		if h.broker != nil {
			h.broker.PublishAuthEvent("failed_login", req.Email, c.ClientIP(), c.GetHeader("User-Agent"), false, map[string]any{"reason": "invalid password"})
		}
		ErrInvalidCredentials(c)
		return
	}

	// Update last login timestamp (fire and forget - don't fail login if this errors)
	if err := h.store.Users().UpdateLastLogin(c.Request.Context(), int32(user.ID)); err != nil {
		log.Printf("[WARN] Failed to update last login for user %d: %v", user.ID, err)
	}

	// Generate access token (short-lived, 15 minutes)
	now := time.Now()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":     user.Email,
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     now.Add(15 * time.Minute).Unix(),
		"iat":     now.Unix(),
		"scope":   "diana",
	})
	signedAccessToken, err := accessToken.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		log.Printf("[ERROR] Failed to sign access token: %v", err)
		ErrInternal(c, "Failed to generate token")
		return
	}

	// Generate refresh token (long-lived, 7 days)
	refreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		log.Printf("[ERROR] Failed to generate refresh token: %v", err)
		ErrInternal(c, "Failed to generate token")
		return
	}
	refreshToken := base64.URLEncoding.EncodeToString(refreshTokenBytes)
	refreshTokenHash := hashToken(refreshToken)

	// Store refresh token in database
	_, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), refreshTokenHash, int32(user.ID), time.Now().Add(7*24*time.Hour))
	if err != nil {
		log.Printf("[ERROR] Failed to create refresh token: %v", err)
		ErrInternal(c, "Failed to create refresh token")
		return
	}

	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", h.isSecure(), true)
	c.SetCookie("diana_refresh_token", refreshToken, 7*24*60*60, "/", "", h.isSecure(), true)

	// Publish successful login event
	if h.broker != nil {
		h.broker.PublishAuthEvent("login", user.Email, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "login successful",
		"access_token":  signedAccessToken,
		"refresh_token": refreshToken,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

func (h *AuthHandler) register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if fieldErrors := parseAuthValidationErrors(err); fieldErrors != nil {
			ErrValidation(c, fieldErrors)
			return
		}
		ErrBadRequest(c, "invalid payload")
		return
	}

	// Normalize email
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Email == "" || req.Password == "" {
		ErrValidation(c, map[string]string{"email": "Email is required", "password": "Password is required"})
		return
	}

	// Password complexity check
	if complexityErrors := validatePasswordComplexity(req.Password); complexityErrors != nil {
		ErrValidation(c, complexityErrors)
		return
	}

	existingUser, err := h.store.Users().FindByEmail(c.Request.Context(), req.Email)
	if err == nil && existingUser != nil {
		log.Printf("[WARN] Registration attempt with existing email: %s", req.Email)
		ErrValidation(c, map[string]string{"email": "This email is already registered"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[ERROR] Failed to hash password: %v", err)
		ErrInternal(c, "Failed to process registration")
		return
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         models.RoleUser, // Default role for new registrations
		IsActive:     true,
	}
	createdUser, err := h.store.Users().Create(c.Request.Context(), user)
	if err != nil {
		log.Printf("[ERROR] Failed to create user: %v", err)
		ErrInternal(c, "Failed to create account")
		return
	}

	now := time.Now()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":     createdUser.Email,
		"user_id": createdUser.ID,
		"role":    createdUser.Role,
		"exp":     now.Add(15 * time.Minute).Unix(),
		"iat":     now.Unix(),
		"scope":   "diana",
	})
	signedAccessToken, err := accessToken.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		log.Printf("[ERROR] Failed to sign access token: %v", err)
		ErrInternal(c, "Failed to generate token")
		return
	}

	refreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		log.Printf("[ERROR] Failed to generate refresh token: %v", err)
		ErrInternal(c, "Failed to generate token")
		return
	}
	refreshToken := base64.URLEncoding.EncodeToString(refreshTokenBytes)
	refreshTokenHash := hashToken(refreshToken)

	_, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), refreshTokenHash, int32(createdUser.ID), time.Now().Add(7*24*time.Hour))
	if err != nil {
		log.Printf("[ERROR] Failed to create refresh token: %v", err)
		ErrInternal(c, "Failed to create refresh token")
		return
	}

	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", h.isSecure(), true)
	c.SetCookie("diana_refresh_token", refreshToken, 7*24*60*60, "/", "", h.isSecure(), true)

	// Publish user creation event for real-time tracking
	if h.broker != nil {
		h.broker.PublishAuthEvent("user_created", createdUser.Email, c.ClientIP(), c.GetHeader("User-Agent"), true, map[string]any{
			"user_id":        createdUser.ID,
			"role":           createdUser.Role,
			"created_by":     "self", // Self-registration
			"is_self_signup": true,
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":       "registration successful",
		"access_token":  signedAccessToken,
		"refresh_token": refreshToken,
		"user": gin.H{
			"id":    createdUser.ID,
			"email": createdUser.Email,
			"role":  createdUser.Role,
		},
	})
}

func (h *AuthHandler) refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "invalid character 'e' looking for beginning of value" {
		ErrBadRequest(c, "invalid payload")
		return
	}

	refreshToken := req.RefreshToken
	if refreshToken == "" {
		cookieToken, err := c.Cookie("diana_refresh_token")
		if err != nil || cookieToken == "" {
			ErrUnauthorized(c)
			return
		}
		refreshToken = cookieToken
	}

	// Hash refresh token to look it up in database
	tokenHash := hashToken(refreshToken)

	// Validate refresh token
	tokenRecord, err := h.store.RefreshTokens().FindRefreshToken(c.Request.Context(), tokenHash)
	if err != nil {
		log.Printf("[WARN] Invalid refresh token attempted: %v", err)
		ErrUnauthorized(c)
		return
	}

	// Check if token has been revoked
	if tokenRecord.Revoked {
		log.Printf("[WARN] Attempted to use revoked refresh token for user ID %d", tokenRecord.UserID)
		ErrUnauthorized(c)
		return
	}

	// Check if token has expired
	if time.Now().After(tokenRecord.ExpiresAt) {
		log.Printf("[WARN] Attempted to use expired refresh token for user ID %d", tokenRecord.UserID)
		ErrUnauthorized(c)
		return
	}

	// Get user details
	user, err := h.store.Users().FindByID(c.Request.Context(), int32(tokenRecord.UserID))
	if err != nil {
		log.Printf("[ERROR] User not found during token refresh for user ID %d: %v", tokenRecord.UserID, err)
		ErrNotFound(c, "user")
		return
	}
	if !user.IsActive || user.AccountStatus != "active" {
		log.Printf("[WARN] Token refresh blocked for inactive user ID %d", user.ID)
		ErrAccountInactive(c)
		return
	}

	// Generate new access token
	now := time.Now()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":     user.Email,
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     now.Add(15 * time.Minute).Unix(),
		"iat":     now.Unix(),
		"scope":   "diana",
	})
	signedAccessToken, err := accessToken.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		log.Printf("[ERROR] Failed to sign access token during refresh: %v", err)
		ErrInternal(c, "Failed to generate token")
		return
	}

	// Revoke old refresh token (token rotation for security)
	if err := h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash); err != nil {
		log.Printf("[WARN] Failed to revoke old refresh token during refresh: %v", err)
	}

	// Generate new refresh token
	newRefreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(newRefreshTokenBytes); err != nil {
		log.Printf("[ERROR] Failed to generate new refresh token: %v", err)
		ErrInternal(c, "Failed to generate token")
		return
	}
	newRefreshToken := base64.URLEncoding.EncodeToString(newRefreshTokenBytes)
	newRefreshTokenHash := hashToken(newRefreshToken)

	// Store new refresh token in database
	_, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), newRefreshTokenHash, int32(user.ID), time.Now().Add(7*24*time.Hour))
	if err != nil {
		log.Printf("[ERROR] Failed to create new refresh token: %v", err)
		ErrInternal(c, "Failed to create refresh token")
		return
	}

	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", h.isSecure(), true)
	c.SetCookie("diana_refresh_token", newRefreshToken, 7*24*60*60, "/", "", h.isSecure(), true)

	// Publish token refresh event
	if h.broker != nil {
		h.broker.PublishAuthEvent("token_refresh", user.Email, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "token refreshed successfully",
		"access_token":  signedAccessToken,
		"refresh_token": newRefreshToken,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

func (h *AuthHandler) logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	// Allow empty body - we can get the token from cookie
	_ = c.ShouldBindJSON(&req)

	refreshToken := req.RefreshToken
	if refreshToken == "" {
		cookieToken, _ := c.Cookie("diana_refresh_token")
		refreshToken = cookieToken
	}

	if refreshToken != "" {
		tokenHash := hashToken(refreshToken)
		if err := h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash); err != nil {
			log.Printf("[WARN] Failed to revoke refresh token during logout: %v", err)
		}
	}

	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("diana_token", "", -1, "/", "", h.isSecure(), true)
	c.SetCookie("diana_refresh_token", "", -1, "/", "", h.isSecure(), true)
	c.SetCookie("diana_csrf_token", "", -1, "/", "", h.isSecure(), false)

	// Publish logout event (using email from context if available)
	if h.broker != nil {
		// Try to get email from JWT claims if set by middleware
		email, _ := c.Get("user_email")
		emailStr, _ := email.(string)
		if emailStr == "" {
			emailStr = "unknown"
		}
		h.broker.PublishAuthEvent("logout", emailStr, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

// hashToken creates a SHA-256 hash of token for storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.URLEncoding.EncodeToString(hash[:])
}
