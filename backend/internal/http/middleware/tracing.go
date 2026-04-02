package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// TraceContext keys for context propagation
type traceContextKey string

const (
	// RequestIDKey is the context key for request ID
	RequestIDKey traceContextKey = "request_id"
	// TraceIDKey is the context key for trace ID (can be different from request ID for distributed tracing)
	TraceIDKey traceContextKey = "trace_id"
	// SpanIDKey is the context key for span ID
	SpanIDKey traceContextKey = "span_id"
	// ParentSpanIDKey is the context key for parent span ID
	ParentSpanIDKey traceContextKey = "parent_span_id"
)

// TraceContext holds distributed tracing information
type TraceContext struct {
	RequestID     string
	TraceID       string
	SpanID        string
	ParentSpanID  string
	StartTime     time.Time
	ServiceName   string
}

// GenerateTraceID generates a new trace ID
func GenerateTraceID() string {
	return generateID(16)
}

// GenerateSpanID generates a new span ID
func GenerateSpanID() string {
	return generateID(8)
}

func generateID(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based ID if crypto random fails
		return hex.EncodeToString([]byte(time.Now().String()))[:length*2]
	}
	return hex.EncodeToString(bytes)
}

// DistributedTracing middleware adds distributed tracing headers
func DistributedTracing(serviceName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Check for incoming trace context from upstream services
		traceID := c.GetHeader("X-Trace-ID")
		if traceID == "" {
			traceID = GenerateTraceID()
		}

		// Check for parent span ID from upstream
		parentSpanID := c.GetHeader("X-Parent-Span-ID")

		// Generate new span ID for this service
		spanID := GenerateSpanID()

		// Use existing request ID or generate new one
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		// Build trace context
		traceCtx := TraceContext{
			RequestID:    requestID,
			TraceID:      traceID,
			SpanID:       spanID,
			ParentSpanID: parentSpanID,
			StartTime:    startTime,
			ServiceName:  serviceName,
		}

		// Set in gin context
		c.Set(string(RequestIDKey), requestID)
		c.Set(string(TraceIDKey), traceID)
		c.Set(string(SpanIDKey), spanID)
		c.Set(string(ParentSpanIDKey), parentSpanID)
		c.Set("trace_context", traceCtx)

		// Set response headers for downstream propagation
		c.Header("X-Request-ID", requestID)
		c.Header("X-Trace-ID", traceID)
		c.Header("X-Span-ID", spanID)

		// Add trace context to request context for downstream use
		ctx := c.Request.Context()
		ctx = context.WithValue(ctx, RequestIDKey, requestID)
		ctx = context.WithValue(ctx, TraceIDKey, traceID)
		ctx = context.WithValue(ctx, SpanIDKey, spanID)
		c.Request = c.Request.WithContext(ctx)

		// Log trace start
		log.Debug().
			Str("trace_id", traceID).
			Str("span_id", spanID).
			Str("parent_span_id", parentSpanID).
			Str("request_id", requestID).
			Str("service", serviceName).
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Msg("Trace started")

		c.Next()

		// Log trace completion
		duration := time.Since(startTime)
		log.Debug().
			Str("trace_id", traceID).
			Str("span_id", spanID).
			Str("request_id", requestID).
			Str("service", serviceName).
			Dur("duration", duration).
			Int("status", c.Writer.Status()).
			Msg("Trace completed")
	}
}

// GetTraceContext extracts trace context from gin context
func GetTraceContext(c *gin.Context) TraceContext {
	if ctx, exists := c.Get("trace_context"); exists {
		if traceCtx, ok := ctx.(TraceContext); ok {
			return traceCtx
		}
	}
	
	// Build from individual values
	return TraceContext{
		RequestID:   c.GetString(string(RequestIDKey)),
		TraceID:     c.GetString(string(TraceIDKey)),
		SpanID:      c.GetString(string(SpanIDKey)),
		ParentSpanID: c.GetString(string(ParentSpanIDKey)),
		ServiceName: "diana-api",
	}
}

// GetRequestIDFromContext extracts request ID from context
func GetRequestIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(RequestIDKey).(string); ok {
		return id
	}
	return ""
}

// GetTraceIDFromContext extracts trace ID from context
func GetTraceIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(TraceIDKey).(string); ok {
		return id
	}
	return ""
}

// PropagateTraceHeaders returns headers that should be sent to downstream services
func PropagateTraceHeaders(c *gin.Context) map[string]string {
	traceCtx := GetTraceContext(c)
	headers := map[string]string{
		"X-Request-ID": traceCtx.RequestID,
		"X-Trace-ID":   traceCtx.TraceID,
		"X-Span-ID":    traceCtx.SpanID,
	}
	if traceCtx.SpanID != "" {
		headers["X-Parent-Span-ID"] = traceCtx.SpanID
	}
	return headers
}

// TracePropagator is a helper for propagating trace context to external services
type TracePropagator struct {
	ServiceName string
}

// NewTracePropagator creates a new trace propagator
func NewTracePropagator(serviceName string) *TracePropagator {
	return &TracePropagator{ServiceName: serviceName}
}

// PropagateToRequest adds trace headers to an outgoing HTTP request
func (tp *TracePropagator) PropagateToRequest(c *gin.Context, headers map[string]string) map[string]string {
	if headers == nil {
		headers = make(map[string]string)
	}

	traceCtx := GetTraceContext(c)
	
	if traceCtx.TraceID != "" {
		headers["X-Trace-ID"] = traceCtx.TraceID
	}
	if traceCtx.RequestID != "" {
		headers["X-Request-ID"] = traceCtx.RequestID
	}
	
	// Create new span ID for this outgoing request and set parent to current span
	newSpanID := GenerateSpanID()
	headers["X-Span-ID"] = newSpanID
	if traceCtx.SpanID != "" {
		headers["X-Parent-Span-ID"] = traceCtx.SpanID
	}

	return headers
}

// IsTraceEnabled checks if tracing headers are present
func IsTraceEnabled(c *gin.Context) bool {
	return c.GetHeader("X-Trace-ID") != "" || c.GetHeader("X-Request-ID") != ""
}

// RedactTraceHeaders removes trace headers from logged data
func RedactTraceHeaders(headers map[string]string) map[string]string {
	redacted := make(map[string]string)
	for k, v := range headers {
		upperKey := strings.ToUpper(k)
		// Keep trace headers but redact any potential PII in values
		if strings.Contains(upperKey, "X-TRACE") || strings.Contains(upperKey, "X-REQUEST") || 
		   strings.Contains(upperKey, "X-SPAN") {
			redacted[k] = v
		}
	}
	return redacted
}
