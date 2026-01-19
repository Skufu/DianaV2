package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/sse"
)

func TestAuthEventHandler_StreamAuthEvents_MissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Config{JWTSecret: "test-secret"}
	broker := sse.NewBroker(1)
	handler := NewAuthEventHandler(cfg, &fakeStoreAuth{}, broker)

	r := gin.New()
	admin := r.Group("/admin")
	handler.Register(admin)

	req := httptest.NewRequest("GET", "/admin/events/stream", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}

	if !strings.Contains(w.Body.String(), "invalid parameters") {
		t.Fatalf("expected invalid parameters error, got %s", w.Body.String())
	}
}

func TestAuthEventHandler_StreamAuthEvents_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Config{JWTSecret: "test-secret"}
	broker := sse.NewBroker(1)
	handler := NewAuthEventHandler(cfg, &fakeStoreAuth{}, broker)

	r := gin.New()
	admin := r.Group("/admin")
	handler.Register(admin)

	req := httptest.NewRequest("GET", "/admin/events/stream?token=invalid", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	if contentType := w.Header().Get("Content-Type"); contentType != "text/event-stream" {
		t.Fatalf("expected Content-Type text/event-stream, got %s", contentType)
	}

	if !strings.Contains(w.Body.String(), "Authentication failed") {
		t.Fatalf("expected auth error message, got %s", w.Body.String())
	}
}

func TestAuthEventHandler_StreamAuthEvents_NonAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Config{JWTSecret: "test-secret"}
	broker := sse.NewBroker(1)
	handler := NewAuthEventHandler(cfg, &fakeStoreAuth{}, broker)

	r := gin.New()
	admin := r.Group("/admin")
	handler.Register(admin)

	token := signTokenForTest(t, cfg.JWTSecret, "clinician")
	req := httptest.NewRequest("GET", "/admin/events/stream?token="+token, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}

	if contentType := w.Header().Get("Content-Type"); contentType != "text/event-stream" {
		t.Fatalf("expected Content-Type text/event-stream, got %s", contentType)
	}

	if !strings.Contains(w.Body.String(), "Admin role required") {
		t.Fatalf("expected admin role error, got %s", w.Body.String())
	}
}

func TestAuthEventHandler_StreamAuthEvents_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Config{JWTSecret: "test-secret"}
	broker := sse.NewBroker(1)
	handler := NewAuthEventHandler(cfg, &fakeStoreAuth{}, broker)

	r := gin.New()
	admin := r.Group("/admin")
	handler.Register(admin)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	token := signTokenForTest(t, cfg.JWTSecret, "admin")
	req := httptest.NewRequest("GET", "/admin/events/stream?token="+token, nil).WithContext(ctx)
	w := httptest.NewRecorder()

	go func() {
		time.Sleep(20 * time.Millisecond)
		broker.Publish(sse.Event{ID: "1", Event: "auth_event", Data: map[string]string{"status": "ok"}})
		time.Sleep(100 * time.Millisecond)
		cancel()
	}()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if contentType := w.Header().Get("Content-Type"); contentType != "text/event-stream" {
		t.Fatalf("expected Content-Type text/event-stream, got %s", contentType)
	}

	if !strings.Contains(w.Body.String(), "event: auth_event") {
		t.Fatalf("expected SSE event in body, got %s", w.Body.String())
	}
}

func signTokenForTest(t *testing.T, secret, role string) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":     "admin@example.com",
		"user_id": float64(1),
		"role":    role,
		"scope":   "diana",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return signedToken
}
