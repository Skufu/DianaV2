-- +goose Up
-- Admin Dashboard Features Migration
-- Extends users table and adds indexes for admin queries

-- Extend users table for admin management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id);

-- Add index for audit event queries (chronological + actor filtering)
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);

-- Add index for model runs (chronological ordering)
CREATE INDEX IF NOT EXISTS idx_model_runs_created_at ON model_runs(created_at DESC);

-- Add index for user listing (role filtering, active status)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users(email);

-- +goose Down
ALTER TABLE users 
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS last_login_at,
DROP COLUMN IF EXISTS created_by;

DROP INDEX IF EXISTS idx_audit_events_created_at;
DROP INDEX IF EXISTS idx_audit_events_actor;
DROP INDEX IF EXISTS idx_audit_events_action;
DROP INDEX IF EXISTS idx_model_runs_created_at;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_email_search;
