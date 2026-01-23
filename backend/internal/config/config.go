package config

import (
	"log"
	"os"
	"strconv"
	"strings"
)

type ClinicalThresholds struct {
	HbA1cNormal             float64
	HbA1cPrediabetic        float64
	HbA1cDiabetic           float64
	FBSNormal               float64
	FBSPrediabetic          float64
	FBSDiabetic             float64
	BPSysNormal             int
	BPSysElevated           int
	BPDiaNormal             int
	BMINormal               float64
	BMIOverweight           float64
	BMIObese                float64
	CholesterolHigh         float64
	CholesterolBorderline   float64
	LDLHigh                 float64
	LDLBorderline           float64
	HDLLow                  float64
	TriglyceridesHigh       float64
	TriglyceridesBorderline float64
}

type Config struct {
	Port               string
	Env                string
	DBDSN              string
	JWTSecret          string
	CORSOrigins        []string
	ModelURL           string
	ModelVersion       string
	DatasetHash        string
	ModelTimeoutMS     int
	ExportMaxRows      int
	RedisAddr          string
	RedisPassword      string
	RedisDB            int
	ClinicalThresholds ClinicalThresholds
}

func Load() Config {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		env := getEnv("ENV", "dev")
		if env != "local" {
			log.Fatalf("JWT_SECRET environment variable is required in %s. Cannot start without it.", env)
		}
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
		RedisAddr:      getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:  getEnv("REDIS_PASSWORD", ""),
		RedisDB:        0,
	}
	cfg.CORSOrigins = splitAndTrim(getEnv("CORS_ORIGINS", "http://localhost:4000,http://localhost:3000,http://localhost:3001"))
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

	cfg.ClinicalThresholds = ClinicalThresholds{
		HbA1cNormal:             getEnvFloat("CLINICAL_HBA1C_NORMAL", 5.7),
		HbA1cPrediabetic:        getEnvFloat("CLINICAL_HBA1C_PREDIABETIC", 6.5),
		HbA1cDiabetic:           getEnvFloat("CLINICAL_HBA1C_DIABETIC", 6.5),
		FBSNormal:               getEnvFloat("CLINICAL_FBS_NORMAL", 100),
		FBSPrediabetic:          getEnvFloat("CLINICAL_FBS_PREDIABETIC", 126),
		FBSDiabetic:             getEnvFloat("CLINICAL_FBS_DIABETIC", 126),
		BPSysNormal:             getEnvInt("CLINICAL_BP_SYS_NORMAL", 120),
		BPSysElevated:           getEnvInt("CLINICAL_BP_SYS_ELEVATED", 140),
		BPDiaNormal:             getEnvInt("CLINICAL_BP_DIA_NORMAL", 80),
		BMINormal:               getEnvFloat("CLINICAL_BMI_NORMAL", 25.0),
		BMIOverweight:           getEnvFloat("CLINICAL_BMI_OVERWEIGHT", 30.0),
		BMIObese:                getEnvFloat("CLINICAL_BMI_OBESE", 30.0),
		CholesterolHigh:         getEnvFloat("CLINICAL_CHOLESTEROL_HIGH", 200),
		CholesterolBorderline:   getEnvFloat("CLINICAL_CHOLESTEROL_BORDERLINE", 200),
		LDLHigh:                 getEnvFloat("CLINICAL_LDL_HIGH", 100),
		LDLBorderline:           getEnvFloat("CLINICAL_LDL_BORDERLINE", 100),
		HDLLow:                  getEnvFloat("CLINICAL_HDL_LOW", 40),
		TriglyceridesHigh:       getEnvFloat("CLINICAL_TRIGLYCERIDES_HIGH", 150),
		TriglyceridesBorderline: getEnvFloat("CLINICAL_TRIGLYCERIDES_BORDERLINE", 150),
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

func getEnvFloat(key string, def float64) float64 {
	if v := os.Getenv(key); v != "" {
		f, err := strconv.ParseFloat(v, 64)
		if err == nil {
			return f
		}
		log.Printf("[CONFIG] Failed to parse %s=%s, using default %v", key, v, def)
	}
	return def
}

func getEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.Atoi(v)
		if err == nil {
			return n
		}
		log.Printf("[CONFIG] Failed to parse %s=%s, using default %v", key, v, def)
	}
	return def
}
