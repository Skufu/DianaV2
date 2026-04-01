// PostgresStore: Factory for pgx-backed repositories.
package store

import (
	"context"
	"strconv"

	"github.com/jackc/pgx/v5"
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

// Ping verifies database connectivity for health checks.
func (s *PostgresStore) Ping(ctx context.Context) error {
	if s.pool == nil {
		return pgx.ErrNoRows // Use appropriate error for "not configured"
	}
	return s.pool.Ping(ctx)
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

// BeginTx starts a new transaction and returns a TxStore.
// All operations on the returned TxStore will use the same transaction.
// Call Commit to persist changes or Rollback to discard them.
func (s *PostgresStore) BeginTx(ctx context.Context) (TxStore, error) {
	if s.pool == nil {
		return nil, pgx.ErrNoRows // Use appropriate error for "not configured"
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}

	return &pgTxStore{
		tx: tx,
		q:  sqlcgen.New(tx),
	}, nil
}

// pgTxStore is a transaction-scoped store that wraps a pgx.Tx.
// All repository operations use the same transaction.
type pgTxStore struct {
	tx pgx.Tx
	q  *sqlcgen.Queries
}

// Commit persists all changes made within the transaction.
func (s *pgTxStore) Commit(ctx context.Context) error {
	return s.tx.Commit(ctx)
}

// Rollback discards all changes made within the transaction.
func (s *pgTxStore) Rollback(ctx context.Context) error {
	return s.tx.Rollback(ctx)
}

// Close is a no-op for transactions. Use Commit or Rollback instead.
func (s *pgTxStore) Close() {
	// Transactions are closed via Commit/Rollback
}

// Ping verifies the transaction is still active.
func (s *pgTxStore) Ping(ctx context.Context) error {
	// For transactions, we can execute a simple query to verify connectivity
	_, err := s.tx.Exec(ctx, "SELECT 1")
	return err
}

// Users returns the UserRepository implementation using the transaction.
func (s *pgTxStore) Users() UserRepository {
	return &pgUserRepo{q: s.q, tx: s.tx}
}

// Patients returns the PatientRepository implementation using the transaction.
func (s *pgTxStore) Patients() PatientRepository {
	return &pgPatientRepo{q: s.q}
}

// Assessments returns the AssessmentRepository implementation using the transaction.
func (s *pgTxStore) Assessments() AssessmentRepository {
	return &pgAssessmentRepo{q: s.q}
}

// RefreshTokens returns the RefreshTokenRepository implementation using the transaction.
func (s *pgTxStore) RefreshTokens() RefreshTokenRepository {
	return &pgRefreshTokenRepo{q: s.q}
}

// Clinics returns the ClinicRepository implementation using the transaction.
func (s *pgTxStore) Clinics() ClinicRepository {
	return &pgClinicRepo{q: s.q}
}

// Cohort returns the CohortRepository implementation using the transaction.
func (s *pgTxStore) Cohort() CohortRepository {
	return &pgCohortRepo{q: s.q}
}

// AuditEvents returns the AuditEventRepository implementation using the transaction.
func (s *pgTxStore) AuditEvents() AuditEventRepository {
	return &pgAuditEventRepo{q: s.q}
}

// ModelRuns returns the ModelRunRepository implementation using the transaction.
func (s *pgTxStore) ModelRuns() ModelRunRepository {
	return &pgModelRunRepo{q: s.q}
}

// BeginTx returns an error - nested transactions are not supported.
// Use savepoints if you need nested transaction semantics.
func (s *pgTxStore) BeginTx(ctx context.Context) (TxStore, error) {
	return nil, pgx.ErrTxClosed
}
