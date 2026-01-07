-- name: CreateAuditEvent :exec
INSERT INTO audit_events (actor, action, target_type, target_id, details, created_at)
VALUES ($1, $2, $3, $4, $5, NOW());

-- name: ListAuditEvents :many
SELECT id, actor, action, target_type, target_id, details, created_at
FROM audit_events
WHERE 
    ($1::text = '' OR actor ILIKE '%' || $1 || '%')
    AND ($2::text = '' OR action = $2)
    AND ($3::timestamptz IS NULL OR created_at >= $3)
    AND ($4::timestamptz IS NULL OR created_at <= $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountAuditEvents :one
SELECT COUNT(*)
FROM audit_events
WHERE 
    ($1::text = '' OR actor ILIKE '%' || $1 || '%')
    AND ($2::text = '' OR action = $2)
    AND ($3::timestamptz IS NULL OR created_at >= $3)
    AND ($4::timestamptz IS NULL OR created_at <= $4);

-- name: GetRecentAuditEvents :many
SELECT id, actor, action, target_type, target_id, details, created_at
FROM audit_events
ORDER BY created_at DESC
LIMIT $1;

-- name: GetAuditEventsByActor :many
SELECT id, actor, action, target_type, target_id, details, created_at
FROM audit_events
WHERE actor = $1
ORDER BY created_at DESC
LIMIT $2;
