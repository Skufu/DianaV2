package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestAuth_ValidToken(t *testing.T) {
	secret := "test-secret"

	// Create a valid token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":     "test@example.com",
		"user_id": float64(123),
		"role":    "clinician",
		"scope":   "diana",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	signedToken, _ := token.SignedString([]byte(secret))

	r := gin.New()
	r.Use(Auth(secret))
	r.GET("/test", func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no user"})
			return
		}
		claims := user.(UserClaims)
		c.JSON(http.StatusOK, gin.H{
			"email":   claims.Email,
			"role":    claims.Role,
			"user_id": claims.UserID,
		})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+signedToken)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuth_MissingToken(t *testing.T) {
	r := gin.New()
	r.Use(Auth("secret"))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuth_InvalidToken(t *testing.T) {
	r := gin.New()
	r.Use(Auth("secret"))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuth_WrongSecret(t *testing.T) {
	// Create token with one secret
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":     "test@example.com",
		"user_id": float64(1),
		"role":    "clinician",
		"scope":   "diana",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	signedToken, _ := token.SignedString([]byte("secret1"))

	// Verify with different secret
	r := gin.New()
	r.Use(Auth("secret2"))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+signedToken)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuth_ExpiredToken(t *testing.T) {
	secret := "test-secret"

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":     "test@example.com",
		"user_id": float64(1),
		"role":    "clinician",
		"scope":   "diana",
		"exp":     time.Now().Add(-time.Hour).Unix(), // expired
	})
	signedToken, _ := token.SignedString([]byte(secret))

	r := gin.New()
	r.Use(Auth(secret))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+signedToken)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuth_MissingClaims(t *testing.T) {
	secret := "test-secret"

	tests := []struct {
		name   string
		claims jwt.MapClaims
	}{
		{
			name: "missing sub",
			claims: jwt.MapClaims{
				"user_id": float64(1),
				"role":    "clinician",
				"scope":   "diana",
				"exp":     time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "missing role",
			claims: jwt.MapClaims{
				"sub":     "test@example.com",
				"user_id": float64(1),
				"scope":   "diana",
				"exp":     time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "missing user_id",
			claims: jwt.MapClaims{
				"sub":   "test@example.com",
				"role":  "clinician",
				"scope": "diana",
				"exp":   time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "missing scope",
			claims: jwt.MapClaims{
				"sub":     "test@example.com",
				"user_id": float64(1),
				"role":    "clinician",
				"exp":     time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "wrong scope",
			claims: jwt.MapClaims{
				"sub":     "test@example.com",
				"user_id": float64(1),
				"role":    "clinician",
				"scope":   "other",
				"exp":     time.Now().Add(time.Hour).Unix(),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, tt.claims)
			signedToken, _ := token.SignedString([]byte(secret))

			r := gin.New()
			r.Use(Auth(secret))
			r.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			req, _ := http.NewRequest("GET", "/test", nil)
			req.Header.Set("Authorization", "Bearer "+signedToken)

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d", w.Code)
			}
		})
	}
}

func TestAuth_MalformedBearer(t *testing.T) {
	r := gin.New()
	r.Use(Auth("secret"))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	tests := []string{
		"Basic token123",
		"bearer token123",
		"Token token123",
		"token123",
	}

	for _, authHeader := range tests {
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", authHeader)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("authHeader=%q: expected 401, got %d", authHeader, w.Code)
		}
	}
}
