# Logging Improvements - Industry Standards Implementation

This document outlines the comprehensive logging improvements implemented to meet industry standards for observability, debugging, and operational monitoring.

## 🎯 Industry Standards Implemented

### 1. **Structured Logging**
- **JSON Format**: Production-ready structured JSON logging
- **Consistent Fields**: Standardized field names across all log entries
- **Contextual Information**: Rich metadata for debugging and monitoring

### 2. **Request Tracing**
- **Unique Request IDs**: Every request gets a unique identifier
- **Request Correlation**: Track requests across multiple services/components
- **User Context**: Associate actions with authenticated users

### 3. **Log Levels & Environment-Based Configuration**
- **Development**: Pretty-printed console logs with colors
- **Staging**: JSON logs with debug information
- **Production**: Optimized JSON logs for monitoring systems

### 4. **Performance Monitoring**
- **Response Time Tracking**: Latency measurement for all requests
- **Slow Request Detection**: Automatic flagging of slow operations
- **Resource Usage**: Response size and request metrics

## 📊 Logging Features

### Request ID Generation
```go
// Automatic generation of unique 16-character hex IDs
// Support for X-Request-ID header propagation
// Context propagation throughout request lifecycle
```

### User Context Tracking
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "service": "diana-api",
  "request_id": "e31a12b91ae606fd",
  "user_email": "demo@diana.app",
  "user_role": "clinician",
  "method": "POST",
  "path": "/api/v1/patients",
  "status": 201,
  "latency": "45.2ms",
  "response_size": 256,
  "ip": "127.0.0.1"
}
```

### Environment-Specific Configuration

#### Development Mode
```
13:34:52 INF starting server cors_origins=["http://localhost:4000"] 
          env=dev go_version=go1.21 jwt_secret=dev-default port=8080 service=diana-api
```

#### Production Mode (JSON)
```json
{
  "timestamp": "2025-01-15T10:30:45.123456789Z",
  "level": "info",
  "service": "diana-api",
  "version": "v1.2.3",
  "environment": "production",
  "go_version": "go1.21",
  "message": "server started successfully",
  "port": "8080",
  "health": "https://api.diana.app/api/v1/healthz"
}
```

## 🔧 Implementation Details

### Middleware Stack
1. **RequestID Middleware**: Generates/propagates request IDs
2. **Logger Middleware**: Captures request/response details
3. **Auth Middleware**: Enhanced with user context logging
4. **Recovery Middleware**: Structured error logging

### Log Levels Used
- **DEBUG**: Incoming requests, detailed debugging (dev only)
- **INFO**: Normal operations, request completion
- **WARN**: Authentication failures, client errors (4xx)
- **ERROR**: Server errors (5xx), database issues

### Performance Optimizations
- **Health Check Skipping**: `/healthz` and `/livez` not logged in production
- **Conditional Logging**: Debug logs only in development
- **Efficient Request ID**: 8-byte hex encoding for minimal overhead

## 🚀 Operational Benefits

### 1. **Debugging & Troubleshooting**
- **Request Correlation**: Follow a request through all components
- **User Action Tracking**: See what users are doing when issues occur
- **Performance Insights**: Identify slow endpoints and optimization opportunities

### 2. **Security & Audit**
- **Authentication Tracking**: Failed login attempts with IP addresses
- **User Activity**: Actions associated with specific users
- **Request Forensics**: Complete request context for security analysis

### 3. **Monitoring & Alerting**
- **Structured Data**: Easy integration with log aggregation systems
- **Metric Extraction**: Response times, error rates, user patterns
- **Automated Alerts**: Slow requests, error spikes, authentication failures

## 📈 Example Log Entries

### Successful Authentication
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "debug",
  "service": "diana-api",
  "request_id": "a1b2c3d4e5f6g7h8",
  "user_email": "demo@diana.app",
  "user_role": "clinician",
  "message": "authentication successful"
}
```

### Failed Authentication
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "warn",
  "service": "diana-api", 
  "request_id": "x1y2z3w4v5u6t7s8",
  "ip": "192.168.1.100",
  "path": "/api/v1/patients",
  "error": "signature is invalid",
  "message": "authentication failed: invalid token"
}
```

### Slow Request Alert
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "service": "diana-api",
  "request_id": "slow123456789",
  "method": "POST", 
  "path": "/api/v1/patients/123/assessments",
  "status": 201,
  "latency": "2.3s",
  "latency_human": "2.3s",
  "slow_request": true,
  "user_email": "demo@diana.app",
  "message": "HTTP slow request"
}
```

### Server Error
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "error",
  "service": "diana-api",
  "request_id": "err987654321",
  "method": "GET",
  "path": "/api/v1/insights/cluster-distribution", 
  "status": 500,
  "latency": "120ms",
  "ip": "127.0.0.1",
  "errors": ["database connection failed", "context deadline exceeded"],
  "message": "HTTP server error"
}
```

## 🔍 Monitoring Integration

### Log Aggregation Systems
- **ELK Stack**: Direct JSON log ingestion
- **Datadog**: Structured log parsing and dashboards
- **CloudWatch**: AWS native log aggregation
- **Grafana Loki**: Prometheus-style log aggregation

### Metrics Extraction
- **Request Rate**: Requests per second by endpoint
- **Error Rate**: 4xx/5xx response percentage
- **Response Time**: P50, P95, P99 latency percentiles
- **User Activity**: Active users and action patterns

### Alert Examples
```yaml
# Slow Request Alert
alert: slow_requests
query: latency > 2s
threshold: 5 occurrences in 5 minutes
action: notify ops team

# Authentication Failure Alert  
alert: auth_failures
query: level="warn" AND message contains "authentication failed"
threshold: 10 occurrences in 1 minute
action: security notification

# Error Rate Alert
alert: high_error_rate
query: status >= 500
threshold: error_rate > 5% over 5 minutes  
action: page on-call engineer
```

## 🛠️ Usage Examples

### Handler Logging
```go
func (h *Handler) createPatient(c *gin.Context) {
    logger := middleware.LogWithRequestID(c)
    
    logger.Info().
        Str("action", "create_patient").
        Msg("processing patient creation request")
    
    // ... handler logic ...
    
    logger.Info().
        Str("patient_id", patient.ID).
        Msg("patient created successfully")
}
```

### Error Logging
```go
if err := h.store.CreatePatient(ctx, patient); err != nil {
    middleware.LogWithRequestID(c).Error().
        Err(err).
        Str("patient_email", patient.Email).
        Msg("failed to create patient")
    return
}
```

This logging system provides enterprise-grade observability while maintaining excellent developer experience for local debugging.