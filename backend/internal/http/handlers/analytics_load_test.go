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

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/cache"
	"github.com/skufu/DianaV2/backend/internal/config"
	appRouter "github.com/skufu/DianaV2/backend/internal/http/router"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// TestAnalyticsLoadTest_1000Requests runs 1000 concurrent requests to analytics endpoint
func TestAnalyticsLoadTest_1000Requests(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN not set; skipping integration tests")
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	testCache, err := cache.NewCache(redisAddr, "", 0)
	if err != nil {
		t.Skipf("Redis not available at %s: %v", redisAddr, err)
	}
	defer testCache.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to connect test db: %v", err)
	}
	defer pool.Close()

	st := store.NewPostgresStore(pool)
	cfg := config.Config{
		Port:          "0",
		Env:           "test",
		DBDSN:         dsn,
		JWTSecret:     "test-secret",
		CORSOrigins:   []string{"*"},
		ModelVersion:  "test-model",
		ExportMaxRows: 100,
	}
	r, _ := appRouter.New(cfg, st, testCache)

	testEmail := "loadtest@example.com"
	seedTestUser(t, pool, testEmail, "password123")
	userID := getTestUserID(t, pool, testEmail)
	seedTestAssessments(t, pool, userID, 10)

	token := getToken(t, r, testEmail, "password123")

	var totalRequests int32 = 1000
	var successCount int32 = 0
	var errorCount int32 = 0
	var totalLatency int64 = 0
	var minLatency int64 = int64(^uint64(0) >> 1)
	var maxLatency int64 = 0

	var wg sync.WaitGroup
	startTime := time.Now()

	for i := 0; i < int(totalRequests); i++ {
		wg.Add(1)
		go func(requestNum int) {
			defer wg.Done()

			reqStart := time.Now()
			req, _ := http.NewRequest("GET", fmt.Sprintf("/api/v1/analytics/summary?req=%d", requestNum), nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			latency := time.Since(reqStart).Milliseconds()
			atomic.AddInt64(&totalLatency, latency)

			for {
				currentMin := atomic.LoadInt64(&minLatency)
				if latency >= currentMin || atomic.CompareAndSwapInt64(&minLatency, currentMin, latency) {
					break
				}
			}
			for {
				currentMax := atomic.LoadInt64(&maxLatency)
				if latency <= currentMax || atomic.CompareAndSwapInt64(&maxLatency, currentMax, latency) {
					break
				}
			}

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

	avgLatency := float64(totalLatency) / float64(totalRequests)
	successRate := (float64(successCount) / float64(totalRequests)) * 100
	throughput := float64(totalRequests) / totalDuration.Seconds()

	fmt.Printf("\n=== Analytics Load Test Results ===\n")
	fmt.Printf("Total Requests: %d\n", totalRequests)
	fmt.Printf("Successful Requests: %d (%.2f%%)\n", successCount, successRate)
	fmt.Printf("Failed Requests: %d\n", errorCount)
	fmt.Printf("Total Duration: %v\n", totalDuration)
	fmt.Printf("Throughput: %.2f requests/second\n", throughput)
	fmt.Printf("\nLatency Metrics:\n")
	fmt.Printf("  Min: %dms\n", minLatency)
	fmt.Printf("  Max: %dms\n", maxLatency)
	fmt.Printf("  Average: %.2fms\n", avgLatency)
	fmt.Printf("\nCaching Performance:\n")
	fmt.Printf("  Expected cache hit rate: >50%% (5-minute TTL, 1000 concurrent requests)\n")
	fmt.Printf("  Cache hit time should be <10ms\n")
	fmt.Printf("  Cache miss time will include DB queries (~50-200ms)\n")

	if successCount < totalRequests*95/100 {
		t.Errorf("Too many failed requests: %d out of %d", errorCount, totalRequests)
	}

	if avgLatency > 200 {
		t.Errorf("Average latency too high: %.2fms (target: <200ms)", avgLatency)
	}

	if successRate < 99.0 {
		t.Errorf("Success rate too low: %.2f%% (target: >99%%)", successRate)
	}

	log.Printf("✓ Load test completed: %d/%d requests succeeded (%.2f%% success rate)", successCount, totalRequests, successRate)
	log.Printf("✓ Average latency: %.2fms (min: %dms, max: %dms)", avgLatency, minLatency, maxLatency)

	cancel()
}
