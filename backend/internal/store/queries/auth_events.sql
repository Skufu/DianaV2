-- name: CreateAuthEvent :exec
INSERT INTO auth_events (event_type, email, ip_address, user_agent, success, metadata, created_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW());

-- name: ListAuthEvents :many
SELECT id, event_type, email, ip_address, user_agent, success, device_info, location, metadata, created_at
FROM auth_events
WHERE
    ($1::text = '' OR event_type = $1)
    AND ($2::text = '' OR email ILIKE '%' || $2 || '%')
    AND ($3::timestamptz IS NULL OR created_at >= $3)
    AND ($4::timestamptz IS NULL OR created_at <= $4)
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: CountAuthEvents :one
SELECT COUNT(*)
FROM auth_events
WHERE
    ($1::text = '' OR event_type = $1)
    AND ($2::text = '' OR email ILIKE '%' || $2 || '%')
    AND ($3::timestamptz IS NULL OR created_at >= $3)
    AND ($4::timestamptz IS NULL OR created_at <= $4);

-- name: GetRecentAuthEvents :many
SELECT id, event_type, email, ip_address, user_agent, success, device_info, location, metadata, created_at
FROM auth_events
ORDER BY created_at DESC
LIMIT $1;
