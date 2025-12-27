-- +goose Up
-- Add mock users with proper password hashes
-- Using ON CONFLICT DO NOTHING to make this migration idempotent
INSERT INTO users (email, password_hash, role) VALUES
  -- demo@diana.app / demo123 - bcrypt hash of "demo123"
  ('demo@diana.app', '$2a$10$5nUIvjrReaoA1GObfgibP.N.moEa9MRuKnoZ8nH/YlDFZE5c0EDCa', 'clinician'),
  -- clinician@example.com / password123 - bcrypt hash of "password123"
  ('clinician@example.com', '$2a$10$2EwposSF6h9Rk8I1HZ5KGeya2QOsLanBu49CMzjn4cm2uFvg6klN6', 'clinician'),
  -- admin@diana.app / admin123 - bcrypt hash of "admin123"
  ('admin@diana.app', '$2a$10$ME93IH/BKEhJOALUCVrxbOFuN3L1r2jvwo0JEQqHYgpZIGBCcKuGq', 'admin'),
  -- researcher@diana.app / research456 - bcrypt hash of "research456"
  ('researcher@diana.app', '$2a$10$k8ql7nL1pFt2PJjsExvWlupEJJjQkfwcp24OPVYdgMawiVv7dV5b2', 'researcher')
ON CONFLICT (email) DO NOTHING;

-- Add realistic mock patients, assessments, and related data
-- Only insert if mock data doesn't already exist (idempotent)
-- +goose StatementBegin
DO $$
DECLARE
  v_demo_user_id INT;
  v_clinician_user_id INT;
  v_admin_user_id INT;
  v_researcher_user_id INT;
  v_patient_id INT;
BEGIN
  -- Check if mock data already exists
  IF NOT EXISTS (SELECT 1 FROM patients WHERE name = 'Sarah Johnson') THEN
    -- Get user IDs
    SELECT id INTO v_demo_user_id FROM users WHERE email = 'demo@diana.app';
    SELECT id INTO v_clinician_user_id FROM users WHERE email = 'clinician@example.com';
    SELECT id INTO v_admin_user_id FROM users WHERE email = 'admin@diana.app';
    SELECT id INTO v_researcher_user_id FROM users WHERE email = 'researcher@diana.app';

    -- Patient 1: Sarah Johnson (demo user) - Low risk profile
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_demo_user_id, 'Sarah Johnson', 52, 'postmenopausal', 3, 23.5, 118, 75,
      'moderate', true, 'never', 'no', 'no', false,
      180, 95, 65, 110
    ) RETURNING id INTO v_patient_id;

    -- Patient 1 assessments (3 over time)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 92.5, 5.2, 180, 95, 65, 110, 118, 75, 'moderate', false, 'never', 'no', 'no', 23.5,
       'low_risk', 15, 'v0-mock', 'mock_dataset_v1', 'normal'),
      (v_patient_id, 89.3, 5.1, 175, 90, 68, 105, 115, 72, 'moderate', false, 'never', 'no', 'no', 23.2,
       'low_risk', 12, 'v0-mock', 'mock_dataset_v1', 'normal'),
      (v_patient_id, 95.1, 5.3, 185, 98, 66, 115, 120, 76, 'moderate', false, 'never', 'no', 'no', 23.8,
       'low_risk', 18, 'v0-mock', 'mock_dataset_v1', 'normal');

    -- Patient 2: Maria Rodriguez (demo user) - Moderate risk profile
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_demo_user_id, 'Maria Rodriguez', 58, 'postmenopausal', 8, 27.2, 135, 85,
      'low', false, 'former', 'yes', 'no', true,
      220, 135, 45, 180
    ) RETURNING id INTO v_patient_id;

    -- Patient 2 assessments (2 assessments)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 108.7, 5.8, 220, 135, 45, 180, 135, 85, 'low', true, 'former', 'yes', 'no', 27.2,
       'moderate_risk', 45, 'v0-mock', 'mock_dataset_v1', 'warning: elevated glucose'),
      (v_patient_id, 112.3, 6.1, 215, 130, 48, 175, 132, 83, 'low', true, 'former', 'yes', 'no', 26.8,
       'moderate_risk', 52, 'v0-mock', 'mock_dataset_v1', 'warning: elevated HbA1c');

    -- Patient 3: Jennifer Wang (demo user) - High risk profile
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_demo_user_id, 'Jennifer Wang', 61, 'postmenopausal', 12, 31.8, 148, 92,
      'sedentary', false, 'current', 'yes', 'yes', true,
      275, 165, 38, 235
    ) RETURNING id INTO v_patient_id;

    -- Patient 3 assessments (4 assessments - high risk monitoring)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 125.8, 6.8, 275, 165, 38, 235, 148, 92, 'sedentary', true, 'current', 'yes', 'yes', 31.8,
       'high_risk', 85, 'v0-mock', 'mock_dataset_v1', 'warning: multiple risk factors'),
      (v_patient_id, 130.2, 7.0, 280, 170, 36, 245, 152, 94, 'sedentary', true, 'current', 'yes', 'yes', 32.1,
       'high_risk', 92, 'v0-mock', 'mock_dataset_v1', 'warning: pre-diabetic levels'),
      (v_patient_id, 118.5, 6.5, 270, 160, 40, 225, 145, 90, 'low', true, 'former', 'yes', 'yes', 31.2,
       'high_risk', 78, 'v0-mock', 'mock_dataset_v1', 'improved but still high risk'),
      (v_patient_id, 122.9, 6.7, 265, 158, 42, 220, 143, 88, 'low', true, 'former', 'yes', 'yes', 30.8,
       'high_risk', 82, 'v0-mock', 'mock_dataset_v1', 'stabilizing');

    -- Patient 4: Lisa Thompson (clinician user) - Perimenopausal
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_clinician_user_id, 'Lisa Thompson', 48, 'perimenopausal', 0, 25.1, 125, 80,
      'high', true, 'never', 'no', 'no', false,
      195, 110, 58, 125
    ) RETURNING id INTO v_patient_id;

    -- Patient 4 assessments (1 baseline)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 87.2, 5.0, 195, 110, 58, 125, 125, 80, 'high', false, 'never', 'no', 'no', 25.1,
       'low_risk', 8, 'v0-mock', 'mock_dataset_v1', 'normal');

    -- Patient 5: Carmen Silva (clinician user) - Recently postmenopausal
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_clinician_user_id, 'Carmen Silva', 54, 'postmenopausal', 2, 26.8, 130, 82,
      'moderate', true, 'former', 'mild', 'no', true,
      210, 120, 52, 155
    ) RETURNING id INTO v_patient_id;

    -- Patient 5 assessments (2 assessments)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 102.4, 5.6, 210, 120, 52, 155, 130, 82, 'moderate', true, 'former', 'mild', 'no', 26.8,
       'moderate_risk', 38, 'v0-mock', 'mock_dataset_v1', 'borderline glucose'),
      (v_patient_id, 98.9, 5.4, 205, 115, 55, 145, 127, 80, 'moderate', true, 'former', 'mild', 'no', 26.5,
       'moderate_risk', 32, 'v0-mock', 'mock_dataset_v1', 'improving');

    -- Patient 6: Patricia Davis (clinician user) - Long postmenopausal, high risk
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_clinician_user_id, 'Patricia Davis', 65, 'postmenopausal', 16, 29.4, 142, 88,
      'low', false, 'former', 'yes', 'yes', true,
      245, 145, 42, 200
    ) RETURNING id INTO v_patient_id;

    -- Patient 6 assessments (3 assessments)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 115.6, 6.3, 245, 145, 42, 200, 142, 88, 'low', true, 'former', 'yes', 'yes', 29.4,
       'high_risk', 72, 'v0-mock', 'mock_dataset_v1', 'warning: elevated glucose'),
      (v_patient_id, 119.2, 6.5, 250, 148, 40, 210, 145, 90, 'low', true, 'former', 'yes', 'yes', 29.8,
       'high_risk', 78, 'v0-mock', 'mock_dataset_v1', 'warning: worsening'),
      (v_patient_id, 113.8, 6.2, 240, 142, 44, 195, 138, 85, 'moderate', true, 'former', 'controlled', 'yes', 29.0,
       'high_risk', 68, 'v0-mock', 'mock_dataset_v1', 'responding to intervention');

    -- Patient 7: Rachel Kim (clinician user) - Athletic profile, low risk
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_clinician_user_id, 'Rachel Kim', 50, 'perimenopausal', 0, 21.2, 110, 70,
      'high', true, 'never', 'no', 'no', false,
      165, 85, 75, 95
    ) RETURNING id INTO v_patient_id;

    -- Patient 7 assessments (1 assessment)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 82.1, 4.8, 165, 85, 75, 95, 110, 70, 'high', false, 'never', 'no', 'no', 21.2,
       'low_risk', 5, 'v0-mock', 'mock_dataset_v1', 'excellent profile');

    -- Patient 8: Diana Martinez (admin user) - Metabolic syndrome profile
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_admin_user_id, 'Diana Martinez', 56, 'postmenopausal', 6, 33.2, 155, 95,
      'sedentary', false, 'current', 'yes', 'no', true,
      285, 175, 35, 280
    ) RETURNING id INTO v_patient_id;

    -- Patient 8 assessments (3 assessments)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 135.7, 7.2, 285, 175, 35, 280, 155, 95, 'sedentary', true, 'current', 'yes', 'no', 33.2,
       'high_risk', 95, 'v0-mock', 'mock_dataset_v1', 'warning: metabolic syndrome'),
      (v_patient_id, 142.3, 7.5, 290, 180, 32, 295, 158, 97, 'sedentary', true, 'current', 'yes', 'no', 33.8,
       'high_risk', 98, 'v0-mock', 'mock_dataset_v1', 'warning: diabetic levels'),
      (v_patient_id, 128.4, 6.9, 275, 168, 38, 265, 150, 92, 'low', true, 'former', 'controlled', 'no', 32.5,
       'high_risk', 88, 'v0-mock', 'mock_dataset_v1', 'intervention started');

    -- Patient 9: Amy Chen (admin user) - Borderline case
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_admin_user_id, 'Amy Chen', 53, 'postmenopausal', 4, 28.5, 138, 86,
      'moderate', false, 'never', 'mild', 'no', false,
      235, 140, 48, 165
    ) RETURNING id INTO v_patient_id;

    -- Patient 9 assessments (2 assessments)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 105.3, 5.9, 235, 140, 48, 165, 138, 86, 'moderate', false, 'never', 'mild', 'no', 28.5,
       'moderate_risk', 42, 'v0-mock', 'mock_dataset_v1', 'borderline'),
      (v_patient_id, 101.8, 5.7, 230, 135, 50, 160, 135, 84, 'moderate', false, 'never', 'mild', 'no', 28.2,
       'moderate_risk', 38, 'v0-mock', 'mock_dataset_v1', 'stable');

    -- Patient 10: Michelle Brown (researcher user) - Well-controlled case
    INSERT INTO patients (
      user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
      activity, phys_activity, smoking, hypertension, heart_disease, family_history,
      chol, ldl, hdl, triglycerides
    ) VALUES (
      v_researcher_user_id, 'Michelle Brown', 59, 'postmenopausal', 9, 24.7, 122, 78,
      'moderate', true, 'never', 'controlled', 'no', true,
      190, 105, 62, 115
    ) RETURNING id INTO v_patient_id;

    -- Patient 10 assessments (2 assessments)
    INSERT INTO assessments (
      patient_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
      activity, history_flag, smoking, hypertension, heart_disease, bmi,
      cluster, risk_score, model_version, dataset_hash, validation_status
    ) VALUES
      (v_patient_id, 96.2, 5.4, 190, 105, 62, 115, 122, 78, 'moderate', true, 'never', 'controlled', 'no', 24.7,
       'low_risk', 22, 'v0-mock', 'mock_dataset_v1', 'well controlled'),
      (v_patient_id, 93.5, 5.3, 185, 100, 65, 110, 120, 76, 'moderate', true, 'never', 'controlled', 'no', 24.4,
       'low_risk', 18, 'v0-mock', 'mock_dataset_v1', 'excellent control');

    -- Add model runs for tracking (only if they don't exist)
    IF NOT EXISTS (SELECT 1 FROM model_runs WHERE model_version = 'v0-mock') THEN
      INSERT INTO model_runs (model_version, dataset_hash, notes) VALUES
        ('v0-mock', 'mock_dataset_v1', 'Mock model for development and testing'),
        ('v0-placeholder', 'test_dataset', 'Placeholder model version for initial deployment');
    END IF;

    -- Add some audit events (only if they don't exist)
    IF NOT EXISTS (SELECT 1 FROM audit_events WHERE actor = 'demo@diana.app' AND action = 'login') THEN
      INSERT INTO audit_events (actor, action, target_type, target_id, details) VALUES
        ('demo@diana.app', 'login', 'user', v_demo_user_id, '{"ip": "127.0.0.1", "user_agent": "mock"}'),
        ('clinician@example.com', 'create_patient', 'patient', (SELECT id FROM patients WHERE name = 'Sarah Johnson' LIMIT 1), '{"patient_name": "Sarah Johnson"}'),
        ('clinician@example.com', 'create_assessment', 'assessment', (SELECT id FROM assessments WHERE patient_id = (SELECT id FROM patients WHERE name = 'Sarah Johnson' LIMIT 1) LIMIT 1), '{"patient_id": 1, "risk_score": 15}'),
        ('admin@diana.app', 'export_data', 'system', NULL, '{"export_type": "patients", "count": 10}'),
        ('researcher@diana.app', 'view_analytics', 'system', NULL, '{"report_type": "cluster_distribution"}');
    END IF;
  END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- Remove mock data (keep schema)
DELETE FROM audit_events WHERE actor IN ('demo@diana.app', 'clinician@example.com', 'admin@diana.app', 'researcher@diana.app');
DELETE FROM model_runs WHERE model_version IN ('v0-mock', 'v0-placeholder');
DELETE FROM assessments WHERE model_version = 'v0-mock';
DELETE FROM patients WHERE name IN (
  'Sarah Johnson', 'Maria Rodriguez', 'Jennifer Wang', 'Lisa Thompson', 'Carmen Silva',
  'Patricia Davis', 'Rachel Kim', 'Diana Martinez', 'Amy Chen', 'Michelle Brown'
);
DELETE FROM users WHERE email IN (
  'demo@diana.app', 'clinician@example.com', 'admin@diana.app', 'researcher@diana.app'
);
