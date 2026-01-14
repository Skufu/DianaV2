package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/services"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type ExportHandler struct {
	store      store.Store
	pdfService *services.PDFExportService
}

// NewExportHandler creates a new export handler with PDF service
func NewExportHandler(store store.Store) *ExportHandler {
	return &ExportHandler{
		store:      store,
		pdfService: services.NewPDFExportService(),
	}
}

// Register registers the handler routes
func (h *ExportHandler) Register(r *gin.RouterGroup) {
	r.GET("/pdf", h.ExportPDF)
	// r.GET("/research", h.ExportResearchData) // Uncomment when needed
}

// ExportPDF generates a PDF health report for the logged-in user
func (h *ExportHandler) ExportPDF(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		ErrUnauthorized(c)
		return
	}

	user, err := h.store.Users().GetUserByID(c, int32(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user profile"})
		return
	}

	// Get user's assessments (limit to reasonable number e.g. 100)
	assessments, err := h.store.Assessments().ListAllLimitedByUser(c, int32(userID), 100)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assessments"})
		return
	}

	// Generate PDF
	// Construct basic UserProfile from User since we fetch assessments separately
	userProfile := models.UserProfile{
		User: *user,
	}
	pdfData, err := h.pdfService.GenerateHealthReport(userProfile, assessments)
	if err != nil {
		log.Printf("Failed to generate PDF: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF report"})
		return
	}

	// Set headers for PDF download
	filename := fmt.Sprintf("diana_health_report_%s_%s_%s.pdf",
		user.FirstName, user.LastName,
		time.Now().Format("2006-01-02"))

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Length", fmt.Sprintf("%d", len(pdfData)))

	// Send PDF data
	c.Data(http.StatusOK, "application/pdf", pdfData)

	log.Printf("PDF report generated and downloaded for user %d", userID)
}

// ExportResearchData exports anonymized data for research (admin only)
func (h *ExportHandler) ExportResearchData(c *gin.Context) {
	claims, err := getUserClaims(c)
	if err != nil {
		ErrUnauthorized(c)
		return
	}

	if claims.Role != "admin" {
		ErrForbidden(c)
		return
	}

	// Get users who consented to research
	// Assuming GetUsersForNotification is available or using List
	// Or maybe ListUsers?
	// Based on errors, GetUsersForNotification was called.
	// We'll use Users().GetUsersForNotification if it exists, otherwise placeholder
	// For now, let's assume Users().List with filter?
	// Or Users().GetUsersForNotification()
	users, err := h.store.Users().GetUsersForNotification(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// TODO: Generate CSV with anonymized data
	// This would include:
	// - Age range (not exact DOB)
	// - Menopause status (not names)
	// - Biomarker values (aggregated or per-user without identifying info)
	// - Cluster assignments
	// - Risk levels
	// - Assessment dates (relative, not exact)

	// For now, just return a placeholder
	c.JSON(http.StatusOK, gin.H{
		"message":     "Research data export feature - TODO: Implement anonymized CSV generation",
		"total_users": len(users),
	})
}

// Legacy methods from original export handler
func (h *ExportHandler) PatientsCSV(c *gin.Context) {
	// This is deprecated - users now export their own data
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Patient CSV export is deprecated. Users can export their own data via /users/me/export/pdf"})
}

func (h *ExportHandler) AssessmentsCSV(c *gin.Context) {
	// This is deprecated - use ExportPDF instead
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Assessment CSV export is deprecated. Use PDF export for professional reports"})
}
