package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a token bucket rate limiter
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     int           // requests per duration
	duration time.Duration // time window
}

type visitor struct {
	tokens     int
	lastUpdate time.Time
}

// NewRateLimiter creates a new rate limiter
// rate: maximum number of requests allowed per duration
// duration: time window for rate limiting
func NewRateLimiter(rate int, duration time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		duration: duration,
	}

	// Clean up stale visitors every 5 minutes
	go rl.cleanup()

	return rl
}

// Allow checks if a request from the given identifier should be allowed
func (rl *RateLimiter) Allow(identifier string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[identifier]
	if !exists {
		rl.visitors[identifier] = &visitor{
			tokens:     rl.rate - 1,
			lastUpdate: time.Now(),
		}
		return true
	}

	// Refill tokens based on time elapsed
	now := time.Now()
	elapsed := now.Sub(v.lastUpdate)
	tokensToAdd := int(elapsed / rl.duration * time.Duration(rl.rate))

	if tokensToAdd > 0 {
		v.tokens += tokensToAdd
		if v.tokens > rl.rate {
			v.tokens = rl.rate
		}
		v.lastUpdate = now
	}

	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

// cleanup removes stale visitor entries
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for id, v := range rl.visitors {
			if time.Since(v.lastUpdate) > rl.duration*2 {
				delete(rl.visitors, id)
			}
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
