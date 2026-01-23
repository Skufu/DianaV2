package handlers_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/cache"
	"github.com/skufu/DianaV2/backend/internal/config"
	appRouter "github.com/skufu/DianaV2/backend/internal/http/router"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// TestCacheHitMissBehavior verifies that caching works correctly for analytics endpoints
func TestCacheHitMissBehavior(t *testing.T) {
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
	r := appRouter.New(cfg, st, testCache)

	testEmail := "cache-test@example.com"
	cacheKey := fmt.Sprintf("summary:%d", getTestUserID(t, pool, testEmail))
	testCache.Delete(ctx, cacheKey)

	seedTestUser(t, pool, testEmail, "testpassword123")
	userID := getTestUserID(t, pool, testEmail)
	seedTestAssessments(t, pool, userID, 5)

	token := getToken(t, r, testEmail, "testpassword123")

	metricsBefore := testCache.GetMetrics()
	req1 := httptest.NewRequest("GET", "/api/v1/analytics/summary", nil)
	req1.Header.Set("Authorization", "Bearer "+token)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("First request failed with status %d: %s", w1.Code, w1.Body.String())
	}

	metricsAfterFirst := testCache.GetMetrics()

	if metricsAfterFirst.Misses == metricsBefore.Misses {
		t.Error("Expected cache miss on first request, but miss count didn't increase")
	}

	var summary1 map[string]any
	if err := json.Unmarshal(w1.Body.Bytes(), &summary1); err != nil {
		t.Fatalf("Failed to parse first response: %v", err)
	}

	assessmentCount := int(summary1["assessment_count"].(float64))
	if assessmentCount != 5 {
		t.Errorf("Expected 5 assessments, got %d", assessmentCount)
	}

	req2 := httptest.NewRequest("GET", "/api/v1/analytics/summary", nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("Second request failed with status %d: %s", w2.Code, w2.Body.String())
	}

	metricsAfterSecond := testCache.GetMetrics()

	if metricsAfterSecond.Hits == metricsAfterFirst.Hits {
		t.Error("Expected cache hit on second request, but hit count didn't increase")
	}

	var summary2 map[string]any
	if err := json.Unmarshal(w2.Body.Bytes(), &summary2); err != nil {
		t.Fatalf("Failed to parse second response: %v", err)
	}

	if !jsonEqual(summary1, summary2) {
		t.Error("Cache hit response differs from first response")
	}

	req3 := httptest.NewRequest("GET", "/api/v1/analytics/summary", nil)
	req3.Header.Set("Authorization", "Bearer "+token)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)

	if w3.Code != http.StatusOK {
		t.Fatalf("Third request failed with status %d: %s", w3.Code, w3.Body.String())
	}

	metricsAfterThird := testCache.GetMetrics()

	expectedHits := metricsAfterSecond.Hits + 1
	if metricsAfterThird.Hits != expectedHits {
		t.Errorf("Expected %d total hits, got %d", expectedHits, metricsAfterThird.Hits)
	}

	if metricsAfterThird.Misses != metricsAfterFirst.Misses {
		t.Errorf("Expected no additional misses after first request, got %d", metricsAfterThird.Misses-metricsAfterFirst.Misses)
	}

	t.Logf("Cache metrics: Hits=%d, Misses=%d", metricsAfterThird.Hits, metricsAfterThird.Misses)

	cancel()
}

// TestCacheInvalidation verifies that cache is invalidated when assessments change
func TestCacheInvalidation(t *testing.T) {
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
	r := appRouter.New(cfg, st, testCache)

	testEmail := "cache-invalidation@example.com"
	seedTestUser(t, pool, testEmail, "testpassword123")
	userID := getTestUserID(t, pool, testEmail)
	seedTestAssessments(t, pool, userID, 3)

	token := getToken(t, r, testEmail, "testpassword123")

	req1 := httptest.NewRequest("GET", "/api/v1/analytics/summary", nil)
	req1.Header.Set("Authorization", "Bearer "+token)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("First request failed with status %d: %s", w1.Code, w1.Body.String())
	}

	var summary1 map[string]any
	if err := json.Unmarshal(w1.Body.Bytes(), &summary1); err != nil {
		t.Fatalf("Failed to parse first response: %v", err)
	}

	assessmentCount1 := int(summary1["assessment_count"].(float64))

	cacheKey := fmt.Sprintf("summary:%d", userID)
	testCache.Delete(ctx, cacheKey)

	seedTestAssessments(t, pool, userID, 1)

	req2 := httptest.NewRequest("GET", "/api/v1/analytics/summary", nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("Second request failed with status %d: %s", w2.Code, w2.Body.String())
	}

	var summary2 map[string]any
	if err := json.Unmarshal(w2.Body.Bytes(), &summary2); err != nil {
		t.Fatalf("Failed to parse second response: %v", err)
	}

	assessmentCount2 := int(summary2["assessment_count"].(float64))

	if assessmentCount2 != assessmentCount1+1 {
		t.Errorf("Expected %d assessments after invalidation, got %d", assessmentCount1+1, assessmentCount2)
	}

	cancel()
}

// TestCacheNilHandling verifies that handlers work correctly with nil cache
func TestCacheNilHandling(t *testing.T) {
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
	r := appRouter.New(cfg, st, nil)

	testEmail := "no-cache-test@example.com"
	seedTestUser(t, pool, testEmail, "testpassword123")
	userID := getTestUserID(t, pool, testEmail)
	seedTestAssessments(t, pool, userID, 2)

	token := getToken(t, r, testEmail, "testpassword123")

	for i := 0; i < 3; i++ {
		req := httptest.NewRequest("GET", "/api/v1/analytics/summary", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Request %d failed with status %d: %s", i+1, w.Code, w.Body.String())
		}

		var summary map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &summary); err != nil {
			t.Fatalf("Failed to parse response on request %d: %v", i+1, err)
		}

		assessmentCount := int(summary["assessment_count"].(float64))
		if assessmentCount != 2 {
			t.Errorf("Request %d: Expected 2 assessments, got %d", i+1, assessmentCount)
		}
	}

	cancel()
}

func getTestUserID(t *testing.T, pool *pgxpool.Pool, email string) int64 {
	t.Helper()
	var id int64
	err := pool.QueryRow(context.Background(),
		"SELECT id FROM users WHERE email = $1", email).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to get user ID: %v", err)
	}
	return id
}

func seedTestAssessments(t *testing.T, pool *pgxpool.Pool, userID int64, count int) {
	t.Helper()
	clusterNames := []string{"low_risk", "medium_risk", "high_risk"}
	for i := 0; i < count; i++ {
		_, err := pool.Exec(context.Background(), `
			INSERT INTO assessments (user_id, hba1c, fbs, cholesterol, ldl, hdl, triglycerides, bmi, risk_score, cluster)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT DO NOTHING`,
			userID, 6.0+float64(i)*0.1, 100+float64(i)*5, 200+float64(i)*10,
			130+float64(i)*5, 50+float64(i)*2, 150+float64(i)*10,
			25.0+float64(i), 0.5+float64(i)*0.1, clusterNames[i%3])
		if err != nil {
			t.Fatalf("Failed to seed assessment %d: %v", i, err)
		}
	}
}

func jsonEqual(a, b map[string]any) bool {
	if len(a) != len(b) {
		return false
	}
	for k, v := range a {
		if bv, ok := b[k]; !ok {
			return false
		} else {
			if fmt.Sprintf("%v", v) != fmt.Sprintf("%v", bv) {
				return false
			}
		}
	}
	return true
}
