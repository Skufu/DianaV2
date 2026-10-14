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

type PDFReportGenerator interface {
	GenerateHealthReport(user models.UserProfile, assessments []models.Assessment) ([]byte, error)
}

type ExportHandler struct {
	store      store.Store
	pdfService PDFReportGenerator
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
		ErrInternal(c, "Failed to fetch user profile")
		return
	}

	// Get user's assessments (limit to reasonable number e.g. 100)
	assessments, err := h.store.Assessments().ListAllLimitedByUser(c, int32(userID), 100)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch assessments for user %d: %v", userID, err)
		ErrInternal(c, "Failed to fetch assessments")
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
		ErrInternal(c, "Failed to generate PDF report")
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
