package handlers

import (
	"testing"

	"github.com/skufu/DianaV2/internal/models"
)

func TestValidationStatus(t *testing.T) {
	cases := []struct {
		name   string
		input  models.Assessment
		expect string
	}{
		{
			name:   "normal values",
			input:  models.Assessment{FBS: 90, HbA1c: 5.4},
			expect: "ok",
		},
		{
			name:   "prediabetic fasting",
			input:  models.Assessment{FBS: 110, HbA1c: 5.4},
			expect: "warning:fbs_prediabetic_range",
		},
		{
			name:   "diabetic a1c and fasting",
			input:  models.Assessment{FBS: 130, HbA1c: 6.8},
			expect: "warning:fbs_diabetic_range,hba1c_diabetic_range",
		},
		{
			name:   "prediabetic a1c only",
			input:  models.Assessment{FBS: 90, HbA1c: 5.8},
			expect: "warning:hba1c_prediabetic_range",
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got := validationStatus(tc.input)
			if got != tc.expect {
				t.Fatalf("expected %s, got %s", tc.expect, got)
			}
		})
	}
}
