package store

import (
	"testing"
	"time"
)

func TestQueryLogger(t *testing.T) {
	logger := NewQueryLogger(50 * time.Millisecond)
	logger.enabled = true // Enable for testing

	// Test logging
	logger.LogQuery("SELECT * FROM users WHERE id = 1", 10*time.Millisecond, "TestQueryLogger")
	logger.LogQuery("SELECT * FROM assessments WHERE user_id = 1", 100*time.Millisecond, "TestQueryLogger")

	// Test slow query detection
	slowQueries := logger.GetSlowQueries()
	if len(slowQueries) != 1 {
		t.Errorf("Expected 1 slow query, got %d", len(slowQueries))
	}

	// Test stats
	stats := logger.GetQueryStats()
	if stats.TotalQueries != 2 {
		t.Errorf("Expected 2 total queries, got %d", stats.TotalQueries)
	}
	if stats.SlowQueryCount != 1 {
		t.Errorf("Expected 1 slow query in stats, got %d", stats.SlowQueryCount)
	}
}

func TestNPlusOneDetector(t *testing.T) {
	detector := NewNPlusOneDetector(3)

	// Simulate N+1 pattern - multiple similar queries
	for i := 0; i < 5; i++ {
		detector.RecordQuery("SELECT * FROM assessments WHERE user_id = X")
	}

	alerts := detector.DetectNPlusOne()
	if len(alerts) != 1 {
		t.Errorf("Expected 1 N+1 alert, got %d", len(alerts))
	}

	if alerts[0].QueryCount != 5 {
		t.Errorf("Expected 5 queries in alert, got %d", alerts[0].QueryCount)
	}
}

func TestNPlusOneDetectorReset(t *testing.T) {
	detector := NewNPlusOneDetector(2)

	detector.RecordQuery("SELECT * FROM users")
	detector.RecordQuery("SELECT * FROM users")

	alerts := detector.DetectNPlusOne()
	if len(alerts) != 1 {
		t.Errorf("Expected 1 alert before reset, got %d", len(alerts))
	}

	detector.Reset()

	alerts = detector.DetectNPlusOne()
	if len(alerts) != 0 {
		t.Errorf("Expected 0 alerts after reset, got %d", len(alerts))
	}
}

func TestQuerySanitization(t *testing.T) {
	query := "SELECT\n\t*\nFROM\n\tusers\nWHERE\n\tid = 1"
	sanitized := sanitizeQuery(query)

	if sanitized != "SELECT * FROM users WHERE id = 1" {
		t.Errorf("Query sanitization failed: %s", sanitized)
	}
}

func TestQueryTruncation(t *testing.T) {
	query := "SELECT * FROM users WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)"
	truncated := truncateQuery(query, 50)

	if len(truncated) <= 50 {
		t.Errorf("Expected truncated query to be longer than 50 chars (with suffix)")
	}
}

func BenchmarkQueryLogger(b *testing.B) {
	logger := NewQueryLogger(100 * time.Millisecond)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		logger.LogQuery("SELECT * FROM users WHERE id = $1", 10*time.Millisecond, "Benchmark")
	}
}

func BenchmarkNPlusOneDetector(b *testing.B) {
	detector := NewNPlusOneDetector(5)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		detector.RecordQuery("SELECT * FROM assessments WHERE user_id = X")
	}
}
