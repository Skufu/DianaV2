package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestErrorResponse_FormatConsistency verifies that all error responses use the standardized APIError format
func TestErrorResponse_FormatConsistency(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		statusCode     int
		expectedFields []string
	}{
		{
			name:           "Unauthorized error response",
			statusCode:     http.StatusUnauthorized,
			expectedFields: []string{"code", "message"},
		},
		{
			name:           "Forbidden error response",
			statusCode:     http.StatusForbidden,
			expectedFields: []string{"code", "message"},
		},
		{
			name:           "Not found error response",
			statusCode:     http.StatusNotFound,
			expectedFields: []string{"code", "message"},
		},
		{
			name:           "Bad request error response",
			statusCode:     http.StatusBadRequest,
			expectedFields: []string{"code", "message"},
		},
		{
			name:           "Internal error response",
			statusCode:     http.StatusInternalServerError,
			expectedFields: []string{"code", "message"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/test", nil)

			switch tt.statusCode {
			case http.StatusUnauthorized:
				ErrUnauthorized(c)
			case http.StatusForbidden:
				ErrForbidden(c)
			case http.StatusNotFound:
				ErrNotFound(c, "test resource")
			case http.StatusBadRequest:
				ErrBadRequest(c, "test bad request")
			case http.StatusInternalServerError:
				ErrInternal(c, "test internal error")
			}

			var response map[string]any
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err, "Response should be valid JSON")

			assert.Equal(t, tt.statusCode, w.Code, "Status code should match")

			for _, field := range tt.expectedFields {
				_, exists := response[field]
				assert.True(t, exists, "Response should contain field: %s", field)
			}

			assert.Contains(t, response, "code", "Response should contain 'code' field")
			assert.Contains(t, response, "message", "Response should contain 'message' field")

			if code, ok := response["code"].(string); ok {
				assert.NotEmpty(t, code, "Code should not be empty")
			} else {
				t.Errorf("'code' field should be a string, got %T", response["code"])
			}

			if message, ok := response["message"].(string); ok {
				assert.NotEmpty(t, message, "Message should not be empty")
			} else {
				t.Errorf("'message' field should be a string, got %T", response["message"])
			}

			_, hasOldErrorField := response["error"]
			assert.False(t, hasOldErrorField, "Response should not use old 'error' field format")
		})
	}
}

func TestErrorResponse_ValidationWithDetails(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/test", nil)

	details := map[string]any{
		"email": "is required",
		"age":   "must be positive",
	}

	ErrValidation(c, details)

	var response map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, response, "code")
	assert.Contains(t, response, "message")
	assert.Contains(t, response, "details")
	assert.Equal(t, "VALIDATION_ERROR", response["code"])
	assert.Equal(t, "Invalid request payload", response["message"])
	assert.Equal(t, details, response["details"])
}
