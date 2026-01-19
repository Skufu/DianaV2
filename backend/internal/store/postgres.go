// PostgresStore: pgx-backed repositories for users and assessments.
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type PostgresStore struct {
	pool *pgxpool.Pool
	q    *sqlcgen.Queries
}

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	var q *sqlcgen.Queries
	if pool != nil {
		q = sqlcgen.New(pool)
	}
	return &PostgresStore{pool: pool, q: q}
}

func (s *PostgresStore) Close() {
	if s.pool != nil {
		s.pool.Close()
	}
}

func (s *PostgresStore) Users() UserRepository {
	return &pgUserRepo{q: s.q, pool: s.pool}
}

func (s *PostgresStore) Assessments() AssessmentRepository {
	return &pgAssessmentRepo{q: s.q}
}

func (s *PostgresStore) RefreshTokens() RefreshTokenRepository {
	return &pgRefreshTokenRepo{q: s.q}
}

func (s *PostgresStore) AuthEvents() AuthEventRepository {
	return &pgAuthEventRepo{pool: s.pool}
}

type pgAuthEventRepo struct {
	pool *pgxpool.Pool
}

func (r *pgAuthEventRepo) Create(ctx context.Context, event models.AuthEvent) error {
	if r.pool == nil {
		return nil
	}

	ipAddress := &event.IPAddress
	if event.IPAddress == "" {
		ipAddress = nil
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO auth_events (event_type, email, ip_address, user_agent, success, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`,
		event.EventType,
		ipAddress,
		event.Email,
		event.UserAgent,
		event.Success,
		event.Metadata,
	)
	return err
}

func (r *pgAuthEventRepo) List(ctx context.Context, eventType, email, startDate, endDate string, limit, offset int) ([]models.AuthEvent, int, error) {
	if r.pool == nil {
		return nil, 0, errors.New("db not configured")
	}

	query := `
		SELECT id, event_type, email, ip_address, user_agent, success, device_info, location, metadata, created_at
		FROM auth_events
		WHERE 1=1
	`

	args := []interface{}{1}
	argIndex := 2

	if eventType != "" {
		query += ` AND event_type = $` + fmt.Sprint(argIndex)
		args = append(args, eventType)
		argIndex++
	}

	if email != "" {
		query += ` AND email ILIKE '%' || $` + fmt.Sprint(argIndex) + ` || '%'`
		args = append(args, email)
		argIndex++
	}

	if startDate != "" {
		query += ` AND created_at >= $` + fmt.Sprint(argIndex)
		args = append(args, startDate)
		argIndex++
	}

	if endDate != "" {
		query += ` AND created_at <= $` + fmt.Sprint(argIndex)
		args = append(args, endDate)
		argIndex++
	}

	query += ` ORDER BY created_at DESC LIMIT $` + fmt.Sprint(argIndex) + ` OFFSET $` + fmt.Sprint(argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []models.AuthEvent
	for rows.Next() {
		var e models.AuthEvent
		var deviceInfoJSON, locationJSON, metadataJSON []byte

		err := rows.Scan(
			&e.ID,
			&e.EventType,
			&e.Email,
			&e.IPAddress,
			&e.UserAgent,
			&e.Success,
			&deviceInfoJSON,
			&locationJSON,
			&metadataJSON,
			&e.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		if len(deviceInfoJSON) > 0 {
			_ = json.Unmarshal(deviceInfoJSON, &e.DeviceInfo)
		}
		if len(locationJSON) > 0 {
			_ = json.Unmarshal(locationJSON, &e.Location)
		}
		if len(metadataJSON) > 0 {
			_ = json.Unmarshal(metadataJSON, &e.Metadata)
		}

		events = append(events, e)
	}

	countQuery := `
		SELECT COUNT(*)
		FROM auth_events
		WHERE 1=1
	`
	countArgs := []interface{}{1}
	countIndex := 2

	if eventType != "" {
		countQuery += ` AND event_type = $` + fmt.Sprint(countIndex)
		countArgs = append(countArgs, eventType)
		countIndex++
	}

	if email != "" {
		countQuery += ` AND email ILIKE '%' || $` + fmt.Sprint(countIndex) + ` || '%'`
		countArgs = append(countArgs, email)
		countIndex++
	}

	if startDate != "" {
		countQuery += ` AND created_at >= $` + fmt.Sprint(countIndex)
		countArgs = append(countArgs, startDate)
		countIndex++
	}

	if endDate != "" {
		countQuery += ` AND created_at <= $` + fmt.Sprint(countIndex)
		countArgs = append(countArgs, endDate)
	}

	var total int
	err = r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

type pgUserRepo struct {
	q    *sqlcgen.Queries
	pool *pgxpool.Pool
}

func (r *pgUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.FindUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	// Derive role from is_admin flag for JWT claims compatibility
	role := "user"
	if row.IsAdmin {
		role = "admin"
	}
	return &models.User{
		ID:           int64(row.ID),
		Email:        row.Email,
		PasswordHash: row.PasswordHash,
		Role:         role,
		IsAdmin:      row.IsAdmin,
		IsActive:     row.IsActive,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}, nil
}

func (r *pgUserRepo) FindByID(ctx context.Context, id int32) (*models.User, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.FindUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	role := "user"
	if row.IsAdmin {
		role = "admin"
	}
	return &models.User{
		ID:           int64(row.ID),
		Email:        row.Email,
		PasswordHash: row.PasswordHash,
		Role:         role,
		IsAdmin:      row.IsAdmin,
		IsActive:     row.IsActive,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}, nil
}

func (r *pgUserRepo) GetUsersForNotification(ctx context.Context) ([]models.UserForNotification, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.GetUsersForNotification(ctx)
	if err != nil {
		return nil, err
	}
	var out []models.UserForNotification
	for _, row := range rows {
		out = append(out, models.UserForNotification{
			ID:                         row.ID,
			Email:                      row.Email,
			FirstName:                  textVal(row.FirstName),
			LastName:                   textVal(row.LastName),
			AssessmentFrequencyMonths:  row.AssessmentFrequencyMonths,
			LastAssessmentReminderSent: row.LastAssessmentReminderSent.Time,
		})
	}
	return out, nil
}

type pgAssessmentRepo struct{ q *sqlcgen.Queries }

func (r *pgAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsByUser(ctx, int64ToPgInt(patientID))
	if err != nil {
		return nil, err
	}
	return mapListAssessmentsByUserRows(rows), nil
}

func (r *pgAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	if r.q == nil {
		return nil, 0, errors.New("db not configured")
	}
	count, err := r.q.CountAssessmentsByUser(ctx, int64ToPgInt(patientID))
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.q.ListAssessmentsByUserPaginated(ctx, sqlcgen.ListAssessmentsByUserPaginatedParams{
		UserID: int64ToPgInt(patientID),
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	return mapListAssessmentsByUserPaginatedRows(rows), int(count), nil
}

func (r *pgAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreateAssessment(ctx, sqlcgen.CreateAssessmentParams{
		UserID:           int64ToPgInt(a.UserID),
		Fbs:              floatToNumeric(a.FBS),
		Hba1c:            floatToNumeric(a.HbA1c),
		Cholesterol:      intToPgInt(a.Cholesterol),
		Ldl:              intToPgInt(a.LDL),
		Hdl:              intToPgInt(a.HDL),
		Triglycerides:    intToPgInt(a.Triglycerides),
		Systolic:         intToPgInt(a.Systolic),
		Diastolic:        intToPgInt(a.Diastolic),
		Activity:         textToPg(a.Activity),
		HistoryFlag:      boolToPg(a.HistoryFlag),
		Smoking:          textToPg(a.Smoking),
		Hypertension:     textToPg(a.Hypertension),
		HeartDisease:     textToPg(a.HeartDisease),
		Bmi:              floatToNumeric(a.BMI),
		Cluster:          textToPg(a.Cluster),
		RiskScore:        intToPgInt(a.RiskScore),
		ModelVersion:     textToPg(a.ModelVersion),
		DatasetHash:      textToPg(a.DatasetHash),
		ValidationStatus: textToPg(a.ValidationStatus),
	})
	if err != nil {
		return nil, err
	}
	res := mapCreateAssessmentRow(row)
	return &res, nil
}

func (r *pgAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ClusterCounts(ctx)
	if err != nil {
		return nil, err
	}
	var res []models.ClusterInsights
	for _, c := range rows {
		res = append(res, models.ClusterInsights{
			Cluster: c.Cluster,
			Count:   int(c.Count),
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.TrendAverages(ctx)
	if err != nil {
		return nil, err
	}
	var res []models.TrendPoint
	for _, t := range rows {
		res = append(res, models.TrendPoint{
			Label: t.Label,
			HbA1c: t.Hba1c,
			FBS:   t.Fbs,
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ClusterCountsByUser(ctx, intToPgInt(int(userID)))
	if err != nil {
		return nil, err
	}
	var res []models.ClusterInsights
	for _, c := range rows {
		res = append(res, models.ClusterInsights{
			Cluster: c.Cluster,
			Count:   int(c.Count),
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.TrendAveragesByUser(ctx, intToPgInt(int(userID)))
	if err != nil {
		return nil, err
	}
	var res []models.TrendPoint
	for _, t := range rows {
		res = append(res, models.TrendPoint{
			Label: t.Label,
			HbA1c: t.Hba1c,
			FBS:   t.Fbs,
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.GetAssessment(ctx, id)
	if err != nil {
		return nil, err
	}
	res := mapGetAssessmentRow(row)
	return &res, nil
}

func (r *pgAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.UpdateAssessment(ctx, sqlcgen.UpdateAssessmentParams{
		ID:               int32(a.ID),
		UserID:           int64ToPgInt(a.UserID),
		Fbs:              floatToNumeric(a.FBS),
		Hba1c:            floatToNumeric(a.HbA1c),
		Cholesterol:      intToPgInt(a.Cholesterol),
		Ldl:              intToPgInt(a.LDL),
		Hdl:              intToPgInt(a.HDL),
		Triglycerides:    intToPgInt(a.Triglycerides),
		Systolic:         intToPgInt(a.Systolic),
		Diastolic:        intToPgInt(a.Diastolic),
		Activity:         textToPg(a.Activity),
		HistoryFlag:      boolToPg(a.HistoryFlag),
		Smoking:          textToPg(a.Smoking),
		Hypertension:     textToPg(a.Hypertension),
		HeartDisease:     textToPg(a.HeartDisease),
		Bmi:              floatToNumeric(a.BMI),
		Cluster:          textToPg(a.Cluster),
		RiskScore:        intToPgInt(a.RiskScore),
		ModelVersion:     textToPg(a.ModelVersion),
		DatasetHash:      textToPg(a.DatasetHash),
		ValidationStatus: textToPg(a.ValidationStatus),
	})
	if err != nil {
		return nil, err
	}
	res := mapUpdateAssessmentRow(row)
	return &res, nil
}

func (r *pgAssessmentRepo) Delete(ctx context.Context, id int32) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.DeleteAssessment(ctx, id)
}

func (r *pgAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsLimited(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	return mapAssessmentsLimitedRows(rows), nil
}

func (r *pgAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsByUserPaginated(ctx, sqlcgen.ListAssessmentsByUserPaginatedParams{
		UserID: int64ToPgInt(int64(userID)),
		Limit:  int32(limit),
		Offset: 0,
	})
	if err != nil {
		return nil, err
	}
	return mapListAssessmentsByUserPaginatedRows(rows), nil
}

func (r *pgAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	// Use raw SQL since this query may not be in sqlc yet
	// Query returns assessment trend data ordered by created_at ASC
	assessments, err := r.ListByPatient(ctx, patientID)
	if err != nil {
		return nil, err
	}

	// Convert to trend format and sort by date ascending
	var trends []models.AssessmentTrend
	for i := len(assessments) - 1; i >= 0; i-- {
		a := assessments[i]
		var riskScore *float64
		if a.RiskScore > 0 {
			rs := float64(a.RiskScore) / 100.0
			riskScore = &rs
		}
		trends = append(trends, models.AssessmentTrend{
			ID:            a.ID,
			CreatedAt:     a.CreatedAt,
			RiskScore:     riskScore,
			Cluster:       a.Cluster,
			HbA1c:         a.HbA1c,
			BMI:           a.BMI,
			FBS:           a.FBS,
			Triglycerides: a.Triglycerides,
			LDL:           a.LDL,
			HDL:           a.HDL,
		})
	}
	return trends, nil
}

type pgRefreshTokenRepo struct{ q *sqlcgen.Queries }

func (r *pgRefreshTokenRepo) CreateRefreshToken(ctx context.Context, tokenHash string, userID int32, expiresAt time.Time) (*models.RefreshToken, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreateRefreshToken(ctx, sqlcgen.CreateRefreshTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: timeToPgTimestamp(expiresAt),
	})
	if err != nil {
		return nil, err
	}
	return &models.RefreshToken{
		ID:        int64(row.ID),
		UserID:    int64(row.UserID),
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt.Time,
		Revoked:   row.Revoked,
		CreatedAt: row.CreatedAt.Time,
		RevokedAt: timestampVal(row.RevokedAt),
	}, nil
}

func (r *pgRefreshTokenRepo) FindRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.FindRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, err
	}
	return &models.RefreshToken{
		ID:        int64(row.ID),
		UserID:    int64(row.UserID),
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt.Time,
		Revoked:   row.Revoked,
		CreatedAt: row.CreatedAt.Time,
		RevokedAt: timestampVal(row.RevokedAt),
	}, nil
}

func (r *pgRefreshTokenRepo) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.RevokeRefreshToken(ctx, tokenHash)
}

func (r *pgRefreshTokenRepo) RevokeAllUserTokens(ctx context.Context, userID int32) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.RevokeAllUserTokens(ctx, userID)
}

func (r *pgRefreshTokenRepo) DeleteExpiredTokens(ctx context.Context) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.DeleteExpiredTokens(ctx)
}

// mapping helpers - assessments

func mapListAssessmentsByUserRows(rows []sqlcgen.ListAssessmentsByUserRow) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, models.Assessment{
			ID:               int64(r.ID),
			UserID:           int64Val(r.UserID),
			FBS:              numericVal(r.Fbs),
			HbA1c:            numericVal(r.Hba1c),
			Cholesterol:      intVal(r.Cholesterol),
			LDL:              intVal(r.Ldl),
			HDL:              intVal(r.Hdl),
			Triglycerides:    intVal(r.Triglycerides),
			Systolic:         intVal(r.Systolic),
			Diastolic:        intVal(r.Diastolic),
			Activity:         textVal(r.Activity),
			HistoryFlag:      boolVal(r.HistoryFlag),
			Smoking:          textVal(r.Smoking),
			Hypertension:     textVal(r.Hypertension),
			HeartDisease:     textVal(r.HeartDisease),
			BMI:              numericVal(r.Bmi),
			Cluster:          textVal(r.Cluster),
			RiskScore:        intVal(r.RiskScore),
			ModelVersion:     textVal(r.ModelVersion),
			DatasetHash:      textVal(r.DatasetHash),
			ValidationStatus: textVal(r.ValidationStatus),
			IsSelfReported:   r.IsSelfReported,
			Source:           r.Source,
			Notes:            textVal(r.Notes),
			CreatedAt:        r.CreatedAt.Time,
			UpdatedAt:        r.UpdatedAt.Time,
		})
	}
	return out
}

func mapListAssessmentsByUserPaginatedRows(rows []sqlcgen.ListAssessmentsByUserPaginatedRow) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, models.Assessment{
			ID:               int64(r.ID),
			UserID:           int64Val(r.UserID), // Generated types have UserID
			FBS:              numericVal(r.Fbs),
			HbA1c:            numericVal(r.Hba1c),
			Cholesterol:      intVal(r.Cholesterol),
			LDL:              intVal(r.Ldl),
			HDL:              intVal(r.Hdl),
			Triglycerides:    intVal(r.Triglycerides),
			Systolic:         intVal(r.Systolic),
			Diastolic:        intVal(r.Diastolic),
			Activity:         textVal(r.Activity),
			HistoryFlag:      boolVal(r.HistoryFlag),
			Smoking:          textVal(r.Smoking),
			Hypertension:     textVal(r.Hypertension),
			HeartDisease:     textVal(r.HeartDisease),
			BMI:              numericVal(r.Bmi),
			Cluster:          textVal(r.Cluster),
			RiskScore:        intVal(r.RiskScore),
			ModelVersion:     textVal(r.ModelVersion),
			DatasetHash:      textVal(r.DatasetHash),
			ValidationStatus: textVal(r.ValidationStatus),
			IsSelfReported:   r.IsSelfReported,
			Source:           r.Source,
			Notes:            textVal(r.Notes),
			CreatedAt:        r.CreatedAt.Time,
			UpdatedAt:        r.UpdatedAt.Time,
		})
	}
	return out
}

func mapAssessmentsLimitedRows(rows []sqlcgen.ListAssessmentsLimitedRow) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, models.Assessment{
			ID:               int64(r.ID),
			UserID:           int64Val(r.UserID),
			FBS:              numericVal(r.Fbs),
			HbA1c:            numericVal(r.Hba1c),
			Cholesterol:      intVal(r.Cholesterol),
			LDL:              intVal(r.Ldl),
			HDL:              intVal(r.Hdl),
			Triglycerides:    intVal(r.Triglycerides),
			Systolic:         intVal(r.Systolic),
			Diastolic:        intVal(r.Diastolic),
			Activity:         textVal(r.Activity),
			HistoryFlag:      boolVal(r.HistoryFlag),
			Smoking:          textVal(r.Smoking),
			Hypertension:     textVal(r.Hypertension),
			HeartDisease:     textVal(r.HeartDisease),
			BMI:              numericVal(r.Bmi),
			Cluster:          textVal(r.Cluster),
			RiskScore:        intVal(r.RiskScore),
			ModelVersion:     textVal(r.ModelVersion),
			DatasetHash:      textVal(r.DatasetHash),
			ValidationStatus: textVal(r.ValidationStatus),
			IsSelfReported:   r.IsSelfReported,
			Source:           r.Source,
			Notes:            textVal(r.Notes),
			CreatedAt:        r.CreatedAt.Time,
			UpdatedAt:        r.UpdatedAt.Time,
		})
	}
	return out
}

func mapCreateAssessmentRow(r sqlcgen.CreateAssessmentRow) models.Assessment {
	return models.Assessment{
		ID:               int64(r.ID),
		UserID:           int64Val(r.UserID),
		FBS:              numericVal(r.Fbs),
		HbA1c:            numericVal(r.Hba1c),
		Cholesterol:      intVal(r.Cholesterol),
		LDL:              intVal(r.Ldl),
		HDL:              intVal(r.Hdl),
		Triglycerides:    intVal(r.Triglycerides),
		Systolic:         intVal(r.Systolic),
		Diastolic:        intVal(r.Diastolic),
		Activity:         textVal(r.Activity),
		HistoryFlag:      boolVal(r.HistoryFlag),
		Smoking:          textVal(r.Smoking),
		Hypertension:     textVal(r.Hypertension),
		HeartDisease:     textVal(r.HeartDisease),
		BMI:              numericVal(r.Bmi),
		Cluster:          textVal(r.Cluster),
		RiskScore:        intVal(r.RiskScore),
		ModelVersion:     textVal(r.ModelVersion),
		DatasetHash:      textVal(r.DatasetHash),
		ValidationStatus: textVal(r.ValidationStatus),
		IsSelfReported:   r.IsSelfReported,
		Source:           r.Source,
		Notes:            textVal(r.Notes),
		CreatedAt:        r.CreatedAt.Time,
		UpdatedAt:        r.UpdatedAt.Time,
	}
}

func mapGetAssessmentRow(r sqlcgen.GetAssessmentRow) models.Assessment {
	return models.Assessment{
		ID:               int64(r.ID),
		UserID:           int64Val(r.UserID),
		FBS:              numericVal(r.Fbs),
		HbA1c:            numericVal(r.Hba1c),
		Cholesterol:      intVal(r.Cholesterol),
		LDL:              intVal(r.Ldl),
		HDL:              intVal(r.Hdl),
		Triglycerides:    intVal(r.Triglycerides),
		Systolic:         intVal(r.Systolic),
		Diastolic:        intVal(r.Diastolic),
		Activity:         textVal(r.Activity),
		HistoryFlag:      boolVal(r.HistoryFlag),
		Smoking:          textVal(r.Smoking),
		Hypertension:     textVal(r.Hypertension),
		HeartDisease:     textVal(r.HeartDisease),
		BMI:              numericVal(r.Bmi),
		Cluster:          textVal(r.Cluster),
		RiskScore:        intVal(r.RiskScore),
		ModelVersion:     textVal(r.ModelVersion),
		DatasetHash:      textVal(r.DatasetHash),
		ValidationStatus: textVal(r.ValidationStatus),
		IsSelfReported:   r.IsSelfReported,
		Source:           r.Source,
		Notes:            textVal(r.Notes),
		CreatedAt:        r.CreatedAt.Time,
		UpdatedAt:        r.UpdatedAt.Time,
	}
}

func mapUpdateAssessmentRow(r sqlcgen.UpdateAssessmentRow) models.Assessment {
	return models.Assessment{
		ID:               int64(r.ID),
		UserID:           int64Val(r.UserID),
		FBS:              numericVal(r.Fbs),
		HbA1c:            numericVal(r.Hba1c),
		Cholesterol:      intVal(r.Cholesterol),
		LDL:              intVal(r.Ldl),
		HDL:              intVal(r.Hdl),
		Triglycerides:    intVal(r.Triglycerides),
		Systolic:         intVal(r.Systolic),
		Diastolic:        intVal(r.Diastolic),
		Activity:         textVal(r.Activity),
		HistoryFlag:      boolVal(r.HistoryFlag),
		Smoking:          textVal(r.Smoking),
		Hypertension:     textVal(r.Hypertension),
		HeartDisease:     textVal(r.HeartDisease),
		BMI:              numericVal(r.Bmi),
		Cluster:          textVal(r.Cluster),
		RiskScore:        intVal(r.RiskScore),
		ModelVersion:     textVal(r.ModelVersion),
		DatasetHash:      textVal(r.DatasetHash),
		ValidationStatus: textVal(r.ValidationStatus),
		IsSelfReported:   r.IsSelfReported,
		Source:           r.Source,
		Notes:            textVal(r.Notes),
		CreatedAt:        r.CreatedAt.Time,
		UpdatedAt:        r.UpdatedAt.Time,
	}
}

// mapAssessment not needed if sqlcgen.Assessment is not used, but keep for fallback?
// No, sqlcgen.Assessment might be used in ListAssessmentsLimitedRows if it uses it.
// Wait, mapAssessmentsLimitedRows takes sqlcgen.ListAssessmentsLimitedRow?
// It WAS taking sqlcgen.Assessment.
// I should update it to take sqlcgen.ListAssessmentsLimitedRow (from generated code logic).
// Line 623 in Step 311 showed ListAssessmentsLimitedRow.
// So I updated signature in helper above.

// pgtype helpers
func intVal(v pgtype.Int4) int {
	if !v.Valid {
		return 0
	}
	return int(v.Int32)
}

func int64Val(v pgtype.Int4) int64 {
	if !v.Valid {
		return 0
	}
	return int64(v.Int32)
}

func intToPgInt(v int) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(v), Valid: true}
}

func int64ToPgInt(v int64) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(v), Valid: true}
}

func textVal(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func textToPg(v string) pgtype.Text {
	if v == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: v, Valid: true}
}

func numericVal(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil {
		return 0
	}
	return f.Float64
}

func floatToNumeric(v float64) pgtype.Numeric {
	var n pgtype.Numeric
	// Use string representation to ensure proper scanning, including for 0 values
	str := fmt.Sprintf("%f", v)
	_ = n.Scan(str)
	return n
}

func boolVal(b pgtype.Bool) bool {
	if !b.Valid {
		return false
	}
	return b.Bool
}

func boolToPg(v bool) pgtype.Bool {
	return pgtype.Bool{Bool: v, Valid: true}
}

func timestampVal(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

func timeToPgTimestamp(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}
