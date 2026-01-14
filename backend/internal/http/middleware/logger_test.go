package middleware

import (
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

func TestRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name        string
		headerValue string
		expectedLen int
	}{
		{
			name:        "generates new ID",
			headerValue: "",
			expectedLen: 16,
		},
		{
			name:        "uses existing ID",
			headerValue: "existing-request-id",
			expectedLen: 19,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			middleware := RequestID()
			c, _ := gin.CreateTestContext(nil)

			if tc.headerValue != "" {
				c.Request.Header.Set("X-Request-ID", tc.headerValue)
			}

			c.Request = c.Request
			middleware(c)

			id := c.GetString("request_id")

			if len(id) != tc.expectedLen {
				t.Errorf("request_id length = %d, want %d", len(id), tc.expectedLen)
			}

			headerID := c.Writer.Header().Get("X-Request-ID")
			if headerID != id {
				t.Errorf("X-Request-ID header = %q, want %q", headerID, id)
			}
		})
	}
}

func TestLogger_SkipPaths(t *testing.T) {
	skipTests := []string{
		"/api/v1/healthz",
		"/api/v1/livez",
		"/metrics",
		"/favicon.ico",
	}

	for _, path := range skipTests {
		if !shouldSkipLogging(path) {
			t.Errorf("shouldSkipLogging(%q) should return true", path)
		}
	}

	if shouldSkipLogging("/api/v1/assessments") {
		t.Error("shouldSkipLogging(/api/v1/assessments) should return false")
	}
}

func TestGetLogEventForStatus(t *testing.T) {
	tests := []struct {
		status   int
		expected string
	}{
		{200, "info"},
		{299, "info"},
		{300, "info"},
		{400, "warn"},
		{401, "warn"},
		{403, "warn"},
		{499, "warn"},
		{500, "error"},
		{501, "error"},
		{505, "error"},
	}

	for _, tc := range tests {
		t.Run(tc.expected, func(t *testing.T) {
			event := getLogEventForStatus(tc.status)
			if event == nil {
				t.Fatal("expected non-nil event")
			}

			expectedLevel := "info"
			if tc.status >= 400 && tc.status < 500 {
				expectedLevel = "warn"
			} else if tc.status >= 500 {
				expectedLevel = "error"
			}

			message := getLogMessage(tc.status, 0)
			if message != "HTTP "+expectedLevel+" request completed" {
				t.Errorf("unexpected log message: %q", message)
			}
		})
	}
}

func TestGetLogMessage(t *testing.T) {
	tests := []struct {
		status   int
		latency  int
		expected string
	}{
		{200, 100, "HTTP request completed"},
		{400, 0, "HTTP client error"},
		{500, 0, "HTTP server error"},
		{200, 6000000, "HTTP slow request"},
		{400, 6000000, "HTTP client error"},
	}

	for _, tc := range tests {
		t.Run("", func(t *testing.T) {
			message := getLogMessage(tc.status, time.Duration(tc.latency)*time.Millisecond)
			if message != tc.expected {
				t.Errorf("getLogMessage(%d, %d) = %q, want %q", tc.status, tc.latency, message, tc.expected)
			}
		})
	}
}

func TestGetVersion(t *testing.T) {
	version := getVersion()

	if version == "dev" || version == "" {
		t.Errorf("expected non-default version, got %q", version)
	}
}

func TestInitLogger(t *testing.T) {
	InitLogger("dev")

	if zerolog.GlobalLevel() != zerolog.DebugLevel {
		t.Errorf("expected DebugLevel in dev mode")
	}
}
