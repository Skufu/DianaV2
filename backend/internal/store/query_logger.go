// Package store provides query logging and N+1 detection utilities.
package store

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"
)

// QueryLogEntry represents a single database query log entry
type QueryLogEntry struct {
	Query     string        `json:"query"`
	Duration  time.Duration `json:"duration"`
	Caller    string        `json:"caller"`
	Timestamp time.Time     `json:"timestamp"`
}

// QueryLogger provides query logging and slow query detection
type QueryLogger struct {
	slowQueryThreshold time.Duration
	queries            []QueryLogEntry
	mu                 sync.RWMutex
	enabled            bool
	logger             *log.Logger
}

// NewQueryLogger creates a new query logger with specified slow query threshold
func NewQueryLogger(slowQueryThreshold time.Duration) *QueryLogger {
	if slowQueryThreshold == 0 {
		slowQueryThreshold = 100 * time.Millisecond
	}
	return &QueryLogger{
		slowQueryThreshold: slowQueryThreshold,
		queries:            make([]QueryLogEntry, 0, 1000),
		enabled:            os.Getenv("ENABLE_QUERY_LOGGING") == "true",
		logger:             log.New(os.Stdout, "[DB] ", log.LstdFlags),
	}
}

// LogQuery logs a database query with its duration
func (ql *QueryLogger) LogQuery(query string, duration time.Duration, caller string) {
	if !ql.enabled {
		return
	}

	entry := QueryLogEntry{
		Query:     sanitizeQuery(query),
		Duration:  duration,
		Caller:    caller,
		Timestamp: time.Now(),
	}

	ql.mu.Lock()
	ql.queries = append(ql.queries, entry)
	ql.mu.Unlock()

	// Log slow queries immediately
	if duration > ql.slowQueryThreshold {
		ql.logger.Printf("SLOW QUERY (%v): %s [caller: %s]", duration, truncateQuery(entry.Query, 200), caller)
	}
}

// GetSlowQueries returns all queries exceeding the threshold
func (ql *QueryLogger) GetSlowQueries() []QueryLogEntry {
	ql.mu.RLock()
	defer ql.mu.RUnlock()

	var slow []QueryLogEntry
	for _, q := range ql.queries {
		if q.Duration > ql.slowQueryThreshold {
			slow = append(slow, q)
		}
	}
	return slow
}

// GetQueryStats returns statistics about logged queries
func (ql *QueryLogger) GetQueryStats() QueryStats {
	ql.mu.RLock()
	defer ql.mu.RUnlock()

	stats := QueryStats{
		TotalQueries: len(ql.queries),
	}

	if len(ql.queries) == 0 {
		return stats
	}

	var totalDuration time.Duration
	var slowCount int

	for _, q := range ql.queries {
		totalDuration += q.Duration
		if q.Duration > ql.slowQueryThreshold {
			slowCount++
		}
		if q.Duration > stats.MaxDuration {
			stats.MaxDuration = q.Duration
		}
	}

	stats.AverageDuration = totalDuration / time.Duration(len(ql.queries))
	stats.SlowQueryCount = slowCount
	return stats
}

// Clear clears the query log
func (ql *QueryLogger) Clear() {
	ql.mu.Lock()
	defer ql.mu.Unlock()
	ql.queries = make([]QueryLogEntry, 0, 1000)
}

// QueryStats holds aggregated query statistics
type QueryStats struct {
	TotalQueries    int           `json:"total_queries"`
	SlowQueryCount  int           `json:"slow_query_count"`
	AverageDuration time.Duration `json:"average_duration"`
	MaxDuration     time.Duration `json:"max_duration"`
}

// NPlusOneDetector detects potential N+1 query patterns
type NPlusOneDetector struct {
	queryCounts map[string]int
	mu          sync.RWMutex
	threshold   int
}

// NewNPlusOneDetector creates a new N+1 detector
func NewNPlusOneDetector(threshold int) *NPlusOneDetector {
	if threshold == 0 {
		threshold = 5
	}
	return &NPlusOneDetector{
		queryCounts: make(map[string]int),
		threshold:   threshold,
	}
}

// RecordQuery records a query pattern for N+1 detection
func (np *NPlusOneDetector) RecordQuery(queryPattern string) {
	np.mu.Lock()
	defer np.mu.Unlock()
	// Normalize query pattern for comparison
	normalized := normalizeQueryPattern(queryPattern)
	np.queryCounts[normalized]++
}

// DetectNPlusOne returns potential N+1 query patterns
func (np *NPlusOneDetector) DetectNPlusOne() []NPlusOneAlert {
	np.mu.RLock()
	defer np.mu.RUnlock()

	var alerts []NPlusOneAlert
	for pattern, count := range np.queryCounts {
		if count >= np.threshold {
			alerts = append(alerts, NPlusOneAlert{
				Pattern:     pattern,
				QueryCount:  count,
				Description: fmt.Sprintf("Potential N+1: %d similar queries detected", count),
			})
		}
	}
	return alerts
}

// Reset clears the detection state
func (np *NPlusOneDetector) Reset() {
	np.mu.Lock()
	defer np.mu.Unlock()
	np.queryCounts = make(map[string]int)
}

// NPlusOneAlert represents a detected N+1 pattern
type NPlusOneAlert struct {
	Pattern     string `json:"pattern"`
	QueryCount  int    `json:"query_count"`
	Description string `json:"description"`
}

// Helper functions
func sanitizeQuery(query string) string {
	// Remove newlines and extra whitespace
	query = strings.ReplaceAll(query, "\n", " ")
	query = strings.ReplaceAll(query, "\t", " ")
	// Collapse multiple spaces
	for strings.Contains(query, "  ") {
		query = strings.ReplaceAll(query, "  ", " ")
	}
	return strings.TrimSpace(query)
}

func truncateQuery(query string, maxLen int) string {
	if len(query) <= maxLen {
		return query
	}
	return query[:maxLen] + "..."
}

func normalizeQueryPattern(query string) string {
	// Replace specific values with placeholders for pattern matching
	// This is a simple implementation - could be enhanced with regex
	query = sanitizeQuery(query)
	// Replace quoted strings with ?
	// This is a naive implementation
	return query
}

// QueryLoggingMiddleware wraps query execution with logging
type QueryLoggingMiddleware struct {
	logger   *QueryLogger
	detector *NPlusOneDetector
}

// NewQueryLoggingMiddleware creates middleware for query logging
func NewQueryLoggingMiddleware(logger *QueryLogger, detector *NPlusOneDetector) *QueryLoggingMiddleware {
	return &QueryLoggingMiddleware{
		logger:   logger,
		detector: detector,
	}
}

// LogQuery logs a query execution with context
func (m *QueryLoggingMiddleware) LogQuery(ctx context.Context, query string, duration time.Duration, caller string) {
	if m.logger != nil {
		m.logger.LogQuery(query, duration, caller)
	}
	if m.detector != nil {
		m.detector.RecordQuery(query)
	}
}

// GetNPlusOneAlerts returns current N+1 alerts
func (m *QueryLoggingMiddleware) GetNPlusOneAlerts() []NPlusOneAlert {
	if m.detector == nil {
		return nil
	}
	return m.detector.DetectNPlusOne()
}

// DefaultQueryLogger is the global query logger instance
var DefaultQueryLogger = NewQueryLogger(100 * time.Millisecond)

// DefaultNPlusOneDetector is the global N+1 detector instance
var DefaultNPlusOneDetector = NewNPlusOneDetector(5)
