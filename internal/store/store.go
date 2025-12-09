package store

import (
	"context"

	"github.com/skufu/DianaV2/internal/models"
)

type Store interface {
	Users() UserRepository
	Patients() PatientRepository
	Assessments() AssessmentRepository
	Close()
}

type UserRepository interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
}

type PatientRepository interface {
	List(ctx context.Context) ([]models.Patient, error)
	Create(ctx context.Context, p models.Patient) (*models.Patient, error)
	ListAllLimited(ctx context.Context, limit int) ([]models.Patient, error)
}

type AssessmentRepository interface {
	ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error)
	Create(ctx context.Context, a models.Assessment) (*models.Assessment, error)
	ClusterCounts(ctx context.Context) ([]models.ClusterAnalytics, error)
	TrendAverages(ctx context.Context) ([]models.TrendPoint, error)
	ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error)
}
