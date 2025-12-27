-- +goose Up
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'clinician',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    fbs NUMERIC(6,2),
    hba1c NUMERIC(4,2),
    cholesterol INT,
    ldl INT,
    hdl INT,
    triglycerides INT,
    systolic INT,
    diastolic INT,
    activity TEXT,
    history_flag BOOLEAN,
    smoking TEXT,
    hypertension TEXT,
    heart_disease TEXT,
    bmi NUMERIC(5,2),
    cluster TEXT,
    risk_score INT,
    model_version TEXT,
    dataset_hash TEXT,
    validation_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_runs (
    id SERIAL PRIMARY KEY,
    model_version TEXT NOT NULL,
    dataset_hash TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    actor TEXT,
    action TEXT,
    target_type TEXT,
    target_id INT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS model_runs;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;

