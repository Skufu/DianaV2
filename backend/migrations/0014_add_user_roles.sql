-- +goose Up
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'doctor'));

UPDATE users
SET role = 'admin'
WHERE is_admin = true;

UPDATE users
SET is_admin = (role = 'admin')
WHERE is_admin IS DISTINCT FROM (role = 'admin');

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- +goose Down
DROP INDEX IF EXISTS idx_users_role;
ALTER TABLE users DROP COLUMN IF EXISTS role;
