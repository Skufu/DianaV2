-- +goose Up
-- ============================================
-- Migration: Add Lifestyle fields to User Profil
-- ============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS physical_activity TEXT,
ADD COLUMN IF NOT EXISTS alcohol TEXT;

-- +goose Down
ALTER TABLE users 
DROP COLUMN IF EXISTS physical_activity;
ALTER TABLE users 
DROP COLUMN IF EXISTS alcohol;
