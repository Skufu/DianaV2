package store

import (
	"context"
	"time"

	"github.com/skufu/DianaV2/internal/models"
)

type Store interface {
	Users() UserRepository
	Patients() PatientRepository
	Assessments() AssessmentRepository
	RefreshTokens() RefreshTokenRepository
	Close()
}

type UserRepository interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id int32) (*models.User, error)
}

type PatientRepository interface {
	List(ctx context.Context, userID int32) ([]models.Patient, error)
	Get(ctx context.Context, id int32, userID int32) (*models.Patient, error)
	Create(ctx context.Context, p models.Patient) (*models.Patient, error)
	Update(ctx context.Context, p models.Patient) (*models.Patient, error)
	Delete(ctx context.Context, id int32, userID int32) error
	ListAllLimited(ctx context.Context, userID int32, limit int) ([]models.Patient, error)
}

type AssessmentRepository interface {
	ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error)
	Get(ctx context.Context, id int32) (*models.Assessment, error)
	Create(ctx context.Context, a models.Assessment) (*models.Assessment, error)
	Update(ctx context.Context, a models.Assessment) (*models.Assessment, error)
	Delete(ctx context.Context, id int32) error
	ClusterCounts(ctx context.Context) ([]models.ClusterAnalytics, error)
	TrendAverages(ctx context.Context) ([]models.TrendPoint, error)
	ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error)
}

type RefreshTokenRepository interface {
	CreateRefreshToken(ctx context.Context, tokenHash string, userID int32, expiresAt time.Time) (*models.RefreshToken, error)
	FindRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
	RevokeAllUserTokens(ctx context.Context, userID int32) error
}
