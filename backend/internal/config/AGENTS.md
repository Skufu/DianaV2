# CONFIG KNOWLEDGE BASE

**Directory**: `backend/internal/config/`

## OVERVIEW
Configuration management using environment variables with validation and defaults.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Configuration | `config.go` | Environment variable loading with defaults |
| Configuration tests | `config_test.go` | Unit tests for config loading |

## CONFIG STRUCTURE

```go
type Config struct {
    Port           string    // HTTP server port
    Env            string    // Environment: dev, staging, production
    DBDSN          string    // Database connection string
    JWTSecret      string    // JWT signing secret (required in production)
    CORSOrigins    []string  // Allowed CORS origins
    ModelURL       string    // ML server URL (empty = mock mode)
    ModelVersion   string    // Model version for tracking
    DatasetHash    string    // Dataset hash for model lineage
    ModelTimeoutMS int       // ML request timeout (ms)
    ExportMaxRows  int       // Max rows for CSV export
}
```

## ENVIRONMENT VARIABLES

| Variable | Default | Required | Description |
|----------|---------|-----------|-------------|
| `ENV` | `dev` | No | Environment: `dev`, `staging`, `production`, `prod` |
| `PORT` | `8080` | No | HTTP server port |
| `DB_DSN` | `""` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | `dev-secret-change-in-production` | Yes (prod) | JWT signing secret |
| `CORS_ORIGINS` | `http://localhost:4000,http://localhost:3000,http://localhost:3001` | No | Comma-separated allowed origins |
| `MODEL_URL` | `""` | No | ML server URL (empty = mock mode) |
| `MODEL_VERSION` | `v0-placeholder` | No | Model version identifier |
| `MODEL_DATASET_HASH` | `""` | No | Dataset hash for lineage tracking |
| `MODEL_TIMEOUT_MS` | `2000` | No | ML request timeout in milliseconds |
| `EXPORT_MAX_ROWS` | `5000` | No | Max rows for CSV export |

## CONVENTIONS

### Validation Strategy
- **Required in production**: `JWT_SECRET` required when `ENV=production` or `prod`
- **Log warning**: Default JWT secret used in non-production
- **Fatal on missing**: `MustEnv()` kills process if required env missing

### Helper Functions
```go
// Get env var with default
getEnv("KEY", "default") // Returns default if not set

// Split comma-separated and trim whitespace
splitAndTrim("a,b,c") // Returns []string{"a", "b", "c"}

// Fatal if required env missing
MustEnv("REQUIRED_KEY") // Calls log.Fatalf if missing
```

### CORS Configuration
```go
CORS_ORIGINS="http://localhost:4000,http://localhost:3000,http://localhost:3001"
```

Splits on comma and trims whitespace.

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Config | struct | config.go | router, server | Main configuration struct |
| Load | func | config.go | server | Load and validate configuration |
| getEnv | func | config.go | Load | Get env var with default |
| splitAndTrim | func | config.go | Load | Parse comma-separated list |
| MustEnv | func | config.go | Load | Validate required env vars |

## ANTI-PATTERNS (THIS PROJECT)

### Security Issues
- **Default JWT secret**: In non-production, uses `"dev-secret-change-in-production"`
- **Hardcoded CORS**: Frontend URLs are hardcoded in default value
- **No validation**: DB_DSN is not validated (empty connection string accepted)

### Technical Debt
- **No config file support**: Only environment variables (no .env, config.yaml)
- **No secret management**: Secrets in plain environment variables (no vault integration)
- **No environment validation**: No validation that DB_DSN is valid connection string
- **Missing TLS config**: No HTTPS/TLS configuration options
- **No log level config**: Always uses default Go log (no DEBUG/INFO/ERROR levels)

### Refactoring Needed
1. **Add config file support**: Load from `.env` or `config.yaml` in development
2. **Environment validation**: Validate DB_DSN format, required fields presence
3. **Secret management**: Integrate with HashiCorp Vault or AWS Secrets Manager
4. **Log configuration**: Add LOG_LEVEL environment variable
5. **TLS configuration**: Add HTTPS/cert configuration options
6. **Health check config**: Add health check timeout/retry configuration
7. **Graceful shutdown**: Add shutdown timeout configuration

## NOTES

### Production Requirements
- `JWT_SECRET` MUST be set in production
- `DB_DSN` MUST be valid PostgreSQL connection string
- `CORS_ORIGINS` MUST include all frontend domains

### Mock ML Mode
When `MODEL_URL` is empty or not set:
- Backend uses `MockPredictor` instead of `HTTPPredictor`
- No external HTTP calls to ML server
- Useful for local development

### Model Configuration
- `ModelVersion` tracked for audit trail
- `DatasetHash` for data lineage (which training dataset)
- `ModelTimeoutMS` controls request timeout (default 2000ms)

### Export Configuration
- `ExportMaxRows` limits CSV export size (default 5000)
- Prevents export of massive datasets causing memory issues

## TODO

- [ ] Add config file support (.env / config.yaml)
- [ ] Add environment validation (DB_DSN format, required fields)
- [ ] Add log level configuration (DEBUG, INFO, ERROR)
- [ ] Add TLS/HTTPS configuration
- [ ] Integrate secret management (Vault, Secrets Manager)
- [ ] Add health check timeout configuration
- [ ] Add graceful shutdown timeout configuration
- [ ] Split CORS origins by environment (dev vs production)
