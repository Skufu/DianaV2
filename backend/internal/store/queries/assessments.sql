-- name: ListAssessmentsByPatient :many
SELECT id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
       activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
       model_version, dataset_hash, validation_status, created_at, updated_at
FROM assessments
WHERE patient_id = $1
ORDER BY created_at DESC;

-- name: ListAssessmentsLimited :many
SELECT id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
       activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
       model_version, dataset_hash, validation_status, created_at, updated_at
FROM assessments
ORDER BY created_at DESC
LIMIT $1;

-- name: ListAssessmentsLimitedByUser :many
SELECT a.id, a.patient_id, a.fbs, a.hba1c, a.cholesterol, a.ldl, a.hdl, a.triglycerides,
       a.systolic, a.diastolic, a.activity, a.history_flag, a.smoking, a.hypertension,
       a.heart_disease, a.bmi, a.cluster, a.risk_score, a.model_version, a.dataset_hash,
       a.validation_status, a.created_at, a.updated_at
FROM assessments a
INNER JOIN patients p ON a.patient_id = p.id
WHERE p.user_id = $1
ORDER BY a.created_at DESC
LIMIT $2;

-- name: CreateAssessment :one
INSERT INTO assessments (
  patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
  activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
  model_version, dataset_hash, validation_status
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9,
  $10, $11, $12, $13, $14, $15, $16, $17,
  $18, $19, $20
)
RETURNING id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
          activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
          model_version, dataset_hash, validation_status, created_at, updated_at;

-- name: GetAssessment :one
SELECT id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
       activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
       model_version, dataset_hash, validation_status, created_at, updated_at
FROM assessments
WHERE id = $1
LIMIT 1;

-- name: UpdateAssessment :one
UPDATE assessments
SET patient_id = $2,
    fbs = $3,
    hba1c = $4,
    cholesterol = $5,
    ldl = $6,
    hdl = $7,
    triglycerides = $8,
    systolic = $9,
    diastolic = $10,
    activity = $11,
    history_flag = $12,
    smoking = $13,
    hypertension = $14,
    heart_disease = $15,
    bmi = $16,
    cluster = $17,
    risk_score = $18,
    model_version = $19,
    dataset_hash = $20,
    validation_status = $21,
    updated_at = NOW()
WHERE id = $1
RETURNING id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
          activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
          model_version, dataset_hash, validation_status, created_at, updated_at;

-- name: DeleteAssessment :exec
DELETE FROM assessments
WHERE id = $1;

-- name: ClusterCounts :many
SELECT COALESCE(cluster, '') AS cluster, COUNT(*) AS count
FROM assessments
GROUP BY COALESCE(cluster, '');

-- name: ClusterCountsByUser :many
SELECT COALESCE(a.cluster, '') AS cluster, COUNT(*) AS count
FROM assessments a
INNER JOIN patients p ON a.patient_id = p.id
WHERE p.user_id = $1
GROUP BY COALESCE(a.cluster, '');

-- name: TrendAverages :many
SELECT to_char(created_at, 'YYYY-MM') AS label,
       COALESCE(avg(hba1c), 0)::float8 AS hba1c,
       COALESCE(avg(fbs), 0)::float8 AS fbs
FROM assessments
GROUP BY label
ORDER BY label;

-- name: TrendAveragesByUser :many
SELECT to_char(a.created_at, 'YYYY-MM') AS label,
       COALESCE(avg(a.hba1c), 0)::float8 AS hba1c,
       COALESCE(avg(a.fbs), 0)::float8 AS fbs
FROM assessments a
INNER JOIN patients p ON a.patient_id = p.id
WHERE p.user_id = $1
GROUP BY label
ORDER BY label;

-- name: GetPatientAssessmentTrend :many
SELECT id, created_at, risk_score, cluster, hba1c, bmi, fbs, 
       triglycerides, ldl, hdl
FROM assessments
WHERE patient_id = $1
ORDER BY created_at ASC;
