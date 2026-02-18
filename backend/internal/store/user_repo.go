// user_repo.go: PostgreSQL implementation of UserRepository interface.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type pgUserRepo struct {
	q    *sqlcgen.Queries
	pool *pgxpool.Pool
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
	return &models.User{
		ID:            int64(row.ID),
		Email:         row.Email,
		PasswordHash:  row.PasswordHash,
		Role:          row.Role,
		IsAdmin:       row.IsAdmin,
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
		FamilyHistoryDiabetes:        row.FamilyHistoryDiabetes,
		SmokingStatus:                textVal(row.SmokingStatus),
		ConsentPersonalData:          row.ConsentPersonalData,
		ConsentResearchParticipation: row.ConsentResearchParticipation,
		ConsentEmailUpdates:          row.ConsentEmailUpdates,
		ConsentAnalytics:             row.ConsentAnalytics,
		ConsentUpdatedAt:             consentUpdatedAt,
		AssessmentFrequencyMonths:    int(row.AssessmentFrequencyMonths),
		ReminderEmail:                row.ReminderEmail,
		LastAssessmentReminderSent:   lastAssessmentReminderSent,
		OnboardingCompleted:          row.OnboardingCompleted,
		Role:                         row.Role,
		IsAdmin:                      row.IsAdmin,
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
	if r.pool == nil {
		return nil, 0, errors.New("db not configured")
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
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
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query += ` ORDER BY created_at DESC LIMIT $` + itoa(argNum) + ` OFFSET $` + itoa(argNum+1)
	args = append(args, pageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
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
	if r.pool == nil {
		return nil, errors.New("db not configured")
	}

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
		role = "user"
	}
	isAdmin := role == "admin"
	if user.IsAdmin {
		isAdmin = true
		role = "admin"
	}
	err := r.pool.QueryRow(ctx, query,
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
	if r.pool == nil {
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
		isAdminInput = pgtype.Bool{Bool: user.Role == "admin", Valid: true}
	}
	err := r.pool.QueryRow(ctx, query, user.ID, user.Email, roleInput, isAdminInput).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &role, &isAdmin,
		&isActive, &lastLoginAt, &createdBy, &createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}

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
		FamilyHistoryDiabetes:     user.FamilyHistoryDiabetes,
		SmokingStatus:             pgtype.Text{String: user.SmokingStatus, Valid: user.SmokingStatus != ""},
		AssessmentFrequencyMonths: int32(user.AssessmentFrequencyMonths),
		ReminderEmail:             user.ReminderEmail,
	})
	if err != nil {
		return nil, err
	}

	return r.GetUserByID(ctx, int32(user.ID))
}

func (r *pgUserRepo) Deactivate(ctx context.Context, id int32) error {
	if r.pool == nil {
		return errors.New("db not configured")
	}

	_, err := r.pool.Exec(ctx, `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *pgUserRepo) Activate(ctx context.Context, id int32) error {
	if r.pool == nil {
		return errors.New("db not configured")
	}

	_, err := r.pool.Exec(ctx, `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`, id)
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
		ID:               int64(row.ID),
		UserID:           int64(intVal(row.UserID)),
		FBS:              numericVal(row.Fbs),
		HbA1c:            numericVal(row.Hba1c),
		Cholesterol:      intVal(row.Cholesterol),
		LDL:              intVal(row.Ldl),
		HDL:              intVal(row.Hdl),
		Triglycerides:    intVal(row.Triglycerides),
		Systolic:         intVal(row.Systolic),
		Diastolic:        intVal(row.Diastolic),
		Activity:         stringVal(row.Activity),
		HistoryFlag:      boolVal(row.HistoryFlag),
		Smoking:          stringVal(row.Smoking),
		Hypertension:     stringVal(row.Hypertension),
		HeartDisease:     stringVal(row.HeartDisease),
		BMI:              numericVal(row.Bmi),
		Cluster:          stringVal(row.Cluster),
		RiskScore:        intVal(row.RiskScore),
		ModelVersion:     stringVal(row.ModelVersion),
		DatasetHash:      stringVal(row.DatasetHash),
		ValidationStatus: stringVal(row.ValidationStatus),
		IsSelfReported:   row.IsSelfReported,
		Source:           row.Source,
		Notes:            stringVal(row.Notes),
		CreatedAt:        row.CreatedAt.Time,
		UpdatedAt:        row.UpdatedAt.Time,
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
		Dates:               []string{},
		HbA1cValues:         []float64{},
		BMIValues:           []float64{},
		SystolicValues:      []int{},
		DiastolicValues:     []int{},
		LDLValues:           []int{},
		HDLValues:           []int{},
		TriglyceridesValues: []int{},
		FBSValues:           []float64{},
		RiskScores:          []string{},
	}

	for _, row := range rows {
		data.Dates = append(data.Dates, row.CreatedAt.Time.Format("2006-01-02"))
		data.HbA1cValues = append(data.HbA1cValues, numericVal(row.Hba1c))
		data.BMIValues = append(data.BMIValues, numericVal(row.Bmi))
		data.FBSValues = append(data.FBSValues, numericVal(row.Fbs))
		data.TriglyceridesValues = append(data.TriglyceridesValues, intVal(row.Triglycerides))
		data.LDLValues = append(data.LDLValues, intVal(row.Ldl))
		data.HDLValues = append(data.HDLValues, intVal(row.Hdl))

		rs := intVal(row.RiskScore)
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
