package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// AdminDashboardHandler handles system-wide admin dashboard endpoints
type AdminDashboardHandler struct {
	store store.Store
}

// NewAdminDashboardHandler creates a new AdminDashboardHandler
func NewAdminDashboardHandler(store store.Store) *AdminDashboardHandler {
	return &AdminDashboardHandler{store: store}
}

// Register registers admin dashboard routes on the given router group
func (h *AdminDashboardHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/dashboard", h.getDashboard)
	rg.GET("/clinics", h.listAllClinics)
	rg.GET("/clinic-comparison", h.getClinicComparison)
}

// getDashboard returns system-wide statistics
// @Summary Get admin dashboard
// @Description Returns system-wide statistics (admin only)
// @Tags Admin
// @Produce json
// @Success 200 {object} models.SystemStats
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/dashboard [get]
func (h *AdminDashboardHandler) getDashboard(c *gin.Context) {
	claims := c.MustGet("user").(middleware.UserClaims)

	if claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied - admin role required"})
		return
	}

	stats, err := h.store.Clinics().AdminSystemStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load system statistics"})
		return
	}

	// Get cluster distribution
	clusterDist, _ := h.store.Assessments().ClusterCounts(c.Request.Context())

	// Get trends
	trends, _ := h.store.Assessments().TrendAverages(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{
		"stats":                stats,
		"cluster_distribution": clusterDist,
		"trends":               trends,
	})
}

// listAllClinics returns all clinics in the system
// @Summary List all clinics (admin only)
// @Description Returns all clinics in the system
// @Tags Admin
// @Produce json
// @Success 200 {array} models.Clinic
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/clinics [get]
func (h *AdminDashboardHandler) listAllClinics(c *gin.Context) {
	claims := c.MustGet("user").(middleware.UserClaims)

	if claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied - admin role required"})
		return
	}

	clinics, err := h.store.Clinics().List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load clinics"})
		return
	}

	c.JSON(http.StatusOK, clinics)
}

// getClinicComparison returns per-clinic statistics
// @Summary Get clinic comparison (admin only)
// @Description Returns statistics comparing all clinics
// @Tags Admin
// @Produce json
// @Success 200 {array} models.ClinicComparison
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/clinic-comparison [get]
func (h *AdminDashboardHandler) getClinicComparison(c *gin.Context) {
	claims := c.MustGet("user").(middleware.UserClaims)

	if claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied - admin role required"})
		return
	}

	comparison, err := h.store.Clinics().AdminClinicComparison(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load clinic comparison"})
		return
	}

	c.JSON(http.StatusOK, comparison)
}
