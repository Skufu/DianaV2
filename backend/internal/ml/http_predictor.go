package ml

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
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
	apiKey  string
}

type predictResp struct {
	Cluster   string `json:"risk_cluster"`
	RiskScore int    `json:"risk_score"`
}

func NewHTTPPredictor(url, version, apiKey string, timeout time.Duration) *HTTPPredictor {
	return &HTTPPredictor{
		client:  &http.Client{Timeout: timeout},
		url:     url,
		version: version,
		apiKey:  apiKey,
	}
}

func (p *HTTPPredictor) Predict(ctx context.Context, input models.Assessment) (string, int, error) {
	if p.url == "" {
		log.Printf("[ML] URL not configured, returning unknown")
		return "unknown", 0, nil
	}

	body, err := json.Marshal(input)
	if err != nil {
		log.Printf("[ML] Failed to marshal input: %v", err)
		return "error", 0, fmt.Errorf("failed to marshal input: %w", err)
	}

	mlURL := p.url + "?model_type=ada"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mlURL, bytes.NewReader(body))
	if err != nil {
		log.Printf("[ML] Failed to create request: %v", err)
		return "error", 0, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if p.apiKey != "" {
		req.Header.Set("X-API-Key", p.apiKey)
	}
	if p.version != "" {
		req.Header.Set("X-Model-Version", p.version)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		log.Printf("[ML] Request failed: %v", err)
		return "error", 0, fmt.Errorf("ML request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[ML] Non-OK status %d: %s", resp.StatusCode, string(respBody))
		return "error", 0, fmt.Errorf("ML server returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var out predictResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		log.Printf("[ML] Failed to decode response: %v", err)
		return "error", 0, fmt.Errorf("failed to decode ML response: %w", err)
	}
	if out.Cluster == "" {
		log.Printf("[ML] Empty cluster in response")
		return "error", 0, errors.New("ML server returned empty cluster")
	}
	return out.Cluster, out.RiskScore, nil
}
