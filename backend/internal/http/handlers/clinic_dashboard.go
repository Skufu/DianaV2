package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// ClinicDashboardHandler handles clinic-level dashboard endpoints
type ClinicDashboardHandler struct {
	store store.Store
}

// NewClinicDashboardHandler creates a new ClinicDashboardHandler
func NewClinicDashboardHandler(store store.Store) *ClinicDashboardHandler {
	return &ClinicDashboardHandler{store: store}
}

// Register registers clinic dashboard routes on the given router group
func (h *ClinicDashboardHandler) Register(rg *gin.RouterGroup) {
	rg.GET("", h.listClinics)
	rg.GET("/:id/dashboard", h.getClinicDashboard)
}

// listClinics returns all clinics the user belongs to
// @Summary List user's clinics
// @Description Returns all clinics the current user is a member of
// @Tags Clinics
// @Produce json
// @Success 200 {array} models.UserClinic
// @Failure 500 {object} map[string]string
// @Router /clinics [get]
func (h *ClinicDashboardHandler) listClinics(c *gin.Context) {
	claims := c.MustGet("user").(middleware.UserClaims)

	clinics, err := h.store.Clinics().ListUserClinics(c.Request.Context(), int32(claims.UserID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load clinics"})
		return
	}

	c.JSON(http.StatusOK, clinics)
}

// getClinicDashboard returns aggregate statistics for a clinic
// @Summary Get clinic dashboard
// @Description Returns aggregate statistics for a specific clinic (clinic_admin only)
// @Tags Clinics
// @Produce json
// @Param id path int true "Clinic ID"
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /clinics/{id}/dashboard [get]
func (h *ClinicDashboardHandler) getClinicDashboard(c *gin.Context) {
	claims := c.MustGet("user").(middleware.UserClaims)
	clinicIDStr := c.Param("id")

	clinicID, err := strconv.Atoi(clinicIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid clinic ID"})
		return
	}

	// Check if user is clinic_admin for this clinic or system admin
	isAdmin, err := h.store.Clinics().IsClinicAdmin(c.Request.Context(), int32(claims.UserID), int32(clinicID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
		return
	}

	if !isAdmin && claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied - clinic_admin role required"})
		return
	}

	// Get clinic info
	clinic, err := h.store.Clinics().Get(c.Request.Context(), int32(clinicID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "clinic not found"})
		return
	}

	// Get aggregate stats
	agg, err := h.store.Clinics().ClinicAggregate(c.Request.Context(), int32(clinicID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load clinic statistics"})
		return
	}

	// Get cluster distribution from assessments
	clusterDist, _ := h.store.Assessments().ClusterCounts(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{
		"clinic_id":            clinic.ID,
		"clinic_name":          clinic.Name,
		"stats":                agg,
		"cluster_distribution": clusterDist,
	})
}
