package sentry

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"github.com/skufu/DianaV2/backend/internal/security"
)

// Config holds Sentry configuration
type Config struct {
	DSN         string
	Environment string
	Release     string
	ServerName  string
	SampleRate  float64
	Debug       bool
	Enabled     bool
}

// LoadConfig loads Sentry configuration from environment variables
func LoadConfig() Config {
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	// Sentry is disabled by default, must explicitly enable
	enabled := os.Getenv("SENTRY_ENABLED") == "true"

	dsn := os.Getenv("SENTRY_DSN")
	if dsn == "" && enabled {
		log.Warn().Msg("SENTRY_ENABLED=true but SENTRY_DSN is empty, Sentry will be disabled")
		enabled = false
	}

	sampleRate := 1.0
	if v := os.Getenv("SENTRY_SAMPLE_RATE"); v != "" {
		if f, err := parseFloat(v); err == nil {
			sampleRate = f
		}
	}

	release := os.Getenv("SENTRY_RELEASE")
	if release == "" {
		release = os.Getenv("APP_VERSION")
	}
	if release == "" {
		release = "dev"
	}

	return Config{
		DSN:         dsn,
		Environment: env,
		Release:     release,
		ServerName:  os.Getenv("SENTRY_SERVER_NAME"),
		SampleRate:  sampleRate,
		Debug:       os.Getenv("SENTRY_DEBUG") == "true",
		Enabled:     enabled,
	}
}

// Init initializes Sentry with the given configuration
func Init(config Config) error {
	if !config.Enabled || config.DSN == "" {
		log.Info().Msg("Sentry is disabled (SENTRY_ENABLED not set or SENTRY_DSN empty)")
		return nil
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              config.DSN,
		Environment:      config.Environment,
		Release:          config.Release,
		ServerName:       config.ServerName,
		SampleRate:       config.SampleRate,
		Debug:            config.Debug,
		AttachStacktrace: true,
		MaxBreadcrumbs:   100,
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Add custom tags
			event.Tags["go_version"] = runtime.Version()
			event.Tags["go_os"] = runtime.GOOS
			event.Tags["go_arch"] = runtime.GOARCH

			// Filter out common non-actionable errors
			if len(event.Exception) > 0 {
				for _, exc := range event.Exception {
					if shouldIgnoreError(exc.Value) {
						return nil
					}
				}
			}

			return event
		},
	})

	if err != nil {
		return fmt.Errorf("sentry initialization failed: %w", err)
	}

	log.Info().
		Str("environment", config.Environment).
		Str("release", config.Release).
		Float64("sample_rate", config.SampleRate).
		Msg("Sentry initialized successfully")

	return nil
}

// Flush waits for queued events to be sent
func Flush(timeout time.Duration) bool {
	return sentry.Flush(timeout)
}

// CaptureMessage sends a message to Sentry
func CaptureMessage(message string) {
	if !isConfigured() {
		return
	}
	sentry.CaptureMessage(message)
}

// CaptureError sends an error to Sentry
func CaptureError(err error) {
	if err == nil || !isConfigured() {
		return
	}
	sentry.CaptureException(err)
}

// CaptureEvent sends a custom event to Sentry
func CaptureEvent(event *sentry.Event) {
	if !isConfigured() {
		return
	}
	sentry.CaptureEvent(event)
}

// AddBreadcrumb adds a breadcrumb for the current scope
func AddBreadcrumb(breadcrumb *sentry.Breadcrumb) {
	if !isConfigured() {
		return
	}
	sentry.AddBreadcrumb(breadcrumb)
}

// SetTag sets a tag for the current scope
func SetTag(key, value string) {
	if !isConfigured() {
		return
	}
	sentry.CurrentHub().Scope().SetTag(key, value)
}

// SetUser sets user information for the current scope
func SetUser(user sentry.User) {
	if !isConfigured() {
		return
	}
	sentry.CurrentHub().Scope().SetUser(user)
}

// StartTransaction starts a new transaction for performance monitoring
func StartTransaction(ctx context.Context, operation, description string) *sentry.Span {
	if !isConfigured() {
		return nil
	}
	span := sentry.StartSpan(ctx, operation)
	span.Description = description
	return span
}

// Finish finishes a transaction/span
func Finish(span *sentry.Span) {
	if span != nil {
		span.Finish()
	}
}

// Middleware returns a Gin middleware that captures errors and adds request context
func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start a transaction for this request
		ctx := sentry.SetHubOnContext(c.Request.Context(), sentry.CurrentHub().Clone())

		span := StartTransaction(ctx, "http.server", fmt.Sprintf("%s %s", c.Request.Method, c.FullPath()))
		if span != nil {
			span.SetTag("http.method", c.Request.Method)
			span.SetTag("http.url", c.Request.URL.Path)
			span.SetTag("http.host", c.Request.Host)
			span.SetData("http.query", security.SanitizeRawQuery(c.Request.URL.RawQuery))
			defer Finish(span)
		}

		// Add request context
		if isConfigured() {
			sentry.ConfigureScope(func(scope *sentry.Scope) {
				scope.SetRequest(c.Request)
				scope.SetTag("request_id", c.GetString("request_id"))
				scope.SetTag("trace_id", c.GetString("trace_id"))

				if userID := c.GetString("user_id"); userID != "" {
					scope.SetUser(sentry.User{
						ID: userID,
					})
				}
			})
		}

		// Process the request
		c.Next()

		// Capture errors from the context
		if len(c.Errors) > 0 {
			for _, ginErr := range c.Errors {
				if err := ginErr.Err; err != nil {
					CaptureError(err)
				}
			}
		}

		// Set status code on span
		if span != nil {
			span.SetTag("http.status_code", fmt.Sprintf("%d", c.Writer.Status()))
			if c.Writer.Status() >= 500 {
				span.Status = sentry.SpanStatusInternalError
			} else if c.Writer.Status() >= 400 {
				span.Status = sentry.SpanStatusInvalidArgument
			} else {
				span.Status = sentry.SpanStatusOK
			}
		}
	}
}

// RecoveryMiddleware returns a Gin middleware that recovers from panics and sends them to Sentry
func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Capture the panic in Sentry
				if isConfigured() {
					sentry.CurrentHub().Recover(err)
					sentry.Flush(2 * time.Second)
				}

				log.Error().
					Interface("panic", err).
					Str("path", c.Request.URL.Path).
					Str("method", c.Request.Method).
					Msg("Panic recovered")

				c.AbortWithStatusJSON(500, gin.H{
					"error":   "Internal Server Error",
					"code":    "internal_error",
					"message": "An unexpected error occurred",
				})
			}
		}()

		c.Next()
	}
}

// isConfigured checks if Sentry is properly configured
func isConfigured() bool {
	hub := sentry.CurrentHub()
	return hub != nil && hub.Client() != nil
}

// shouldIgnoreError checks if an error should be ignored
func shouldIgnoreError(errorValue string) bool {
	// List of errors to ignore (not actionable)
	ignoredPatterns := []string{
		"broken pipe",
		"connection reset",
		"context canceled",
		"context deadline exceeded",
		"i/o timeout",
		"request canceled",
		"operation was canceled",
	}

	for _, pattern := range ignoredPatterns {
		if containsIgnoreCase(errorValue, pattern) {
			return true
		}
	}

	return false
}

func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) && containsSubstringIgnoreCase(s, substr)
}

func containsSubstringIgnoreCase(s, substr string) bool {
	// Simple case-insensitive substring check
	lowerS := toLower(s)
	lowerSubstr := toLower(substr)

	for i := 0; i <= len(lowerS)-len(lowerSubstr); i++ {
		if lowerS[i:i+len(lowerSubstr)] == lowerSubstr {
			return true
		}
	}
	return false
}

func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c = c + ('a' - 'A')
		}
		result[i] = c
	}
	return string(result)
}

func parseFloat(s string) (float64, error) {
	// Simple float parsing
	var result float64
	var divisor float64 = 1
	var decimal bool
	var negative bool

	if len(s) > 0 && s[0] == '-' {
		negative = true
		s = s[1:]
	}

	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '.' {
			if decimal {
				return 0, fmt.Errorf("invalid float")
			}
			decimal = true
			continue
		}
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid float")
		}

		digit := float64(c - '0')
		if decimal {
			divisor *= 10
			result += digit / divisor
		} else {
			result = result*10 + digit
		}
	}

	if negative {
		result = -result
	}

	return result, nil
}
