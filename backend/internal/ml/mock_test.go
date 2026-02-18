package ml

import (
	"context"
	"testing"

	"github.com/skufu/DianaV2/backend/internal/models"
)

func TestMockPredictor_Predict(t *testing.T) {
	p := NewMockPredictor()

	tests := []struct {
		name          string
		input         models.Assessment
		wantCluster   string
		wantRiskRange [2]int // min, max for risk score
	}{
		{
			name: "SIRD - high BMI, lipids, and BP",
			input: models.Assessment{
				BMI:           36,
				Triglycerides: 180,
				LDL:           150,
				HDL:           40,
				Systolic:      135,
				Diastolic:     85,
			},
			wantCluster:   "SIRD",
			wantRiskRange: [2]int{80, 100},
		},
		{
			name: "SIDD - low BMI with high lipids/BP",
			input: models.Assessment{
				BMI:           22,
				Triglycerides: 210,
				LDL:           170,
				Systolic:      145,
				Diastolic:     92,
			},
			wantCluster:   "SIDD",
			wantRiskRange: [2]int{70, 90},
		},
		{
			name: "MARD - even patient ID",
			input: models.Assessment{
				PatientID:     10,
				BMI:           24,
				Triglycerides: 110,
				LDL:           100,
				HDL:           55,
				Systolic:      118,
				Diastolic:     76,
			},
			wantCluster:   "MARD",
			wantRiskRange: [2]int{40, 50},
		},
		{
			name: "MOD - odd patient ID, normal values",
			input: models.Assessment{
				PatientID:     11,
				BMI:           24,
				Triglycerides: 110,
				LDL:           100,
				HDL:           55,
				Systolic:      118,
				Diastolic:     76,
			},
			wantCluster:   "MOD",
			wantRiskRange: [2]int{25, 40},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cluster, risk, err := p.Predict(context.Background(), tt.input)
			if err != nil {
				t.Errorf("Predict() returned unexpected error: %v", err)
			}
			if cluster != tt.wantCluster {
				t.Errorf("cluster = %q, want %q", cluster, tt.wantCluster)
			}
			if risk < tt.wantRiskRange[0] || risk > tt.wantRiskRange[1] {
				t.Errorf("risk = %d, want in range [%d, %d]", risk, tt.wantRiskRange[0], tt.wantRiskRange[1])
			}
		})
	}
}

func TestNewMockPredictor(t *testing.T) {
	p := NewMockPredictor()
	if p == nil {
		t.Error("NewMockPredictor returned nil")
	}
}
