// Package handlers provides GDPR/privacy compliance endpoints.
package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// PrivacyHandler handles GDPR and privacy compliance endpoints
type PrivacyHandler struct {
	store store.Store
}

// NewPrivacyHandler creates a new privacy handler
func NewPrivacyHandler(store store.Store) *PrivacyHandler {
	return &PrivacyHandler{store: store}
}

// Register registers the handler routes
func (h *PrivacyHandler) Register(r *gin.RouterGroup) {
	// GDPR Data Export (Article 15 - Right of access)
	r.GET("/export/data", h.ExportUserData)

	// GDPR Data Deletion (Article 17 - Right to erasure)
	r.POST("/delete", h.DeleteUserData)

	// Consent management (GDPR Article 7)
	r.GET("/consent/history", h.GetConsentHistory)
	r.POST("/consent/withdraw", h.WithdrawConsent)

	// Data processing information (GDPR Article 13/14)
	r.GET("/processing-info", h.GetProcessingInfo)
}

// DataExportResponse represents the complete user data export
type DataExportResponse struct {
	ExportMetadata ExportMetadata   `json:"export_metadata"`
	UserProfile    models.User      `json:"user_profile"`
	Assessments    []models.Assessment `json:"assessments"`
	ConsentHistory []ConsentRecord  `json:"consent_history"`
	AuditLog       []AuditSummary   `json:"audit_log"`
	ClinicMemberships []ClinicMembership `json:"clinic_memberships,omitempty"`
}

// ExportMetadata contains information about the export
type ExportMetadata struct {
	ExportID      string    `json:"export_id"`
	ExportedAt    time.Time `json:"exported_at"`
	UserID        int64     `json:"user_id"`
	Email         string    `json:"email"`
	FormatVersion string    `json:"format_version"`
	LegalBasis    string    `json:"legal_basis"`
	RetentionDate time.Time `json:"retention_until"`
}

// ConsentRecord represents a historical consent record
type ConsentRecord struct {
	Timestamp                    time.Time `json:"timestamp"`
	ConsentPersonalData          bool      `json:"consent_personal_data"`
	ConsentResearchParticipation bool      `json:"consent_research_participation"`
	ConsentEmailUpdates          bool      `json:"consent_email_updates"`
	ConsentAnalytics             bool      `json:"consent_analytics"`
}

// AuditSummary represents anonymized audit records for the user
type AuditSummary struct {
	Action    string    `json:"action"`
	Timestamp time.Time `json:"timestamp"`
	Details   string    `json:"details,omitempty"`
}

// ClinicMembership represents clinic associations
type ClinicMembership struct {
	ClinicID   int64  `json:"clinic_id"`
	ClinicName string `json:"clinic_name"`
	Role       string `json:"role"`
	JoinedAt   time.Time `json:"joined_at"`
}

// ExportUserData exports all user data in compliance with GDPR Article 15
func (h *PrivacyHandler) ExportUserData(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
	if err != nil {
		log.Printf("[ERROR] Failed to fetch user %d for data export: %v", userClaims.UserID, err)
		ErrInternal(c, "Failed to fetch user data")
		return
	}
	if user == nil {
		ErrNotFound(c, "User")
		return
	}

	// Fetch user's assessments
	assessments, err := h.store.Assessments().ListAllLimitedByUser(c.Request.Context(), int32(userClaims.UserID), 10000)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch assessments for user %d: %v", userClaims.UserID, err)
		// Continue with empty assessments
		assessments = []models.Assessment{}
	}

	// Build consent history (current state is what we have in DB)
	consentHistory := []ConsentRecord{
		{
			Timestamp:                    user.ConsentUpdatedAt,
			ConsentPersonalData:          user.ConsentPersonalData,
			ConsentResearchParticipation: user.ConsentResearchParticipation,
			ConsentEmailUpdates:          user.ConsentEmailUpdates,
			ConsentAnalytics:             user.ConsentAnalytics,
		},
	}

	// Get audit events for this user
	auditEvents, _, err := h.store.AuditEvents().List(c.Request.Context(), models.AuditListParams{
		Actor:    user.Email,
		Page:     1,
		PageSize: 1000,
	})
	var auditSummary []AuditSummary
	if err == nil {
		for _, event := range auditEvents {
			auditSummary = append(auditSummary, AuditSummary{
				Action:    event.Action,
				Timestamp: event.CreatedAt,
				Details:   fmt.Sprintf("%s on %s", event.Action, event.TargetType),
			})
		}
	}

	// Get clinic memberships
	clinics, err := h.store.Clinics().ListUserClinics(c.Request.Context(), int32(userClaims.UserID))
	var memberships []ClinicMembership
	if err == nil {
		for _, clinic := range clinics {
			memberships = append(memberships, ClinicMembership{
				ClinicID:   clinic.ID,
				ClinicName: clinic.Name,
				Role:       clinic.Role,
				JoinedAt:   clinic.CreatedAt,
			})
		}
	}

	exportData := DataExportResponse{
		ExportMetadata: ExportMetadata{
			ExportID:      fmt.Sprintf("gdpr-export-%d-%d", userClaims.UserID, time.Now().Unix()),
			ExportedAt:    time.Now(),
			UserID:        userClaims.UserID,
			Email:         user.Email,
			FormatVersion: "1.0",
			LegalBasis:    "GDPR Article 15 - Right of access",
			RetentionDate: time.Now().AddDate(1, 0, 0), // Keep export for 1 year
		},
		UserProfile:       *user,
		Assessments:       assessments,
		ConsentHistory:    consentHistory,
		AuditLog:          auditSummary,
		ClinicMemberships: memberships,
	}

	// Check requested format
	format := c.DefaultQuery("format", "json")

	switch format {
	case "json":
		c.JSON(http.StatusOK, exportData)
	case "zip":
		h.exportDataAsZip(c, exportData, user)
	case "csv":
		h.exportDataAsCSV(c, exportData, user)
	default:
		ErrBadRequest(c, "Invalid format. Supported formats: json, zip, csv")
	}
}

// exportDataAsZip creates a ZIP file with multiple data formats
func (h *PrivacyHandler) exportDataAsZip(c *gin.Context, data DataExportResponse, user *models.User) {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Add user profile as JSON
	profileJSON, _ := json.MarshalIndent(data.UserProfile, "", "  ")
	profileFile, _ := zipWriter.Create("user_profile.json")
	profileFile.Write(profileJSON)

	// Add assessments as JSON
	assessmentsJSON, _ := json.MarshalIndent(data.Assessments, "", "  ")
	assessmentsFile, _ := zipWriter.Create("assessments.json")
	assessmentsFile.Write(assessmentsJSON)

	// Add assessments as CSV
	csvBuf := new(bytes.Buffer)
	csvWriter := csv.NewWriter(csvBuf)
	csvWriter.Write([]string{"ID", "Created At", "Risk Score", "Cluster", "HbA1c", "BMI", "FBS", "Model Version"})
	for _, a := range data.Assessments {
		csvWriter.Write([]string{
			fmt.Sprintf("%d", a.ID),
			a.CreatedAt.Format(time.RFC3339),
			fmt.Sprintf("%d", a.RiskScore),
			a.Cluster,
			fmt.Sprintf("%.2f", a.HbA1c),
			fmt.Sprintf("%.2f", a.BMI),
			fmt.Sprintf("%.2f", a.FBS),
			a.ModelVersion,
		})
	}
	csvWriter.Flush()
	csvFile, _ := zipWriter.Create("assessments.csv")
	csvFile.Write(csvBuf.Bytes())

	// Add consent history
	consentJSON, _ := json.MarshalIndent(data.ConsentHistory, "", "  ")
	consentFile, _ := zipWriter.Create("consent_history.json")
	consentFile.Write(consentJSON)

	// Add README
	readme := fmt.Sprintf(`DIANA V2 Data Export
====================
Export ID: %s
Exported At: %s
User: %s
Format Version: %s

This export contains your personal data in compliance with GDPR Article 15.
Files included:
- user_profile.json: Your complete user profile
- assessments.json: All your health assessments
- assessments.csv: Assessments in CSV format
- consent_history.json: Your consent history

For questions about your data, contact: privacy@diana-health.com
`, data.ExportMetadata.ExportID, data.ExportMetadata.ExportedAt.Format(time.RFC3339),
		user.Email, data.ExportMetadata.FormatVersion)
	readmeFile, _ := zipWriter.Create("README.txt")
	readmeFile.Write([]byte(readme))

	zipWriter.Close()

	filename := fmt.Sprintf("diana_data_export_%s_%s.zip", user.Email, time.Now().Format("2006-01-02"))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Length", fmt.Sprintf("%d", buf.Len()))
	c.Data(http.StatusOK, "application/zip", buf.Bytes())
}

// exportDataAsCSV exports user data in CSV format
func (h *PrivacyHandler) exportDataAsCSV(c *gin.Context, data DataExportResponse, user *models.User) {
	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	// Write header and user info
	writer.Write([]string{"Field", "Value"})
	writer.Write([]string{"Export ID", data.ExportMetadata.ExportID})
	writer.Write([]string{"Exported At", data.ExportMetadata.ExportedAt.Format(time.RFC3339)})
	writer.Write([]string{"User ID", fmt.Sprintf("%d", user.ID)})
	writer.Write([]string{"Email", user.Email})
	writer.Write([]string{"First Name", user.FirstName})
	writer.Write([]string{"Last Name", user.LastName})
	writer.Write([]string{"Account Status", user.AccountStatus})
	writer.Write([]string{"Created At", user.CreatedAt.Format(time.RFC3339)})
	writer.Write([]string{})

	// Write consent info
	writer.Write([]string{"Consent Personal Data", fmt.Sprintf("%t", user.ConsentPersonalData)})
	writer.Write([]string{"Consent Research", fmt.Sprintf("%t", user.ConsentResearchParticipation)})
	writer.Write([]string{"Consent Emails", fmt.Sprintf("%t", user.ConsentEmailUpdates)})
	writer.Write([]string{"Consent Analytics", fmt.Sprintf("%t", user.ConsentAnalytics)})
	writer.Write([]string{})

	// Write assessments
	writer.Write([]string{"Assessment ID", "Date", "Risk Score", "Cluster", "HbA1c", "BMI", "FBS"})
	for _, a := range data.Assessments {
		writer.Write([]string{
			fmt.Sprintf("%d", a.ID),
			a.CreatedAt.Format(time.RFC3339),
			fmt.Sprintf("%d", a.RiskScore),
			a.Cluster,
			fmt.Sprintf("%.2f", a.HbA1c),
			fmt.Sprintf("%.2f", a.BMI),
			fmt.Sprintf("%.2f", a.FBS),
		})
	}

	writer.Flush()

	filename := fmt.Sprintf("diana_data_export_%s_%s.csv", user.Email, time.Now().Format("2006-01-02"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.String(http.StatusOK, buf.String())
}

// DeleteUserData handles GDPR Article 17 - Right to erasure
func (h *PrivacyHandler) DeleteUserData(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	var req struct {
		Reason      string `json:"reason,omitempty"`
		Confirm     bool   `json:"confirm" binding:"required"`
		KeepResearch bool  `json:"keep_research_data"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		ErrBadRequest(c, "Confirmation required for data deletion")
		return
	}

	if !req.Confirm {
		ErrBadRequest(c, "You must confirm data deletion")
		return
	}

	ctx := c.Request.Context()

	// Get user info before deletion for audit
	user, err := h.store.Users().GetUserByID(ctx, int32(userClaims.UserID))
	if err != nil {
		ErrInternal(c, "Failed to fetch user")
		return
	}

	// Log the deletion request in audit
	h.store.AuditEvents().Create(ctx, models.AuditEvent{
		Actor:      user.Email,
		Action:     "data_deletion_requested",
		TargetType: "user",
		TargetID:   int(userClaims.UserID),
		Details: map[string]any{
			"reason":       req.Reason,
			"keep_research": req.KeepResearch,
		},
	})

	// Perform soft delete
	if err := h.store.Users().SoftDeleteUser(ctx, userClaims.UserID); err != nil {
		log.Printf("[ERROR] Failed to soft delete user %d: %v", userClaims.UserID, err)
		ErrInternal(c, "Failed to delete user data")
		return
	}

	// Revoke all refresh tokens
	h.store.RefreshTokens().RevokeAllUserTokens(ctx, int32(userClaims.UserID))

	// Return deletion confirmation
	c.JSON(http.StatusOK, gin.H{
		"status": "data_deletion_initiated",
		"message": "Your account and personal data have been scheduled for deletion. You have 30 days to cancel this request by contacting support.",
		"deletion_date": time.Now().AddDate(0, 0, 30).Format(time.RFC3339),
		"can_cancel": true,
	})
}

// GetConsentHistory returns user's consent history
func (h *PrivacyHandler) GetConsentHistory(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
	if err != nil {
		ErrInternal(c, "Failed to fetch user")
		return
	}

	history := []ConsentRecord{
		{
			Timestamp:                    user.ConsentUpdatedAt,
			ConsentPersonalData:          user.ConsentPersonalData,
			ConsentResearchParticipation: user.ConsentResearchParticipation,
			ConsentEmailUpdates:          user.ConsentEmailUpdates,
			ConsentAnalytics:             user.ConsentAnalytics,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"consent_history": history,
		"last_updated":    user.ConsentUpdatedAt,
	})
}

// WithdrawConsent allows users to withdraw consent for specific processing
func (h *PrivacyHandler) WithdrawConsent(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	var req struct {
		ConsentTypes []string `json:"consent_types" binding:"required"`
		Reason       string   `json:"reason,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		ErrBadRequest(c, "Consent types required")
		return
	}

	ctx := c.Request.Context()

	// Get current consent settings
	user, err := h.store.Users().GetUserByID(ctx, int32(userClaims.UserID))
	if err != nil {
		ErrInternal(c, "Failed to fetch user")
		return
	}

	// Update consent settings
	consent := models.ConsentSettings{
		ConsentPersonalData:          user.ConsentPersonalData,
		ConsentResearchParticipation: user.ConsentResearchParticipation,
		ConsentEmailUpdates:          user.ConsentEmailUpdates,
		ConsentAnalytics:             user.ConsentAnalytics,
	}

	for _, ct := range req.ConsentTypes {
		switch ct {
		case "personal_data":
			consent.ConsentPersonalData = false
		case "research":
			consent.ConsentResearchParticipation = false
		case "email":
			consent.ConsentEmailUpdates = false
		case "analytics":
			consent.ConsentAnalytics = false
		}
	}

	if err := h.store.Users().UpdateUserConsent(ctx, userClaims.UserID, consent); err != nil {
		ErrInternal(c, "Failed to update consent")
		return
	}

	// Log the consent withdrawal
	h.store.AuditEvents().Create(ctx, models.AuditEvent{
		Actor:      user.Email,
		Action:     "consent_withdrawn",
		TargetType: "user",
		TargetID:   int(userClaims.UserID),
		Details: map[string]any{
			"withdrawn_types": req.ConsentTypes,
			"reason":          req.Reason,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"status":           "consent_updated",
		"withdrawn_types":  req.ConsentTypes,
		"effective_date":   time.Now().Format(time.RFC3339),
	})
}

// GetProcessingInfo returns information about data processing (GDPR Article 13/14)
func (h *PrivacyHandler) GetProcessingInfo(c *gin.Context) {
	info := gin.H{
		"data_controller": gin.H{
			"name":    "DIANA V2 Health Platform",
			"contact": "privacy@diana-health.com",
			"address": "123 Health Street, Medical District, 12345",
		},
		"purposes": []gin.H{
			{
				"purpose":      "Health Risk Assessment",
				"legal_basis":  "Consent (GDPR Art. 6(1)(a))",
				"description":  "Processing health data to provide diabetes risk predictions",
				"retention":    "5 years after last activity",
			},
			{
				"purpose":      "Research Participation",
				"legal_basis":  "Consent (GDPR Art. 6(1)(a))",
				"description":  "Anonymized data used for medical research",
				"retention":    "Indefinite (anonymized)",
				"optional":     true,
			},
			{
				"purpose":      "Service Improvement",
				"legal_basis":  "Legitimate Interest (GDPR Art. 6(1)(f))",
				"description":  "Analytics to improve platform performance",
				"retention":    "2 years",
				"optional":     true,
			},
		},
		"recipients": []string{
			"Authorized healthcare providers",
			"Cloud hosting provider (AWS/GCP)",
			"Email service provider",
		},
		"rights": []gin.H{
			{"right": "Access", "endpoint": "/api/v1/users/me/privacy/export/data"},
			{"right": "Rectification", "endpoint": "/api/v1/users/me/profile"},
			{"right": "Erasure", "endpoint": "/api/v1/users/me/privacy/delete"},
			{"right": "Restrict Processing", "endpoint": "/api/v1/users/me/privacy/consent/withdraw"},
			{"right": "Data Portability", "endpoint": "/api/v1/users/me/privacy/export/data?format=zip"},
			{"right": "Object", "endpoint": "/api/v1/users/me/privacy/consent/withdraw"},
		},
		"automated_decision_making": gin.H{
			"exists":      true,
			"description": "ML models predict diabetes risk based on biomarkers",
			"logic":       "Supervised learning classifier trained on clinical data",
			"significance": "Results are for screening purposes only, not diagnosis",
		},
		"retention_policy": gin.H{
			"active_accounts":     "5 years from last login",
			"deleted_accounts":    "30 days grace period + 90 days purge",
			"assessment_data":     "Duration of account + 2 years",
			"audit_logs":          "7 years (legal requirement)",
			"consent_records":     "Duration of account + 5 years",
		},
	}

	c.JSON(http.StatusOK, info)
}
