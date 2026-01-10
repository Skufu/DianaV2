package store

import (
	"context"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

type Store interface {
	Users() UserRepository
	Patients() PatientRepository
	Assessments() AssessmentRepository
	RefreshTokens() RefreshTokenRepository
	Cohort() CohortRepository
	Clinics() ClinicRepository
	AuditEvents() AuditEventRepository
	ModelRuns() ModelRunRepository
	Close()
}

type UserRepository interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id int32) (*models.User, error)
	// Admin user management methods
	List(ctx context.Context, params models.UserListParams) ([]models.User, int, error)
	Create(ctx context.Context, user models.User) (*models.User, error)
	Update(ctx context.Context, user models.User) (*models.User, error)
	Deactivate(ctx context.Context, id int32) error
	Activate(ctx context.Context, id int32) error
	UpdateLastLogin(ctx context.Context, id int32) error
}

type PatientRepository interface {
	List(ctx context.Context, userID int32) ([]models.Patient, error)
	ListWithLatestAssessment(ctx context.Context, userID int32) ([]models.PatientSummary, error)
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
	ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterAnalytics, error)
	TrendAverages(ctx context.Context) ([]models.TrendPoint, error)
	TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error)
	ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error)
	ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error)
	GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error)
}

type RefreshTokenRepository interface {
	CreateRefreshToken(ctx context.Context, tokenHash string, userID int32, expiresAt time.Time) (*models.RefreshToken, error)
	FindRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
	RevokeAllUserTokens(ctx context.Context, userID int32) error
	DeleteExpiredTokens(ctx context.Context) error
}

type CohortRepository interface {
	StatsByCluster(ctx context.Context) ([]models.CohortGroup, error)
	StatsByRiskLevel(ctx context.Context) ([]models.CohortGroup, error)
	StatsByAgeGroup(ctx context.Context) ([]models.CohortGroup, error)
	StatsByMenopauseStatus(ctx context.Context) ([]models.CohortGroup, error)
	TotalPatientCount(ctx context.Context) (int, error)
	TotalAssessmentCount(ctx context.Context) (int, error)
}

type ClinicRepository interface {
	List(ctx context.Context) ([]models.Clinic, error)
	Get(ctx context.Context, id int32) (*models.Clinic, error)
	Create(ctx context.Context, name, address string) (*models.Clinic, error)
	ListUserClinics(ctx context.Context, userID int32) ([]models.UserClinic, error)
	IsClinicAdmin(ctx context.Context, userID, clinicID int32) (bool, error)
	ClinicAggregate(ctx context.Context, clinicID int32) (*models.ClinicAggregate, error)
	AdminSystemStats(ctx context.Context) (*models.SystemStats, error)
	AdminClinicComparison(ctx context.Context) ([]models.ClinicComparison, error)
}

// AuditEventRepository provides access to audit logs for admin transparency
type AuditEventRepository interface {
	Create(ctx context.Context, event models.AuditEvent) error
	List(ctx context.Context, params models.AuditListParams) ([]models.AuditEvent, int, error)
}

// ModelRunRepository provides access to ML model training run history
type ModelRunRepository interface {
	List(ctx context.Context, limit, offset int) ([]models.ModelRun, int, error)
	GetActive(ctx context.Context) (*models.ModelRun, error)
	Create(ctx context.Context, run models.ModelRun) (*models.ModelRun, error)
	SetActive(ctx context.Context, id int32) error
}
