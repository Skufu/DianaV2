package metrics

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// PrometheusMetrics holds all Prometheus-style metrics for the application
// These are in-memory counters and gauges that can be exposed via /metrics endpoint
type PrometheusMetrics struct {
	// HTTP metrics
	httpRequestsTotal   *CounterVec
	httpRequestDuration *HistogramVec
	httpResponseSize    *HistogramVec

	// Business metrics
	assessmentsCreated *Counter
	assessmentsByRisk  *CounterVec
	usersRegistered    *Counter
	usersActive        *Gauge

	// ML metrics
	mlPredictionsTotal    *CounterVec
	mlPredictionDuration  *HistogramVec
	mlCircuitBreakerState *GaugeVec
	mlDriftAlerts         *Gauge

	// Database metrics
	dbQueryDuration     *HistogramVec
	dbConnectionsActive *Gauge
	dbConnectionsIdle   *Gauge

	// System metrics
	uptime    *Gauge
	startTime time.Time
}

// Counter is a simple counter metric
type Counter struct {
	mu    sync.Mutex
	value float64
	name  string
}

// CounterVec is a counter with labels
type CounterVec struct {
	mu       sync.RWMutex
	counters map[string]*Counter
	name     string
}

// Gauge is a simple gauge metric
type Gauge struct {
	mu    sync.Mutex
	value float64
	name  string
}

// GaugeVec is a gauge with labels
type GaugeVec struct {
	mu     sync.RWMutex
	gauges map[string]*Gauge
	name   string
}

// HistogramVec is a histogram with labels
type HistogramVec struct {
	mu      sync.RWMutex
	buckets map[string][]float64
	sums    map[string]float64
	counts  map[string]uint64
	name    string
	bounds  []float64
}

// Histogram is an observer for a specific label combination
type Histogram struct {
	hv  *HistogramVec
	key string
}

// NewCounter creates a new counter
func NewCounter(name string) *Counter {
	return &Counter{name: name}
}

// Inc increments the counter
func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value++
}

// Add adds a value to the counter
func (c *Counter) Add(v float64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value += v
}

// Value returns the current value
func (c *Counter) Value() float64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value
}

// NewCounterVec creates a new counter vector
func NewCounterVec(name string) *CounterVec {
	return &CounterVec{
		counters: make(map[string]*Counter),
		name:     name,
	}
}

// WithLabelValues gets or creates a counter with the given labels
func (cv *CounterVec) WithLabelValues(labels ...string) *Counter {
	key := labelsToKey(labels)

	cv.mu.RLock()
	c, ok := cv.counters[key]
	cv.mu.RUnlock()
	if ok {
		return c
	}

	cv.mu.Lock()
	defer cv.mu.Unlock()
	if cv.counters[key] == nil {
		cv.counters[key] = NewCounter(cv.name + "_" + key)
	}
	return cv.counters[key]
}

// NewGauge creates a new gauge
func NewGauge(name string) *Gauge {
	return &Gauge{name: name}
}

// Set sets the gauge value
func (g *Gauge) Set(v float64) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.value = v
}

// Inc increments the gauge
func (g *Gauge) Inc() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.value++
}

// Dec decrements the gauge
func (g *Gauge) Dec() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.value--
}

// Add adds to the gauge
func (g *Gauge) Add(v float64) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.value += v
}

// Value returns the current value
func (g *Gauge) Value() float64 {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.value
}

// NewGaugeVec creates a new gauge vector
func NewGaugeVec(name string) *GaugeVec {
	return &GaugeVec{
		gauges: make(map[string]*Gauge),
		name:   name,
	}
}

// WithLabelValues gets or creates a gauge with the given labels
func (gv *GaugeVec) WithLabelValues(labels ...string) *Gauge {
	key := labelsToKey(labels)

	gv.mu.RLock()
	g, ok := gv.gauges[key]
	gv.mu.RUnlock()
	if ok {
		return g
	}

	gv.mu.Lock()
	defer gv.mu.Unlock()
	if gv.gauges[key] == nil {
		gv.gauges[key] = NewGauge(gv.name + "_" + key)
	}
	return gv.gauges[key]
}

// NewHistogramVec creates a new histogram vector with default buckets
func NewHistogramVec(name string, bounds []float64) *HistogramVec {
	if bounds == nil {
		// Default Prometheus-style buckets in seconds
		bounds = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10}
	}
	return &HistogramVec{
		buckets: make(map[string][]float64),
		sums:    make(map[string]float64),
		counts:  make(map[string]uint64),
		name:    name,
		bounds:  bounds,
	}
}

// WithLabelValues gets or creates a histogram with the given labels
func (hv *HistogramVec) WithLabelValues(labels ...string) *Histogram {
	key := labelsToKey(labels)

	hv.mu.Lock()
	if hv.buckets[key] == nil {
		hv.buckets[key] = make([]float64, len(hv.bounds))
	}
	hv.mu.Unlock()

	return &Histogram{
		hv:  hv,
		key: key,
	}
}

// Observe adds a value to the histogram
func (h *Histogram) Observe(v float64) {
	h.hv.mu.Lock()
	defer h.hv.mu.Unlock()

	// Find the buckets and increment. Prometheus buckets are cumulative (le)
	for i, bound := range h.hv.bounds {
		if v <= bound {
			h.hv.buckets[h.key][i]++
		}
	}

	// Update sum and count for this key
	h.hv.sums[h.key] += v
	h.hv.counts[h.key]++
}

func labelsToKey(labels []string) string {
	key := ""
	for i, l := range labels {
		if i > 0 {
			key += "_"
		}
		key += sanitizeLabel(l)
	}
	return key
}

func sanitizeLabel(s string) string {
	// Simple sanitization - replace invalid chars
	result := ""
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' {
			result += string(c)
		} else {
			result += "_"
		}
	}
	if result == "" {
		return "empty"
	}
	return result
}

// Global metrics instance
var globalMetrics *PrometheusMetrics
var globalMetricsMu sync.Mutex

// Init initializes the global metrics
func Init() *PrometheusMetrics {
	globalMetricsMu.Lock()
	defer globalMetricsMu.Unlock()

	if globalMetrics != nil {
		return globalMetrics
	}

	globalMetrics = &PrometheusMetrics{
		// HTTP metrics
		httpRequestsTotal: NewCounterVec("http_requests_total"),
		httpRequestDuration: NewHistogramVec("http_request_duration_seconds", []float64{
			0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60,
		}),
		httpResponseSize: NewHistogramVec("http_response_size_bytes", []float64{
			100, 1000, 10000, 100000, 1000000, 10000000,
		}),

		// Business metrics
		assessmentsCreated: NewCounter("assessments_created_total"),
		assessmentsByRisk:  NewCounterVec("assessments_by_risk_level_total"),
		usersRegistered:    NewCounter("users_registered_total"),
		usersActive:        NewGauge("users_active"),

		// ML metrics
		mlPredictionsTotal:    NewCounterVec("ml_predictions_total"),
		mlPredictionDuration:  NewHistogramVec("ml_prediction_duration_seconds", nil),
		mlCircuitBreakerState: NewGaugeVec("ml_circuit_breaker_state"),
		mlDriftAlerts:         NewGauge("ml_drift_alerts_unacknowledged"),

		// Database metrics
		dbQueryDuration:     NewHistogramVec("db_query_duration_seconds", nil),
		dbConnectionsActive: NewGauge("db_connections_active"),
		dbConnectionsIdle:   NewGauge("db_connections_idle"),

		// System metrics
		uptime:    NewGauge("service_uptime_seconds"),
		startTime: time.Now(),
	}

	return globalMetrics
}

// Get returns the global metrics instance
func Get() *PrometheusMetrics {
	if globalMetrics == nil {
		return Init()
	}
	return globalMetrics
}

// HTTPMiddleware returns a gin middleware that records HTTP metrics
func HTTPMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		m := Get()

		// Process request
		c.Next()

		// Record metrics after request
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())
		method := c.Request.Method
		path := c.FullPath()
		if path == "" {
			path = "unknown"
		}

		// Increment request counter
		m.httpRequestsTotal.WithLabelValues(method, path, status).Inc()

		// Record duration
		m.httpRequestDuration.WithLabelValues(method, path).Observe(duration)

		// Record response size
		m.httpResponseSize.WithLabelValues(method, path).Observe(float64(c.Writer.Size()))

		// Update uptime
		m.uptime.Set(time.Since(m.startTime).Seconds())
	}
}

// RecordAssessmentCreated records an assessment creation
func RecordAssessmentCreated(riskLevel string) {
	m := Get()
	m.assessmentsCreated.Inc()
	m.assessmentsByRisk.WithLabelValues(riskLevel).Inc()
}

// RecordUserRegistered records a user registration
func RecordUserRegistered() {
	Get().usersRegistered.Inc()
}

// SetActiveUsers sets the current active users count
func SetActiveUsers(count float64) {
	Get().usersActive.Set(count)
}

// RecordMLPrediction records an ML prediction
func RecordMLPrediction(modelType string, success bool, duration time.Duration) {
	m := Get()
	status := "success"
	if !success {
		status = "failure"
	}
	m.mlPredictionsTotal.WithLabelValues(modelType, status).Inc()
	m.mlPredictionDuration.WithLabelValues(modelType).Observe(duration.Seconds())
}

// SetCircuitBreakerState sets the circuit breaker state
func SetCircuitBreakerState(state string) {
	m := Get()
	value := 0.0
	switch state {
	case "closed":
		value = 0
	case "open":
		value = 1
	case "half-open":
		value = 2
	}
	m.mlCircuitBreakerState.WithLabelValues("ml_service").Set(value)
}

// SetDriftAlerts sets the unacknowledged drift alerts count
func SetDriftAlerts(count float64) {
	Get().mlDriftAlerts.Set(count)
}

// RecordDBQuery records a database query duration
func RecordDBQuery(operation string, duration time.Duration) {
	Get().dbQueryDuration.WithLabelValues(operation).Observe(duration.Seconds())
}

// SetDBConnections sets database connection counts
func SetDBConnections(active, idle float64) {
	m := Get()
	m.dbConnectionsActive.Set(active)
	m.dbConnectionsIdle.Set(idle)
}

// Handler returns an HTTP handler for the metrics endpoint
func Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.String(http.StatusOK, ExportMetrics())
	}
}

// ExportMetrics exports all metrics in Prometheus exposition format
func ExportMetrics() string {
	m := Get()
	output := ""

	// Update uptime before export
	m.uptime.Set(time.Since(m.startTime).Seconds())

	// HTTP requests total
	output += "# HELP http_requests_total Total HTTP requests\n"
	output += "# TYPE http_requests_total counter\n"
	m.httpRequestsTotal.mu.RLock()
	for key, counter := range m.httpRequestsTotal.counters {
		output += fmt.Sprintf("http_requests_total{%s} %g\n", formatLabels(key), counter.Value())
	}
	m.httpRequestsTotal.mu.RUnlock()

	// HTTP request duration
	output += "# HELP http_request_duration_seconds HTTP request duration\n"
	output += "# TYPE http_request_duration_seconds histogram\n"
	m.httpRequestDuration.mu.RLock()
	for key := range m.httpRequestDuration.buckets {
		for i, bound := range m.httpRequestDuration.bounds {
			output += fmt.Sprintf("http_request_duration_seconds_bucket{le=\"%g\",%s} %g\n",
				bound, formatLabels(key), m.httpRequestDuration.buckets[key][i])
		}
		output += fmt.Sprintf("http_request_duration_seconds_count{%s} %d\n",
			formatLabels(key), m.httpRequestDuration.counts[key])
		output += fmt.Sprintf("http_request_duration_seconds_sum{%s} %g\n",
			formatLabels(key), m.httpRequestDuration.sums[key])
	}
	m.httpRequestDuration.mu.RUnlock()

	// HTTP response size
	output += "# HELP http_response_size_bytes HTTP response size\n"
	output += "# TYPE http_response_size_bytes histogram\n"
	m.httpResponseSize.mu.RLock()
	for key := range m.httpResponseSize.buckets {
		for i, bound := range m.httpResponseSize.bounds {
			output += fmt.Sprintf("http_response_size_bytes_bucket{le=\"%g\",%s} %g\n",
				bound, formatLabels(key), m.httpResponseSize.buckets[key][i])
		}
		output += fmt.Sprintf("http_response_size_bytes_count{%s} %d\n",
			formatLabels(key), m.httpResponseSize.counts[key])
		output += fmt.Sprintf("http_response_size_bytes_sum{%s} %g\n",
			formatLabels(key), m.httpResponseSize.sums[key])
	}
	m.httpResponseSize.mu.RUnlock()

	// Business metrics
	output += "# HELP assessments_created_total Total assessments created\n"
	output += "# TYPE assessments_created_total counter\n"
	output += fmt.Sprintf("assessments_created_total %g\n", m.assessmentsCreated.Value())

	output += "# HELP users_registered_total Total users registered\n"
	output += "# TYPE users_registered_total counter\n"
	output += fmt.Sprintf("users_registered_total %g\n", m.usersRegistered.Value())

	output += "# HELP users_active Current active users\n"
	output += "# TYPE users_active gauge\n"
	output += fmt.Sprintf("users_active %g\n", m.usersActive.Value())

	output += "# HELP assessments_by_risk_level_total Total assessments by risk level\n"
	output += "# TYPE assessments_by_risk_level_total counter\n"
	m.assessmentsByRisk.mu.RLock()
	for key, counter := range m.assessmentsByRisk.counters {
		output += fmt.Sprintf("assessments_by_risk_level_total{%s} %g\n", formatLabels(key), counter.Value())
	}
	m.assessmentsByRisk.mu.RUnlock()

	// ML metrics
	output += "# HELP ml_predictions_total Total ML predictions\n"
	output += "# TYPE ml_predictions_total counter\n"
	m.mlPredictionsTotal.mu.RLock()
	for key, counter := range m.mlPredictionsTotal.counters {
		output += fmt.Sprintf("ml_predictions_total{%s} %g\n", formatLabels(key), counter.Value())
	}
	m.mlPredictionsTotal.mu.RUnlock()

	output += "# HELP ml_prediction_duration_seconds ML prediction duration\n"
	output += "# TYPE ml_prediction_duration_seconds histogram\n"
	m.mlPredictionDuration.mu.RLock()
	for key := range m.mlPredictionDuration.buckets {
		for i, bound := range m.mlPredictionDuration.bounds {
			output += fmt.Sprintf("ml_prediction_duration_seconds_bucket{le=\"%g\",%s} %g\n",
				bound, formatLabels(key), m.mlPredictionDuration.buckets[key][i])
		}
		output += fmt.Sprintf("ml_prediction_duration_seconds_count{%s} %d\n",
			formatLabels(key), m.mlPredictionDuration.counts[key])
		output += fmt.Sprintf("ml_prediction_duration_seconds_sum{%s} %g\n",
			formatLabels(key), m.mlPredictionDuration.sums[key])
	}
	m.mlPredictionDuration.mu.RUnlock()

	output += "# HELP ml_circuit_breaker_state ML circuit breaker state\n"
	output += "# TYPE ml_circuit_breaker_state gauge\n"
	m.mlCircuitBreakerState.mu.RLock()
	for key, gauge := range m.mlCircuitBreakerState.gauges {
		output += fmt.Sprintf("ml_circuit_breaker_state{%s} %g\n", formatLabels(key), gauge.Value())
	}
	m.mlCircuitBreakerState.mu.RUnlock()

	output += "# HELP ml_drift_alerts_unacknowledged Unacknowledged drift alerts\n"
	output += "# TYPE ml_drift_alerts_unacknowledged gauge\n"
	output += fmt.Sprintf("ml_drift_alerts_unacknowledged %g\n", m.mlDriftAlerts.Value())

	// Database metrics
	output += "# HELP db_query_duration_seconds Database query duration\n"
	output += "# TYPE db_query_duration_seconds histogram\n"
	m.dbQueryDuration.mu.RLock()
	for key := range m.dbQueryDuration.buckets {
		for i, bound := range m.dbQueryDuration.bounds {
			output += fmt.Sprintf("db_query_duration_seconds_bucket{le=\"%g\",%s} %g\n",
				bound, formatLabels(key), m.dbQueryDuration.buckets[key][i])
		}
		output += fmt.Sprintf("db_query_duration_seconds_count{%s} %d\n",
			formatLabels(key), m.dbQueryDuration.counts[key])
		output += fmt.Sprintf("db_query_duration_seconds_sum{%s} %g\n",
			formatLabels(key), m.dbQueryDuration.sums[key])
	}
	m.dbQueryDuration.mu.RUnlock()

	output += "# HELP db_connections_active Active DB connections\n"
	output += "# TYPE db_connections_active gauge\n"
	output += fmt.Sprintf("db_connections_active %g\n", m.dbConnectionsActive.Value())

	output += "# HELP db_connections_idle Idle DB connections\n"
	output += "# TYPE db_connections_idle gauge\n"
	output += fmt.Sprintf("db_connections_idle %g\n", m.dbConnectionsIdle.Value())

	// System metrics
	output += "# HELP service_uptime_seconds Service uptime in seconds\n"
	output += "# TYPE service_uptime_seconds gauge\n"
	output += fmt.Sprintf("service_uptime_seconds %g\n", m.uptime.Value())

	return output
}

func formatLabels(key string) string {
	// Simple label formatting - key is already sanitized
	if key == "" {
		return ""
	}
	return "labels=\"" + key + "\""
}

// StartMetricsUpdater starts a background goroutine to update periodic metrics
func StartMetricsUpdater(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Update uptime
				Get().uptime.Set(time.Since(globalMetrics.startTime).Seconds())
			}
		}
	}()

	log.Info().Msg("Metrics updater started")
}
