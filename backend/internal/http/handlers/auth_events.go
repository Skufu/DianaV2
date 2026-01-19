package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/http/sse"
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

type streamParams struct {
	Token string `form:"token" binding:"required"`
}

func (h *AuthEventHandler) streamAuthEvents(c *gin.Context) {
	var params streamParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid parameters"})
		return
	}

	token := params.Token
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	claims, err := middleware.ValidateToken(token, h.cfg.JWTSecret)
	if err != nil {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.String(http.StatusUnauthorized, "event: error\ndata: "+`{"message":"Authentication failed"}`+"\n\n")
		return
	}

	if claims.Role != "admin" {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.String(http.StatusForbidden, "event: error\ndata: "+`{"message":"Admin role required"}`+"\n\n")
		return
	}

	sse.StreamToGin(c, h.broker, c.Request.Context())
}
