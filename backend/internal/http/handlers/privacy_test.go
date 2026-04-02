package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
)

func TestPrivacyHandler_GetProcessingInfo(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := NewPrivacyHandler(nil) // nil store is OK for this endpoint
	handler.Register(router.Group("/privacy"))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/privacy/processing-info", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Check required fields
	if _, ok := response["data_controller"]; !ok {
		t.Error("Missing data_controller in response")
	}
	if _, ok := response["purposes"]; !ok {
		t.Error("Missing purposes in response")
	}
	if _, ok := response["rights"]; !ok {
		t.Error("Missing rights in response")
	}
}

func TestPrivacyHandler_ExportUserData_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := NewPrivacyHandler(nil)
	api := router.Group("/api")
	protected := api.Group("")
	protected.Use(func(c *gin.Context) {
		// Simulate missing auth
		c.Next()
	})
	handler.Register(protected.Group("/privacy"))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/privacy/export/data", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", w.Code)
	}
}

func TestPrivacyHandler_DeleteUserData_Validation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := NewPrivacyHandler(nil)
	api := router.Group("/api")
	protected := api.Group("")
	protected.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{UserID: 1, Email: "test@example.com"})
		c.Next()
	})
	handler.Register(protected.Group("/privacy"))

	// Test without confirmation
	body := map[string]bool{"confirm": false}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/privacy/delete", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for invalid confirmation, got %d", w.Code)
	}
}

func TestPrivacyHandler_WithdrawConsent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := NewPrivacyHandler(nil)
	api := router.Group("/api")
	protected := api.Group("")
	protected.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{UserID: 1, Email: "test@example.com"})
		c.Next()
	})
	handler.Register(protected.Group("/privacy"))

	// Test valid consent withdrawal
	body := map[string]any{
		"consent_types": []string{"email", "analytics"},
		"reason":        "No longer interested",
	}
	jsonBody, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/privacy/consent/withdraw", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Expect 500 because we have no real store, but it got past validation
	if w.Code != http.StatusInternalServerError && w.Code != http.StatusOK {
		t.Errorf("Expected status 500 or 200, got %d", w.Code)
	}
}

func TestDataExportResponse_Structure(t *testing.T) {
	export := DataExportResponse{
		ExportMetadata: ExportMetadata{
			ExportID:      "test-export-123",
			FormatVersion: "1.0",
			LegalBasis:    "GDPR Article 15",
		},
		ConsentHistory: []ConsentRecord{},
		AuditLog:       []AuditSummary{},
	}

	data, err := json.Marshal(export)
	if err != nil {
		t.Fatalf("Failed to marshal export: %v", err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal export: %v", err)
	}

	// Verify structure
	if _, ok := parsed["export_metadata"]; !ok {
		t.Error("Missing export_metadata")
	}
	if _, ok := parsed["user_profile"]; !ok {
		t.Error("Missing user_profile")
	}
	if _, ok := parsed["assessments"]; !ok {
		t.Error("Missing assessments")
	}
	if _, ok := parsed["consent_history"]; !ok {
		t.Error("Missing consent_history")
	}
}
