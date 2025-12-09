-- name: ListPatients :many
SELECT id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
       activity, smoking, hypertension, heart_disease, chol, ldl, hdl, triglycerides,
       created_at, updated_at
FROM patients
ORDER BY id DESC;

-- name: ListPatientsLimited :many
SELECT id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
       activity, smoking, hypertension, heart_disease, chol, ldl, hdl, triglycerides,
       created_at, updated_at
FROM patients
ORDER BY id DESC
LIMIT $1;

-- name: CreatePatient :one
INSERT INTO patients (
  name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
  activity, smoking, hypertension, heart_disease, chol, ldl, hdl, triglycerides
) VALUES (
  $1, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12, $13, $14, $15
)
RETURNING id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
          activity, smoking, hypertension, heart_disease, chol, ldl, hdl, triglycerides,
          created_at, updated_at;

