package ml

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

type HTTPPredictor struct {
	client  *http.Client
	url     string
	version string
}

type predictResp struct {
	Cluster   string `json:"risk_cluster"`
	RiskScore int    `json:"risk_score"`
}

func NewHTTPPredictor(url, version string, timeout time.Duration) *HTTPPredictor {
	return &HTTPPredictor{
		client:  &http.Client{Timeout: timeout},
		url:     url,
		version: version,
	}
}

func (p *HTTPPredictor) Predict(input models.Assessment) (string, int) {
	if p.url == "" {
		log.Printf("[ML] URL not configured, returning unknown")
		return "unknown", 0
	}

	body, err := json.Marshal(input)
	if err != nil {
		log.Printf("[ML] Failed to marshal input: %v", err)
		return "error", 0
	}

	mlURL := p.url + "?model_type=ada"
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, mlURL, bytes.NewReader(body))
	if err != nil {
		log.Printf("[ML] Failed to create request: %v", err)
		return "error", 0
	}
	req.Header.Set("Content-Type", "application/json")
	if p.version != "" {
		req.Header.Set("X-Model-Version", p.version)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		log.Printf("[ML] Request failed: %v", err)
		return "error", 0
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[ML] Non-OK status %d: %s", resp.StatusCode, string(respBody))
		return "error", 0
	}

	var out predictResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		log.Printf("[ML] Failed to decode response: %v", err)
		return "error", 0
	}
	if out.Cluster == "" {
		log.Printf("[ML] Empty cluster in response")
		return "error", 0
	}
	return out.Cluster, out.RiskScore
}
