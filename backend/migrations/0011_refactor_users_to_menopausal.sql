-- +goose Up
-- ============================================
-- Migration: Refactor to Menopausal User System
-- Description: Transition from clinician-patient model to direct-to-consumer platform
-- ============================================

-- Step 1: Add personal information columns to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Step 2: Add menopausal health columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS menopause_status TEXT CHECK (menopause_status IN ('pre', 'peri', 'post', 'surgical')),
ADD COLUMN IF NOT EXISTS menopause_type TEXT CHECK (menopause_type IN ('natural', 'surgical')),
ADD COLUMN IF NOT EXISTS years_menopause INT CHECK (years_menopause >= 0 AND years_menopause <= 50);

-- Step 3: Add medical history columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hypertension TEXT CHECK (hypertension IN ('no', 'controlled', 'uncontrolled')),
ADD COLUMN IF NOT EXISTS heart_disease TEXT CHECK (heart_disease IN ('no', 'yes')),
ADD COLUMN IF NOT EXISTS family_history_diabetes BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS smoking_status TEXT CHECK (smoking_status IN ('never', 'former', 'current'));

-- Step 4: Add consent columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS consent_personal_data BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS consent_research_participation BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_email_updates BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_analytics BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Add user settings columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assessment_frequency_months INT NOT NULL DEFAULT 3 CHECK (assessment_frequency_months >= 1 AND assessment_frequency_months <= 12),
ADD COLUMN IF NOT EXISTS reminder_email BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_assessment_reminder_sent TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Step 6: Add account management columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'deleted')),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Step 7: Add new user_id column to assessments before removing patient_id
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS user_id INT;

-- Step 8: Drop old foreign key constraint
ALTER TABLE assessments 
DROP CONSTRAINT IF EXISTS assessments_patient_id_fkey;

-- Step 9: Drop old patient_id column
ALTER TABLE assessments 
DROP COLUMN IF EXISTS patient_id;

-- Step 10: Add new foreign key constraint
ALTER TABLE assessments 
ADD CONSTRAINT assessments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 11: Remove role column (replaced by is_admin)
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Step 12: Add self-assessment fields to assessments
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS is_self_reported BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 13: Create indexes for user queries
CREATE INDEX IF NOT EXISTS idx_users_menopause_status ON users(menopause_status);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_consent_research ON users(consent_research_participation);
CREATE INDEX IF NOT EXISTS idx_users_assessment_reminder ON users(reminder_email, last_assessment_reminder_sent);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id_created ON assessments(user_id, created_at DESC);

-- Step 14: Create notification_queue table
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

-- Step 15: Delete patients table (no longer needed)
-- Note: All patient data is being deleted as per requirements
DROP TABLE IF EXISTS patients CASCADE;

-- +goose Down
-- ============================================
-- Rollback: Revert to Clinician-Patient Model
-- ============================================

-- Drop notification_queue table
DROP INDEX IF EXISTS idx_notification_queue_user;
DROP INDEX IF EXISTS idx_notification_queue_status;
DROP TABLE IF EXISTS notification_queue;

-- Drop new indexes
DROP INDEX IF EXISTS idx_assessments_user_id_created;
DROP INDEX IF EXISTS idx_users_assessment_reminder;
DROP INDEX IF EXISTS idx_users_consent_research;
DROP INDEX IF EXISTS idx_users_account_status;
DROP INDEX IF EXISTS idx_users_menopause_status;

-- Revert assessments table (add back patient_id, remove user_id)
ALTER TABLE assessments 
DROP CONSTRAINT IF EXISTS assessments_user_id_fkey;

ALTER TABLE assessments 
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS source,
DROP COLUMN IF EXISTS is_self_reported;

ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS patient_id INT;

ALTER TABLE assessments 
ADD CONSTRAINT assessments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE assessments 
DROP COLUMN IF EXISTS user_id;

-- Revert users table
ALTER TABLE users 
DROP COLUMN IF EXISTS is_admin,
DROP COLUMN IF EXISTS deleted_at,
DROP COLUMN IF EXISTS account_status,
DROP COLUMN IF EXISTS onboarding_completed,
DROP COLUMN IF EXISTS last_assessment_reminder_sent,
DROP COLUMN IF EXISTS reminder_email,
DROP COLUMN IF EXISTS assessment_frequency_months,
DROP COLUMN IF EXISTS consent_updated_at,
DROP COLUMN IF EXISTS consent_analytics,
DROP COLUMN IF EXISTS consent_email_updates,
DROP COLUMN IF EXISTS consent_research_participation,
DROP COLUMN IF EXISTS consent_personal_data,
DROP COLUMN IF EXISTS smoking_status,
DROP COLUMN IF EXISTS family_history_diabetes,
DROP COLUMN IF EXISTS heart_disease,
DROP COLUMN IF EXISTS hypertension,
DROP COLUMN IF EXISTS years_menopause,
DROP COLUMN IF EXISTS menopause_type,
DROP COLUMN IF EXISTS menopause_status,
DROP COLUMN IF EXISTS date_of_birth,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS first_name;

-- Add back role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'clinician';

-- Recreate patients table (simplified version for rollback)
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    age INT,
    menopause_status TEXT,
    years_menopause INT,
    bmi NUMERIC(5,2),
    bp_systolic INT,
    bp_diastolic INT,
    activity TEXT,
    smoking TEXT,
    hypertension TEXT,
    heart_disease TEXT,
    chol INT,
    ldl INT,
    hdl INT,
    triglycerides INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
