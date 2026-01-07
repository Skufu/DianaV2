package middleware

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimiter_Allow(t *testing.T) {
	// Create limiter: 3 requests per 100ms
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     3,
		duration: 100 * time.Millisecond,
	}

	// First 3 requests should be allowed
	for i := 0; i < 3; i++ {
		if !rl.Allow("user1") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}

	// 4th request should be denied
	if rl.Allow("user1") {
		t.Fatal("4th request should be denied")
	}

	// Different user should be allowed
	if !rl.Allow("user2") {
		t.Fatal("different user should be allowed")
	}
}

func TestRateLimiter_TokenRefill(t *testing.T) {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     2,
		duration: 50 * time.Millisecond,
	}

	// Consume all tokens
	rl.Allow("user1")
	rl.Allow("user1")

	// Should be denied
	if rl.Allow("user1") {
		t.Fatal("should be denied after consuming tokens")
	}

	// Wait for refill
	time.Sleep(60 * time.Millisecond)

	// Should be allowed again
	if !rl.Allow("user1") {
		t.Fatal("should be allowed after refill")
	}
}

func TestRateLimiter_Concurrent(t *testing.T) {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     100,
		duration: time.Second,
	}

	var wg sync.WaitGroup
	allowed := make(chan bool, 200)

	// 10 goroutines making 20 requests each
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 20; j++ {
				allowed <- rl.Allow("concurrent-user")
			}
		}()
	}

	wg.Wait()
	close(allowed)

	allowedCount := 0
	for a := range allowed {
		if a {
			allowedCount++
		}
	}

	// Should allow exactly 100 requests
	if allowedCount != 100 {
		t.Fatalf("expected 100 allowed requests, got %d", allowedCount)
	}
}

func TestRateLimit_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     2,
		duration: time.Second,
	}

	r := gin.New()
	r.Use(RateLimit(rl))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// First 2 requests should succeed
	for i := 0; i < 2; i++ {
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.1:1234"
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200, got %d", i+1, w.Code)
		}
	}

	// 3rd request should be rate limited
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.1:1234"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w.Code)
	}
}

func TestRateLimit_UsesAuthenticatedEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     1,
		duration: time.Second,
	}

	r := gin.New()
	// Inject user claims before rate limiter
	r.Use(func(c *gin.Context) {
		c.Set("user", UserClaims{
			UserID: 1,
			Email:  "test@example.com",
			Role:   "clinician",
		})
		c.Next()
	})
	r.Use(RateLimit(rl))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// First request allowed
	req1, _ := http.NewRequest("GET", "/test", nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w1.Code)
	}

	// Second request denied (same email)
	req2, _ := http.NewRequest("GET", "/test", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", w2.Code)
	}
}

func TestNewRateLimiter(t *testing.T) {
	rl := NewRateLimiter(10, time.Minute)
	if rl == nil {
		t.Fatal("NewRateLimiter returned nil")
	}
	if rl.rate != 10 {
		t.Errorf("rate = %d, want 10", rl.rate)
	}
	if rl.duration != time.Minute {
		t.Errorf("duration = %v, want 1m", rl.duration)
	}
}
