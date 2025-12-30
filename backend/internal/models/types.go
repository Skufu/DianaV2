// Domain models for users, patients, assessments, and analytics DTOs.
package models

import "time"

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

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

type Assessment struct {
	ID               int64     `json:"id"`
	PatientID        int64     `json:"patient_id"`
	FBS              float64   `json:"fbs,omitempty"`
	HbA1c            float64   `json:"hba1c,omitempty"`
	Cholesterol      int       `json:"cholesterol,omitempty"`
	LDL              int       `json:"ldl,omitempty"`
	HDL              int       `json:"hdl,omitempty"`
	Triglycerides    int       `json:"triglycerides,omitempty"`
	Systolic         int       `json:"systolic,omitempty"`
	Diastolic        int       `json:"diastolic,omitempty"`
	Activity         string    `json:"activity,omitempty"`
	HistoryFlag      bool      `json:"history_flag,omitempty"`
	Smoking          string    `json:"smoking,omitempty"`
	Hypertension     string    `json:"hypertension,omitempty"`
	HeartDisease     string    `json:"heart_disease,omitempty"`
	BMI              float64   `json:"bmi,omitempty"`
	Cluster          string    `json:"cluster,omitempty"`
	RiskScore        int       `json:"risk_score,omitempty"`
	ModelVersion     string    `json:"model_version,omitempty"`
	DatasetHash      string    `json:"dataset_hash,omitempty"`
	ValidationStatus string    `json:"validation_status,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
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

type ClusterAnalytics struct {
	Cluster string `json:"cluster"`
	Count   int    `json:"count"`
}

type TrendPoint struct {
	Label string  `json:"label"`
	HbA1c float64 `json:"hba1c"`
	FBS   float64 `json:"fbs"`
}

// AssessmentTrend represents a single point in a patient's risk trend over time
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
	Role string `json:"role"` // 'member' or 'clinic_admin'
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
