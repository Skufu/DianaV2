package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	user, err := h.store.Users().FindByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	// Generate refresh token (long-lived, 7 days)
	refreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}
	refreshToken := base64.URLEncoding.EncodeToString(refreshTokenBytes)
	refreshTokenHash := hashToken(refreshToken)

	// Store refresh token in database
	_, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), refreshTokenHash, int32(user.ID), time.Now().Add(7*24*time.Hour))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  signedAccessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    900, // 15 minutes in seconds
	})
}

func (h *AuthHandler) refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	if req.RefreshToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
		return
	}

	// Hash the refresh token to look it up in the database
	tokenHash := hashToken(req.RefreshToken)

	// Validate refresh token
	tokenRecord, err := h.store.RefreshTokens().FindRefreshToken(c.Request.Context(), tokenHash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	// Check if token has been revoked
	if tokenRecord.Revoked {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token has been revoked"})
		return
	}

	// Check if token has expired
	if time.Now().After(tokenRecord.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token has expired"})
		return
	}

	// Get user details
	user, err := h.store.Users().FindByID(c.Request.Context(), int32(tokenRecord.UserID))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": signedAccessToken,
		"token_type":   "Bearer",
		"expires_in":   900, // 15 minutes in seconds
	})
}

func (h *AuthHandler) logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	if req.RefreshToken != "" {
		tokenHash := hashToken(req.RefreshToken)
		// Revoke the refresh token (ignore errors as the token may already be invalid)
		_ = h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash)
	}

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

// hashToken creates a SHA-256 hash of the token for storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.URLEncoding.EncodeToString(hash[:])
}
