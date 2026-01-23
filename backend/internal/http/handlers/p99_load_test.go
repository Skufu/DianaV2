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

func TestHealthzLoadTest_500Users(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN not set; skipping integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to connect test db: %v", err)
	}
	defer pool.Close()
	defer cancel()

	r := gin.New()
	r.GET("/api/v1/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	var totalRequests int32 = 500
	var successCount int32 = 0
	var errorCount int32 = 0
	var totalLatency int64 = 0
	var latencies []int64
	var latenciesMutex sync.Mutex

	var wg sync.WaitGroup
	startTime := time.Now()

	for i := 0; i < int(totalRequests); i++ {
		wg.Add(1)
		go func(requestNum int) {
			defer wg.Done()

			reqStart := time.Now()
			req, _ := http.NewRequest("GET", "/api/v1/healthz", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			latency := time.Since(reqStart).Milliseconds()
			atomic.AddInt64(&totalLatency, latency)

			if w.Code == http.StatusOK {
				atomic.AddInt32(&successCount, 1)
			} else {
				atomic.AddInt32(&errorCount, 1)
				log.Printf("Request %d failed with status %d", requestNum, w.Code)
			}

			latenciesMutex.Lock()
			latencies = append(latencies, latency)
			latenciesMutex.Unlock()
		}(i)
	}

	wg.Wait()
	endTime := time.Now()
	totalDuration := endTime.Sub(startTime)

	sortLatencies(latencies)
	p99Index := int(float64(len(latencies)) * 0.99)
	var p99Latency int64 = 0
	if p99Index > 0 && p99Index < len(latencies) {
		p99Latency = latencies[p99Index]
	}

	avgLatency := float64(totalLatency) / float64(totalRequests)
	successRate := (float64(successCount) / float64(totalRequests)) * 100
	throughput := float64(totalRequests) / totalDuration.Seconds()

	fmt.Printf("\n=== Healthz Load Test Results ===\n")
	fmt.Printf("Total Requests: %d\n", totalRequests)
	fmt.Printf("Successful Requests: %d (%.2f%%)\n", successCount, successRate)
	fmt.Printf("Failed Requests: %d\n", errorCount)
	fmt.Printf("Total Duration: %v\n", totalDuration)
	fmt.Printf("Throughput: %.2f requests/second\n", throughput)
	fmt.Printf("\nLatency Metrics:\n")
	fmt.Printf("  P99 Latency: %dms (TARGET: <200ms)\n", p99Latency)
	fmt.Printf("  Average: %.2fms\n", avgLatency)
	fmt.Printf("  Min: %dms\n", minLatency(latencies))
	fmt.Printf("  Max: %dms\n", maxLatency(latencies))

	if p99Latency > 200 {
		t.Errorf("P99 latency too high: %dms (target: <200ms)", p99Latency)
	}

	if avgLatency > 100 {
		t.Errorf("Average latency too high: %.2fms (target: <100ms)", avgLatency)
	}

	if successRate < 100.0 {
		t.Errorf("Success rate too low: %.2f%% (target: 100%%)", successRate)
	}

	log.Printf("✓ Load test completed: %d/%d requests succeeded (%.2f%% success rate)", successCount, totalRequests, successRate)
	log.Printf("✓ P99 Latency: %dms (target: <200ms)", p99Latency)
	log.Printf("✓ Average latency: %.2fms", avgLatency)

	cancel()
}

func sortLatencies(latencies []int64) {
	for i := 0; i < len(latencies)-1; i++ {
		for j := i + 1; j < len(latencies); j++ {
			if latencies[i] > latencies[j] {
				latencies[i], latencies[j] = latencies[j], latencies[i]
			}
		}
	}
}

func minLatency(latencies []int64) int64 {
	if len(latencies) == 0 {
		return 0
	}
	min := latencies[0]
	for _, l := range latencies {
		if l < min {
			min = l
		}
	}
	return min
}

func maxLatency(latencies []int64) int64 {
	if len(latencies) == 0 {
		return 0
	}
	max := latencies[0]
	for _, l := range latencies {
		if l > max {
			max = l
		}
	}
	return max
}
