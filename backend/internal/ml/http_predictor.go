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
	RiskCluster      string  `json:"risk_cluster"`
	MetabolicSubtype string  `json:"metabolic_subtype"`
	RiskScore        int     `json:"risk_score"`
	RiskLevel        string  `json:"risk_level"`
	RiskLabel        string  `json:"risk_label"`
	ClusterDesc      string  `json:"cluster_description"`
	TreatmentFocus   string  `json:"treatment_focus"`
	AtRiskProb       float64 `json:"at_risk_probability"`
	PredictedStatus  string  `json:"predicted_status"`
}

func NewHTTPPredictor(url, version, apiKey string, timeout time.Duration) *HTTPPredictor {
	return &HTTPPredictor{
		client:  &http.Client{Timeout: timeout},
		url:     url,
		version: version,
		apiKey:  apiKey,
	}
}

func (p *HTTPPredictor) Predict(ctx context.Context, input models.Assessment) (Prediction, error) {
	if p.url == "" {
		return Prediction{}, fmt.Errorf("ml url is not configured")
	}

	if input.BMI <= 0 || input.Triglycerides <= 0 || input.LDL <= 0 || input.HDL <= 0 ||
		input.Systolic <= 0 || input.Diastolic <= 0 || input.Age < 18 || input.Age > 120 {
		return Prediction{}, fmt.Errorf("invalid clinical payload for ML prediction")
	}

	body, err := json.Marshal(input)
	if err != nil {
		log.Printf("[ML] Failed to marshal input: %v", err)
		return Prediction{}, fmt.Errorf("failed to marshal input: %w", err)
	}

	mlURL := p.url + "?model_type=clinical"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mlURL, bytes.NewReader(body))
	if err != nil {
		log.Printf("[ML] Failed to create request: %v", err)
		return Prediction{}, fmt.Errorf("failed to create request: %w", err)
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
		return Prediction{}, fmt.Errorf("ml request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[ML] Non-OK status %d: %s", resp.StatusCode, string(respBody))
		return Prediction{}, fmt.Errorf("ml server returned status %d", resp.StatusCode)
	}

	var out predictResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		log.Printf("[ML] Failed to decode response: %v", err)
		return Prediction{}, fmt.Errorf("failed to decode ml response: %w", err)
	}

	// Prefer metabolic subtype (SIDD/SIRD/MOD/MARD) over risk cluster for frontend compatibility
	cluster := out.MetabolicSubtype
	if cluster == "" {
		cluster = out.RiskCluster
	}
	if cluster == "" {
		log.Printf("[ML] Empty cluster in response")
		return Prediction{}, fmt.Errorf("ml response missing risk cluster")
	}
	return Prediction{
		Cluster:            cluster,
		RiskScore:          out.RiskScore,
		PredictedStatus:    out.PredictedStatus,
		RiskLabel:          out.RiskLabel,
		ClusterDescription: out.ClusterDesc,
		TreatmentFocus:     out.TreatmentFocus,
		AtRiskProbability:  out.AtRiskProb,
	}, nil
}
