package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRegisterHealth_Healthz(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	RegisterHealth(router.Group("/api/v1"))

	req, _ := http.NewRequest("GET", "/api/v1/healthz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)
	assert.Equal(t, "ok", payload["status"])
}

func TestRegisterHealth_Livez(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	RegisterHealth(router.Group("/api/v1"))

	req, _ := http.NewRequest("GET", "/api/v1/livez", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &payload)
	assert.NoError(t, err)
	assert.Equal(t, "live", payload["status"])
}
