// mappers.go: Shared mapper functions for PostgreSQL type conversions.
// These helpers simplify converting between Go types and pgtype (SQLC generated types).
package store

import (
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

// ============================================================================
// Timestamp Mappers
// ============================================================================

// timeToPgTimestamp converts a Go time.Time to pgtype.Timestamp.
// Used when passing timestamps to SQLC generated queries.
func timeToPgTimestamp(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{
		Time:  t,
		Valid: true,
	}
}

// timestampVal converts a pgtype.Timestamp to *time.Time.
// Returns nil if timestamp is NULL (Valid=false).
// Used when converting SQLC result types to domain models.
func timestampVal(ts pgtype.Timestamp) *time.Time {
	if !ts.Valid {
		return nil
	}
	return &ts.Time
}

// timeToPgTimestamptz converts a Go time.Time to pgtype.Timestamptz.
func timeToPgTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

// timestampTzVal converts a pgtype.Timestamptz to time.Time.
func timestampTzVal(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

// ============================================================================
// Integer Mappers
// ============================================================================

// intVal converts a pgtype.Int4 to int.
// Returns 0 if value is NULL.
func intVal(v pgtype.Int4) int {
	if !v.Valid {
		return 0
	}
	return int(v.Int32)
}

// int64Val converts a pgtype.Int4 to int64.
// Returns 0 if value is NULL.
func int64Val(v pgtype.Int4) int64 {
	if !v.Valid {
		return 0
	}
	return int64(v.Int32)
}

// intToPgInt converts an int to pgtype.Int4.
func intToPgInt(v int) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(v), Valid: true}
}

// int64ToPgInt converts an int64 to pgtype.Int4.
func int64ToPgInt(v int64) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(v), Valid: true}
}

// ============================================================================
// String/Text Mappers
// ============================================================================

// textVal converts a pgtype.Text to string.
// Returns empty string if value is NULL.
func textVal(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

// textToPg converts a string to pgtype.Text.
// Marks as invalid (NULL) if string is empty.
func textToPg(v string) pgtype.Text {
	if v == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: v, Valid: true}
}

// ============================================================================
// Numeric/Float Mappers
// ============================================================================

// numericVal converts a pgtype.Numeric to float64.
// Returns 0 if value is NULL or conversion fails.
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

func floatVal(f pgtype.Float8) float64 {
	if !f.Valid {
		return 0
	}
	return f.Float64
}

// floatToNumeric converts a float64 to pgtype.Numeric.
// Uses string representation for proper scanning including zero values.
func floatToNumeric(v float64) pgtype.Numeric {
	var n pgtype.Numeric
	str := fmt.Sprintf("%f", v)
	_ = n.Scan(str)
	return n
}

func floatToPgFloat(v float64) pgtype.Float8 {
	if v == 0 {
		return pgtype.Float8{Valid: false}
	}
	return pgtype.Float8{Float64: v, Valid: true}
}

// ============================================================================
// Boolean Mappers
// ============================================================================

// boolVal converts a pgtype.Bool to bool.
// Returns false if value is NULL.
func boolVal(b pgtype.Bool) bool {
	if !b.Valid {
		return false
	}
	return b.Bool
}

// boolToPg converts a bool to pgtype.Bool.
func boolToPg(v bool) pgtype.Bool {
	return pgtype.Bool{Bool: v, Valid: true}
}

// ============================================================================
// Patient Row Mappers
// ============================================================================

// mapPatientRows converts ListPatientsRow slice to models.Patient slice.
func mapPatientRows(rows []sqlcgen.ListPatientsRow) []models.Patient {
	var out []models.Patient
	for _, r := range rows {
		out = append(out, models.Patient{
			ID:              int64(r.ID),
			UserID:          int64(r.UserID),
			Name:            r.Name,
			Age:             intVal(r.Age),
			MenopauseStatus: textVal(r.MenopauseStatus),
			YearsMenopause:  intVal(r.YearsMenopause),
			BMI:             numericVal(r.Bmi),
			BPSystolic:      intVal(r.BpSystolic),
			BPDiastolic:     intVal(r.BpDiastolic),
			Activity:        textVal(r.Activity),
			PhysActivity:    boolVal(r.PhysActivity),
			Smoking:         textVal(r.Smoking),
			Hypertension:    textVal(r.Hypertension),
			HeartDisease:    textVal(r.HeartDisease),
			FamilyHistory:   boolVal(r.FamilyHistory),
			Chol:            intVal(r.Chol),
			LDL:             intVal(r.Ldl),
			HDL:             intVal(r.Hdl),
			Triglycerides:   intVal(r.Triglycerides),
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		})
	}
	return out
}

// mapPatientLimitedRows converts ListPatientsLimitedRow slice to models.Patient slice.
func mapPatientLimitedRows(rows []sqlcgen.ListPatientsLimitedRow) []models.Patient {
	var out []models.Patient
	for _, r := range rows {
		out = append(out, models.Patient{
			ID:              int64(r.ID),
			UserID:          int64(r.UserID),
			Name:            r.Name,
			Age:             intVal(r.Age),
			MenopauseStatus: textVal(r.MenopauseStatus),
			YearsMenopause:  intVal(r.YearsMenopause),
			BMI:             numericVal(r.Bmi),
			BPSystolic:      intVal(r.BpSystolic),
			BPDiastolic:     intVal(r.BpDiastolic),
			Activity:        textVal(r.Activity),
			PhysActivity:    boolVal(r.PhysActivity),
			Smoking:         textVal(r.Smoking),
			Hypertension:    textVal(r.Hypertension),
			HeartDisease:    textVal(r.HeartDisease),
			FamilyHistory:   boolVal(r.FamilyHistory),
			Chol:            intVal(r.Chol),
			LDL:             intVal(r.Ldl),
			HDL:             intVal(r.Hdl),
			Triglycerides:   intVal(r.Triglycerides),
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		})
	}
	return out
}

// mapPatientPaginatedRows converts ListPatientsPaginatedRow slice to models.Patient slice.
func mapPatientPaginatedRows(rows []sqlcgen.ListPatientsPaginatedRow) []models.Patient {
	var out []models.Patient
	for _, r := range rows {
		out = append(out, models.Patient{
			ID:              int64(r.ID),
			UserID:          int64(r.UserID),
			Name:            r.Name,
			Age:             intVal(r.Age),
			MenopauseStatus: textVal(r.MenopauseStatus),
			YearsMenopause:  intVal(r.YearsMenopause),
			BMI:             numericVal(r.Bmi),
			BPSystolic:      intVal(r.BpSystolic),
			BPDiastolic:     intVal(r.BpDiastolic),
			Activity:        textVal(r.Activity),
			PhysActivity:    boolVal(r.PhysActivity),
			Smoking:         textVal(r.Smoking),
			Hypertension:    textVal(r.Hypertension),
			HeartDisease:    textVal(r.HeartDisease),
			FamilyHistory:   boolVal(r.FamilyHistory),
			Chol:            intVal(r.Chol),
			LDL:             intVal(r.Ldl),
			HDL:             intVal(r.Hdl),
			Triglycerides:   intVal(r.Triglycerides),
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		})
	}
	return out
}

// mapCreatePatientRow converts CreatePatientRow to models.Patient.
func mapCreatePatientRow(r sqlcgen.CreatePatientRow) models.Patient {
	return models.Patient{
		ID:              int64(r.ID),
		UserID:          int64(r.UserID),
		Name:            r.Name,
		Age:             intVal(r.Age),
		MenopauseStatus: textVal(r.MenopauseStatus),
		YearsMenopause:  intVal(r.YearsMenopause),
		BMI:             numericVal(r.Bmi),
		BPSystolic:      intVal(r.BpSystolic),
		BPDiastolic:     intVal(r.BpDiastolic),
		Activity:        textVal(r.Activity),
		PhysActivity:    boolVal(r.PhysActivity),
		Smoking:         textVal(r.Smoking),
		Hypertension:    textVal(r.Hypertension),
		HeartDisease:    textVal(r.HeartDisease),
		FamilyHistory:   boolVal(r.FamilyHistory),
		Chol:            intVal(r.Chol),
		LDL:             intVal(r.Ldl),
		HDL:             intVal(r.Hdl),
		Triglycerides:   intVal(r.Triglycerides),
		CreatedAt:       r.CreatedAt.Time,
		UpdatedAt:       r.UpdatedAt.Time,
	}
}

// mapGetPatientRow converts GetPatientRow to models.Patient.
func mapGetPatientRow(r sqlcgen.GetPatientRow) models.Patient {
	return models.Patient{
		ID:              int64(r.ID),
		UserID:          int64(r.UserID),
		Name:            r.Name,
		Age:             intVal(r.Age),
		MenopauseStatus: textVal(r.MenopauseStatus),
		YearsMenopause:  intVal(r.YearsMenopause),
		BMI:             numericVal(r.Bmi),
		BPSystolic:      intVal(r.BpSystolic),
		BPDiastolic:     intVal(r.BpDiastolic),
		Activity:        textVal(r.Activity),
		PhysActivity:    boolVal(r.PhysActivity),
		Smoking:         textVal(r.Smoking),
		Hypertension:    textVal(r.Hypertension),
		HeartDisease:    textVal(r.HeartDisease),
		FamilyHistory:   boolVal(r.FamilyHistory),
		Chol:            intVal(r.Chol),
		LDL:             intVal(r.Ldl),
		HDL:             intVal(r.Hdl),
		Triglycerides:   intVal(r.Triglycerides),
		CreatedAt:       r.CreatedAt.Time,
		UpdatedAt:       r.UpdatedAt.Time,
	}
}

// mapUpdatePatientRow converts UpdatePatientRow to models.Patient.
func mapUpdatePatientRow(r sqlcgen.UpdatePatientRow) models.Patient {
	return models.Patient{
		ID:              int64(r.ID),
		UserID:          int64(r.UserID),
		Name:            r.Name,
		Age:             intVal(r.Age),
		MenopauseStatus: textVal(r.MenopauseStatus),
		YearsMenopause:  intVal(r.YearsMenopause),
		BMI:             numericVal(r.Bmi),
		BPSystolic:      intVal(r.BpSystolic),
		BPDiastolic:     intVal(r.BpDiastolic),
		Activity:        textVal(r.Activity),
		PhysActivity:    boolVal(r.PhysActivity),
		Smoking:         textVal(r.Smoking),
		Hypertension:    textVal(r.Hypertension),
		HeartDisease:    textVal(r.HeartDisease),
		FamilyHistory:   boolVal(r.FamilyHistory),
		Chol:            intVal(r.Chol),
		LDL:             intVal(r.Ldl),
		HDL:             intVal(r.Hdl),
		Triglycerides:   intVal(r.Triglycerides),
		CreatedAt:       r.CreatedAt.Time,
		UpdatedAt:       r.UpdatedAt.Time,
	}
}

// ============================================================================
// Assessment Row Mappers
// ============================================================================

// mapListAssessmentsByUserRows converts ListAssessmentsByUserRow slice to models.Assessment slice.
func mapListAssessmentsByUserRows(rows []sqlcgen.ListAssessmentsByUserRow) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, models.Assessment{
			ID:                 int64(r.ID),
			UserID:             int64Val(r.UserID),
			FBS:                numericVal(r.Fbs),
			HbA1c:              numericVal(r.Hba1c),
			Cholesterol:        intVal(r.Cholesterol),
			LDL:                intVal(r.Ldl),
			HDL:                intVal(r.Hdl),
			Triglycerides:      intVal(r.Triglycerides),
			Systolic:           intVal(r.Systolic),
			Diastolic:          intVal(r.Diastolic),
			Activity:           textVal(r.Activity),
			HistoryFlag:        boolVal(r.HistoryFlag),
			Smoking:            textVal(r.Smoking),
			Hypertension:       textVal(r.Hypertension),
			HeartDisease:       textVal(r.HeartDisease),
			BMI:                numericVal(r.Bmi),
			Cluster:            textVal(r.Cluster),
			RiskScore:          intVal(r.RiskScore),
			PredictedStatus:    textVal(r.PredictedStatus),
			RiskLabel:          textVal(r.RiskLabel),
			ClusterDescription: textVal(r.ClusterDescription),
			TreatmentFocus:     textVal(r.TreatmentFocus),
			AtRiskProbability:  floatVal(r.AtRiskProbability),
			ModelVersion:       textVal(r.ModelVersion),
			DatasetHash:        textVal(r.DatasetHash),
			ValidationStatus:   textVal(r.ValidationStatus),
			IsSelfReported:     r.IsSelfReported,
			Source:             r.Source,
			Notes:              textVal(r.Notes),
			CreatedAt:          r.CreatedAt.Time,
			UpdatedAt:          r.UpdatedAt.Time,
		})
	}
	return out
}

// mapListAssessmentsByUserPaginatedRows converts ListAssessmentsByUserPaginatedRow slice to models.Assessment slice.
func mapListAssessmentsByUserPaginatedRows(rows []sqlcgen.ListAssessmentsByUserPaginatedRow) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, models.Assessment{
			ID:                 int64(r.ID),
			UserID:             int64Val(r.UserID),
			FBS:                numericVal(r.Fbs),
			HbA1c:              numericVal(r.Hba1c),
			Cholesterol:        intVal(r.Cholesterol),
			LDL:                intVal(r.Ldl),
			HDL:                intVal(r.Hdl),
			Triglycerides:      intVal(r.Triglycerides),
			Systolic:           intVal(r.Systolic),
			Diastolic:          intVal(r.Diastolic),
			Activity:           textVal(r.Activity),
			HistoryFlag:        boolVal(r.HistoryFlag),
			Smoking:            textVal(r.Smoking),
			Hypertension:       textVal(r.Hypertension),
			HeartDisease:       textVal(r.HeartDisease),
			BMI:                numericVal(r.Bmi),
			Cluster:            textVal(r.Cluster),
			RiskScore:          intVal(r.RiskScore),
			PredictedStatus:    textVal(r.PredictedStatus),
			RiskLabel:          textVal(r.RiskLabel),
			ClusterDescription: textVal(r.ClusterDescription),
			TreatmentFocus:     textVal(r.TreatmentFocus),
			AtRiskProbability:  floatVal(r.AtRiskProbability),
			ModelVersion:       textVal(r.ModelVersion),
			DatasetHash:        textVal(r.DatasetHash),
			ValidationStatus:   textVal(r.ValidationStatus),
			IsSelfReported:     r.IsSelfReported,
			Source:             r.Source,
			Notes:              textVal(r.Notes),
			CreatedAt:          r.CreatedAt.Time,
			UpdatedAt:          r.UpdatedAt.Time,
		})
	}
	return out
}

// mapAssessmentsLimitedRows converts ListAssessmentsLimitedRow slice to models.Assessment slice.
func mapAssessmentsLimitedRows(rows []sqlcgen.ListAssessmentsLimitedRow) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, models.Assessment{
			ID:                 int64(r.ID),
			UserID:             int64Val(r.UserID),
			FBS:                numericVal(r.Fbs),
			HbA1c:              numericVal(r.Hba1c),
			Cholesterol:        intVal(r.Cholesterol),
			LDL:                intVal(r.Ldl),
			HDL:                intVal(r.Hdl),
			Triglycerides:      intVal(r.Triglycerides),
			Systolic:           intVal(r.Systolic),
			Diastolic:          intVal(r.Diastolic),
			Activity:           textVal(r.Activity),
			HistoryFlag:        boolVal(r.HistoryFlag),
			Smoking:            textVal(r.Smoking),
			Hypertension:       textVal(r.Hypertension),
			HeartDisease:       textVal(r.HeartDisease),
			BMI:                numericVal(r.Bmi),
			Cluster:            textVal(r.Cluster),
			RiskScore:          intVal(r.RiskScore),
			PredictedStatus:    textVal(r.PredictedStatus),
			RiskLabel:          textVal(r.RiskLabel),
			ClusterDescription: textVal(r.ClusterDescription),
			TreatmentFocus:     textVal(r.TreatmentFocus),
			AtRiskProbability:  floatVal(r.AtRiskProbability),
			ModelVersion:       textVal(r.ModelVersion),
			DatasetHash:        textVal(r.DatasetHash),
			ValidationStatus:   textVal(r.ValidationStatus),
			IsSelfReported:     r.IsSelfReported,
			Source:             r.Source,
			Notes:              textVal(r.Notes),
			CreatedAt:          r.CreatedAt.Time,
			UpdatedAt:          r.UpdatedAt.Time,
		})
	}
	return out
}

// mapCreateAssessmentRow converts CreateAssessmentRow to models.Assessment.
func mapCreateAssessmentRow(r sqlcgen.CreateAssessmentRow) models.Assessment {
	return models.Assessment{
		ID:                 int64(r.ID),
		UserID:             int64Val(r.UserID),
		FBS:                numericVal(r.Fbs),
		HbA1c:              numericVal(r.Hba1c),
		Cholesterol:        intVal(r.Cholesterol),
		LDL:                intVal(r.Ldl),
		HDL:                intVal(r.Hdl),
		Triglycerides:      intVal(r.Triglycerides),
		Systolic:           intVal(r.Systolic),
		Diastolic:          intVal(r.Diastolic),
		Activity:           textVal(r.Activity),
		HistoryFlag:        boolVal(r.HistoryFlag),
		Smoking:            textVal(r.Smoking),
		Hypertension:       textVal(r.Hypertension),
		HeartDisease:       textVal(r.HeartDisease),
		BMI:                numericVal(r.Bmi),
		Cluster:            textVal(r.Cluster),
		RiskScore:          intVal(r.RiskScore),
		PredictedStatus:    textVal(r.PredictedStatus),
		RiskLabel:          textVal(r.RiskLabel),
		ClusterDescription: textVal(r.ClusterDescription),
		TreatmentFocus:     textVal(r.TreatmentFocus),
		AtRiskProbability:  floatVal(r.AtRiskProbability),
		ModelVersion:       textVal(r.ModelVersion),
		DatasetHash:        textVal(r.DatasetHash),
		ValidationStatus:   textVal(r.ValidationStatus),
		IsSelfReported:     r.IsSelfReported,
		Source:             r.Source,
		Notes:              textVal(r.Notes),
		CreatedAt:          r.CreatedAt.Time,
		UpdatedAt:          r.UpdatedAt.Time,
	}
}

// mapGetAssessmentRow converts GetAssessmentRow to models.Assessment.
func mapGetAssessmentRow(r sqlcgen.GetAssessmentRow) models.Assessment {
	return models.Assessment{
		ID:                 int64(r.ID),
		UserID:             int64Val(r.UserID),
		FBS:                numericVal(r.Fbs),
		HbA1c:              numericVal(r.Hba1c),
		Cholesterol:        intVal(r.Cholesterol),
		LDL:                intVal(r.Ldl),
		HDL:                intVal(r.Hdl),
		Triglycerides:      intVal(r.Triglycerides),
		Systolic:           intVal(r.Systolic),
		Diastolic:          intVal(r.Diastolic),
		Activity:           textVal(r.Activity),
		HistoryFlag:        boolVal(r.HistoryFlag),
		Smoking:            textVal(r.Smoking),
		Hypertension:       textVal(r.Hypertension),
		HeartDisease:       textVal(r.HeartDisease),
		BMI:                numericVal(r.Bmi),
		Cluster:            textVal(r.Cluster),
		RiskScore:          intVal(r.RiskScore),
		PredictedStatus:    textVal(r.PredictedStatus),
		RiskLabel:          textVal(r.RiskLabel),
		ClusterDescription: textVal(r.ClusterDescription),
		TreatmentFocus:     textVal(r.TreatmentFocus),
		AtRiskProbability:  floatVal(r.AtRiskProbability),
		ModelVersion:       textVal(r.ModelVersion),
		DatasetHash:        textVal(r.DatasetHash),
		ValidationStatus:   textVal(r.ValidationStatus),
		IsSelfReported:     r.IsSelfReported,
		Source:             r.Source,
		Notes:              textVal(r.Notes),
		CreatedAt:          r.CreatedAt.Time,
		UpdatedAt:          r.UpdatedAt.Time,
	}
}

// mapUpdateAssessmentRow converts UpdateAssessmentRow to models.Assessment.
func mapUpdateAssessmentRow(r sqlcgen.UpdateAssessmentRow) models.Assessment {
	return models.Assessment{
		ID:                 int64(r.ID),
		UserID:             int64Val(r.UserID),
		FBS:                numericVal(r.Fbs),
		HbA1c:              numericVal(r.Hba1c),
		Cholesterol:        intVal(r.Cholesterol),
		LDL:                intVal(r.Ldl),
		HDL:                intVal(r.Hdl),
		Triglycerides:      intVal(r.Triglycerides),
		Systolic:           intVal(r.Systolic),
		Diastolic:          intVal(r.Diastolic),
		Activity:           textVal(r.Activity),
		HistoryFlag:        boolVal(r.HistoryFlag),
		Smoking:            textVal(r.Smoking),
		Hypertension:       textVal(r.Hypertension),
		HeartDisease:       textVal(r.HeartDisease),
		BMI:                numericVal(r.Bmi),
		Cluster:            textVal(r.Cluster),
		RiskScore:          intVal(r.RiskScore),
		PredictedStatus:    textVal(r.PredictedStatus),
		RiskLabel:          textVal(r.RiskLabel),
		ClusterDescription: textVal(r.ClusterDescription),
		TreatmentFocus:     textVal(r.TreatmentFocus),
		AtRiskProbability:  floatVal(r.AtRiskProbability),
		ModelVersion:       textVal(r.ModelVersion),
		DatasetHash:        textVal(r.DatasetHash),
		ValidationStatus:   textVal(r.ValidationStatus),
		IsSelfReported:     r.IsSelfReported,
		Source:             r.Source,
		Notes:              textVal(r.Notes),
		CreatedAt:          r.CreatedAt.Time,
		UpdatedAt:          r.UpdatedAt.Time,
	}
}
