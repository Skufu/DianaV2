-- name: ListModelRuns :many
SELECT id, model_version, dataset_hash, notes, created_at
FROM model_runs
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountModelRuns :one
SELECT COUNT(*) FROM model_runs;

-- name: GetLatestModelRun :one
SELECT id, model_version, dataset_hash, notes, created_at
FROM model_runs
ORDER BY created_at DESC
LIMIT 1;

-- name: CreateModelRun :one
INSERT INTO model_runs (model_version, dataset_hash, notes, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING id, model_version, dataset_hash, notes, created_at;

-- name: GetModelRunByVersion :one
SELECT id, model_version, dataset_hash, notes, created_at
FROM model_runs
WHERE model_version = $1
LIMIT 1;
