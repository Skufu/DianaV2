# DianaV2 Project Context Pin

> **DO NOT MODIFY THIS FILE VIA AI** - This is human-curated project context.

## Project Overview
- **Name**: Diana V2
- **Purpose**: Medical AI Platform for diabetes risk assessment and patient analytics
- **Status**: Active development - Technical Debt Remediation Phase

## Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Go 1.21+, Gin framework, PostgreSQL, SQLC |
| Frontend | React 18, Vite, Tailwind CSS |
| ML Service | Python, Flask, scikit-learn clustering |
| Database | PostgreSQL with pgxpool driver |
| Auth | JWT tokens (access + refresh) |

## Architecture Constraints
- All API endpoints under `/api/v1/`
- Use existing error helpers: `ErrBadRequest()`, `ErrInternal()`, `ErrUnauthorized()`
- Follow Gin handler patterns in existing code
- ML service runs separately, accessed via REST API
- Never expose `password_hash` in API responses

## Directory Structure
```
backend/
├── cmd/server/      # Main entry point
├── internal/
│   ├── http/        # Handlers, middleware, routes
│   ├── services/    # Business logic
│   ├── store/       # Database layer (SQLC generated)
│   ├── ml/          # ML client integration
│   └── models/      # Data types
frontend/
├── src/
│   ├── components/  # React components
│   ├── api.js       # API client
│   └── App.jsx      # Root component
ml/
├── server.py        # Flask ML API
├── train.py         # Model training
└── clustering.py    # Patient clustering
```

## Key Domain Concepts
| Term | Definition |
|------|------------|
| Assessment | Patient health data submission with biomarkers |
| Risk Score | ML-predicted diabetes risk (0-100) |
| Cluster | Patient grouping based on health patterns |
| HbA1c/FBS | Key diabetes biomarkers |
| Insights | Analytics dashboard for clinicians |

## Commands
```bash
# Backend
cd backend && go run cmd/server/main.go
go test ./...

# Frontend  
cd frontend && npm run dev
npm test

# ML Service
cd ml && python server.py
```

## Important Security Notes
- Use `context.WithoutCancel()` for background operations
- All handlers must log errors server-side before returning generic messages
- JWT tokens should be in HttpOnly cookies (migration in progress)
