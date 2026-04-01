// PostgresStore: Factory for pgx-backed repositories.
package store

import (
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

// itoa converts an integer to its string representation.
// Used for dynamic SQL parameter numbering in queries that cannot use SQLC.
// NOTE: This should be removed once all repos are migrated to SQLC.
func itoa(n int) string {
	return strconv.Itoa(n)
}

type PostgresStore struct {
	pool *pgxpool.Pool
	q    *sqlcgen.Queries
}

// NewPostgresStore creates a new PostgresStore with pgxpool connection.
// Initializes SQLC Queries for type-safe database operations.
func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	var q *sqlcgen.Queries
	if pool != nil {
		q = sqlcgen.New(pool)
	}
	return &PostgresStore{pool: pool, q: q}
}

// Close closes the database connection pool.
func (s *PostgresStore) Close() {
	if s.pool != nil {
		s.pool.Close()
	}
}

// Users returns the UserRepository implementation.
func (s *PostgresStore) Users() UserRepository {
	return &pgUserRepo{q: s.q, pool: s.pool}
}

// Patients returns the PatientRepository implementation.
func (s *PostgresStore) Patients() PatientRepository {
	return &pgPatientRepo{q: s.q}
}

// Assessments returns the AssessmentRepository implementation.
func (s *PostgresStore) Assessments() AssessmentRepository {
	return &pgAssessmentRepo{q: s.q}
}

// RefreshTokens returns the RefreshTokenRepository implementation.
func (s *PostgresStore) RefreshTokens() RefreshTokenRepository {
	return &pgRefreshTokenRepo{q: s.q}
}

// Clinics returns the ClinicRepository implementation.
func (s *PostgresStore) Clinics() ClinicRepository {
	return &pgClinicRepo{q: s.q}
}

// Cohort returns the CohortRepository implementation.
func (s *PostgresStore) Cohort() CohortRepository {
	return &pgCohortRepo{q: s.q}
}

// AuditEvents returns the AuditEventRepository implementation.
func (s *PostgresStore) AuditEvents() AuditEventRepository {
	return &pgAuditEventRepo{q: s.q}
}

// ModelRuns returns the ModelRunRepository implementation.
func (s *PostgresStore) ModelRuns() ModelRunRepository {
	return &pgModelRunRepo{q: s.q}
}
