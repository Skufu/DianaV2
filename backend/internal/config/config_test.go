package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret")
	defer os.Unsetenv("JWT_SECRET")

	os.Unsetenv("PORT")
	os.Unsetenv("ENV")
	os.Unsetenv("CORS_ORIGINS")
	os.Unsetenv("EXPORT_MAX_ROWS")
	os.Unsetenv("MODEL_TIMEOUT_MS")

	cfg := Load()

	if cfg.Port != "8080" {
		t.Errorf("Port = %q, want %q", cfg.Port, "8080")
	}
	if cfg.Env != "dev" {
		t.Errorf("Env = %q, want %q", cfg.Env, "dev")
	}
	if cfg.JWTSecret != "test-secret" {
		t.Errorf("JWTSecret = %q, want %q", cfg.JWTSecret, "test-secret")
	}
	if cfg.ExportMaxRows != 5000 {
		t.Errorf("ExportMaxRows = %d, want 5000", cfg.ExportMaxRows)
	}
	if cfg.ModelTimeoutMS != 2000 {
		t.Errorf("ModelTimeoutMS = %d, want 2000", cfg.ModelTimeoutMS)
	}
}

func TestLoad_CustomValues(t *testing.T) {
	os.Setenv("PORT", "3000")
	os.Setenv("ENV", "staging")
	os.Setenv("JWT_SECRET", "my-secret")
	os.Setenv("CORS_ORIGINS", "https://app.example.com, https://admin.example.com")
	os.Setenv("EXPORT_MAX_ROWS", "1000")
	os.Setenv("MODEL_TIMEOUT_MS", "5000")
	os.Setenv("MODEL_URL", "http://ml:8001/predict")
	os.Setenv("MODEL_VERSION", "v2.0")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("ENV")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("CORS_ORIGINS")
		os.Unsetenv("EXPORT_MAX_ROWS")
		os.Unsetenv("MODEL_TIMEOUT_MS")
		os.Unsetenv("MODEL_URL")
		os.Unsetenv("MODEL_VERSION")
	}()

	cfg := Load()

	if cfg.Port != "3000" {
		t.Errorf("Port = %q, want %q", cfg.Port, "3000")
	}
	if cfg.Env != "staging" {
		t.Errorf("Env = %q, want %q", cfg.Env, "staging")
	}
	if cfg.JWTSecret != "my-secret" {
		t.Errorf("JWTSecret = %q, want %q", cfg.JWTSecret, "my-secret")
	}
	if cfg.ExportMaxRows != 1000 {
		t.Errorf("ExportMaxRows = %d, want 1000", cfg.ExportMaxRows)
	}
	if cfg.ModelTimeoutMS != 5000 {
		t.Errorf("ModelTimeoutMS = %d, want 5000", cfg.ModelTimeoutMS)
	}
	if cfg.ModelURL != "http://ml:8001/predict" {
		t.Errorf("ModelURL = %q, want %q", cfg.ModelURL, "http://ml:8001/predict")
	}
	if cfg.ModelVersion != "v2.0" {
		t.Errorf("ModelVersion = %q, want %q", cfg.ModelVersion, "v2.0")
	}
	if len(cfg.CORSOrigins) != 2 {
		t.Errorf("CORSOrigins length = %d, want 2", len(cfg.CORSOrigins))
	}
	if cfg.CORSOrigins[0] != "https://app.example.com" {
		t.Errorf("CORSOrigins[0] = %q, want %q", cfg.CORSOrigins[0], "https://app.example.com")
	}
}

func TestGetEnv(t *testing.T) {
	os.Setenv("TEST_KEY", "test-value")
	defer os.Unsetenv("TEST_KEY")

	if v := getEnv("TEST_KEY", "default"); v != "test-value" {
		t.Errorf("getEnv = %q, want %q", v, "test-value")
	}
	if v := getEnv("NONEXISTENT_KEY", "default"); v != "default" {
		t.Errorf("getEnv = %q, want %q", v, "default")
	}
}

func TestSplitAndTrim(t *testing.T) {
	tests := []struct {
		input string
		want  []string
	}{
		{"a,b,c", []string{"a", "b", "c"}},
		{" a , b , c ", []string{"a", "b", "c"}},
		{"single", []string{"single"}},
		{"", nil},
		{" , , ", nil},
	}

	for _, tt := range tests {
		got := splitAndTrim(tt.input)
		if len(got) != len(tt.want) {
			t.Errorf("splitAndTrim(%q) len = %d, want %d", tt.input, len(got), len(tt.want))
			continue
		}
		for i := range got {
			if got[i] != tt.want[i] {
				t.Errorf("splitAndTrim(%q)[%d] = %q, want %q", tt.input, i, got[i], tt.want[i])
			}
		}
	}
}

func TestLoad_InvalidNumbers(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-for-invalid-numbers-test")
	os.Setenv("EXPORT_MAX_ROWS", "not-a-number")
	os.Setenv("MODEL_TIMEOUT_MS", "invalid")
	defer func() {
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("EXPORT_MAX_ROWS")
		os.Unsetenv("MODEL_TIMEOUT_MS")
	}()

	cfg := Load()

	// Should fall back to defaults
	if cfg.ExportMaxRows != 5000 {
		t.Errorf("ExportMaxRows = %d, want 5000 (default)", cfg.ExportMaxRows)
	}
	if cfg.ModelTimeoutMS != 2000 {
		t.Errorf("ModelTimeoutMS = %d, want 2000 (default)", cfg.ModelTimeoutMS)
	}
}

func TestConfigLoad_MissingJWTSecret_LocalAllowed(t *testing.T) {
	os.Unsetenv("JWT_SECRET")
	os.Setenv("ENV", "local")
	defer func() {
		os.Unsetenv("ENV")
	}()

	cfg := Load()

	if cfg.JWTSecret == "" {
		t.Errorf("JWTSecret should not be empty in local (should use default)")
	}
	if cfg.JWTSecret != "dev-secret-change-in-production" {
		t.Errorf("JWTSecret = %q, want default fallback", cfg.JWTSecret)
	}
}

func TestConfigLoad_ClinicalThresholdsDefaults(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret")
	defer os.Unsetenv("JWT_SECRET")

	os.Unsetenv("CLINICAL_HBA1C_NORMAL")
	os.Unsetenv("CLINICAL_HBA1C_PREDIABETIC")
	os.Unsetenv("CLINICAL_HBA1C_DIABETIC")
	os.Unsetenv("CLINICAL_FBS_NORMAL")
	os.Unsetenv("CLINICAL_FBS_PREDIABETIC")
	os.Unsetenv("CLINICAL_FBS_DIABETIC")
	os.Unsetenv("CLINICAL_BP_SYS_NORMAL")
	os.Unsetenv("CLINICAL_BP_SYS_ELEVATED")
	os.Unsetenv("CLINICAL_BP_DIA_NORMAL")
	os.Unsetenv("CLINICAL_BMI_NORMAL")
	os.Unsetenv("CLINICAL_BMI_OVERWEIGHT")
	os.Unsetenv("CLINICAL_BMI_OBESE")
	os.Unsetenv("CLINICAL_CHOLESTEROL_HIGH")
	os.Unsetenv("CLINICAL_CHOLESTEROL_BORDERLINE")
	os.Unsetenv("CLINICAL_LDL_HIGH")
	os.Unsetenv("CLINICAL_LDL_BORDERLINE")
	os.Unsetenv("CLINICAL_HDL_LOW")
	os.Unsetenv("CLINICAL_TRIGLYCERIDES_HIGH")
	os.Unsetenv("CLINICAL_TRIGLYCERIDES_BORDERLINE")

	cfg := Load()

	if cfg.ClinicalThresholds.HbA1cNormal != 5.7 {
		t.Errorf("HbA1cNormal = %v, want 5.7", cfg.ClinicalThresholds.HbA1cNormal)
	}
	if cfg.ClinicalThresholds.HbA1cPrediabetic != 6.5 {
		t.Errorf("HbA1cPrediabetic = %v, want 6.5", cfg.ClinicalThresholds.HbA1cPrediabetic)
	}
	if cfg.ClinicalThresholds.HbA1cDiabetic != 6.5 {
		t.Errorf("HbA1cDiabetic = %v, want 6.5", cfg.ClinicalThresholds.HbA1cDiabetic)
	}
	if cfg.ClinicalThresholds.FBSNormal != 100 {
		t.Errorf("FBSNormal = %v, want 100", cfg.ClinicalThresholds.FBSNormal)
	}
	if cfg.ClinicalThresholds.FBSPrediabetic != 100 {
		t.Errorf("FBSPrediabetic = %v, want 100", cfg.ClinicalThresholds.FBSPrediabetic)
	}
if cfg.ClinicalThresholds.FBSDiabetic != 126 {
t.Errorf("FBSDiabetic = %v, want 126", cfg.ClinicalThresholds.FBSDiabetic)
	}
	if cfg.ClinicalThresholds.BPSysNormal != 120 {
		t.Errorf("BPSysNormal = %d, want 120", cfg.ClinicalThresholds.BPSysNormal)
	}
	if cfg.ClinicalThresholds.BPSysElevated != 140 {
		t.Errorf("BPSysElevated = %d, want 140", cfg.ClinicalThresholds.BPSysElevated)
	}
	if cfg.ClinicalThresholds.BPDiaNormal != 80 {
		t.Errorf("BPDiaNormal = %d, want 80", cfg.ClinicalThresholds.BPDiaNormal)
	}
	if cfg.ClinicalThresholds.BMINormal != 18.5 {
		t.Errorf("BMINormal = %v, want 18.5", cfg.ClinicalThresholds.BMINormal)
	}
	if cfg.ClinicalThresholds.BMIOverweight != 23.0 {
		t.Errorf("BMIOverweight = %v, want 23.0", cfg.ClinicalThresholds.BMIOverweight)
	}
	if cfg.ClinicalThresholds.BMIObese != 25.0 {
		t.Errorf("BMIObese = %v, want 25.0", cfg.ClinicalThresholds.BMIObese)
	}
	if cfg.ClinicalThresholds.CholesterolHigh != 200 {
		t.Errorf("CholesterolHigh = %v, want 200", cfg.ClinicalThresholds.CholesterolHigh)
	}
	if cfg.ClinicalThresholds.CholesterolBorderline != 200 {
		t.Errorf("CholesterolBorderline = %v, want 200", cfg.ClinicalThresholds.CholesterolBorderline)
	}
	if cfg.ClinicalThresholds.LDLHigh != 100 {
		t.Errorf("LDLHigh = %v, want 100", cfg.ClinicalThresholds.LDLHigh)
	}
	if cfg.ClinicalThresholds.LDLBorderline != 100 {
		t.Errorf("LDLBorderline = %v, want 100", cfg.ClinicalThresholds.LDLBorderline)
	}
	if cfg.ClinicalThresholds.HDLLow != 40 {
		t.Errorf("HDLLow = %v, want 40", cfg.ClinicalThresholds.HDLLow)
	}
	if cfg.ClinicalThresholds.TriglyceridesHigh != 150 {
		t.Errorf("TriglyceridesHigh = %v, want 150", cfg.ClinicalThresholds.TriglyceridesHigh)
	}
	if cfg.ClinicalThresholds.TriglyceridesBorderline != 150 {
		t.Errorf("TriglyceridesBorderline = %v, want 150", cfg.ClinicalThresholds.TriglyceridesBorderline)
	}
}

func TestConfigLoad_ClinicalThresholdsFromEnv(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret")
	defer func() {
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("CLINICAL_HBA1C_NORMAL")
		os.Unsetenv("CLINICAL_HBA1C_PREDIABETIC")
		os.Unsetenv("CLINICAL_FBS_NORMAL")
	}()

	os.Setenv("CLINICAL_HBA1C_NORMAL", "6.0")
	os.Setenv("CLINICAL_HBA1C_PREDIABETIC", "6.8")
	os.Setenv("CLINICAL_FBS_NORMAL", "110")

	cfg := Load()

	if cfg.ClinicalThresholds.HbA1cNormal != 6.0 {
		t.Errorf("HbA1cNormal = %v, want 6.0", cfg.ClinicalThresholds.HbA1cNormal)
	}
	if cfg.ClinicalThresholds.HbA1cPrediabetic != 6.8 {
		t.Errorf("HbA1cPrediabetic = %v, want 6.8", cfg.ClinicalThresholds.HbA1cPrediabetic)
	}
	if cfg.ClinicalThresholds.FBSNormal != 110 {
		t.Errorf("FBSNormal = %v, want 110", cfg.ClinicalThresholds.FBSNormal)
	}
}
