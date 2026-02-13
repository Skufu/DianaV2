package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/cache"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type UsersHandler struct {
	store store.Store
	cache *cache.Cache
}

func NewUsersHandler(store store.Store, cache *cache.Cache) *UsersHandler {
	return &UsersHandler{store: store, cache: cache}
}

func (h *UsersHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/profile", h.GetUserProfile)
	rg.PUT("/profile", h.UpdateUserProfile)
	rg.POST("/onboarding", h.CompleteOnboarding)
	rg.GET("/consent", h.GetConsentSettings)
	rg.PUT("/consent", h.UpdateConsentSettings)
	rg.GET("/trends", h.GetTrends)
	rg.DELETE("/account", h.DeleteAccount)
}

// GetUserProfile returns the current user's full profile including latest assessment summary
func (h *UsersHandler) GetUserProfile(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
	if err != nil {
		log.Printf("[ERROR] Failed to fetch user profile: %v", err)
		ErrInternal(c, "Failed to fetch user profile")
		return
	}
	if user == nil {
		ErrNotFound(c, "User")
		return
	}

	assessment, _ := h.store.Users().GetLatestAssessmentByUser(c.Request.Context(), userClaims.UserID)
	count, _ := h.store.Users().GetAssessmentCountByUser(c.Request.Context(), userClaims.UserID)

	profile := models.UserProfile{
		User:             *user,
		LatestAssessment: assessment,
		AssessmentCount:  count,
	}

	if assessment != nil {
		profile.LastAssessmentAt = &assessment.CreatedAt
		profile.CurrentCluster = assessment.Cluster
		// Simple risk level mapping
		if assessment.RiskScore < 30 {
			profile.CurrentRiskLevel = "low"
		} else if assessment.RiskScore < 70 {
			profile.CurrentRiskLevel = "medium"
		} else {
			profile.CurrentRiskLevel = "high"
		}
	}

	c.JSON(http.StatusOK, profile)
}

// UpdateUserProfile updates user's personal information
func (h *UsersHandler) UpdateUserProfile(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	var req models.User
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] User profile validation failed: %v", err)
		ErrBadRequest(c, "Invalid request payload")
		return
	}

	// Ensure ID matches token
	req.ID = userClaims.UserID

	updatedUser, err := h.store.Users().UpdateUser(c.Request.Context(), req)
	if err != nil {
		log.Printf("[ERROR] Failed to update profile: %v", err)
		ErrInternal(c, "Failed to update profile")
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

// CompleteOnboarding marks user as having completed onboarding
func (h *UsersHandler) CompleteOnboarding(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	var req models.OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Onboarding request validation failed: %v", err)
		ErrBadRequest(c, "Invalid request payload")
		return
	}

	if !req.ConsentPersonalData {
		ErrBadRequest(c, "Consent to personal data usage is required")
		return
	}

	// Apply defaults for optional fields
	if req.AssessmentFrequencyMonths == 0 {
		req.AssessmentFrequencyMonths = 3
	}

	// Parse DOB
	var dob *time.Time
	if req.DateOfBirth != "" {
		parsed, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			log.Printf("[ERROR] Invalid date format: %v", err)
			ErrBadRequest(c, "Invalid date format, use YYYY-MM-DD")
			return
		}
		dob = &parsed
	}

	// 1. Update User Profile fields
	userUpdate := models.User{
		ID:                        userClaims.UserID,
		FirstName:                 req.FirstName,
		LastName:                  req.LastName,
		DateOfBirth:               dob,
		MenopauseStatus:           req.MenopauseStatus,
		MenopauseType:             req.MenopauseType,
		YearsMenopause:            req.YearsMenopause,
		Hypertension:              req.Hypertension,
		HeartDisease:              req.HeartDisease,
		FamilyHistoryDiabetes:     req.FamilyHistoryDiabetes,
		SmokingStatus:             req.SmokingStatus,
		AssessmentFrequencyMonths: req.AssessmentFrequencyMonths,
		ReminderEmail:             req.ReminderEmail,
	}

	// 2. Update Consent
	consent := models.ConsentSettings{
		ConsentPersonalData:          req.ConsentPersonalData,
		ConsentResearchParticipation: req.ConsentResearchParticipation,
		ConsentEmailUpdates:          req.ConsentEmailUpdates,
		ConsentAnalytics:             req.ConsentAnalytics,
	}

	// Transaction-like updates (best effort or use actual transaction if store supports it)
	if _, err := h.store.Users().UpdateUser(c.Request.Context(), userUpdate); err != nil {
		log.Printf("[ERROR] Failed to update user details: %v", err)
		ErrInternal(c, "Failed to update user details")
		return
	}

	if err := h.store.Users().UpdateUserConsent(c.Request.Context(), userClaims.UserID, consent); err != nil {
		log.Printf("[ERROR] Failed to update consent: %v", err)
		ErrInternal(c, "Failed to update consent")
		return
	}

	// 3. Mark Onboarding Complete
	if err := h.store.Users().UpdateUserOnboarding(c.Request.Context(), userClaims.UserID, true); err != nil {
		log.Printf("[ERROR] Failed to complete onboarding: %v", err)
		ErrInternal(c, "Failed to complete onboarding")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "onboarding completed"})
}

// GetConsentSettings returns user's consent flags
func (h *UsersHandler) GetConsentSettings(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
	if err != nil || user == nil {
		log.Printf("[ERROR] Failed to fetch user: %v", err)
		ErrInternal(c, "Failed to fetch user")
		return
	}

	settings := models.ConsentSettings{
		ConsentPersonalData:          user.ConsentPersonalData,
		ConsentResearchParticipation: user.ConsentResearchParticipation,
		ConsentEmailUpdates:          user.ConsentEmailUpdates,
		ConsentAnalytics:             user.ConsentAnalytics,
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateConsentSettings updates user's consent preferences
func (h *UsersHandler) UpdateConsentSettings(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	var req models.ConsentSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Consent settings validation failed: %v", err)
		ErrBadRequest(c, "Invalid request payload")
		return
	}

	if err := h.store.Users().UpdateUserConsent(c.Request.Context(), userClaims.UserID, req); err != nil {
		log.Printf("[ERROR] Failed to update consent: %v", err)
		ErrInternal(c, "Failed to update consent")
		return
	}

	c.JSON(http.StatusOK, req)
}

// GetTrends returns user's biomarker trends
func (h *UsersHandler) GetTrends(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	monthsStr := c.DefaultQuery("months", "12")
	months, _ := strconv.Atoi(monthsStr)
	if months < 1 {
		months = 12
	}

	cacheKey := fmt.Sprintf("trends:%d:%d", userClaims.UserID, months)

	if h.cache != nil {
		var cachedTrends []any
		if err := h.cache.Get(c.Request.Context(), cacheKey, &cachedTrends); err == nil {
			c.JSON(http.StatusOK, cachedTrends)
			return
		}
	}

	trends, err := h.store.Users().GetUserTrends(c.Request.Context(), userClaims.UserID, months)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch trends: %v", err)
		ErrInternal(c, "Failed to fetch trends")
		return
	}

	if h.cache != nil {
		if err := h.cache.Set(c.Request.Context(), cacheKey, trends, 5*time.Minute); err != nil {
			log.Printf("[WARN] Failed to cache trends for user %d: %v", userClaims.UserID, err)
		}
	}

	c.JSON(http.StatusOK, trends)
}

// DeleteAccount soft-deletes user's account
func (h *UsersHandler) DeleteAccount(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	if err := h.store.Users().SoftDeleteUser(c.Request.Context(), userClaims.UserID); err != nil {
		log.Printf("[ERROR] Failed to delete account: %v", err)
		ErrInternal(c, "Failed to delete account")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "account deleted"})
}
