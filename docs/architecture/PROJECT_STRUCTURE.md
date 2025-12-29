# Project Structure

This document outlines the organizational structure of the Diana V2 codebase.

## Directory Layout

```
DIANA V2/
├── backend/                    # Go backend server
│   ├── cmd/                   # Application entrypoints
│   │   ├── server/            # Main API server
│   │   ├── migrate/           # Database migrations
│   │   └── seed/              # Database seeding
│   ├── internal/              # Private application code
│   │   ├── config/            # Configuration management
│   │   ├── http/              # HTTP handlers and middleware
│   │   ├── ml/                # ML client integration
│   │   ├── models/            # Domain models
│   │   └── store/             # Database access layer
│   ├── migrations/            # SQL migration files
│   └── sqlc.yaml              # SQLC configuration
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.jsx           # Main application
│   │   ├── api.js            # API client
│   │   └── main.jsx          # Application entrypoint
│   ├── package.json
│   └── vite.config.js
├── ml/                         # Machine Learning (Python)
│   ├── README.md              # ML module documentation
│   ├── server.py              # Flask API server
│   ├── predict.py             # Prediction logic
│   ├── train.py               # Model training
│   ├── clustering.py          # Risk clustering
│   ├── data_processing.py     # Data preparation
│   └── requirements.txt       # Python dependencies
├── models/                     # Trained ML model artifacts
│   ├── clinical/              # Clinical model files
│   └── *.joblib               # Serialized models
├── data/                       # Raw datasets
│   └── nhanes/                # NHANES data files
├── scripts/                    # Shell scripts
│   ├── README.md              # Scripts documentation
│   ├── setup.sh               # Project setup
│   ├── run-dev.sh             # Development runner
│   ├── start-ml.sh            # ML server starter
│   └── test-db.sh             # Database testing
├── docs/                       # Documentation
│   ├── architecture/          # Architecture docs
│   ├── dev/                   # Developer guides
│   └── ops/                   # Operations docs
├── build/                      # Container configuration
│   └── Dockerfile
├── Makefile                    # Build commands
└── README.md                   # Project overview
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