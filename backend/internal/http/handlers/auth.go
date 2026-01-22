package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg   config.Config
	store store.Store
}

func NewAuthHandler(cfg config.Config, store store.Store) *AuthHandler {
	return &AuthHandler{cfg: cfg, store: store}
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/login", h.login)
	rg.POST("/refresh", h.refresh)
	rg.POST("/logout", h.logout)
}

func (h *AuthHandler) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrBadRequest(c, "invalid payload")
		return
	}
	if req.Email == "" || req.Password == "" {
		ErrBadRequest(c, "email and password are required")
		return
	}
	user, err := h.store.Users().FindByEmail(c.Request.Context(), req.Email)
	if err != nil {
		log.Printf("[ERROR] Login failed for email %s: %v", req.Email, err)
		ErrUnauthorized(c)
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("[WARN] Invalid password attempt for email %s", req.Email)
		ErrUnauthorized(c)
		return
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

	c.JSON(http.StatusOK, gin.H{
		"access_token":  signedAccessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    900,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

func (h *AuthHandler) refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrBadRequest(c, "invalid payload")
		return
	}

	if req.RefreshToken == "" {
		ErrUnauthorized(c)
		return
	}

	// Hash refresh token to look it up in database
	tokenHash := hashToken(req.RefreshToken)

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

	c.JSON(http.StatusOK, gin.H{
		"access_token":  signedAccessToken,
		"refresh_token": newRefreshToken,
		"token_type":    "Bearer",
		"expires_in":    900,
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
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrBadRequest(c, "invalid payload")
		return
	}

	if req.RefreshToken != "" {
		tokenHash := hashToken(req.RefreshToken)
		// Revoke refresh token (log errors for monitoring, don't fail logout)
		if err := h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash); err != nil {
			log.Printf("[WARN] Failed to revoke refresh token during logout: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

// hashToken creates a SHA-256 hash of token for storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.URLEncoding.EncodeToString(hash[:])
}
