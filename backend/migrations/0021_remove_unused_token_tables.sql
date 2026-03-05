-- +goose Up
-- ============================================
-- Migration: Remove unused token and notification tables
-- Description: Cleanup dead code from previous migrations
-- ============================================

-- Drop email verification tokens table (migration 0013)
DROP TABLE IF EXISTS email_verification_tokens;

-- Drop password reset tokens table (migration 0013)
DROP TABLE IF EXISTS password_reset_tokens;

-- Drop notification queue table (migration 0011)
DROP INDEX IF EXISTS idx_notification_queue_status;
DROP INDEX IF EXISTS idx_notification_queue_user;
DROP TABLE IF EXISTS notification_queue;

-- +goose Down
-- ============================================
-- Rollback: Recreate removed tables
-- ============================================

-- Recreate notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('assessment_reminder', 'risk_alert', 'monthly_summary', 'educational')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);

-- Recreate email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- Recreate password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
