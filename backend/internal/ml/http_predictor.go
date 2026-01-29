package ml

import (
	"bytes"
	"context"
	"encoding/json"
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
		log.Printf("[ML] URL not configured, using mock prediction")
		return p.mockPredict(input)
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
		log.Printf("[ML] Request failed: %v, falling back to mock prediction", err)
		return p.mockPredict(input)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[ML] Non-OK status %d: %s, falling back to mock prediction", resp.StatusCode, string(respBody))
		return p.mockPredict(input)
	}

	var out predictResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		log.Printf("[ML] Failed to decode response: %v, falling back to mock prediction", err)
		return p.mockPredict(input)
	}
	if out.Cluster == "" {
		log.Printf("[ML] Empty cluster in response, falling back to mock prediction")
		return p.mockPredict(input)
	}
	return out.Cluster, out.RiskScore, nil
}

func (p *HTTPPredictor) mockPredict(input models.Assessment) (string, int, error) {
	switch {
	case input.BMI > 30 && input.HbA1c > 6.0:
		return "SIRD", 85, nil
	case input.HbA1c > 6.5 && input.BMI < 27:
		return "SIDD", 92, nil
	case input.BMI > 30:
		return "MOD", 65, nil
	default:
		return "MARD", 35, nil
	}
}
