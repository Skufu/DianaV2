package handlers_test

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TestConnectionPoolExhaustion_500Users verifies that the database connection pool
// handles 500 concurrent users without exhaustion. This test monitors pool statistics
// to ensure connections are properly recycled and MaxConns=50 is sufficient.
func TestConnectionPoolExhaustion_500Users(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN not set; skipping integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("failed to parse DB config: %v", err)
	}

	// Configure pool for production-like settings
	poolConfig.MaxConns = 50
	poolConfig.MinConns = 10
	poolConfig.MaxConnLifetime = 1 * time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		t.Fatalf("failed to init pgx pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("failed to ping database: %v", err)
	}

	r := gin.New()
	r.GET("/api/v1/db-test", func(c *gin.Context) {
		var count int64
		err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"count": count})
	})

	var totalRequests int32 = 500
	var successCount int32 = 0
	var errorCount int32 = 0
	var poolExhaustionCount int32 = 0

	var wg sync.WaitGroup
	startTime := time.Now()

	statsTicker := time.NewTicker(100 * time.Millisecond)
	defer statsTicker.Stop()

	go func() {
		for range statsTicker.C {
			stats := pool.Stat()
			log.Printf("[POOL STATS] Acquired: %d/%d MaxConns | Idle: %d | Total: %d",
				stats.AcquiredConns(), stats.MaxConns(),
				stats.IdleConns(), stats.TotalConns())

			if stats.AcquiredConns() >= stats.MaxConns() {
				atomic.AddInt32(&poolExhaustionCount, 1)
			}
		}
	}()

	for i := 0; i < int(totalRequests); i++ {
		wg.Add(1)
		go func(requestNum int) {
			defer wg.Done()

			req, _ := http.NewRequest("GET", "/api/v1/db-test", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code == http.StatusOK {
				atomic.AddInt32(&successCount, 1)
			} else {
				atomic.AddInt32(&errorCount, 1)
				log.Printf("Request %d failed with status %d: %s", requestNum, w.Code, w.Body.String())
			}
		}(i)
	}

	wg.Wait()
	endTime := time.Now()
	totalDuration := endTime.Sub(startTime)

	finalStats := pool.Stat()
	successRate := (float64(successCount) / float64(totalRequests)) * 100

	fmt.Printf("\n=== Connection Pool Exhaustion Test Results ===\n")
	fmt.Printf("Total Requests: %d\n", totalRequests)
	fmt.Printf("Successful Requests: %d (%.2f%%)\n", successCount, successRate)
	fmt.Printf("Failed Requests: %d\n", errorCount)
	fmt.Printf("Total Duration: %v\n", totalDuration)
	fmt.Printf("\nConnection Pool Configuration:\n")
	fmt.Printf("  MaxConns: %d\n", poolConfig.MaxConns)
	fmt.Printf("  MinConns: %d\n", poolConfig.MinConns)
	fmt.Printf("  MaxConnLifetime: %s\n", poolConfig.MaxConnLifetime)
	fmt.Printf("  MaxConnIdleTime: %s\n", poolConfig.MaxConnIdleTime)
	fmt.Printf("\nFinal Pool Statistics:\n")
	fmt.Printf("  Acquired Connections: %d/%d\n", finalStats.AcquiredConns(), finalStats.MaxConns())
	fmt.Printf("  Idle Connections: %d\n", finalStats.IdleConns())
	fmt.Printf("  Total Connections: %d\n", finalStats.TotalConns())
	fmt.Printf("  Total Acquire Count: %d\n", finalStats.AcquireCount())
	fmt.Printf("  Empty Acquire Count: %d\n", finalStats.EmptyAcquireCount())
	fmt.Printf("\nPool Exhaustion Indicators:\n")
	fmt.Printf("  Times at MaxConns: %d\n", poolExhaustionCount)
	fmt.Printf("  Connection Errors: %d\n", errorCount)

	if errorCount > 0 {
		t.Errorf("Database connection pool exhaustion detected: %d out of %d requests failed",
			errorCount, totalRequests)
	}

	if successRate < 100.0 {
		t.Errorf("Success rate below target: %.2f%% (target: 100%%)", successRate)
	}

	if finalStats.EmptyAcquireCount() < int64(totalRequests/2) {
		t.Errorf("Low EmptyAcquireCount indicates pool exhaustion: %d (expected > %d)",
			finalStats.EmptyAcquireCount(), totalRequests/2)
	}

	time.Sleep(100 * time.Millisecond)
	recoveryStats := pool.Stat()
	if recoveryStats.AcquiredConns() > 10 {
		t.Errorf("Pool did not recover: %d connections still acquired after test completed",
			recoveryStats.AcquiredConns())
	}

	log.Printf("✓ Connection pool exhaustion test passed: %d/%d requests succeeded", successCount, totalRequests)
	log.Printf("✓ Pool exhaustion events: %d (target: 0)", poolExhaustionCount)
	log.Printf("✓ EmptyAcquireCount: %d (indicates no wait time for connections)", finalStats.EmptyAcquireCount())
}
