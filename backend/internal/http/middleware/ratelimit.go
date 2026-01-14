package middleware

import (
	"container/heap"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a token bucket rate limiter
type RateLimiter struct {
	visitors   map[string]*visitor
	evictHeap  visitorHeap
	mu         sync.RWMutex
	rate       int
	duration   time.Duration
	maxEntries int
}

type visitor struct {
	key        string
	tokens     int
	lastUpdate time.Time
	heapIndex  int
}

type visitorHeap []*visitor

func (h visitorHeap) Len() int           { return len(h) }
func (h visitorHeap) Less(i, j int) bool { return h[i].lastUpdate.Before(h[j].lastUpdate) }
func (h visitorHeap) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
	h[i].heapIndex = i
	h[j].heapIndex = j
}

func (h *visitorHeap) Push(x interface{}) {
	v := x.(*visitor)
	v.heapIndex = len(*h)
	*h = append(*h, v)
}

func (h *visitorHeap) Pop() interface{} {
	old := *h
	n := len(old)
	v := old[n-1]
	old[n-1] = nil
	v.heapIndex = -1
	*h = old[0 : n-1]
	return v
}

const defaultMaxEntries = 100000

// NewRateLimiter creates a new rate limiter
// rate: maximum number of requests allowed per duration
// duration: time window for rate limiting
func NewRateLimiter(rate int, duration time.Duration) *RateLimiter {
	return NewRateLimiterWithMax(rate, duration, defaultMaxEntries)
}

// NewRateLimiterWithMax creates a rate limiter with custom max entries
func NewRateLimiterWithMax(rate int, duration time.Duration, maxEntries int) *RateLimiter {
	rl := &RateLimiter{
		visitors:   make(map[string]*visitor),
		evictHeap:  make(visitorHeap, 0),
		rate:       rate,
		duration:   duration,
		maxEntries: maxEntries,
	}
	heap.Init(&rl.evictHeap)

	go rl.cleanup()

	return rl
}

// Allow checks if a request from the given identifier should be allowed
func (rl *RateLimiter) Allow(identifier string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[identifier]
	if !exists {
		if len(rl.visitors) >= rl.maxEntries {
			rl.evictOldestLocked()
		}
		v = &visitor{
			key:        identifier,
			tokens:     rl.rate - 1,
			lastUpdate: time.Now(),
		}
		rl.visitors[identifier] = v
		heap.Push(&rl.evictHeap, v)
		return true
	}

	now := time.Now()
	elapsed := now.Sub(v.lastUpdate)
	tokensToAdd := int(elapsed / rl.duration * time.Duration(rl.rate))

	if tokensToAdd > 0 {
		v.tokens += tokensToAdd
		if v.tokens > rl.rate {
			v.tokens = rl.rate
		}
		v.lastUpdate = now
		heap.Fix(&rl.evictHeap, v.heapIndex)
	}

	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

func (rl *RateLimiter) evictOldestLocked() {
	if rl.evictHeap.Len() > 0 {
		oldest := heap.Pop(&rl.evictHeap).(*visitor)
		delete(rl.visitors, oldest.key)
	}
}

// cleanup removes stale visitor entries
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-rl.duration * 2)
		for rl.evictHeap.Len() > 0 && rl.evictHeap[0].lastUpdate.Before(cutoff) {
			oldest := heap.Pop(&rl.evictHeap).(*visitor)
			delete(rl.visitors, oldest.key)
		}
		rl.mu.Unlock()
	}
}

// RateLimit returns a Gin middleware that rate limits requests
// by IP address or authenticated user email
func RateLimit(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use authenticated user email if available, otherwise use IP
		identifier := c.ClientIP()
		if user, exists := c.Get("user"); exists {
			if claims, ok := user.(UserClaims); ok {
				identifier = claims.Email
			}
		}

		if !limiter.Allow(identifier) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
			})
			return
		}

		c.Next()
	}
}

// MaxBodySize returns a middleware that limits request body size.
// This prevents DoS attacks via large JSON payloads.
func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}

// AuthRateLimit returns a stricter rate limiter for authentication endpoints
func AuthRateLimit(requestsPerMinute int) gin.HandlerFunc {
	limiter := NewRateLimiter(requestsPerMinute, time.Minute)
	return RateLimit(limiter)
}
