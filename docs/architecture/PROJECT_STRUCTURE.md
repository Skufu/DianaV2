# Project Structure

This document outlines the organizational structure of the Diana V2 codebase.

## Directory Layout

```
DIANA V2/
├── build/                      # Build artifacts and containerization
│   └── Dockerfile             # Container configuration
├── cmd/                       # Main applications
│   ├── server/                # API server entrypoint
│   │   └── main.go
│   └── seed/                  # Database seeding utility
│       └── main.go
├── configs/                   # Configuration file templates
│   ├── env.example            # Environment variables template
│   └── .env.local.example     # Local development overrides template
├── docs/                      # Documentation
│   ├── architecture/          # Architecture and system design docs
│   │   ├── ARCHITECTURE.md    # System architecture documentation
│   │   └── PROJECT_STRUCTURE.md # This file
│   ├── dev/                   # Developer guides and historical plans
│   │   ├── CLAUDE.md          # Claude Code documentation
│   │   ├── frontendplan.md    # Frontend development plan
│   │   ├── frontendplan-root.md # Historical root-level frontend plan
│   │   ├── plan.md            # Project development plan
│   │   ├── plan-root.md       # Historical root-level project plan
│   │   └── TROUBLESHOOTING.md # Common issues and solutions
│   ├── ml-api-contract.md     # ML API contract specification
│   └── ops/                   # Deployment and operations docs
│       ├── deployment.md      # Primary deployment instructions
│       ├── deployment-internal.md # Internal/legacy deployment notes
│       └── logging-improvements.md # Logging and observability improvements
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.jsx           # Main application component
│   │   ├── api.js            # API client
│   │   ├── index.css         # Global styles
│   │   └── main.jsx          # Application entrypoint
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── internal/                  # Private application code
│   ├── config/                # Configuration management
│   │   └── config.go
│   ├── http/                  # HTTP layer
│   │   ├── handlers/          # HTTP request handlers
│   │   │   ├── analytics.go
│   │   │   ├── assessments.go
│   │   │   ├── auth.go
│   │   │   ├── export.go
│   │   │   ├── health.go
│   │   │   ├── patients.go
│   │   │   └── utils.go
│   │   ├── middleware/        # HTTP middleware
│   │   │   ├── auth.go        # JWT authentication
│   │   │   └── logger.go      # Request logging and tracing
│   │   └── router/            # Route configuration
│   │       └── router.go
│   ├── ml/                    # Machine learning integration
│   │   ├── http_predictor.go  # HTTP-based ML predictor
│   │   ├── mock.go           # Mock predictor for development
│   │   └── README.md
│   ├── models/                # Domain models and DTOs
│   │   └── types.go
│   └── store/                 # Data access layer
│       ├── postgres.go        # PostgreSQL implementation
│       ├── queries/           # SQL query definitions
│       │   ├── assessments.sql
│       │   ├── patients.sql
│       │   └── users.sql
│       ├── sqlc/              # Generated query code
│       └── store.go           # Storage interfaces
├── migrations/                # Database migrations
│   ├── 0001_init.sql
│   └── 0002_add_family_history_and_phys_activity.sql
├── scripts/                   # Development and operational scripts
│   ├── debug-neon.sh         # Database connectivity debugging
│   ├── dev-setup.sh          # Initial development setup
│   ├── run-dev.sh            # Full-stack development runner
│   └── test-db.sh            # Database connection testing
├── .env.example              # Example environment variables
├── .env.local.example        # Example local overrides
├── .gitignore               # Git ignore patterns
├── go.mod                   # Go module definition
├── go.sum                   # Go module checksums
├── Makefile                 # Build and development commands
├── README.md                # Project overview and quickstart
└── sqlc.yaml                # SQLC configuration
```

## Architecture Layers

### 1. Presentation Layer (`frontend/`, `internal/http/`)
- **Frontend**: React 18 with Vite build system
- **API Layer**: Gin HTTP framework with structured routing
- **Middleware**: Authentication, logging, CORS, request tracing

### 2. Business Logic Layer (`internal/`)
- **Handlers**: HTTP request processing and response formatting
- **Models**: Domain objects and data transfer objects
- **ML Integration**: Pluggable machine learning prediction system

### 3. Data Access Layer (`internal/store/`, `migrations/`)
- **Store**: Repository pattern with interface-based design
- **Database**: PostgreSQL with migration management
- **Queries**: SQLC for type-safe SQL query generation

### 4. Infrastructure Layer (`build/`, `scripts/`, `configs/`)
- **Containerization**: Docker-based deployment
- **Configuration**: Environment-based configuration management
- **Development Tools**: Scripts for local development and testing

## Key Design Principles

### 1. **Clean Architecture**
- Clear separation between layers
- Dependency inversion through interfaces
- Business logic independent of frameworks

### 2. **Industry Standards**
- Structured logging with request tracing
- Comprehensive error handling
- Security best practices (JWT, CORS, input validation)

### 3. **Development Experience**
- Hot reloading for both frontend and backend
- Mock mode for database-free development
- Comprehensive documentation and troubleshooting guides

### 4. **Observability**
- Structured logging with request IDs
- Performance metrics and slow query detection
- User action tracking and audit trails

### 5. **Scalability**
- Stateless API design
- Database connection pooling
- Pluggable ML prediction system

## Configuration Management

### Environment-Based Configuration
- **Development**: `.env`, `.env.local` with console logging
- **Staging**: Structured JSON logging with debug info
- **Production**: Structured JSON logging with minimal verbosity

### Security Configuration
- JWT secret management
- CORS origin configuration
- Database connection security (SSL, connection pooling)

## Development Workflow

1. **Setup**: Run `scripts/dev-setup.sh` for initial configuration
2. **Development**: Use `scripts/run-dev.sh` for full-stack development
3. **Testing**: Database connectivity tests and unit tests
4. **Deployment**: Docker-based deployment with environment-specific configs

## Logging and Observability

### Structured Logging
- **Request ID**: Unique identifier for request tracing
- **User Context**: Email and role from JWT claims
- **Performance Metrics**: Latency, response size, slow request detection
- **Error Context**: Detailed error information with request correlation

### Log Levels
- **DEBUG**: Detailed request/response information (development only)
- **INFO**: Standard operational information
- **WARN**: Authentication failures, client errors
- **ERROR**: Server errors, database issues

This structure follows Go and web application best practices while providing a scalable foundation for the diabetes risk assessment platform.