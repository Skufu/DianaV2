package ml

import "github.com/skufu/DianaV2/internal/models"

type Predictor interface {
	Predict(input models.Assessment) (cluster string, risk int)
}

type MockPredictor struct{}

func NewMockPredictor() *MockPredictor {
	return &MockPredictor{}
}

func (m *MockPredictor) Predict(input models.Assessment) (string, int) {
	// Simple deterministic rules to keep behavior stable during placeholder phase.
	switch {
	case input.BMI > 30 && input.HbA1c > 6.0:
		return "SOIRD", 85
	case input.HbA1c > 6.5 && input.BMI < 27:
		return "SIDD", 92
	case input.PatientID%2 == 0:
		return "MARD", 45
	default:
		return "MIDD", 30
	}
}
