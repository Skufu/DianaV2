package ml

import (
	"context"

	"github.com/skufu/DianaV2/backend/internal/models"
)

type Predictor interface {
	Predict(ctx context.Context, input models.Assessment) (Prediction, error)
	GetActiveModelMetadata(ctx context.Context) (*ModelMetadata, error)
}

type MockPredictor struct{}

func NewMockPredictor() *MockPredictor {
	return &MockPredictor{}
}

func (m *MockPredictor) Predict(ctx context.Context, input models.Assessment) (Prediction, error) {
	switch {
	case input.BMI >= 35 && (input.Triglycerides >= 150 || input.LDL >= 130 || (input.HDL > 0 && input.HDL < 45)) && (input.Systolic >= 130 || input.Diastolic >= 80):
		return Prediction{
			Cluster:            "SIRD",
			RiskScore:          85,
			PredictedStatus:    "high",
			RiskLabel:          "High risk",
			ClusterDescription: "Severe insulin-resistant diabetes profile.",
			TreatmentFocus:     "Focus on insulin sensitivity and cardiovascular risk reduction.",
			AtRiskProbability:  0.85,
		}, nil
	case input.BMI < 25 && (input.Triglycerides >= 200 || input.LDL >= 160 || input.Systolic >= 140 || input.Diastolic >= 90):
		return Prediction{
			Cluster:            "SIDD",
			RiskScore:          78,
			PredictedStatus:    "high",
			RiskLabel:          "High risk",
			ClusterDescription: "Severe insulin-deficient diabetes profile.",
			TreatmentFocus:     "Prioritize glycemic control and beta-cell preservation.",
			AtRiskProbability:  0.78,
		}, nil
	case input.BMI >= 30:
		return Prediction{
			Cluster:            "MOD",
			RiskScore:          60,
			PredictedStatus:    "moderate",
			RiskLabel:          "Moderate risk",
			ClusterDescription: "Mild obesity-related diabetes profile.",
			TreatmentFocus:     "Weight management and lifestyle optimization.",
			AtRiskProbability:  0.60,
		}, nil
	case input.PatientID%2 == 0:
		return Prediction{
			Cluster:            "MARD",
			RiskScore:          45,
			PredictedStatus:    "low",
			RiskLabel:          "Lower risk",
			ClusterDescription: "Mild age-related diabetes profile.",
			TreatmentFocus:     "Maintain current health habits and monitor risk factors.",
			AtRiskProbability:  0.45,
		}, nil
	default:
		return Prediction{
			Cluster:            "MOD",
			RiskScore:          30,
			PredictedStatus:    "low",
			RiskLabel:          "Lower risk",
			ClusterDescription: "Mild obesity-related diabetes profile.",
			TreatmentFocus:     "Maintain healthy weight and regular activity.",
			AtRiskProbability:  0.30,
		}, nil
	}
}

func (m *MockPredictor) GetActiveModelMetadata(ctx context.Context) (*ModelMetadata, error) {
	return &ModelMetadata{
		ModelVersion: "mock_v1",
		DatasetHash:  "mock_hash",
		Notes:        "Mock models metadata",
		Features:     []string{"mock_feature"},
		Metrics:      map[string]interface{}{"accuracy": 0.99},
	}, nil
}
