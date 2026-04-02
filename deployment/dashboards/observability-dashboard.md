# DianaV2 Observability Dashboard

This document describes the observability dashboards for the DianaV2 medical AI platform.

## Overview

The observability stack includes:
- **Metrics**: Prometheus-style metrics via `/api/v1/metrics`
- **Logs**: Structured JSON logging with PII redaction
- **Traces**: Distributed tracing with X-Request-ID propagation
- **Errors**: Sentry integration for error tracking
- **Profiling**: pprof endpoints for performance analysis

## Dashboards

### 1. Service Health Dashboard

**Purpose**: Monitor overall service health and availability

**Key Metrics**:
- `up{job="diana-backend"}` - Backend service availability
- `up{job="diana-ml"}` - ML service availability
- `http_requests_total{path="/api/v1/health"}` - Health check success rate
- `service_uptime_seconds` - Service uptime

**Alert Thresholds**:
- Service down for > 1 minute → Critical
- Health check failure rate > 5% → Warning

### 2. Performance Dashboard

**Purpose**: Track API performance and latency

**Key Metrics**:
- `http_request_duration_seconds` (p50, p95, p99)
- `http_response_size_bytes` - Response sizes
- `ml_prediction_duration_seconds` - ML prediction latency
- `db_query_duration_seconds` - Database query latency

**Alert Thresholds**:
- p95 latency > 2s for 5 minutes → Warning
- p99 latency > 5s for 3 minutes → Critical

### 3. Error Tracking Dashboard

**Purpose**: Monitor errors and exceptions

**Key Metrics**:
- `http_requests_total{status=~"5.."}` - 5xx error rate
- `http_requests_total{status=~"4.."}` - 4xx error rate
- `ml_predictions_total{status="failure"}` - ML prediction failures
- Sentry issues by error type

**Alert Thresholds**:
- 5xx error rate > 10% → Warning
- 5xx error rate > 50% → Critical

### 4. Business Metrics Dashboard

**Purpose**: Track business-level metrics

**Key Metrics**:
- `assessments_created_total` - Total assessments created
- `assessments_by_risk_level_total` - Assessments by risk level
- `users_registered_total` - User registrations
- `users_active` - Active users
- `ml_circuit_breaker_state` - Circuit breaker state
- `ml_drift_alerts_unacknowledged` - Unacknowledged drift alerts

### 5. ML Service Dashboard

**Purpose**: Monitor ML service health and performance

**Key Metrics**:
- ML prediction latency (p50, p95, p99)
- ML prediction success/failure rates
- Circuit breaker state transitions
- Model drift alerts
- Feature distribution (via drift detection)

## Accessing Dashboards

### Local Development

```bash
# Metrics endpoint
curl http://localhost:8080/api/v1/metrics

# Health endpoint
curl http://localhost:8080/api/v1/health

# pprof profiling
curl -o cpu.prof http://localhost:8080/api/v1/debug/pprof/profile?seconds=30
curl -o heap.prof http://localhost:8080/api/v1/debug/pprof/heap
go tool pprof cpu.prof
```

### Production

In production, metrics are scraped by your monitoring system (Prometheus, Datadog, etc.):

```yaml
# Example Prometheus scrape configuration
scrape_configs:
  - job_name: 'diana-backend'
    static_configs:
      - targets: ['diana-backend:8080']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 30s

  - job_name: 'diana-ml'
    static_configs:
      - targets: ['diana-ml:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

## Tracing

Distributed tracing headers are automatically propagated:

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Unique request identifier |
| `X-Trace-ID` | Trace identifier for distributed tracing |
| `X-Span-ID` | Current span identifier |
| `X-Parent-Span-ID` | Parent span identifier |

Example:
```bash
curl -H "X-Request-ID: $(uuidgen)" \
     -H "X-Trace-ID: $(uuidgen)" \
     http://localhost:8080/api/v1/health
```

## Log Analysis

Structured logs can be queried using your log aggregation system:

```bash
# Example: Find all slow requests
jq 'select(.latency > "1s")' /var/log/diana/*.log

# Example: Find all ML prediction failures
jq 'select(.component == "ml" and .level == "ERROR")' /var/log/diana/*.log

# Example: Trace a request through the system
jq 'select(.request_id == "abc123")' /var/log/diana/*.log
```

## Profiling Usage

### CPU Profiling

```bash
# Capture 30-second CPU profile
curl -o cpu.prof http://localhost:8080/api/v1/debug/pprof/profile?seconds=30

# Analyze
go tool pprof cpu.prof
(pprof) top
(pprof) list <function>
(pprof) web
```

### Memory Profiling

```bash
# Capture heap profile
curl -o heap.prof http://localhost:8080/api/v1/debug/pprof/heap

# Analyze
go tool pprof heap.prof
(pprof) top
(pprof) alloc_space
```

### Goroutine Analysis

```bash
# Capture goroutine dump
curl -o goroutines.prof http://localhost:8080/api/v1/debug/pprof/goroutine
go tool pprof goroutines.prof
```

### Execution Tracing

```bash
# Capture 5-second execution trace
curl -o trace.out http://localhost:8080/api/v1/debug/pprof/trace?seconds=5
go tool trace trace.out
```

## Deployment Annotations

Deployment events are logged with structured data:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "message": "Deployment completed",
  "service": "diana-backend",
  "version": "v2.1.0",
  "deployment": {
    "id": "deploy-123",
    "environment": "production",
    "commit": "abc123",
    "previous_version": "v2.0.9"
  }
}
```

## Alerting Channels

Alerts are sent to the following channels:

| Severity | Channel | Response Time |
|----------|---------|---------------|
| Critical | PagerDuty + Slack #critical-alerts | 15 minutes |
| Warning | Slack #alerts | 1 hour |
| Info | Slack #info | N/A |

## Runbooks

### Circuit Breaker Open

1. Check ML service health: `curl /api/v1/health`
2. Check ML service logs for errors
3. Verify ML service connectivity from backend
4. If ML service is healthy, circuit will auto-close after 30s
5. If persistent, investigate network issues

### High Error Rate

1. Identify error type from Sentry or logs
2. Check recent deployments: `git log --oneline -10`
3. Check database connectivity
4. Check external service dependencies
5. Consider rollback if error rate > 50%

### High Latency

1. Check database query performance
2. Check ML prediction latency
3. Check cache hit rates
4. Review recent code changes
5. Scale resources if needed

## PII Handling

All logs automatically redact PII:

- Email addresses → `[REDACTED_EMAIL]`
- Phone numbers → `[REDACTED_PHONE]`
- IP addresses → `[REDACTED_IP]`
- JWT tokens → `[REDACTED_JWT]`
- Passwords → `[REDACTED_PASSWORD]`
- API keys → `[REDACTED_API_KEY]`

## Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Metrics | 15 days (prometheus default) |
| Logs | 30 days |
| Traces | 7 days |
| Profiling data | 7 days |
| Sentry errors | 90 days |
