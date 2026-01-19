-- +goose Up
-- Auth Events Table: Stores real-time authentication events for admin monitoring
-- Supports login, logout, failed_login, and token_refresh events

CREATE TABLE IF NOT EXISTS auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login', 'token_refresh')),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    device_info JSONB,
    location JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_auth_events_created_at ON auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_email ON auth_events(email);
CREATE INDEX IF NOT EXISTS idx_auth_events_type ON auth_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_success ON auth_events(success);

-- Comment on table
COMMENT ON TABLE auth_events IS 'Authentication event logs for real-time admin monitoring';
COMMENT ON COLUMN auth_events.event_type IS 'Type of auth event: login, logout, failed_login, token_refresh';
COMMENT ON COLUMN auth_events.email IS 'User email (optional for failed logins)';
COMMENT ON COLUMN auth_events.ip_address IS 'Client IP address';
COMMENT ON COLUMN auth_events.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN auth_events.success IS 'Whether the event was successful';
COMMENT ON COLUMN auth_events.device_info IS 'Parsed device information (browser, os, device)';
COMMENT ON COLUMN auth_events.location IS 'Geolocation data (country, city, lat, long)';
COMMENT ON COLUMN auth_events.metadata IS 'Additional event-specific data (failure_reason, session_id, etc.)';

-- +goose Down
DROP TABLE IF EXISTS auth_events;
