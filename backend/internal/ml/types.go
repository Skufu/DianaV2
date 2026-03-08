package ml

type Prediction struct {
	Cluster            string
	RiskScore          int
	PredictedStatus    string
	RiskLabel          string
	ClusterDescription string
	TreatmentFocus     string
	AtRiskProbability  float64
	ModelVersion       string
	DatasetHash        string
	DriftBaseline      DriftBaselineMetadata
	FeatureSet         FeatureSet
	ClusterCapability  ClusterCapability
	OutputCapabilities OutputCapabilities
}

type FeatureSet struct {
	Features     []string `json:"features"`
	FeatureCount int      `json:"feature_count"`
	Source       string   `json:"source"`
}

type ClusterCapability struct {
	Supported      bool     `json:"supported"`
	RequiredInputs []string `json:"required_inputs"`
	OutputField    string   `json:"output_field"`
	AliasField     string   `json:"alias_field"`
}

type OutputCapabilities struct {
	PredictedStatus      bool `json:"predicted_status"`
	RiskScore            bool `json:"risk_score"`
	AtRiskProbability    bool `json:"at_risk_probability"`
	PredictionConfidence bool `json:"prediction_confidence"`
	MetabolicSubtype     bool `json:"metabolic_subtype"`
	RiskLabel            bool `json:"risk_label"`
	ClusterDescription   bool `json:"cluster_description"`
	TreatmentFocus       bool `json:"treatment_focus"`
}

type DriftBaselineMetadata struct {
	BaselineID           string   `json:"baseline_id"`
	BaselineVersion      string   `json:"baseline_version"`
	ModelVersion         string   `json:"model_version"`
	DatasetHash          string   `json:"dataset_hash"`
	FeatureSchemaVersion string   `json:"feature_schema_version"`
	SourceKind           string   `json:"source_kind"`
	CreatedAt            string   `json:"created_at"`
	RefreshedAt          string   `json:"refreshed_at,omitempty"`
	StaleAfter           string   `json:"stale_after"`
	SampleCount          int      `json:"sample_count"`
	ReferenceFeatures    []string `json:"reference_features"`
	LineageStatus        string   `json:"lineage_status"`
}

type DriftActiveLineage struct {
	ModelVersion         string `json:"model_version"`
	DatasetHash          string `json:"dataset_hash"`
	FeatureSchemaVersion string `json:"feature_schema_version"`
}

type DriftStatus struct {
	ReferenceFeatures    []string              `json:"reference_features"`
	ReferenceSet         bool                  `json:"reference_set"`
	TotalAlerts          int                   `json:"total_alerts"`
	UnacknowledgedAlerts int                   `json:"unacknowledged_alerts"`
	LastCheck            *string               `json:"last_check"`
	ScipyAvailable       bool                  `json:"scipy_available"`
	ActiveLineage        DriftActiveLineage    `json:"active_lineage"`
	DriftBaseline        DriftBaselineMetadata `json:"drift_baseline"`
}

type DriftAlert struct {
	Timestamp    string         `json:"timestamp"`
	AlertType    string         `json:"alert_type"`
	Severity     string         `json:"severity"`
	Message      string         `json:"message"`
	Details      map[string]any `json:"details"`
	Acknowledged bool           `json:"acknowledged"`
}

type DriftAlertsResponse struct {
	Alerts []DriftAlert `json:"alerts"`
}

type DriftAlertsEnvelope struct {
	Alerts        []DriftAlert          `json:"alerts"`
	ActiveLineage DriftActiveLineage    `json:"active_lineage"`
	DriftBaseline DriftBaselineMetadata `json:"drift_baseline"`
}

// ModelMetadata represents the metadata of a deployed ML model.
type ModelMetadata struct {
	ModelVersion       string                 `json:"model_version"`
	DatasetHash        string                 `json:"dataset_hash"`
	Notes              string                 `json:"notes"`
	Features           []string               `json:"features"`
	FeatureSet         FeatureSet             `json:"feature_set"`
	ClusterCapability  ClusterCapability      `json:"cluster_capability"`
	OutputCapabilities OutputCapabilities     `json:"output_capabilities"`
	DriftBaseline      DriftBaselineMetadata  `json:"drift_baseline"`
	Metrics            map[string]interface{} `json:"metrics"`
}
