// user_repo.go: PostgreSQL implementation of UserRepository interface.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type pgUserRepo struct {
	q    *sqlcgen.Queries
	pool *pgxpool.Pool
	tx   pgx.Tx // Used when operating within a transaction
}

// getExecutor returns the appropriate query executor (pool, tx, or q).
// Priority: tx > pool > q
func (r *pgUserRepo) getExecutor() queryExecutor {
	if r.tx != nil {
		return r.tx
	}
	if r.pool != nil {
		return r.pool
	}
	return nil
}

// queryExecutor is an interface that both pgxpool.Pool and pgx.Tx implement.
type queryExecutor interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

func normalizeRoleFields(role string, isAdmin bool) (string, bool) {
	if isAdmin || role == models.RoleAdmin {
		return models.RoleAdmin, true
	}
	if role == "" {
		return models.RoleUser, false
	}
	return role, false
}

// ============================================================================
// Basic User CRUD
// ============================================================================

func (r *pgUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.FindUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	role, isAdmin := normalizeRoleFields(row.Role, row.IsAdmin)
	return &models.User{
		ID:            int64(row.ID),
		Email:         row.Email,
		PasswordHash:  row.PasswordHash,
		Role:          role,
		IsAdmin:       isAdmin,
		IsActive:      row.IsActive,
		AccountStatus: row.AccountStatus,
		CreatedAt:     row.CreatedAt.Time,
		UpdatedAt:     row.UpdatedAt.Time,
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

	var dob *time.Time
	if row.DateOfBirth.Valid {
		dob = &row.DateOfBirth.Time
	}

	var consentUpdatedAt time.Time
	if row.ConsentUpdatedAt.Valid {
		consentUpdatedAt = row.ConsentUpdatedAt.Time
	}

	var lastAssessmentReminderSent *time.Time
	if row.LastAssessmentReminderSent.Valid {
		lastAssessmentReminderSent = &row.LastAssessmentReminderSent.Time
	}

	var deletedAt *time.Time
	if row.DeletedAt.Valid {
		deletedAt = &row.DeletedAt.Time
	}

	role, isAdmin := normalizeRoleFields(row.Role, row.IsAdmin)
	return &models.User{
		ID:                           int64(row.ID),
		Email:                        row.Email,
		PasswordHash:                 row.PasswordHash,
		FirstName:                    textVal(row.FirstName),
		LastName:                     textVal(row.LastName),
		DateOfBirth:                  dob,
		Phone:                        textVal(row.Phone),
		Address:                      textVal(row.Address),
		MenopauseStatus:              textVal(row.MenopauseStatus),
		MenopauseType:                textVal(row.MenopauseType),
		YearsMenopause:               intVal(row.YearsMenopause),
		Hypertension:                 textVal(row.Hypertension),
		HeartDisease:                 textVal(row.HeartDisease),
		SmokingStatus:                textVal(row.SmokingStatus),
		PhysicalActivity:             textVal(row.PhysicalActivity),
		Alcohol:                      textVal(row.Alcohol),
		ConsentPersonalData:          row.ConsentPersonalData,
		ConsentResearchParticipation: row.ConsentResearchParticipation,
		ConsentEmailUpdates:          row.ConsentEmailUpdates,
		ConsentAnalytics:             row.ConsentAnalytics,
		ConsentUpdatedAt:             consentUpdatedAt,
		AssessmentFrequencyMonths:    int(row.AssessmentFrequencyMonths),
		ReminderEmail:                row.ReminderEmail,
		LastAssessmentReminderSent:   lastAssessmentReminderSent,
		OnboardingCompleted:          row.OnboardingCompleted,
		Role:                         role,
		IsAdmin:                      isAdmin,
		IsActive:                     row.IsActive,
		AccountStatus:                row.AccountStatus,
		DeletedAt:                    deletedAt,
		CreatedAt:                    row.CreatedAt.Time,
		UpdatedAt:                    row.UpdatedAt.Time,
	}, nil
}

func (r *pgUserRepo) GetUserByID(ctx context.Context, id int32) (*models.User, error) {
	return r.FindByID(ctx, id)
}

func (r *pgUserRepo) List(ctx context.Context, params models.UserListParams) ([]models.User, int, error) {
	exec := r.getExecutor()
	if exec == nil {
		return nil, 0, errors.New("db not configured")
	}

	// Pagination params are validated by ParsePagination() in handlers
	page := params.Page
	pageSize := params.PageSize
	offset := (page - 1) * pageSize

	query := `
		SELECT id, email, password_hash, role, is_admin,
		       COALESCE(is_active, true) as is_active,
		       last_login_at, created_by, created_at, updated_at,
		       account_status, onboarding_completed
		FROM users
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM users WHERE 1=1`
	args := []any{}
	argNum := 1

	if params.Search != "" {
		query += ` AND email ILIKE '%' || $` + itoa(argNum) + ` || '%'`
		countQuery += ` AND email ILIKE '%' || $` + itoa(argNum) + ` || '%'`
		args = append(args, params.Search)
		argNum++
	}

	if params.Role != "" {
		query += ` AND role = $` + itoa(argNum)
		countQuery += ` AND role = $` + itoa(argNum)
		args = append(args, params.Role)
		argNum++
	}

	if params.IsActive != nil {
		query += ` AND COALESCE(is_active, true) = $` + itoa(argNum)
		countQuery += ` AND COALESCE(is_active, true) = $` + itoa(argNum)
		args = append(args, *params.IsActive)
		argNum++
	}

	var total int
	err := exec.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query += ` ORDER BY created_at DESC LIMIT $` + itoa(argNum) + ` OFFSET $` + itoa(argNum+1)
	args = append(args, pageSize, offset)

	rows, err := exec.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		var isActive bool
		var role string
		var isAdmin bool
		var lastLoginAt pgtype.Timestamptz
		var createdBy pgtype.Int4
		var createdAt, updatedAt pgtype.Timestamptz
		var accountStatus string
		var onboardingCompleted bool

		err := rows.Scan(
			&u.ID, &u.Email, &u.PasswordHash, &role, &isAdmin,
			&isActive, &lastLoginAt, &createdBy, &createdAt, &updatedAt,
			&accountStatus, &onboardingCompleted,
		)
		if err != nil {
			return nil, 0, err
		}
		role, isAdmin = normalizeRoleFields(role, isAdmin)
		u.IsActive = isActive
		u.Role = role
		u.IsAdmin = isAdmin
		u.AccountStatus = accountStatus
		u.OnboardingCompleted = onboardingCompleted
		if lastLoginAt.Valid {
			u.LastLoginAt = &lastLoginAt.Time
		}
		if createdBy.Valid {
			cb := int64(createdBy.Int32)
			u.CreatedBy = &cb
		}
		u.CreatedAt = createdAt.Time
		u.UpdatedAt = updatedAt.Time
		users = append(users, u)
	}

	return users, total, nil
}

func (r *pgUserRepo) Create(ctx context.Context, user models.User) (*models.User, error) {
	// Use transaction if available, otherwise use pool
	if r.tx != nil {
		return r.createWithTx(ctx, user, r.tx)
	}
	if r.pool != nil {
		return r.createWithTx(ctx, user, r.pool)
	}
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	return nil, errors.New("db not configured")
}

// createWithTx creates a user using the provided executor (transaction or pool).
func (r *pgUserRepo) createWithTx(ctx context.Context, user models.User, exec queryExecutor) (*models.User, error) {
	var id int64
	var createdAt, updatedAt time.Time
	var role string

	query := `
		INSERT INTO users (email, password_hash, role, is_admin, is_active, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
		RETURNING id, role, created_at, updated_at
	`

	role = user.Role
	if role == "" {
		role = models.RoleUser
	}
	role, isAdmin := normalizeRoleFields(role, user.IsAdmin)
	err := exec.QueryRow(ctx, query,
		user.Email, user.PasswordHash, role, isAdmin, user.CreatedBy,
	).Scan(&id, &role, &createdAt, &updatedAt)

	if err != nil {
		return nil, err
	}

	user.ID = id
	user.IsActive = true
	user.CreatedAt = createdAt
	user.UpdatedAt = updatedAt
	user.Role = role

	return &user, nil
}

func (r *pgUserRepo) Update(ctx context.Context, user models.User) (*models.User, error) {
	exec := r.getExecutor()
	if exec == nil {
		return nil, errors.New("db not configured")
	}

	query := `
		UPDATE users
		SET email = COALESCE(NULLIF($2, ''), email),
		    role = COALESCE($3, role),
		    is_admin = COALESCE($4, is_admin),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, password_hash, role, is_admin,
		          COALESCE(is_active, true), last_login_at, created_by, created_at, updated_at
	`

	var u models.User
	var isActive bool
	var lastLoginAt pgtype.Timestamptz
	var createdBy pgtype.Int4
	var createdAt, updatedAt pgtype.Timestamptz
	var role string
	var isAdmin bool

	var roleInput pgtype.Text
	var isAdminInput pgtype.Bool
	if user.Role != "" {
		roleInput = pgtype.Text{String: user.Role, Valid: true}
		isAdminInput = pgtype.Bool{Bool: user.Role == models.RoleAdmin, Valid: true}
	}
	err := exec.QueryRow(ctx, query, user.ID, user.Email, roleInput, isAdminInput).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &role, &isAdmin,
		&isActive, &lastLoginAt, &createdBy, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}

	role, isAdmin = normalizeRoleFields(role, isAdmin)
	u.IsActive = isActive
	u.Role = role
	u.IsAdmin = isAdmin
	if lastLoginAt.Valid {
		u.LastLoginAt = &lastLoginAt.Time
	}
	if createdBy.Valid {
		cb := int64(createdBy.Int32)
		u.CreatedBy = &cb
	}
	u.CreatedAt = createdAt.Time
	u.UpdatedAt = updatedAt.Time

	return &u, nil
}

func (r *pgUserRepo) UpdateUser(ctx context.Context, user models.User) (*models.User, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}

	var dob pgtype.Date
	if user.DateOfBirth != nil {
		dob = pgtype.Date{Time: *user.DateOfBirth, Valid: true}
	}

	err := r.q.UpdateUser(ctx, sqlcgen.UpdateUserParams{
		ID:                        int32(user.ID),
		FirstName:                 pgtype.Text{String: user.FirstName, Valid: user.FirstName != ""},
		LastName:                  pgtype.Text{String: user.LastName, Valid: user.LastName != ""},
		DateOfBirth:               dob,
		Phone:                     pgtype.Text{String: user.Phone, Valid: user.Phone != ""},
		Address:                   pgtype.Text{String: user.Address, Valid: user.Address != ""},
		MenopauseStatus:           pgtype.Text{String: user.MenopauseStatus, Valid: user.MenopauseStatus != ""},
		MenopauseType:             pgtype.Text{String: user.MenopauseType, Valid: user.MenopauseType != ""},
		YearsMenopause:            pgtype.Int4{Int32: int32(user.YearsMenopause), Valid: true},
		Hypertension:              pgtype.Text{String: user.Hypertension, Valid: user.Hypertension != ""},
		HeartDisease:              pgtype.Text{String: user.HeartDisease, Valid: user.HeartDisease != ""},
		SmokingStatus:             pgtype.Text{String: user.SmokingStatus, Valid: user.SmokingStatus != ""},
		PhysicalActivity:          pgtype.Text{String: user.PhysicalActivity, Valid: user.PhysicalActivity != ""},
		Alcohol:                   pgtype.Text{String: user.Alcohol, Valid: user.Alcohol != ""},
		AssessmentFrequencyMonths: int32(user.AssessmentFrequencyMonths),
		ReminderEmail:             user.ReminderEmail,
	})
	if err != nil {
		return nil, err
	}

	return r.GetUserByID(ctx, int32(user.ID))
}

func (r *pgUserRepo) Deactivate(ctx context.Context, id int32) error {
	exec := r.getExecutor()
	if exec == nil {
		return errors.New("db not configured")
	}

	_, err := exec.Exec(ctx, `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *pgUserRepo) Activate(ctx context.Context, id int32) error {
	exec := r.getExecutor()
	if exec == nil {
		return errors.New("db not configured")
	}

	_, err := exec.Exec(ctx, `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`, id)
	return err
}

// ============================================================================
// User Management Methods
// ============================================================================

func (r *pgUserRepo) UpdateLastLogin(ctx context.Context, id int32) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.UpdateLastLogin(ctx, id)
}

func (r *pgUserRepo) SoftDeleteUser(ctx context.Context, userID int64) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.SoftDeleteUser(ctx, int32(userID))
}

func (r *pgUserRepo) UpdateUserOnboarding(ctx context.Context, userID int64, completed bool) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.UpdateUserOnboarding(ctx, sqlcgen.UpdateUserOnboardingParams{
		ID:                  int32(userID),
		OnboardingCompleted: completed,
	})
}

func (r *pgUserRepo) UpdateUserConsent(ctx context.Context, userID int64, consent models.ConsentSettings) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.UpdateUserConsent(ctx, sqlcgen.UpdateUserConsentParams{
		ID:                           int32(userID),
		ConsentPersonalData:          consent.ConsentPersonalData,
		ConsentResearchParticipation: consent.ConsentResearchParticipation,
		ConsentEmailUpdates:          consent.ConsentEmailUpdates,
		ConsentAnalytics:             consent.ConsentAnalytics,
	})
}

// ============================================================================
// Assessment-Related Methods
// ============================================================================

func (r *pgUserRepo) GetLatestAssessmentByUser(ctx context.Context, userID int64) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}

	row, err := r.q.GetLatestAssessmentByUser(ctx, pgtype.Int4{Int32: int32(userID), Valid: true})
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}

	stringVal := func(t pgtype.Text) string {
		if !t.Valid {
			return ""
		}
		return t.String
	}

	return &models.Assessment{
		ID:                 int64(row.ID),
		UserID:             int64(intVal(row.UserID)),
		FBS:                numericVal(row.Fbs),
		HbA1c:              numericVal(row.Hba1c),
		Cholesterol:        intVal(row.Cholesterol),
		LDL:                intVal(row.Ldl),
		HDL:                intVal(row.Hdl),
		Triglycerides:      intVal(row.Triglycerides),
		Systolic:           intVal(row.Systolic),
		Diastolic:          intVal(row.Diastolic),
		Activity:           stringVal(row.Activity),
		HistoryFlag:        boolVal(row.HistoryFlag),
		Smoking:            stringVal(row.Smoking),
		Hypertension:       stringVal(row.Hypertension),
		HeartDisease:       stringVal(row.HeartDisease),
		BMI:                numericVal(row.Bmi),
		Cluster:            stringVal(row.Cluster),
		RiskScore:          intVal(row.RiskScore),
		PredictedStatus:    stringVal(row.PredictedStatus),
		RiskLabel:          stringVal(row.RiskLabel),
		ClusterDescription: stringVal(row.ClusterDescription),
		TreatmentFocus:     stringVal(row.TreatmentFocus),
		AtRiskProbability:  floatVal(row.AtRiskProbability),
		ModelVersion:       stringVal(row.ModelVersion),
		DatasetHash:        stringVal(row.DatasetHash),
		ValidationStatus:   stringVal(row.ValidationStatus),
		IsSelfReported:     row.IsSelfReported,
		Source:             row.Source,
		Notes:              stringVal(row.Notes),
		CreatedAt:          row.CreatedAt.Time,
		UpdatedAt:          row.UpdatedAt.Time,
	}, nil
}

func (r *pgUserRepo) GetAssessmentCountByUser(ctx context.Context, userID int64) (int, error) {
	if r.q == nil {
		return 0, errors.New("db not configured")
	}
	count, err := r.q.CountAssessmentsByUser(ctx, pgtype.Int4{Int32: int32(userID), Valid: true})
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *pgUserRepo) GetUserTrends(ctx context.Context, userID int64, months int) (*models.TrendData, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}

	rows, err := r.q.GetAssessmentTrendByUser(ctx, pgtype.Int4{Int32: int32(userID), Valid: true})
	if err != nil {
		return nil, err
	}

	data := &models.TrendData{
		Dates:                    []string{},
		HbA1cValues:              []float64{},
		BMIValues:                []float64{},
		SystolicValues:           []int{},
		DiastolicValues:          []int{},
		LDLValues:                []int{},
		HDLValues:                []int{},
		TriglyceridesValues:      []int{},
		FBSValues:                []float64{},
		WaistCircumferenceValues: []float64{},
		RiskScores:               []string{},
		RiskScoreValues:          []int{},
		Clusters:                 []string{},
	}

	for _, row := range rows {
		data.Dates = append(data.Dates, row.CreatedAt.Time.Format("2006-01-02"))
		data.HbA1cValues = append(data.HbA1cValues, numericVal(row.Hba1c))
		data.BMIValues = append(data.BMIValues, numericVal(row.Bmi))
		data.FBSValues = append(data.FBSValues, numericVal(row.Fbs))
		data.TriglyceridesValues = append(data.TriglyceridesValues, intVal(row.Triglycerides))
		data.LDLValues = append(data.LDLValues, intVal(row.Ldl))
		data.HDLValues = append(data.HDLValues, intVal(row.Hdl))
		data.SystolicValues = append(data.SystolicValues, intVal(row.Systolic))
		data.DiastolicValues = append(data.DiastolicValues, intVal(row.Diastolic))
		data.WaistCircumferenceValues = append(data.WaistCircumferenceValues, numericVal(row.WaistCircumference))

		clusterStr := ""
		if row.Cluster.Valid {
			clusterStr = row.Cluster.String
		}
		data.Clusters = append(data.Clusters, clusterStr)

		rs := intVal(row.RiskScore)
		data.RiskScoreValues = append(data.RiskScoreValues, rs)

		level := "high"
		if rs < 30 {
			level = "low"
		} else if rs < 70 {
			level = "medium"
		}
		data.RiskScores = append(data.RiskScores, level)
	}

	return data, nil
}

// ============================================================================
// Notification Methods
// ============================================================================

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
