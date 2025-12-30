-- +goose Up
-- Clinics table for multi-tenant support
CREATE TABLE clinics (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table: users can belong to multiple clinics with different roles
CREATE TABLE user_clinics (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id INT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'member' or 'clinic_admin'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, clinic_id)
);

CREATE INDEX idx_user_clinics_user ON user_clinics(user_id);
CREATE INDEX idx_user_clinics_clinic ON user_clinics(clinic_id);

-- +goose Down
DROP INDEX IF EXISTS idx_user_clinics_clinic;
DROP INDEX IF EXISTS idx_user_clinics_user;
DROP TABLE IF EXISTS user_clinics;
DROP TABLE IF EXISTS clinics;
