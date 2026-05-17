package sse

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
)

type Event struct {
	ID    string
	Event string
	Data  any
}

type Broker struct {
	clients   map[chan Event]bool
	mu        sync.RWMutex
	buffer    []Event
	batchSize int
}

func NewBroker(batchSize int) *Broker {
	return &Broker{
		clients:   make(map[chan Event]bool),
		buffer:    make([]Event, 0, batchSize),
		batchSize: batchSize,
	}
}

func (b *Broker) Subscribe(client chan Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.clients[client] = true
}

func (b *Broker) Unsubscribe(client chan Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.clients[client] {
		delete(b.clients, client)
		close(client)
	}
}

func (b *Broker) Publish(event Event) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.buffer = append(b.buffer, event)

	if len(b.buffer) >= b.batchSize {
		b.broadcast()
	}
}

func (b *Broker) broadcast() {
	for client := range b.clients {
		for _, event := range b.buffer {
			select {
			case client <- event:
			default:
			}
		}
	}
	b.buffer = b.buffer[:0]
}

func (b *Broker) ClientCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.clients)
}

// Close closes all client channels and clears the buffer
func (b *Broker) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()

	// Close all client channels
	for client := range b.clients {
		close(client)
		delete(b.clients, client)
	}

	// Clear buffer
	b.buffer = b.buffer[:0]
}

func (b *Broker) PublishAuthEvent(eventType, email, ipAddress, userAgent string, success bool, metadata map[string]any) {
	event := Event{
		ID:    time.Now().Format(time.RFC3339Nano),
		Event: "auth_event",
		Data: models.AuthEvent{
			ID:        time.Now().Format(time.RFC3339Nano),
			EventType: eventType,
			Email:     email,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Success:   success,
			Metadata:  metadata,
			CreatedAt: time.Now(),
		},
	}
	b.Publish(event)
}

func StreamToGin(c *gin.Context, broker *Broker, ctx context.Context) {
	eventChan := make(chan Event, 10)
	broker.Subscribe(eventChan)
	defer broker.Unsubscribe(eventChan)

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	if _, err := c.Writer.WriteString(":connected\n\n"); err != nil {
		return
	}
	c.Writer.Flush()

	keepAlive := time.NewTicker(30 * time.Second)
	defer keepAlive.Stop()

	for {
		select {
		case event := <-eventChan:
			if err := writeSSEEvent(c.Writer, event); err != nil {
				return
			}
			c.Writer.Flush()

		case <-keepAlive.C:
			if _, err := c.Writer.WriteString(":keep-alive\n\n"); err != nil {
				return
			}
			c.Writer.Flush()

		case <-ctx.Done():
			return
		}
	}
}

func writeSSEEvent(w gin.ResponseWriter, event Event) error {
	data, err := json.Marshal(event.Data)
	if err != nil {
		return err
	}

	var sb strings.Builder
	sb.WriteString("id: ")
	sb.WriteString(event.ID)
	sb.WriteString("\n")
	sb.WriteString("event: ")
	sb.WriteString(event.Event)
	sb.WriteString("\n")
	sb.WriteString("data: ")
	sb.WriteString(string(data))
	sb.WriteString("\n\n")

	_, _ = w.Write([]byte(sb.String()))
	return nil
}
