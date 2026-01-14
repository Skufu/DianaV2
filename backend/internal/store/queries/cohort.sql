-- cohort.sql: SQLC queries for cohort analysis and aggregate statistics

-- name: CohortStatsByCluster :many
SELECT 
    COALESCE(cluster, 'Unknown') AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(risk_score), 0)::float8 AS avg_risk_score,
    COUNT(CASE WHEN risk_score < 30 THEN 1 END)::int AS low_risk_count,
    COUNT(CASE WHEN risk_score >= 30 AND risk_score < 70 THEN 1 END)::int AS moderate_risk_count,
    COUNT(CASE WHEN risk_score >= 70 THEN 1 END)::int AS high_risk_count
FROM assessments
GROUP BY COALESCE(cluster, 'Unknown');

-- name: CohortStatsByRiskLevel :many
SELECT 
    CASE 
        WHEN risk_score < 30 THEN 'Low'
        WHEN risk_score >= 30 AND risk_score < 70 THEN 'Moderate'
        ELSE 'High'
    END AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(risk_score), 0)::float8 AS avg_risk_score
FROM assessments
GROUP BY 
    CASE 
        WHEN risk_score < 30 THEN 'Low'
        WHEN risk_score >= 30 AND risk_score < 70 THEN 'Moderate'
        ELSE 'High'
    END;

-- name: CohortStatsByAgeGroup :many
SELECT 
    CASE 
        WHEN DATE_PART('year', AGE(u.date_of_birth)) < 30 THEN '<30'
        WHEN DATE_PART('year', AGE(u.date_of_birth)) >= 30 AND DATE_PART('year', AGE(u.date_of_birth)) < 50 THEN '30-49'
        WHEN DATE_PART('year', AGE(u.date_of_birth)) >= 50 AND DATE_PART('year', AGE(u.date_of_birth)) < 70 THEN '50-69'
        ELSE '70+'
    END AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(a.hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(a.fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(a.bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(a.systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(a.diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(a.risk_score), 0)::float8 AS avg_risk_score
FROM assessments a
JOIN users u ON a.user_id = u.id
GROUP BY 1;

-- name: CohortStatsByMenopauseStatus :many
SELECT 
    COALESCE(u.menopause_status, 'Unknown') AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(a.hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(a.fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(a.bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(a.systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(a.diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(a.risk_score), 0)::float8 AS avg_risk_score
FROM assessments a
JOIN users u ON a.user_id = u.id
GROUP BY 1;

-- name: TotalAssessmentCount :one
SELECT COUNT(*)::int AS count FROM assessments;

-- name: TotalPatientCount :one
SELECT COUNT(*)::int AS count FROM users WHERE role = 'patient';
