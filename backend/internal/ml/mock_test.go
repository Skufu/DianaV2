package ml

import (
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
			name: "SIRD - high BMI and HbA1c",
			input: models.Assessment{
				BMI:   32,
				HbA1c: 6.5,
			},
			wantCluster:   "SIRD",
			wantRiskRange: [2]int{80, 100},
		},
		{
			name: "SIDD - high HbA1c, low BMI",
			input: models.Assessment{
				BMI:   25,
				HbA1c: 7.0,
			},
			wantCluster:   "SIDD",
			wantRiskRange: [2]int{90, 100},
		},
		{
			name: "MARD - even patient ID",
			input: models.Assessment{
				PatientID: 10,
				BMI:       24,
				HbA1c:     5.5,
			},
			wantCluster:   "MARD",
			wantRiskRange: [2]int{40, 50},
		},
		{
			name: "MOD - odd patient ID, normal values",
			input: models.Assessment{
				PatientID: 11,
				BMI:       24,
				HbA1c:     5.5,
			},
			wantCluster:   "MOD",
			wantRiskRange: [2]int{25, 35},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cluster, risk := p.Predict(tt.input)
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
