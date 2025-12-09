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
	Name            string    `json:"name"`
	Age             int       `json:"age,omitempty"`
	MenopauseStatus string    `json:"menopause_status,omitempty"`
	YearsMenopause  int       `json:"years_menopause,omitempty"`
	BMI             float64   `json:"bmi,omitempty"`
	BPSystolic      int       `json:"bp_systolic,omitempty"`
	BPDiastolic     int       `json:"bp_diastolic,omitempty"`
	Activity        string    `json:"activity,omitempty"`
	Smoking         string    `json:"smoking,omitempty"`
	Hypertension    string    `json:"hypertension,omitempty"`
	HeartDisease    string    `json:"heart_disease,omitempty"`
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
