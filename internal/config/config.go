package config

import (
	"log"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port          string
	Env           string
	DBDSN         string
	JWTSecret     string
	CORSOrigins   []string
	ModelURL      string
	ModelVersion  string
	ExportMaxRows int
}

func Load() Config {
	cfg := Config{
		Port:         getEnv("PORT", "8080"),
		Env:          getEnv("ENV", "dev"),
		DBDSN:        getEnv("DB_DSN", ""),
		JWTSecret:    getEnv("JWT_SECRET", "dev-secret"),
		ModelURL:     getEnv("MODEL_URL", ""),
		ModelVersion: getEnv("MODEL_VERSION", "v0-placeholder"),
	}
	cfg.CORSOrigins = splitAndTrim(getEnv("CORS_ORIGINS", "http://localhost:3000"))
	if v := os.Getenv("EXPORT_MAX_ROWS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.ExportMaxRows = n
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
