-- name: ListAssessmentsByPatient :many
SELECT id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
       activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
       model_version, dataset_hash, validation_status, created_at
FROM assessments
WHERE patient_id = $1
ORDER BY created_at DESC;

-- name: ListAssessmentsLimited :many
SELECT id, patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
       activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
       model_version, dataset_hash, validation_status, created_at
FROM assessments
ORDER BY created_at DESC
LIMIT $1;

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
          model_version, dataset_hash, validation_status, created_at;

-- name: ClusterCounts :many
SELECT COALESCE(cluster, '') AS cluster, COUNT(*) AS count
FROM assessments
GROUP BY COALESCE(cluster, '');

-- name: TrendAverages :many
SELECT to_char(created_at, 'YYYY-MM') AS label,
       COALESCE(avg(hba1c), 0)::float8 AS hba1c,
       COALESCE(avg(fbs), 0)::float8 AS fbs
FROM assessments
GROUP BY label
ORDER BY label;

