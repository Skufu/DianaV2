package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// RequestID middleware adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for existing request ID in headers
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		// Set request ID in context and response header
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Add to request context for downstream use
		ctx := context.WithValue(c.Request.Context(), "request_id", requestID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// Logger returns a gin middleware that logs HTTP requests using structured logging
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		requestID, _ := c.Get("request_id")

		// Skip health check endpoints in production to reduce noise
		if shouldSkipLogging(path) {
			c.Next()
			return
		}

		// Log incoming request
		log.Debug().
			Str("request_id", requestID.(string)).
			Str("method", c.Request.Method).
			Str("path", path).
			Str("query", raw).
			Str("ip", c.ClientIP()).
			Str("user_agent", c.Request.UserAgent()).
			Int64("content_length", c.Request.ContentLength).
			Msg("incoming request")

		// Process request
		c.Next()

		// Calculate latency and response size
		latency := time.Since(start)
		responseSize := c.Writer.Size()

		// Build base log event with common fields
		event := getLogEventForStatus(c.Writer.Status()).
			Str("request_id", requestID.(string)).
			Str("method", c.Request.Method).
			Str("path", path).
			Int("status", c.Writer.Status()).
			Dur("latency", latency).
			Str("latency_human", latency.String()).
			Int("response_size", responseSize).
			Str("ip", c.ClientIP())

		// Add query params if present
		if raw != "" {
			event.Str("query", raw)
		}

		// Add error details if present
		if len(c.Errors) > 0 {
			errorMsgs := make([]string, len(c.Errors))
			for i, e := range c.Errors {
				errorMsgs[i] = e.Error()
			}
			event.Strs("errors", errorMsgs)
		}

		// Add performance metrics
		if latency > 1*time.Second {
			event.Bool("slow_request", true)
		}

		// Add user context if available (from JWT)
		if userEmail, exists := c.Get("user_email"); exists {
			event.Str("user_email", userEmail.(string))
		}
		if userRole, exists := c.Get("user_role"); exists {
			event.Str("user_role", userRole.(string))
		}

		// Log with appropriate message based on status
		msg := getLogMessage(c.Writer.Status(), latency)
		event.Msg(msg)
	}
}

// InitLogger initializes the global zerolog logger with appropriate settings for different environments
func InitLogger(env string) {
	// Set consistent time format
	zerolog.TimeFieldFormat = time.RFC3339Nano
	zerolog.TimestampFieldName = "timestamp"
	zerolog.MessageFieldName = "message"
	zerolog.LevelFieldName = "level"

	// Configure log level based on environment
	switch env {
	case "prod", "production":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
		// Production: structured JSON logging
		log.Logger = zerolog.New(os.Stdout).With().
			Timestamp().
			Str("service", "diana-api").
			Str("version", getVersion()).
			Str("environment", env).
			Logger()

	case "staging", "stage":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
		// Staging: JSON with some debug info
		log.Logger = zerolog.New(os.Stdout).With().
			Timestamp().
			Str("service", "diana-api").
			Str("environment", env).
			Logger()

	default: // dev, development, or any other value
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
		// Development: pretty console logging
		consoleWriter := zerolog.ConsoleWriter{
			Out:        os.Stderr,
			TimeFormat: "15:04:05",
			NoColor:    false,
		}
		log.Logger = zerolog.New(consoleWriter).With().
			Timestamp().
			Str("service", "diana-api").
			Logger()
	}

	// Set global context fields
	log.Logger = log.Logger.With().
		Str("go_version", getGoVersion()).
		Logger()
}

// Helper functions

func generateRequestID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func shouldSkipLogging(path string) bool {
	// Skip health checks and metrics endpoints to reduce log noise
	skipPaths := []string{"/api/v1/healthz", "/api/v1/livez", "/metrics", "/favicon.ico"}
	for _, skipPath := range skipPaths {
		if path == skipPath {
			return true
		}
	}
	return false
}

func getLogEventForStatus(status int) *zerolog.Event {
	switch {
	case status >= 500:
		return log.Error()
	case status >= 400:
		return log.Warn()
	case status >= 300:
		return log.Info()
	default:
		return log.Info()
	}
}

func getLogMessage(status int, latency time.Duration) string {
	switch {
	case status >= 500:
		return "HTTP server error"
	case status >= 400:
		return "HTTP client error"
	case latency > 5*time.Second:
		return "HTTP slow request"
	default:
		return "HTTP request completed"
	}
}

func getVersion() string {
	if version := os.Getenv("APP_VERSION"); version != "" {
		return version
	}
	return "dev"
}

func getGoVersion() string {
	// This would typically come from build info in a real app
	return "go1.21"
}

// GetRequestID extracts the request ID from gin context
func GetRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		return requestID.(string)
	}
	return "unknown"
}

// LogWithRequestID creates a logger with request ID context
func LogWithRequestID(c *gin.Context) *zerolog.Logger {
	requestID := GetRequestID(c)
	logger := log.With().Str("request_id", requestID).Logger()
	return &logger
}