package handlers

import (
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// MLProxyHandler proxies frontend ML requests to the internal ML service.
// This keeps the ML server private and the ML API key server-side.
type MLProxyHandler struct {
	mlBaseURL  string
	mlAPIKey   string
	httpClient *http.Client
}

// NewMLProxyHandler creates a new ML proxy handler.
func NewMLProxyHandler(mlBaseURL, mlAPIKey string, timeoutMS int) *MLProxyHandler {
	mlBaseURL = strings.TrimSuffix(strings.TrimSuffix(mlBaseURL, "/"), "/predict")

	return &MLProxyHandler{
		mlBaseURL: mlBaseURL,
		mlAPIKey:  mlAPIKey,
		httpClient: &http.Client{
			Timeout: time.Duration(timeoutMS) * time.Millisecond,
		},
	}
}

// Register registers the ML proxy routes.
func (h *MLProxyHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/health", h.proxyGet)
	rg.GET("/insights/metrics", h.proxyGet)
	rg.GET("/insights/information-gain", h.proxyGet)
	rg.GET("/insights/clusters", h.proxyGet)
	rg.GET("/insights/visualizations/:name", h.proxyGet)
	rg.POST("/predict/explain", h.proxyPost)
}

// proxyGet forwards a GET request to the ML server.
func (h *MLProxyHandler) proxyGet(c *gin.Context) {
	// Build the target URL from the request path
	// Strip the /ml prefix that the router group adds
	targetPath := strings.TrimPrefix(c.Request.URL.Path, "/api/v1/ml")
	targetURL := h.mlBaseURL + targetPath

	// Preserve query string
	if c.Request.URL.RawQuery != "" {
		targetURL += "?" + c.Request.URL.RawQuery
	}

	h.doProxy(c, "GET", targetURL, nil)
}

// proxyPost forwards a POST request to the ML server.
func (h *MLProxyHandler) proxyPost(c *gin.Context) {
	targetPath := strings.TrimPrefix(c.Request.URL.Path, "/api/v1/ml")
	targetURL := h.mlBaseURL + targetPath

	if c.Request.URL.RawQuery != "" {
		targetURL += "?" + c.Request.URL.RawQuery
	}

	h.doProxy(c, "POST", targetURL, c.Request.Body)
}

// doProxy performs the actual HTTP request to the ML server.
func (h *MLProxyHandler) doProxy(c *gin.Context, method, targetURL string, body io.Reader) {
	req, err := http.NewRequestWithContext(c.Request.Context(), method, targetURL, body)
	if err != nil {
		log.Printf("[ML_PROXY] Failed to create request: %v", err)
		ErrBadGateway(c, "Failed to proxy request to ML service")
		return
	}

	// Forward Content-Type for POST requests
	if method == "POST" {
		req.Header.Set("Content-Type", c.GetHeader("Content-Type"))
	}

	// Inject ML API key server-side (never exposed to browser)
	if h.mlAPIKey != "" {
		req.Header.Set("X-API-Key", h.mlAPIKey)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("[ML_PROXY] ML service request failed: %v", err)
		ErrServiceUnavailable(c, "ML service unavailable")
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			c.Writer.Header().Add(key, value)
		}
	}

	// Stream the response body back
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("[ML_PROXY] Failed to stream response: %v", err)
	}
}
