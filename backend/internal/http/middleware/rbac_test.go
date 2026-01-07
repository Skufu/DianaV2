package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRoleRequired_AllowedRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user", UserClaims{
			UserID: 1,
			Email:  "admin@example.com",
			Role:   "admin",
		})
		c.Next()
	})
	r.Use(RoleRequired("admin"))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRoleRequired_DeniedRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("user", UserClaims{
			UserID: 1,
			Email:  "user@example.com",
			Role:   "clinician",
		})
		c.Next()
	})
	r.Use(RoleRequired("admin"))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestRoleRequired_MultipleRoles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		userRole     string
		allowedRoles []string
		wantStatus   int
	}{
		{
			name:         "admin in admin,manager",
			userRole:     "admin",
			allowedRoles: []string{"admin", "manager"},
			wantStatus:   http.StatusOK,
		},
		{
			name:         "manager in admin,manager",
			userRole:     "manager",
			allowedRoles: []string{"admin", "manager"},
			wantStatus:   http.StatusOK,
		},
		{
			name:         "clinician not in admin,manager",
			userRole:     "clinician",
			allowedRoles: []string{"admin", "manager"},
			wantStatus:   http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set("user", UserClaims{
					UserID: 1,
					Email:  "test@example.com",
					Role:   tt.userRole,
				})
				c.Next()
			})
			r.Use(RoleRequired(tt.allowedRoles...))
			r.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			req, _ := http.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}

func TestRoleRequired_NoUserClaims(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	// No user claims set
	r.Use(RoleRequired("admin"))
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

func TestRoleRequired_InvalidUserContext(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		// Set invalid type for user
		c.Set("user", "not-a-user-claims-struct")
		c.Next()
	})
	r.Use(RoleRequired("admin"))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

func TestAdminOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		role       string
		wantStatus int
	}{
		{"admin allowed", "admin", http.StatusOK},
		{"clinician denied", "clinician", http.StatusForbidden},
		{"manager denied", "manager", http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set("user", UserClaims{
					UserID: 1,
					Email:  "test@example.com",
					Role:   tt.role,
				})
				c.Next()
			})
			r.Use(AdminOnly())
			r.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			req, _ := http.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d", tt.wantStatus, w.Code)
			}
		})
	}
}
