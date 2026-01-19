package sse

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
)

func TestBroker_PublishBroadcastsWhenBatchReached(t *testing.T) {
	broker := NewBroker(2)

	client := make(chan Event, 5)
	broker.Subscribe(client)
	defer broker.Unsubscribe(client)

	broker.Publish(Event{ID: "1", Event: "auth_event", Data: map[string]string{"k": "v1"}})
	select {
	case <-client:
		t.Fatal("expected no event until batch size reached")
	default:
	}

	broker.Publish(Event{ID: "2", Event: "auth_event", Data: map[string]string{"k": "v2"}})

	select {
	case event := <-client:
		if event.ID != "1" {
			t.Fatalf("expected first event ID 1, got %s", event.ID)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("expected event after batch reached")
	}
}

func TestBroker_SubscribeUnsubscribeCount(t *testing.T) {
	broker := NewBroker(1)
	client := make(chan Event, 1)

	if broker.ClientCount() != 0 {
		t.Fatalf("expected 0 clients, got %d", broker.ClientCount())
	}

	broker.Subscribe(client)
	if broker.ClientCount() != 1 {
		t.Fatalf("expected 1 client, got %d", broker.ClientCount())
	}

	broker.Unsubscribe(client)
	if broker.ClientCount() != 0 {
		t.Fatalf("expected 0 clients, got %d", broker.ClientCount())
	}
}

func TestBroker_PublishAuthEvent(t *testing.T) {
	broker := NewBroker(1)
	client := make(chan Event, 1)
	broker.Subscribe(client)
	defer broker.Unsubscribe(client)

	broker.PublishAuthEvent("login", "user@example.com", "127.0.0.1", "test-agent", true, map[string]interface{}{"k": "v"})

	select {
	case event := <-client:
		if event.Event != "auth_event" {
			t.Fatalf("expected auth_event, got %s", event.Event)
		}
		data, ok := event.Data.(models.AuthEvent)
		if !ok {
			t.Fatal("expected models.AuthEvent data")
		}
		if data.EventType != "login" {
			t.Fatalf("expected event type login, got %s", data.EventType)
		}
		if data.Email != "user@example.com" {
			t.Fatalf("expected email user@example.com, got %s", data.Email)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("expected auth event to be delivered")
	}
}

func TestStreamToGin_WritesSSEHeadersAndEvent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	broker := NewBroker(1)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	r := gin.New()
	r.GET("/stream", func(c *gin.Context) {
		go func() {
			broker.Publish(Event{ID: "1", Event: "auth_event", Data: map[string]string{"status": "ok"}})
			time.Sleep(10 * time.Millisecond)
			cancel()
		}()
		StreamToGin(c, broker, ctx)
	})

	req := httptest.NewRequest("GET", "/stream", nil)
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	if contentType := w.Header().Get("Content-Type"); contentType != "text/event-stream" {
		t.Fatalf("expected Content-Type text/event-stream, got %s", contentType)
	}

	body := w.Body.String()
	if !strings.Contains(body, "event: auth_event") {
		t.Fatalf("expected SSE event header in body, got %s", body)
	}
	if !strings.Contains(body, "data: ") {
		t.Fatalf("expected SSE data line in body, got %s", body)
	}
}
