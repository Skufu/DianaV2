package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	// Clear environment
	os.Unsetenv("PORT")
	os.Unsetenv("ENV")
	os.Unsetenv("JWT_SECRET")
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
	os.Setenv("EXPORT_MAX_ROWS", "not-a-number")
	os.Setenv("MODEL_TIMEOUT_MS", "invalid")
	defer func() {
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
