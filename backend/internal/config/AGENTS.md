# CONFIG KNOWLEDGE BASE

**Directory**: `backend/internal/config`  
**Generated:** 2026-02-26  
**Commit:** 53f470c  
**Branch:** main

## OVERVIEW
Environment configuration management with validation, defaults, and clinical thresholds for the DIANA diabetes risk assessment platform.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Config loading | `config.go` | `Load()` function initializes all configuration |
| Required env vars | `config.go:137-143` | `MustEnv()` validates critical variables |
| Clinical thresholds | `config.go:93-113` | Biomarker thresholds (HbA1c, FBS, BMI, lipids) |
| Helper functions | `config.go:117-165` | `getEnv`, `getEnvFloat`, `getEnvInt`, `splitAndTrim` |

## CONFIGURATION STRUCTURE

### Core Config Fields
```go
type Config struct {
    Port           string    // Server port (default: 8080)
    Env            string    // Environment: dev, local, test, prod
    DBDSN          string    // PostgreSQL connection string
    JWTSecret      string    // JWT signing key (required in prod)
    CORSOrigins    []string  // Allowed CORS origins
    ModelURL       string    // ML server URL (empty = mock mode)
    ModelVersion   string    // Model version tag (default: binary_v2_no_bp)
    DatasetHash    string    // Training dataset hash for lineage
    MLAPIKey       string    // ML service API key
    ModelTimeoutMS int       // ML request timeout (default: 2000ms)
    ExportMaxRows  int       // CSV export limit (default: 5000)
    RedisAddr      string    // Redis address (default: localhost:6379)
    RedisPassword  string    // Redis password
    RedisDB        int       // Redis database number
    ClinicalThresholds ClinicalThresholds  // Biomarker ranges
}
```

### Clinical Thresholds
Biomarker ranges used for validation and risk assessment:

| Biomarker | Normal | Prediabetic/High | Diabetic |
|-----------|--------|------------------|----------|
| HbA1c (%) | < 5.7 | 5.7-6.4 | ≥ 6.5 |
| FBS (mg/dL) | < 100 | 100-125 | ≥ 126 |
| BMI (kg/m²) | < 23 | 23-25 | ≥ 25 (Asia-Pacific WHO) |
| Systolic BP (mmHg) | < 120 | 120-139 | ≥ 140 |
| Cholesterol (mg/dL) | < 200 | 200 | - |
| LDL (mg/dL) | < 100 | 100 | - |
| HDL (mg/dL) | ≥ 40 | < 40 | - |
| Triglycerides (mg/dL) | < 150 | 150 | - |

## ENVIRONMENT VARIABLES

### Required
| Variable | Description | Fatal if Missing |
|----------|-------------|------------------|
| `JWT_SECRET` | JWT signing key (min 32 chars) | Yes (except local/test) |

### Database
| Variable | Default | Description |
|----------|---------|-------------|
| `DB_DSN` | - | PostgreSQL connection string |

### ML Service
| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_URL` | - | ML server endpoint (empty = mock mode) |
| `MODEL_VERSION` | binary_v2_no_bp | Model version identifier |
| `MODEL_DATASET_HASH` | - | Dataset lineage hash |
| `ML_API_KEY` | - | ML service authentication |
| `MODEL_TIMEOUT_MS` | 2000 | Request timeout in milliseconds |

### Redis
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_ADDR` | localhost:6379 | Redis server address |
| `REDIS_PASSWORD` | - | Redis password |
| `REDIS_DB` | 0 | Redis database number |

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | HTTP server port |
| `ENV` | dev | Environment name |
| `CORS_ORIGINS` | http://localhost:4000,... | Comma-separated allowed origins |
| `EXPORT_MAX_ROWS` | 5000 | Maximum CSV export rows |

### Clinical Overrides
| Variable | Default | Description |
|----------|---------|-------------|
| `CLINICAL_HBA1C_NORMAL` | 5.7 | HbA1c normal threshold |
| `CLINICAL_HBA1C_PREDIABETIC` | 6.5 | HbA1c prediabetic threshold |
| `CLINICAL_FBS_NORMAL` | 100 | FBS normal threshold |
| `CLINICAL_FBS_PREDIABETIC` | 126 | FBS prediabetic threshold |
| `CLINICAL_BP_SYS_NORMAL` | 120 | Systolic BP normal |
| `CLINICAL_BP_SYS_ELEVATED` | 140 | Systolic BP elevated |
| `CLINICAL_BMI_NORMAL` | 23.0 | BMI normal (Asia-Pacific) |
| `CLINICAL_BMI_OVERWEIGHT` | 25.0 | BMI overweight (Asia-Pacific) |
| `CLINICAL_CHOLESTEROL_HIGH` | 200 | Cholesterol high threshold |
| `CLINICAL_LDL_HIGH` | 100 | LDL high threshold |
| `CLINICAL_HDL_LOW` | 40 | HDL low threshold |
| `CLINICAL_TRIGLYCERIDES_HIGH` | 150 | Triglycerides high threshold |

## CONVENTIONS

### Environment Loading Pattern
```go
func Load() Config {
    env := getEnv("ENV", "dev")
    jwtSecret := os.Getenv("JWT_SECRET")
    if jwtSecret == "" {
        switch env {
        case "local":
            jwtSecret = "dev-secret-change-in-production"
        case "test":
            jwtSecret = "test-secret"
        default:
            log.Fatalf("FATAL: JWT_SECRET environment variable is required...")
        }
    }
    // ... build and return Config
}
```

### Helper Functions
- **`getEnv(key, def)`**: String with default fallback
- **`getEnvFloat(key, def)`**: Parse float with default
- **`getEnvInt(key, def)`**: Parse int with default
- **`splitAndTrim(s)`**: Comma-split with whitespace trim
- **`MustEnv(keys...)`**: Fatal if any key missing

### Clinical Threshold Notes
- Uses **Asia-Pacific WHO BMI thresholds** (23/25 vs US 25/30)
- Thresholds are **configurable via environment** for different populations
- Defaults align with **ADA (American Diabetes Association)** guidelines

## ANTI-PATTERNS (THIS PROJECT)

### Configuration
- **Hardcoded values**: All configuration must use environment variables with defaults
- **Missing validation**: Required vars must use `MustEnv()` or explicit checks
- **Silent failures**: Invalid numeric values log warnings but use defaults

### Security
- **JWT_SECRET in local dev**: Falls back to dev-secret only in local/test env
- **ML_API_KEY optional**: Development can run without ML auth (production requires it)

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Config | struct | config.go | server, handlers | Configuration container |
| ClinicalThresholds | struct | config.go | validation | Biomarker ranges |
| Load | func | config.go | server | Main config loader |
| MustEnv | func | config.go | - | Required env validator |
| getEnv | func | config.go | Load | String with default |
| getEnvFloat | func | config.go | Load | Float parser |
| getEnvInt | func | config.go | Load | Int parser |
| splitAndTrim | func | config.go | Load | CORS origin parser |

## NOTES

### JWT Secret Handling
- **Production**: `JWT_SECRET` is **required** - server will not start without it
- **Local dev**: Falls back to hardcoded dev-secret (insecure but convenient)
- **Test**: Uses test-secret for reproducibility

### Mock Mode
When `MODEL_URL` is empty:
- Backend uses `MockPredictor` instead of HTTP client
- No external ML service calls
- Deterministic rule-based predictions for development

### Asia-Pacific BMI Thresholds
The clinical thresholds use WHO Asia-Pacific criteria:
- Normal: BMI < 23
- Overweight: BMI 23-24.9
- Obese: BMI ≥ 25

This differs from Western thresholds (25/30) to better reflect diabetes risk in Asian populations.

### Environment Precedence
1. Explicit environment variable
2. Default value in code
3. Fatal error (for JWT_SECRET in production)
