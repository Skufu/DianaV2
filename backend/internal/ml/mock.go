package ml

import "github.com/skufu/DianaV2/backend/internal/models"

type Predictor interface {
	Predict(input models.Assessment) (cluster string, risk int)
}

type MockPredictor struct{}

func NewMockPredictor() *MockPredictor {
	return &MockPredictor{}
}

func (m *MockPredictor) Predict(input models.Assessment) (string, int) {
	// Cluster assignments based on paper: SIDD, SIRD, MOD, MARD
	// Simple deterministic rules to keep behavior stable during placeholder phase.
	switch {
	case input.BMI > 30 && input.HbA1c > 6.0:
		return "SIRD", 85 // Severe Insulin-Resistant Diabetes
	case input.HbA1c > 6.5 && input.BMI < 27:
		return "SIDD", 92 // Severe Insulin-Deficient Diabetes
	case input.PatientID%2 == 0:
		return "MARD", 45 // Mild Age-Related Diabetes
	default:
		return "MOD", 30 // Mild Obesity-Related Diabetes
	}
}
