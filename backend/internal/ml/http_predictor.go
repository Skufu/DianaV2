// HTTPPredictor: posts assessments to a remote model inference endpoint.
package ml

import (
	"bytes"
	"context"
	"encoding/json"
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
	Cluster   string `json:"cluster"`
	RiskScore int    `json:"risk_score"`
}

// NewHTTPPredictor creates an HTTP-backed predictor that posts assessment data
// to a model inference endpoint. Timeout applies to the entire request.
func NewHTTPPredictor(url, version string, timeout time.Duration) *HTTPPredictor {
	return &HTTPPredictor{
		client:  &http.Client{Timeout: timeout},
		url:     url,
		version: version,
	}
}

func (p *HTTPPredictor) Predict(input models.Assessment) (string, int) {
	if p.url == "" {
		return "unknown", 0
	}

	body, err := json.Marshal(input)
	if err != nil {
		return "error", 0
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, p.url, bytes.NewReader(body))
	if err != nil {
		return "error", 0
	}
	req.Header.Set("Content-Type", "application/json")
	if p.version != "" {
		req.Header.Set("X-Model-Version", p.version)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return "error", 0
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "error", 0
	}

	var out predictResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "error", 0
	}
	if out.Cluster == "" {
		return "error", 0
	}
	return out.Cluster, out.RiskScore
}
