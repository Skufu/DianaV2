package middleware

import (
	"encoding/json"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// AuditLogger provides audit logging functionality for admin actions.
// It captures the actor (from JWT claims), action type, target entity, and request details.
type AuditLogger struct {
	store store.Store
}

// NewAuditLogger creates a new AuditLogger with the given store.
func NewAuditLogger(st store.Store) *AuditLogger {
	return &AuditLogger{store: st}
}

// LogAction creates a middleware that logs the specified action after successful completion.
// The middleware runs AFTER the handler (using c.Next()) and only logs if the request succeeded.
//
// Parameters:
//   - action: The action type (e.g., "user.create", "user.update", "user.deactivate")
//   - targetType: The type of entity being acted upon (e.g., "user", "model_run")
//
// Example usage:
//
//	auditLogger := middleware.NewAuditLogger(store)
//	router.POST("/users", auditLogger.LogAction("user.create", "user"), handler.CreateUser)
func (a *AuditLogger) LogAction(action, targetType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Execute the handler first
		c.Next()

		// Only log if the request was successful (2xx status)
		if c.IsAborted() || c.Writer.Status() >= 400 {
			return
		}

		// Get user claims from context
		userInterface, exists := c.Get("user")
		if !exists {
			return // Can't log without actor information
		}

		claims, ok := userInterface.(UserClaims)
		if !ok {
			return
		}

		// Extract target ID from URL params if present
		var targetID int
		if idStr := c.Param("id"); idStr != "" {
			targetID, _ = strconv.Atoi(idStr)
		}

		// Build details from request
		details := buildAuditDetails(c)

		// Create audit event (fire and forget - don't block the response)
		go func() {
			event := models.AuditEvent{
				Actor:      claims.Email,
				Action:     action,
				TargetType: targetType,
				TargetID:   targetID,
				Details:    details,
			}
			_ = a.store.AuditEvents().Create(c.Request.Context(), event)
		}()
	}
}

// buildAuditDetails extracts relevant information from the request for audit logging.
func buildAuditDetails(c *gin.Context) map[string]interface{} {
	details := map[string]interface{}{
		"method":     c.Request.Method,
		"path":       c.Request.URL.Path,
		"status":     c.Writer.Status(),
		"ip":         c.ClientIP(),
		"user_agent": c.Request.UserAgent(),
	}

	// Include query parameters if any
	if len(c.Request.URL.Query()) > 0 {
		details["query"] = c.Request.URL.Query()
	}

	// For POST/PUT requests, try to include sanitized body info
	// We use a previously-set context value since the body is already consumed
	if bodyData, exists := c.Get("audit_body"); exists {
		details["body"] = bodyData
	}

	return details
}

// CaptureRequestBody is a helper middleware that captures the request body
// for audit logging. Should be used before handlers that need body auditing.
// It stores a sanitized version of the body (without sensitive fields like passwords).
func CaptureRequestBody() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only capture for POST/PUT/PATCH methods
		if c.Request.Method != "POST" && c.Request.Method != "PUT" && c.Request.Method != "PATCH" {
			c.Next()
			return
		}

		// Read and restore body
		bodyBytes, err := c.GetRawData()
		if err != nil {
			c.Next()
			return
		}

		// Try to parse as JSON and sanitize
		var bodyMap map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &bodyMap); err == nil {
			// Remove sensitive fields
			delete(bodyMap, "password")
			delete(bodyMap, "password_hash")
			delete(bodyMap, "token")
			delete(bodyMap, "refresh_token")

			c.Set("audit_body", bodyMap)
		}

		// Restore the body for the actual handler
		c.Request.Body = newReadCloser(bodyBytes)
		c.Next()
	}
}

// readCloser wraps a byte slice to implement io.ReadCloser
type readCloser struct {
	data   []byte
	offset int
}

func newReadCloser(data []byte) *readCloser {
	return &readCloser{data: data}
}

func (r *readCloser) Read(p []byte) (n int, err error) {
	if r.offset >= len(r.data) {
		return 0, nil
	}
	n = copy(p, r.data[r.offset:])
	r.offset += n
	return n, nil
}

func (r *readCloser) Close() error {
	return nil
}
