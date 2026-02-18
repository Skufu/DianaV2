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
	switch {
	case input.BMI >= 35 && (input.Triglycerides >= 150 || input.LDL >= 130 || (input.HDL > 0 && input.HDL < 45)) && (input.Systolic >= 130 || input.Diastolic >= 80):
		return "SIRD", 85, nil
	case input.BMI < 25 && (input.Triglycerides >= 200 || input.LDL >= 160 || input.Systolic >= 140 || input.Diastolic >= 90):
		return "SIDD", 78, nil
	case input.BMI >= 30:
		return "MOD", 60, nil
	case input.PatientID%2 == 0:
		return "MARD", 45, nil
	default:
		return "MOD", 30, nil
	}
}
