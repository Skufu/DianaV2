package services

import (
	"testing"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

func TestPDFExportService_GenerateHealthReport(t *testing.T) {
	service := NewPDFExportService()

	now := time.Date(2026, time.January, 14, 10, 30, 0, 0, time.UTC)
	user := models.UserProfile{
		User: models.User{
			ID:        1,
			FirstName: "John",
			LastName:  "Doe",
			Email:     "john.doe@example.com",
		},
	}

	assessments := []models.Assessment{
		{
			ID:        1,
			PatientID: 1,
			HbA1c:     6.5,
			CreatedAt: now,
		},
		{
			ID:        2,
			PatientID: 1,
			HbA1c:     7.0,
			CreatedAt: now.Add(-24 * time.Hour),
		},
	}

	result, err := service.GenerateHealthReport(user, assessments)

	if err != nil {
		t.Errorf("GenerateHealthReport() returned error: %v", err)
	}

	if len(result) == 0 {
		t.Fatal("expected non-empty PDF data")
	}
}

func TestGetRiskLevel(t *testing.T) {
	tests := []struct {
		score    int32
		expected string
	}{
		{20, "Low"},
		{29, "Low"},
		{30, "Moderate"},
		{69, "Moderate"},
		{70, "High"},
		{100, "High"},
	}

	for _, tc := range tests {
		t.Run("", func(t *testing.T) {
			result := getRiskLevel(tc.score)
			if result != tc.expected {
				t.Errorf("getRiskLevel(%d) = %q, want %q", tc.score, result, tc.expected)
			}
		})
	}
}
