package ml

type Prediction struct {
	Cluster            string
	RiskScore          int
	PredictedStatus    string
	RiskLabel          string
	ClusterDescription string
	TreatmentFocus     string
	AtRiskProbability  float64
}

// ModelMetadata represents the metadata of a deployed ML model.
type ModelMetadata struct {
	ModelVersion string                 `json:"model_version"`
	DatasetHash  string                 `json:"dataset_hash"`
	Notes        string                 `json:"notes"`
	Features     []string               `json:"features"`
	Metrics      map[string]interface{} `json:"metrics"`
}
