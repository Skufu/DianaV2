package store

import (
	"context"
	"testing"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

func TestPostgresStore_NewPostgresStore(t *testing.T) {
	store := NewPostgresStore(nil)

	if store == nil {
		t.Error("NewPostgresStore returned nil")
	}
}

func TestPostgresStore_Close(t *testing.T) {
	store := &PostgresStore{}

	store.Close()
}

func TestPostgresStore_RepositoryFactories(t *testing.T) {
	store := &PostgresStore{}

	if store.Users() == nil {
		t.Error("Users() returned nil")
	}

	if store.Patients() == nil {
		t.Error("Patients() returned nil")
	}

	if store.Assessments() == nil {
		t.Error("Assessments() returned nil")
	}

	if store.RefreshTokens() == nil {
		t.Error("RefreshTokens() returned nil")
	}

	if store.AuditEvents() == nil {
		t.Error("AuditEvents() returned nil")
	}

	if store.ModelRuns() == nil {
		t.Error("ModelRuns() returned nil")
	}

	if store.Cohort() == nil {
		t.Error("Cohort() returned nil")
	}

	if store.Clinics() == nil {
		t.Error("Clinics() returned nil")
	}
}

func TestPgUserRepo_NotConfigured(t *testing.T) {
	repo := &pgUserRepo{}

	_, err := repo.FindByEmail(context.Background(), "test@example.com")
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgUserRepo_FindByEmail_ErrorHandling(t *testing.T) {
	repo := &pgUserRepo{}

	tests := []struct {
		name  string
		email string
	}{
		{"empty email", ""},
		{"valid email", "test@example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := repo.FindByEmail(context.Background(), tt.email)
			if err == nil || err.Error() != "db not configured" {
				t.Errorf("Expected 'db not configured' error for email %s, got: %v", tt.email, err)
			}
		})
	}
}

func TestPgUserRepo_FindByID_ErrorHandling(t *testing.T) {
	repo := &pgUserRepo{}

	_, err := repo.FindByID(context.Background(), 123)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for ID 123, got: %v", err)
	}
}

func TestPgUserRepo_GetUsersForNotification_ErrorHandling(t *testing.T) {
	repo := &pgUserRepo{}

	_, err := repo.GetUsersForNotification(context.Background())
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgPatientRepo_NotConfigured(t *testing.T) {
	repo := &pgPatientRepo{}

	_, err := repo.Create(context.Background(), models.Patient{
		UserID: 1,
		Name:   "Test Patient",
	})
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgPatientRepo_List_ErrorHandling(t *testing.T) {
	repo := &pgPatientRepo{}

	_, err := repo.List(context.Background(), 123)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for user ID 123, got: %v", err)
	}
}

func TestPgPatientRepo_ListWithLatestAssessment_ErrorHandling(t *testing.T) {
	repo := &pgPatientRepo{}

	_, err := repo.ListWithLatestAssessment(context.Background(), 123)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for user ID 123, got: %v", err)
	}
}

func TestPgPatientRepo_Get_ErrorHandling(t *testing.T) {
	repo := &pgPatientRepo{}

	_, err := repo.Get(context.Background(), 123, 456)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for patient ID 123, user ID 456, got: %v", err)
	}
}

func TestPgPatientRepo_Update_ErrorHandling(t *testing.T) {
	repo := &pgPatientRepo{}

	_, err := repo.Update(context.Background(), models.Patient{
		UserID: 1,
		Name:   "Test",
	})
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgPatientRepo_Delete_ErrorHandling(t *testing.T) {
	repo := &pgPatientRepo{}

	err := repo.Delete(context.Background(), 123, 456)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for patient ID 123, user ID 456, got: %v", err)
	}
}

func TestPgAssessmentRepo_NotConfigured(t *testing.T) {
	repo := &pgAssessmentRepo{}

	_, err := repo.Create(context.Background(), models.Assessment{
		UserID: 1,
		HbA1c:  6.5,
	})
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgAssessmentRepo_List_ErrorHandling(t *testing.T) {
	repo := &pgAssessmentRepo{}

	_, err := repo.ListByPatient(context.Background(), 123)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for patient ID 123, got: %v", err)
	}
}

func TestPgAssessmentRepo_Create_ErrorHandling(t *testing.T) {
	repo := &pgAssessmentRepo{}

	_, err := repo.Create(context.Background(), models.Assessment{
		UserID: 1,
		HbA1c:  6.5,
	})
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgAssessmentRepo_Update_ErrorHandling(t *testing.T) {
	repo := &pgAssessmentRepo{}

	_, err := repo.Update(context.Background(), models.Assessment{
		UserID: 1,
		HbA1c:  6.5,
	})
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgAssessmentRepo_Delete_ErrorHandling(t *testing.T) {
	repo := &pgAssessmentRepo{}

	err := repo.Delete(context.Background(), 123)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for assessment ID 123, got: %v", err)
	}
}

func TestPgAssessmentRepo_ClusterCounts_ErrorHandling(t *testing.T) {
	repo := &pgAssessmentRepo{}

	_, err := repo.ClusterCounts(context.Background())
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgAssessmentRepo_TrendAverages_ErrorHandling(t *testing.T) {
	repo := &pgAssessmentRepo{}

	_, err := repo.TrendAverages(context.Background())
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgRefreshTokenRepo_NotConfigured(t *testing.T) {
	repo := &pgRefreshTokenRepo{}

	_, err := repo.CreateRefreshToken(context.Background(), "hash", 123, time.Now())
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgRefreshTokenRepo_FindRefreshToken_ErrorHandling(t *testing.T) {
	repo := &pgRefreshTokenRepo{}

	_, err := repo.FindRefreshToken(context.Background(), "hash")
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for token hash, got: %v", err)
	}
}

func TestPgRefreshTokenRepo_RevokeRefreshToken_ErrorHandling(t *testing.T) {
	repo := &pgRefreshTokenRepo{}

	err := repo.RevokeRefreshToken(context.Background(), "hash")
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}

func TestPgRefreshTokenRepo_RevokeAllUserTokens_ErrorHandling(t *testing.T) {
	repo := &pgRefreshTokenRepo{}

	err := repo.RevokeAllUserTokens(context.Background(), 123)
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error for user ID 123, got: %v", err)
	}
}

func TestPgRefreshTokenRepo_DeleteExpiredTokens_ErrorHandling(t *testing.T) {
	repo := &pgRefreshTokenRepo{}

	err := repo.DeleteExpiredTokens(context.Background())
	if err == nil || err.Error() != "db not configured" {
		t.Errorf("Expected 'db not configured' error, got: %v", err)
	}
}
