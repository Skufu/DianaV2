package ml

import (
	"context"

	"github.com/skufu/DianaV2/backend/internal/models"
)

type Predictor interface {
	Predict(ctx context.Context, input models.Assessment) (cluster string, risk int, err error)
}

type MockPredictor struct{}

func NewMockPredictor() *MockPredictor {
	return &MockPredictor{}
}

func (m *MockPredictor) Predict(ctx context.Context, input models.Assessment) (string, int, error) {
	// Cluster assignments based on paper: SIDD, SIRD, MOD, MARD
	// Simple deterministic rules to keep behavior stable during placeholder phase.
	switch {
	case input.BMI > 30 && input.HbA1c > 6.0:
		return "SIRD", 85, nil // Severe Insulin-Resistant Diabetes
	case input.HbA1c > 6.5 && input.BMI < 27:
		return "SIDD", 92, nil // Severe Insulin-Deficient Diabetes
	case input.PatientID%2 == 0:
		return "MARD", 45, nil // Mild Age-Related Diabetes
	default:
		return "MOD", 30, nil // Mild Obesity-Related Diabetes
	}
}
