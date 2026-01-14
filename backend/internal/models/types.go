// Domain models for users, assessments, and insights DTOs.
package models

import "time"

type User struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`

	// Personal Information
	FirstName   string     `json:"first_name,omitempty"`
	LastName    string     `json:"last_name,omitempty"`
	DateOfBirth *time.Time `json:"date_of_birth,omitempty"`
	Phone       string     `json:"phone,omitempty"`
	Address     string     `json:"address,omitempty"`

	// Menopausal Health
	MenopauseStatus string `json:"menopause_status,omitempty"`
	MenopauseType   string `json:"menopause_type,omitempty"`
	YearsMenopause  int    `json:"years_menopause,omitempty"`

	// Medical History
	Hypertension          string `json:"hypertension,omitempty"`
	HeartDisease          string `json:"heart_disease,omitempty"`
	FamilyHistoryDiabetes bool   `json:"family_history_diabetes,omitempty"`
	SmokingStatus         string `json:"smoking_status,omitempty"`

	// Consent
	ConsentPersonalData          bool      `json:"consent_personal_data"`
	ConsentResearchParticipation bool      `json:"consent_research_participation"`
	ConsentEmailUpdates          bool      `json:"consent_email_updates"`
	ConsentAnalytics             bool      `json:"consent_analytics"`
	ConsentUpdatedAt             time.Time `json:"consent_updated_at,omitempty"`

	// Settings
	AssessmentFrequencyMonths  int        `json:"assessment_frequency_months,omitempty"`
	ReminderEmail              bool       `json:"reminder_email"`
	LastAssessmentReminderSent *time.Time `json:"last_assessment_reminder_sent,omitempty"`
	OnboardingCompleted        bool       `json:"onboarding_completed"`

	// Account Management
	// Authorization
	Role      string `json:"role"`
	CreatedBy *int64 `json:"created_by,omitempty"`

	IsActive      bool       `json:"is_active"`
	IsAdmin       bool       `json:"is_admin"`
	AccountStatus string     `json:"account_status,omitempty"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`

	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Assessment struct {
	ID            int64   `json:"id"`
	UserID        int64   `json:"user_id"` // Changed from PatientID
	PatientID     int64   `json:"patient_id,omitempty"`
	RiskLevel     string  `json:"risk_level,omitempty"`
	FBS           float64 `json:"fbs,omitempty"`
	HbA1c         float64 `json:"hba1c,omitempty"`
	Cholesterol   int     `json:"cholesterol,omitempty"`
	LDL           int     `json:"ldl,omitempty"`
	HDL           int     `json:"hdl,omitempty"`
	Triglycerides int     `json:"triglycerides,omitempty"`
	Systolic      int     `json:"systolic,omitempty"`
	Diastolic     int     `json:"diastolic,omitempty"`
	Activity      string  `json:"activity,omitempty"`
	HistoryFlag   bool    `json:"history_flag,omitempty"`
	Smoking       string  `json:"smoking,omitempty"`
	Hypertension  string  `json:"hypertension,omitempty"`
	HeartDisease  string  `json:"heart_disease,omitempty"`
	BMI           float64 `json:"bmi,omitempty"`

	// ML Results
	Cluster          string `json:"cluster,omitempty"`
	RiskScore        int    `json:"risk_score,omitempty"`
	ModelVersion     string `json:"model_version,omitempty"`
	DatasetHash      string `json:"dataset_hash,omitempty"`
	ValidationStatus string `json:"validation_status,omitempty"`

	// Self-assessment fields
	IsSelfReported bool   `json:"is_self_reported,omitempty"`
	Source         string `json:"source,omitempty"` // 'manual', 'device'
	Notes          string `json:"notes,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type RefreshToken struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	TokenHash string    `json:"token_hash"`
	ExpiresAt time.Time `json:"expires_at"`
	Revoked   bool      `json:"revoked"`
	CreatedAt time.Time `json:"created_at"`
	RevokedAt time.Time `json:"revoked_at,omitempty"`
}

type ClusterInsights struct {
	Cluster string `json:"cluster"`
	Count   int    `json:"count"`
}

type TrendPoint struct {
	Label string  `json:"label"`
	HbA1c float64 `json:"hba1c"`
	FBS   float64 `json:"fbs"`
}

// AssessmentTrend represents a single point in a user's risk trend over time
type AssessmentTrend struct {
	ID            int64     `json:"id"`
	CreatedAt     time.Time `json:"created_at"`
	RiskScore     *float64  `json:"risk_score"`
	Cluster       string    `json:"cluster"`
	HbA1c         float64   `json:"hba1c"`
	BMI           float64   `json:"bmi"`
	FBS           float64   `json:"fbs"`
	Triglycerides int       `json:"triglycerides"`
	LDL           int       `json:"ldl"`
	HDL           int       `json:"hdl"`
}

// UserProfile extends User with latest assessment info
type UserProfile struct {
	User
	LatestAssessment *Assessment `json:"latest_assessment,omitempty"`
	AssessmentCount  int         `json:"assessment_count"`
	LastAssessmentAt *time.Time  `json:"last_assessment_at,omitempty"`
	CurrentCluster   string      `json:"current_cluster,omitempty"`
	CurrentRiskLevel string      `json:"current_risk_level,omitempty"` // 'low', 'medium', 'high'
}

// ConsentSettings represents user consent preferences
type ConsentSettings struct {
	ConsentPersonalData          bool `json:"consent_personal_data"`
	ConsentResearchParticipation bool `json:"consent_research_participation"`
	ConsentEmailUpdates          bool `json:"consent_email_updates"`
	ConsentAnalytics             bool `json:"consent_analytics"`
}

// TrendData represents biomarker trends over time
type TrendData struct {
	Dates               []string  `json:"dates"`
	HbA1cValues         []float64 `json:"hba1c_values"`
	BMIValues           []float64 `json:"bmi_values"`
	SystolicValues      []int     `json:"systolic_values"`
	DiastolicValues     []int     `json:"diastolic_values"`
	LDLValues           []int     `json:"ldl_values"`
	HDLValues           []int     `json:"hdl_values"`
	TriglyceridesValues []int     `json:"triglycerides_values"`
	FBSValues           []float64 `json:"fbs_values"`
	RiskScores          []string  `json:"risk_scores"` // 'low', 'medium', 'high'
}

// OnboardingRequest represents onboarding data
type OnboardingRequest struct {
	FirstName                    string `json:"first_name" binding:"required,max=100"`
	LastName                     string `json:"last_name" binding:"required,max=100"`
	DateOfBirth                  string `json:"date_of_birth" binding:"required"` // YYYY-MM-DD
	MenopauseStatus              string `json:"menopause_status" binding:"required,oneof=pre peri post surgical"`
	MenopauseType                string `json:"menopause_type" binding:"omitempty,oneof=natural surgical"`
	YearsMenopause               int    `json:"years_menopause" binding:"omitempty,min=0,max=50"`
	Hypertension                 string `json:"hypertension" binding:"omitempty,oneof=no controlled uncontrolled"`
	HeartDisease                 string `json:"heart_disease" binding:"omitempty,oneof=no yes"`
	FamilyHistoryDiabetes        bool   `json:"family_history_diabetes"`
	SmokingStatus                string `json:"smoking_status" binding:"omitempty,oneof=never former current"`
	ConsentPersonalData          bool   `json:"consent_personal_data" binding:"required"`
	ConsentResearchParticipation bool   `json:"consent_research_participation" binding:"required"`
	ConsentEmailUpdates          bool   `json:"consent_email_updates" binding:"required"`
	ConsentAnalytics             bool   `json:"consent_analytics" binding:"required"`
	AssessmentFrequencyMonths    int    `json:"assessment_frequency_months" binding:"omitempty,min=1,max=12,default=3"`
	ReminderEmail                bool   `json:"reminder_email" binding:"omitempty,default=true"`
}

// NotificationQueue represents email notification
type NotificationQueue struct {
	ID               int64      `json:"id"`
	UserID           int64      `json:"user_id"`
	NotificationType string     `json:"notification_type"`
	Subject          string     `json:"subject"`
	Body             string     `json:"body"`
	SentAt           *time.Time `json:"sent_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// UpdateAssessmentRequest represents the payload for updating an assessment
type UpdateAssessmentRequest struct {
	FBS           *float64 `json:"fbs" binding:"omitempty,min=0,max=1000"`
	HbA1c         *float64 `json:"hba1c" binding:"omitempty,min=0,max=20"`
	Cholesterol   *int     `json:"cholesterol" binding:"omitempty,min=0,max=1000"`
	LDL           *int     `json:"ldl" binding:"omitempty,min=0,max=500"`
	HDL           *int     `json:"hdl" binding:"omitempty,min=0,max=200"`
	Triglycerides *int     `json:"triglycerides" binding:"omitempty,min=0,max=2000"`
	Systolic      *int     `json:"systolic" binding:"omitempty,min=50,max=300"`
	Diastolic     *int     `json:"diastolic" binding:"omitempty,min=30,max=200"`
	Activity      string   `json:"activity" binding:"omitempty,max=50"`
	HistoryFlag   bool     `json:"history_flag"`
	Smoking       string   `json:"smoking" binding:"omitempty,max=50"`
	Hypertension  string   `json:"hypertension" binding:"omitempty,max=50"`
	HeartDisease  string   `json:"heart_disease" binding:"omitempty,max=50"`
	BMI           *float64 `json:"bmi" binding:"omitempty,min=10,max=100"`
	Notes         string   `json:"notes" binding:"omitempty,max=2000"`
}

// -----------------------------------------------------------------------------
// Legacy / Admin Models (Ported from types_old.go)
// -----------------------------------------------------------------------------

type Patient struct {
	ID              int64     `json:"id"`
	UserID          int64     `json:"user_id,omitempty"`
	Name            string    `json:"name"`
	Age             int       `json:"age,omitempty"`
	MenopauseStatus string    `json:"menopause_status,omitempty"`
	YearsMenopause  int       `json:"years_menopause,omitempty"`
	BMI             float64   `json:"bmi,omitempty"`
	BPSystolic      int       `json:"bp_systolic,omitempty"`
	BPDiastolic     int       `json:"bp_diastolic,omitempty"`
	Activity        string    `json:"activity,omitempty"`
	PhysActivity    bool      `json:"phys_activity,omitempty"`
	Smoking         string    `json:"smoking,omitempty"`
	Hypertension    string    `json:"hypertension,omitempty"`
	HeartDisease    string    `json:"heart_disease,omitempty"`
	FamilyHistory   bool      `json:"family_history,omitempty"`
	Chol            int       `json:"chol,omitempty"`
	LDL             int       `json:"ldl,omitempty"`
	HDL             int       `json:"hdl,omitempty"`
	Triglycerides   int       `json:"triglycerides,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type PatientSummary struct {
	Patient
	Cluster   string    `json:"cluster,omitempty"`
	RiskScore int       `json:"risk_score,omitempty"`
	Risk      int       `json:"risk,omitempty"`
	FBS       float64   `json:"fbs,omitempty"`
	HbA1c     float64   `json:"hba1c,omitempty"`
	LastVisit time.Time `json:"lastVisit,omitempty"`
}

// CohortGroup represents aggregated statistics for a patient group
type CohortGroup struct {
	Name              string  `json:"name"`
	Count             int     `json:"count"`
	AvgHbA1c          float64 `json:"avg_hba1c"`
	AvgFBS            float64 `json:"avg_fbs"`
	AvgBMI            float64 `json:"avg_bmi"`
	AvgBPSystolic     float64 `json:"avg_bp_systolic"`
	AvgBPDiastolic    float64 `json:"avg_bp_diastolic"`
	AvgRiskScore      float64 `json:"avg_risk_score"`
	LowRiskCount      int     `json:"low_risk_count,omitempty"`
	ModerateRiskCount int     `json:"moderate_risk_count,omitempty"`
	HighRiskCount     int     `json:"high_risk_count,omitempty"`
}

// UserForNotification represents minimal user data for notification service
type UserForNotification struct {
	ID                         int32     `json:"id"`
	Email                      string    `json:"email"`
	FirstName                  string    `json:"first_name"`
	LastName                   string    `json:"last_name"`
	AssessmentFrequencyMonths  int32     `json:"assessment_frequency_months"`
	LastAssessmentReminderSent time.Time `json:"last_assessment_reminder_sent"`
}

// Clinic represents a clinic entity
type Clinic struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserClinic represents a user's membership in a clinic
type UserClinic struct {
	Clinic
	Role string `json:"role"` // 'member' or 'admin'
}

// ClinicAggregate represents aggregate statistics for a clinic
type ClinicAggregate struct {
	TotalPatients        int     `json:"total_patients"`
	TotalAssessments     int     `json:"total_assessments"`
	AvgRiskScore         float64 `json:"avg_risk_score"`
	HighRiskCount        int     `json:"high_risk_count"`
	AssessmentsThisMonth int     `json:"assessments_this_month"`
}

// SystemStats represents system-wide statistics for admin dashboard
type SystemStats struct {
	TotalUsers           int     `json:"total_users"`
	TotalPatients        int     `json:"total_patients"`
	TotalAssessments     int     `json:"total_assessments"`
	TotalClinics         int     `json:"total_clinics"`
	AvgRiskScore         float64 `json:"avg_risk_score"`
	HighRiskCount        int     `json:"high_risk_count"`
	AssessmentsThisMonth int     `json:"assessments_this_month"`
	NewUsersThisMonth    int     `json:"new_users_this_month"`
}

// ClinicComparison represents per-clinic statistics for admin comparison
type ClinicComparison struct {
	ClinicID        int64   `json:"clinic_id"`
	ClinicName      string  `json:"clinic_name"`
	PatientCount    int     `json:"patient_count"`
	AssessmentCount int     `json:"assessment_count"`
	AvgRiskScore    float64 `json:"avg_risk_score"`
	HighRiskCount   int     `json:"high_risk_count"`
}

// AuditEvent represents a logged admin action for audit trail
type AuditEvent struct {
	ID         int64                  `json:"id"`
	Actor      string                 `json:"actor"`
	Action     string                 `json:"action"`
	TargetType string                 `json:"target_type"`
	TargetID   int                    `json:"target_id"`
	Details    map[string]interface{} `json:"details,omitempty"`
	CreatedAt  time.Time              `json:"created_at"`
}

// ModelRun represents a training run of the ML model
type ModelRun struct {
	ID           int64     `json:"id"`
	ModelVersion string    `json:"model_version"`
	DatasetHash  string    `json:"dataset_hash,omitempty"`
	Notes        string    `json:"notes,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

// UserListParams defines pagination and filter parameters for user listing
type UserListParams struct {
	Page     int    `form:"page" binding:"min=1"`
	PageSize int    `form:"page_size" binding:"min=1,max=100"`
	Search   string `form:"search"`
	Role     string `form:"role"`
	IsActive *bool  `form:"is_active"`
}

// AuditListParams defines pagination and filter parameters for audit log listing
type AuditListParams struct {
	Page      int       `form:"page" binding:"min=1"`
	PageSize  int       `form:"page_size" binding:"min=1,max=100"`
	Actor     string    `form:"actor"`
	Action    string    `form:"action"`
	StartDate time.Time `form:"start_date"`
	EndDate   time.Time `form:"end_date"`
}

// PaginatedResponse is a generic wrapper for paginated API responses
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}
