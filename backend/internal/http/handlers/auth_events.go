package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/http/sse"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type AuthEventHandler struct {
	cfg    config.Config
	store  store.Store
	broker *sse.Broker
}

func NewAuthEventHandler(cfg config.Config, store store.Store, broker *sse.Broker) *AuthEventHandler {
	return &AuthEventHandler{
		cfg:    cfg,
		store:  store,
		broker: broker,
	}
}

func (h *AuthEventHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/events/stream", h.streamAuthEvents)
}

// StreamAuthEvents is the exported handler for the SSE endpoint
func (h *AuthEventHandler) StreamAuthEvents(c *gin.Context) {
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		if cookieToken, err := c.Cookie("diana_token"); err == nil {
			token = strings.TrimSpace(cookieToken)
		}
	}
	if token == "" {
		authz := c.GetHeader("Authorization")
		if strings.HasPrefix(authz, "Bearer ") {
			token = strings.TrimSpace(strings.TrimPrefix(authz, "Bearer "))
		}
	}
	if token == "" {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.String(http.StatusUnauthorized, "event: error\ndata: "+`{"message":"Authentication required"}`+"\n\n")
		return
	}

	claims, err := middleware.ValidateToken(token, h.cfg.JWTSecret)
	if err != nil {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.String(http.StatusUnauthorized, "event: error\ndata: "+`{"message":"Authentication failed"}`+"\n\n")
		return
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.String(http.StatusUnauthorized, "event: error\ndata: "+`{"message":"Authentication failed"}`+"\n\n")
		return
	}
	user, err := h.store.Users().FindByID(c.Request.Context(), int32(userIDFloat))
	if err != nil || user == nil || !user.IsActive || user.AccountStatus != "active" {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.String(http.StatusForbidden, "event: error\ndata: "+`{"message":"Account inactive"}`+"\n\n")
		return
	}

	role, ok := claims["role"].(string)
	if !ok || role != models.RoleAdmin {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.String(http.StatusForbidden, "event: error\ndata: "+`{"message":"Admin role required"}`+"\n\n")
		return
	}

	sse.StreamToGin(c, h.broker, c.Request.Context())
}

// streamAuthEvents is the internal implementation (unexported)
func (h *AuthEventHandler) streamAuthEvents(c *gin.Context) {
	h.StreamAuthEvents(c)
}
