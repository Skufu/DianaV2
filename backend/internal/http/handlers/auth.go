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

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type signupRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
}

func (h *AuthHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/signup", h.signup)
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
		h.broker.PublishAuthEvent("failed_login", req.Email, c.ClientIP(), c.GetHeader("User-Agent"), false, map[string]interface{}{"failure_reason": "invalid credentials"})
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	now := time.Now()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.Email,
		"user_id":  user.ID,
		"role":     user.Role,
		"is_admin": user.IsAdmin,
		"exp":      now.Add(15 * time.Minute).Unix(),
		"iat":      now.Unix(),
		"scope":    "diana",
	})
	signedAccessToken, err := accessToken.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	refreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}
	refreshToken := base64.URLEncoding.EncodeToString(refreshTokenBytes)
	refreshTokenHash := hashToken(refreshToken)

	_, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), refreshTokenHash, int32(user.ID), now.Add(7*24*time.Hour))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create refresh token"})
		return
	}

	h.broker.PublishAuthEvent("login", user.Email, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)

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

func (h *AuthHandler) signup(c *gin.Context) {
	var req signupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists
	existing, _ := h.store.Users().FindByEmail(c.Request.Context(), req.Email)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user already exists"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server error"})
		return
	}

	// Create user
	newUser := models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         "user",
		IsAdmin:      false,
		IsActive:     true,
	}

	createdUser, err := h.store.Users().Create(c.Request.Context(), newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Update profile with names
	createdUser.FirstName = req.FirstName
	createdUser.LastName = req.LastName
	_, err = h.store.Users().UpdateUser(c.Request.Context(), *createdUser)
	if err != nil {
		// Log error but continue as user is created
		// In a real scenario we might want cleanup or transaction
	}

	// Generate tokens immediately so they are logged in
	now := time.Now()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      createdUser.Email,
		"user_id":  createdUser.ID,
		"role":     createdUser.Role,
		"is_admin": createdUser.IsAdmin,
		"exp":      now.Add(15 * time.Minute).Unix(),
		"iat":      now.Unix(),
		"scope":    "diana",
	})
	signedAccessToken, err := accessToken.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	refreshTokenBytes := make([]byte, 32)
	rand.Read(refreshTokenBytes)
	refreshToken := base64.URLEncoding.EncodeToString(refreshTokenBytes)
	refreshTokenHash := hashToken(refreshToken)

	_, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), refreshTokenHash, int32(createdUser.ID), time.Now().Add(7*24*time.Hour))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create refresh token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"access_token":  signedAccessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    900,
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
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	if req.RefreshToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
		return
	}

	tokenHash := hashToken(req.RefreshToken)

	tokenRecord, err := h.store.RefreshTokens().FindRefreshToken(c.Request.Context(), tokenHash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	if tokenRecord.Revoked {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token has been revoked"})
		return
	}

	if time.Now().After(tokenRecord.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token has expired"})
		return
	}

	user, err := h.store.Users().FindByID(c.Request.Context(), int32(tokenRecord.UserID))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	now := time.Now()
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.Email,
		"user_id":  user.ID,
		"role":     user.Role,
		"is_admin": user.IsAdmin,
		"exp":      now.Add(15 * time.Minute).Unix(),
		"iat":      now.Unix(),
		"scope":    "diana",
	})
	signedAccessToken, err := accessToken.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}

	_ = h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash)

	newRefreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(newRefreshTokenBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
		return
	}
	newRefreshToken := base64.URLEncoding.EncodeToString(newRefreshTokenBytes)
	newRefreshTokenHash := hashToken(newRefreshToken)

	_, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), newRefreshTokenHash, int32(user.ID), now.Add(7*24*time.Hour))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create refresh token"})
		return
	}

	h.broker.PublishAuthEvent("token_refresh", user.Email, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	userEmail := ""
	if req.RefreshToken != "" {
		tokenHash := hashToken(req.RefreshToken)
		tokenRecord, err := h.store.RefreshTokens().FindRefreshToken(c.Request.Context(), tokenHash)
		if err == nil {
			user, userErr := h.store.Users().FindByID(c.Request.Context(), int32(tokenRecord.UserID))
			if userErr == nil {
				userEmail = user.Email
			}
		}
		_ = h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash)
	}

	h.broker.PublishAuthEvent("logout", userEmail, c.ClientIP(), c.GetHeader("User-Agent"), true, nil)

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.URLEncoding.EncodeToString(hash[:])
}
