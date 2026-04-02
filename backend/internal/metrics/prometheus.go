package metrics

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
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
	assessmentsCreated  *Counter
	assessmentsByRisk   *CounterVec
	usersRegistered     *Counter
	usersActive         *Gauge
	
	// ML metrics
	mlPredictionsTotal      *CounterVec
	mlPredictionDuration    *HistogramVec
	mlCircuitBreakerState   *GaugeVec
	mlDriftAlerts           *Gauge
	
	// Database metrics
	dbQueryDuration     *HistogramVec
	dbConnectionsActive *Gauge
	dbConnectionsIdle   *Gauge
	
	// System metrics
	uptime              *Gauge
	startTime           time.Time
}

// Counter is a simple counter metric
type Counter struct {
	value float64
	name  string
}

// CounterVec is a counter with labels
type CounterVec struct {
	counters map[string]*Counter
	name     string
}

// Gauge is a simple gauge metric
type Gauge struct {
	value float64
	name  string
}

// GaugeVec is a gauge with labels
type GaugeVec struct {
	gauges map[string]*Gauge
	name   string
}

// HistogramVec is a histogram with labels
type HistogramVec struct {
	buckets map[string][]float64
	sums    map[string]float64
	counts  map[string]uint64
	name    string
	bounds  []float64
}

// NewCounter creates a new counter
func NewCounter(name string) *Counter {
	return &Counter{name: name}
}

// Inc increments the counter
func (c *Counter) Inc() {
	c.value++
}

// Add adds a value to the counter
func (c *Counter) Add(v float64) {
	c.value += v
}

// Value returns the current value
func (c *Counter) Value() float64 {
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
	g.value = v
}

// Inc increments the gauge
func (g *Gauge) Inc() {
	g.value++
}

// Dec decrements the gauge
func (g *Gauge) Dec() {
	g.value--
}

// Add adds to the gauge
func (g *Gauge) Add(v float64) {
	g.value += v
}

// Value returns the current value
func (g *Gauge) Value() float64 {
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
func (hv *HistogramVec) WithLabelValues(labels ...string) *HistogramVec {
	key := labelsToKey(labels)
	if hv.buckets[key] == nil {
		hv.buckets[key] = make([]float64, len(hv.bounds))
	}
	return &HistogramVec{
		buckets: hv.buckets,
		sums:    hv.sums,
		counts:  hv.counts,
		name:    hv.name,
		bounds:  hv.bounds,
	}
}

// Observe adds a value to the histogram
func (hv *HistogramVec) Observe(v float64) {
	// Find the bucket and increment
	for i, bound := range hv.bounds {
		if v <= bound {
			for key := range hv.buckets {
				hv.buckets[key][i]++
			}
			break
		}
	}
	// Update sum and count for all keys
	for key := range hv.buckets {
		hv.sums[key] += v
		hv.counts[key]++
	}
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

// Init initializes the global metrics
func Init() *PrometheusMetrics {
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
		startTime:   time.Now(),
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
	for key, counter := range m.httpRequestsTotal.counters {
		output += fmt.Sprintf("http_requests_total{%s} %g\n", formatLabels(key), counter.Value())
	}
	
	// HTTP request duration
	output += "# HELP http_request_duration_seconds HTTP request duration\n"
	output += "# TYPE http_request_duration_seconds histogram\n"
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
	
	// ML metrics
	output += "# HELP ml_predictions_total Total ML predictions\n"
	output += "# TYPE ml_predictions_total counter\n"
	for key, counter := range m.mlPredictionsTotal.counters {
		output += fmt.Sprintf("ml_predictions_total{%s} %g\n", formatLabels(key), counter.Value())
	}
	
	output += "# HELP ml_drift_alerts_unacknowledged Unacknowledged drift alerts\n"
	output += "# TYPE ml_drift_alerts_unacknowledged gauge\n"
	output += fmt.Sprintf("ml_drift_alerts_unacknowledged %g\n", m.mlDriftAlerts.Value())
	
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
