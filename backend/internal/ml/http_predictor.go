package ml

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

// sanitizeModelType removes newlines from model type to prevent log injection
func sanitizeModelType(input string) string {
	return strings.ReplaceAll(strings.ReplaceAll(input, "\n", " "), "\r", " ")
}


type HTTPPredictor struct {
	client  *http.Client
	url     string
	version string
	apiKey  string
}

const defaultDriftCheckTimeout = time.Second

type predictResp struct {
	RiskCluster        string                `json:"risk_cluster"`
	MetabolicSubtype   string                `json:"metabolic_subtype"`
	RiskScore          int                   `json:"risk_score"`
	RiskLevel          string                `json:"risk_level"`
	RiskLabel          string                `json:"risk_label"`
	ClusterDesc        string                `json:"cluster_description"`
	TreatmentFocus     string                `json:"treatment_focus"`
	AtRiskProb         float64               `json:"at_risk_probability"`
	PredictedStatus    string                `json:"predicted_status"`
	ModelVersion       string                `json:"model_version"`
	DatasetHash        string                `json:"dataset_hash"`
	DriftBaseline      DriftBaselineMetadata `json:"drift_baseline"`
	FeatureSet         FeatureSet            `json:"feature_set"`
	ClusterCapability  ClusterCapability     `json:"cluster_capability"`
	OutputCapabilities OutputCapabilities    `json:"output_capabilities"`
}

type driftStatusResp struct {
	ReferenceFeatures    []string              `json:"reference_features"`
	ReferenceSet         bool                  `json:"reference_set"`
	TotalAlerts          int                   `json:"total_alerts"`
	UnacknowledgedAlerts int                   `json:"unacknowledged_alerts"`
	LastCheck            string                `json:"last_check"`
	ScipyAvailable       bool                  `json:"scipy_available"`
	ActiveLineage        DriftActiveLineage    `json:"active_lineage"`
	DriftBaseline        DriftBaselineMetadata `json:"drift_baseline"`
}

type driftAlertsResp struct {
	Alerts []DriftAlert `json:"alerts"`
}

type driftCheckReq struct {
	Features     map[string][]float64 `json:"features"`
	ModelVersion string               `json:"model_version,omitempty"`
	Source       string               `json:"source,omitempty"`
}

func canonicalClusterCode(raw string) (string, bool) {
	cluster := strings.ToUpper(strings.TrimSpace(raw))

	// Strip "-like" suffix if present (ML service returns "SIRD-like", "SIDD-like", etc.)
	cluster = strings.TrimSuffix(cluster, "-LIKE")

	switch cluster {
	case "SIDD", "SIRD", "MOD", "MARD":
		return cluster, true
	default:
		return "", false
	}
}

func isNeutralClusterSentinel(raw string) bool {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "N/A", "NA":
		return true
	default:
		return false
	}
}

func clusteringCapabilityEnabled(out predictResp) bool {
	capabilityMetadataProvided := out.ClusterCapability.Supported ||
		len(out.ClusterCapability.RequiredInputs) > 0 ||
		strings.TrimSpace(out.ClusterCapability.OutputField) != "" ||
		strings.TrimSpace(out.ClusterCapability.AliasField) != "" ||
		out.OutputCapabilities.PredictedStatus ||
		out.OutputCapabilities.RiskScore ||
		out.OutputCapabilities.AtRiskProbability ||
		out.OutputCapabilities.PredictionConfidence ||
		out.OutputCapabilities.MetabolicSubtype ||
		out.OutputCapabilities.RiskLabel ||
		out.OutputCapabilities.ClusterDescription ||
		out.OutputCapabilities.TreatmentFocus

	capabilityExplicitlyDisabled := !out.ClusterCapability.Supported &&
		!out.OutputCapabilities.MetabolicSubtype &&
		(strings.TrimSpace(out.MetabolicSubtype) != "" || strings.TrimSpace(out.RiskCluster) != "")

	if capabilityExplicitlyDisabled {
		return false
	}

	if !capabilityMetadataProvided {
		return true
	}

	if out.ClusterCapability.Supported && out.OutputCapabilities.MetabolicSubtype {
		return true
	}

	if out.ClusterCapability.Supported != out.OutputCapabilities.MetabolicSubtype {
		log.Printf(
			"[ML] Inconsistent clustering capability metadata: cluster_capability.supported=%t output_capabilities.metabolic_subtype=%t. Disabling clustering semantics.",
			out.ClusterCapability.Supported,
			out.OutputCapabilities.MetabolicSubtype,
		)
	}

	return false
}

func resolveClusterAlias(out predictResp) (string, error) {
	if !clusteringCapabilityEnabled(out) {
		if strings.TrimSpace(out.MetabolicSubtype) != "" || strings.TrimSpace(out.RiskCluster) != "" {
			log.Printf(
				"[ML] Clustering capability disabled by metadata; ignoring aliases metabolic_subtype=%q risk_cluster=%q",
				out.MetabolicSubtype,
				out.RiskCluster,
			)
		}

		return "", nil
	}

	metabolicSubtypeRaw := strings.TrimSpace(out.MetabolicSubtype)
	riskClusterRaw := strings.TrimSpace(out.RiskCluster)
	metabolicSubtypeNeutral := isNeutralClusterSentinel(metabolicSubtypeRaw)
	riskClusterNeutral := isNeutralClusterSentinel(riskClusterRaw)

	if metabolicSubtypeNeutral && (riskClusterNeutral || riskClusterRaw == "") {
		return "", nil
	}

	if riskClusterNeutral && metabolicSubtypeRaw == "" {
		return "", nil
	}

	metabolicSubtype, hasMetabolicSubtype := canonicalClusterCode(metabolicSubtypeRaw)
	riskCluster, hasRiskCluster := canonicalClusterCode(riskClusterRaw)

	if hasMetabolicSubtype {
		switch {
		case riskClusterRaw == "":
		case riskClusterNeutral:
			return "", fmt.Errorf("ml response contained inconsistent risk_cluster %q for canonical metabolic_subtype %q", out.RiskCluster, out.MetabolicSubtype)
		case hasRiskCluster && riskCluster != metabolicSubtype:
			log.Printf("[ML] Cluster alias mismatch: metabolic_subtype=%q risk_cluster=%q; using metabolic_subtype", out.MetabolicSubtype, out.RiskCluster)
		case !hasRiskCluster:
			log.Printf("[ML] Unsupported compatibility alias risk_cluster=%q ignored in favor of metabolic_subtype=%q", out.RiskCluster, out.MetabolicSubtype)
		}

		return metabolicSubtype, nil
	}

	if metabolicSubtypeRaw != "" {
		return "", fmt.Errorf("ml response contained unsupported metabolic_subtype %q", out.MetabolicSubtype)
	}

	if riskClusterNeutral {
		return "", nil
	}

	if hasRiskCluster {
		return riskCluster, nil
	}

	if riskClusterRaw != "" {
		return "", fmt.Errorf("ml response contained unsupported risk_cluster %q", out.RiskCluster)
	}

	return "", fmt.Errorf("ml response missing cluster aliases")
}

func NewHTTPPredictor(url, version, apiKey string, timeout time.Duration) *HTTPPredictor {
	return &HTTPPredictor{
		client:  &http.Client{Timeout: timeout},
		url:     url,
		version: version,
		apiKey:  apiKey,
	}
}

// IsAvailable checks if the ML service health endpoint is reachable.
// This is used by health checks to determine ML service availability.
func (p *HTTPPredictor) IsAvailable() bool {
	if p.url == "" {
		return false
	}

	// Quick health check with short timeout
	healthClient := &http.Client{Timeout: 2 * time.Second}
	healthURL := p.baseURL() + "/health"

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, healthURL, nil)
	if err != nil {
		return false
	}
	if p.apiKey != "" {
		req.Header.Set("X-API-Key", p.apiKey)
	}

	resp, err := healthClient.Do(req)
	if err != nil {
		return false
	}
	defer func() { _ = resp.Body.Close() }()

	return resp.StatusCode == http.StatusOK
}

func addDriftFeature(features map[string][]float64, name string, value float64) {
	if value < 0 {
		return
	}
	features[name] = []float64{value}
}

func buildDriftFeatures(modelType string, input models.Assessment) map[string][]float64 {
	features := make(map[string][]float64)

	switch strings.ToLower(strings.TrimSpace(modelType)) {
	case "ada":
		addDriftFeature(features, "hba1c", input.HbA1c)
		addDriftFeature(features, "fbs", input.FBS)
		addDriftFeature(features, "bmi", input.BMI)
		addDriftFeature(features, "triglycerides", float64(input.Triglycerides))
		addDriftFeature(features, "ldl", float64(input.LDL))
		addDriftFeature(features, "hdl", float64(input.HDL))
	default:
		addDriftFeature(features, "bmi", input.BMI)
		addDriftFeature(features, "triglycerides", float64(input.Triglycerides))
		addDriftFeature(features, "ldl", float64(input.LDL))
		addDriftFeature(features, "hdl", float64(input.HDL))
		addDriftFeature(features, "age", float64(input.Age))
		addDriftFeature(features, "waist_circumference", input.WaistCircumference)

		if strings.EqualFold(strings.TrimSpace(modelType), "binary_v2_bp") {
			addDriftFeature(features, "systolic", float64(input.Systolic))
			addDriftFeature(features, "diastolic", float64(input.Diastolic))
		}
	}

	return features
}

func (p *HTTPPredictor) driftCheckTimeout() time.Duration {
	if p == nil || p.client == nil || p.client.Timeout <= 0 || p.client.Timeout > defaultDriftCheckTimeout {
		return defaultDriftCheckTimeout
	}

	return p.client.Timeout
}

func (p *HTTPPredictor) baseURL() string {
	return strings.TrimSuffix(strings.TrimSuffix(p.url, "/"), "/predict")
}

func (p *HTTPPredictor) queueDriftCheck(modelType string, input models.Assessment) {
	if p == nil {
		return
	}

	features := buildDriftFeatures(modelType, input)
	if len(features) == 0 {
		log.Printf("[ML][DRIFT] skipped drift check for model_type=%s: no supported numeric features", sanitizeModelType(modelType))
		return
	}

	log.Printf("[ML][DRIFT] queued non-blocking drift check for model_type=%s feature_count=%d", sanitizeModelType(modelType), len(features))

	payload := driftCheckReq{
		Features:     features,
		ModelVersion: modelType,
		Source:       "prediction_workflow",
	}

	go func() {
		driftCtx, cancel := context.WithTimeout(context.Background(), p.driftCheckTimeout())
		defer cancel()

		if err := p.sendDriftCheck(driftCtx, payload); err != nil {
			log.Printf("[ML][DRIFT] drift check failed for model_type=%s: %v", sanitizeModelType(modelType), err)
		}
	}()
}

func (p *HTTPPredictor) sendDriftCheck(ctx context.Context, payload driftCheckReq) error {
	if p.url == "" {
		return fmt.Errorf("ml url is not configured")
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal drift payload: %w", err)
	}

	driftURL := p.baseURL() + "/monitoring/drift/check"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, driftURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create drift request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if p.apiKey != "" {
		req.Header.Set("X-API-Key", p.apiKey)
	}
	if payload.ModelVersion != "" {
		req.Header.Set("X-Model-Version", payload.ModelVersion)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("drift request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("drift server returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	_, _ = io.Copy(io.Discard, resp.Body)
	return nil
}

func (p *HTTPPredictor) Predict(ctx context.Context, input models.Assessment) (Prediction, error) {
	return p.predictWithModelType(ctx, input, "")
}

func (p *HTTPPredictor) PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (Prediction, error) {
	return p.predictWithModelType(ctx, input, modelType)
}

func (p *HTTPPredictor) predictWithModelType(ctx context.Context, input models.Assessment, modelType string) (Prediction, error) {
	if p.url == "" {
		return Prediction{}, fmt.Errorf("ml url is not configured")
	}

	if input.BMI <= 0 || input.Triglycerides <= 0 || input.LDL <= 0 || input.HDL <= 0 ||
		input.Age < 18 || input.Age > 120 {
		return Prediction{}, fmt.Errorf("invalid clinical payload for ML prediction")
	}

	body, err := json.Marshal(input)
	if err != nil {
		log.Printf("[ML] Failed to marshal input: %v", err)
		return Prediction{}, fmt.Errorf("failed to marshal input: %w", err)
	}

	version := p.version
	if modelType != "" {
		version = modelType
	}
	mlURL := fmt.Sprintf("%s/predict?model_type=%s", p.baseURL(), version)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mlURL, bytes.NewReader(body))
	if err != nil {
		log.Printf("[ML] Failed to create request: %v", err)
		return Prediction{}, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if p.apiKey != "" {
		req.Header.Set("X-API-Key", p.apiKey)
	}
	if version != "" {
		req.Header.Set("X-Model-Version", version)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		log.Printf("[ML] Request failed: %v", err)
		return Prediction{}, fmt.Errorf("ml request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

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

	cluster, err := resolveClusterAlias(out)
	if err != nil {
		log.Printf("[ML] Invalid cluster aliases in response: %v", err)
		return Prediction{}, err
	}

	clusterCapabilityEnabled := clusteringCapabilityEnabled(out)
	normalizedClusterCapability := out.ClusterCapability
	normalizedOutputCapabilities := out.OutputCapabilities

	if !clusterCapabilityEnabled {
		normalizedClusterCapability.Supported = false
		normalizedOutputCapabilities.MetabolicSubtype = false
		normalizedOutputCapabilities.ClusterDescription = false
		normalizedOutputCapabilities.TreatmentFocus = false
	}

	clusterDescription := ""
	if clusterCapabilityEnabled && normalizedOutputCapabilities.ClusterDescription {
		clusterDescription = out.ClusterDesc
	}

	treatmentFocus := ""
	if clusterCapabilityEnabled && normalizedOutputCapabilities.TreatmentFocus {
		treatmentFocus = out.TreatmentFocus
	}

	prediction := Prediction{
		Cluster:            cluster,
		RiskScore:          out.RiskScore,
		PredictedStatus:    out.PredictedStatus,
		RiskLabel:          out.RiskLabel,
		ClusterDescription: clusterDescription,
		TreatmentFocus:     treatmentFocus,
		AtRiskProbability:  out.AtRiskProb,
		ModelVersion:       strings.TrimSpace(out.ModelVersion),
		DatasetHash:        strings.TrimSpace(out.DatasetHash),
		DriftBaseline:      out.DriftBaseline,
		FeatureSet:         out.FeatureSet,
		ClusterCapability:  normalizedClusterCapability,
		OutputCapabilities: normalizedOutputCapabilities,
	}

	p.queueDriftCheck(version, input)

	return prediction, nil
}

// GetActiveModelMetadata fetches the metadata of the currently active model from the ML server.
func (p *HTTPPredictor) GetActiveModelMetadata(ctx context.Context) (*ModelMetadata, error) {
	if p.url == "" {
		return nil, fmt.Errorf("ml url is not configured")
	}

	mlURL := p.baseURL() + "/model/active/metadata"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mlURL, nil)
	if err != nil {
		log.Printf("[ML] Failed to create request for metadata: %v", err)
		return nil, fmt.Errorf("failed to create request for metadata: %w", err)
	}
	if p.apiKey != "" {
		req.Header.Set("X-API-Key", p.apiKey)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		log.Printf("[ML] Metadata request failed: %v", err)
		return nil, fmt.Errorf("ml metadata request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[ML] Non-OK status %d for metadata: %s", resp.StatusCode, string(respBody))
		return nil, fmt.Errorf("ml server returned status %d for metadata", resp.StatusCode)
	}

	var metadata ModelMetadata
	if err := json.NewDecoder(resp.Body).Decode(&metadata); err != nil {
		log.Printf("[ML] Failed to decode metadata response: %v", err)
		return nil, fmt.Errorf("failed to decode ml metadata response: %w", err)
	}

	return &metadata, nil
}

func (p *HTTPPredictor) GetDriftStatus(ctx context.Context) (*DriftStatus, error) {
	if p.url == "" {
		return nil, fmt.Errorf("ml url is not configured")
	}

	statusURL := p.baseURL() + "/monitoring/drift"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, statusURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create drift status request: %w", err)
	}
	if p.apiKey != "" {
		req.Header.Set("X-API-Key", p.apiKey)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ml drift status request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ml drift status returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var status driftStatusResp
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, fmt.Errorf("failed to decode ml drift status response: %w", err)
	}

	var lastCheck *string
	if trimmed := strings.TrimSpace(status.LastCheck); trimmed != "" {
		lastCheck = &trimmed
	}

	return &DriftStatus{
		ReferenceFeatures:    status.ReferenceFeatures,
		ReferenceSet:         status.ReferenceSet,
		TotalAlerts:          status.TotalAlerts,
		UnacknowledgedAlerts: status.UnacknowledgedAlerts,
		LastCheck:            lastCheck,
		ScipyAvailable:       status.ScipyAvailable,
		ActiveLineage:        status.ActiveLineage,
		DriftBaseline:        status.DriftBaseline,
	}, nil
}

func (p *HTTPPredictor) GetDriftAlerts(ctx context.Context, unacknowledgedOnly bool, limit int) (*DriftAlertsEnvelope, error) {
	if p.url == "" {
		return nil, fmt.Errorf("ml url is not configured")
	}

	query := fmt.Sprintf("?unacknowledged=%t&limit=%d", unacknowledgedOnly, limit)
	alertsURL := p.baseURL() + "/monitoring/alerts" + query
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, alertsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create drift alerts request: %w", err)
	}
	if p.apiKey != "" {
		req.Header.Set("X-API-Key", p.apiKey)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ml drift alerts request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ml drift alerts returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var alertsResp driftAlertsResp
	if err := json.NewDecoder(resp.Body).Decode(&alertsResp); err != nil {
		return nil, fmt.Errorf("failed to decode ml drift alerts response: %w", err)
	}

	status, err := p.GetDriftStatus(ctx)
	if err != nil {
		return nil, err
	}

	return &DriftAlertsEnvelope{
		Alerts:        alertsResp.Alerts,
		ActiveLineage: status.ActiveLineage,
		DriftBaseline: status.DriftBaseline,
	}, nil
}
