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
