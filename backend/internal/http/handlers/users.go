package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type UsersHandler struct {
	store store.Store
}

func NewUsersHandler(store store.Store) *UsersHandler {
	return &UsersHandler{store: store}
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user profile"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Fetch latest assessment
	assessment, err := h.store.Users().GetLatestAssessmentByUser(c.Request.Context(), userClaims.UserID)
	if err != nil {
		// Log error but don't fail profile load
		// log.Printf("failed to fetch latest assessment: %v", err)
	}

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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure ID matches token
	req.ID = userClaims.UserID

	updatedUser, err := h.store.Users().UpdateUser(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

// CompleteOnboarding marks user as having completed onboarding
func (h *UsersHandler) CompleteOnboarding(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	var req models.OnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Update User Profile fields
	userUpdate := models.User{
		ID:                        userClaims.UserID,
		FirstName:                 req.FirstName,
		LastName:                  req.LastName,
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
	// Parse DOB
	// if req.DateOfBirth != "" { ... } // Assuming basic string or handle parsing if needed

	// 2. Update Consent
	consent := models.ConsentSettings{
		ConsentPersonalData:          req.ConsentPersonalData,
		ConsentResearchParticipation: req.ConsentResearchParticipation,
		ConsentEmailUpdates:          req.ConsentEmailUpdates,
		ConsentAnalytics:             req.ConsentAnalytics,
	}

	// Transaction-like updates (best effort or use actual transaction if store supports it)
	if _, err := h.store.Users().UpdateUser(c.Request.Context(), userUpdate); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user details"})
		return
	}

	if err := h.store.Users().UpdateUserConsent(c.Request.Context(), userClaims.UserID, consent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update consent"})
		return
	}

	// 3. Mark Onboarding Complete
	if err := h.store.Users().UpdateUserOnboarding(c.Request.Context(), userClaims.UserID, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete onboarding"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "onboarding completed"})
}

// GetConsentSettings returns user's consent flags
func (h *UsersHandler) GetConsentSettings(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
	if err != nil || user == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	var req models.ConsentSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.store.Users().UpdateUserConsent(c.Request.Context(), userClaims.UserID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update consent"})
		return
	}

	c.JSON(http.StatusOK, req)
}

// GetTrends returns user's biomarker trends
func (h *UsersHandler) GetTrends(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	monthsStr := c.DefaultQuery("months", "12")
	months, _ := strconv.Atoi(monthsStr)
	if months < 1 {
		months = 12
	}

	trends, err := h.store.Users().GetUserTrends(c.Request.Context(), userClaims.UserID, months)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch trends"})
		return
	}

	c.JSON(http.StatusOK, trends)
}

// DeleteAccount soft-deletes user's account
func (h *UsersHandler) DeleteAccount(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	if err := h.store.Users().SoftDeleteUser(c.Request.Context(), userClaims.UserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "account deleted"})
}
