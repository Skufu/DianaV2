package services

import (
	"context"
	"testing"

	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type mockStore struct{}

func (m *mockStore) AuditEvents() store.AuditEventRepository { return m }

func (m *mockStore) Create(ctx context.Context, event models.AuditEvent) error {
	return nil
}

// Implement remaining Store interface methods
func (m *mockStore) Users() store.UserRepository                 { return nil }
func (m *mockStore) Patients() store.PatientRepository           { return nil }
func (m *mockStore) Assessments() store.AssessmentRepository     { return nil }
func (m *mockStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockStore) Cohort() store.CohortRepository              { return nil }
func (m *mockStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockStore) ModelRuns() store.ModelRunRepository         { return nil }
func (m *mockStore) Close()                                      {}

// Implement AuditEventRepository List method
func (m *mockStore) List(ctx context.Context, params models.AuditListParams) ([]models.AuditEvent, int, error) {
	return nil, 0, nil
}

func TestNotificationService_QueueAssessmentReminder(t *testing.T) {
	service := NewNotificationService(&mockStore{})

	result := service.QueueAssessmentReminder(123, 1)

	if result != nil {
		t.Errorf("QueueAssessmentReminder() returned error: %v", result)
	}
}

func TestNotificationService_ScheduleMonthlySummary(t *testing.T) {
	service := NewNotificationService(&mockStore{})

	result := service.ScheduleMonthlySummary(456)

	if result != nil {
		t.Errorf("ScheduleMonthlySummary() returned error: %v", result)
	}
}

func TestNotificationService_SendRiskAlert(t *testing.T) {
	service := NewNotificationService(&mockStore{})

	tests := []struct {
		name      string
		userID    int64
		hba1c     float64
		riskLevel string
	}{
		{
			name:      "low risk",
			userID:    1,
			hba1c:     6.0,
			riskLevel: "moderate risk",
		},
		{
			name:      "high risk",
			userID:    2,
			hba1c:     7.2,
			riskLevel: "high risk",
		},
		{
			name:      "borderline",
			userID:    3,
			hba1c:     5.7,
			riskLevel: "Moderate risk - Consider lifestyle changes",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := service.SendRiskAlert(tc.userID, tc.hba1c, tc.riskLevel)

			if result != nil {
				t.Errorf("SendRiskAlert() returned error: %v", result)
			}

		})
	}
}

func TestNotificationService_ProcessQueue(t *testing.T) {
	service := NewNotificationService(&mockStore{})

	result := service.ProcessQueue()

	if result != nil {
		t.Errorf("ProcessQueue() returned error: %v", result)
	}
}
