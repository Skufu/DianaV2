package config

import (
	"log"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port           string
	Env            string
	DBDSN          string
	JWTSecret      string
	CORSOrigins    []string
	ModelURL       string
	ModelVersion   string
	DatasetHash    string
	ModelTimeoutMS int
	ExportMaxRows  int
}

func Load() Config {
	// Require JWT_SECRET in production
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		env := getEnv("ENV", "dev")
		if env == "production" || env == "prod" {
			log.Fatal("JWT_SECRET is required in production")
		}
		// Only allow default in dev
		jwtSecret = "dev-secret-change-in-production"
		log.Println("WARNING: Using default JWT secret. Set JWT_SECRET environment variable!")
	}

	cfg := Config{
		Port:           getEnv("PORT", "8080"),
		Env:            getEnv("ENV", "dev"),
		DBDSN:          getEnv("DB_DSN", ""),
		JWTSecret:      jwtSecret,
		ModelURL:       getEnv("MODEL_URL", ""),
		ModelVersion:   getEnv("MODEL_VERSION", "v0-placeholder"),
		DatasetHash:    getEnv("MODEL_DATASET_HASH", ""),
		ModelTimeoutMS: 2000,
	}
	cfg.CORSOrigins = splitAndTrim(getEnv("CORS_ORIGINS", "http://localhost:3000"))
	if v := os.Getenv("EXPORT_MAX_ROWS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.ExportMaxRows = n
		}
	}
	if v := os.Getenv("MODEL_TIMEOUT_MS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cfg.ModelTimeoutMS = n
		}
	}
	if cfg.ExportMaxRows == 0 {
		cfg.ExportMaxRows = 5000
	}
	return cfg
}

func getEnv(key, def string) string {
	val := os.Getenv(key)
	if val == "" {
		return def
	}
	return val
}

func splitAndTrim(v string) []string {
	parts := strings.Split(v, ",")
	var out []string
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func MustEnv(keys ...string) {
	for _, k := range keys {
		if os.Getenv(k) == "" {
			log.Fatalf("missing required env: %s", k)
		}
	}
}
