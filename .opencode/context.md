# Project Context

## Environment
- Language: Go (backend), JavaScript/React (frontend), Python (ML)
- Runtime: Go 1.24 (go.mod toolchain go1.24.1), Node/Vite (frontend), Python 3.x (requirements.txt)
- Build: `make build` (backend), `cd frontend && npm run build`
- Test: `make test` (backend), `cd frontend && npm run test` (Playwright), `make test-ml` (ML)
- Package Manager: Go modules, npm (frontend), pip (ML)

## Project Type
- [ ] Library/Package
- [x] Application (CLI/Web/Mobile/Desktop)
- [ ] Microservice
- [ ] Monorepo
- [ ] Other: Multi-tier web app (Go API + React + ML service)

## Infrastructure
- Container: docker-compose.yml
- Orchestration: None
- CI/CD: .github/workflows/ci.yml, cd.yml
- Cloud: None detected

## Structure
- Source: backend/, frontend/src/, ml/
- Tests: backend/*_test.go, frontend/e2e/, ml (pytest)
- Docs: README.md, docs/
- Entry: backend/cmd/server/main.go, frontend/src/main.jsx, ml/server.py

## Conventions (OBSERVE from existing code)
- Naming: Go PascalCase for types, camelCase for vars; React components PascalCase
- Imports: Go standard/third-party/internal groups; React relative imports via domain index.jsx
- Error handling: Backend uses structured APIError helpers; frontend uses apiFetch wrappers
- Testing: Go table-driven tests; Playwright E2E for frontend

## Notes
- Frontend uses React 18 + Vite + Tailwind; no Redux/Zustand
- API calls centralized in frontend/src/api.js (no raw fetch)
- ML service is Flask with prediction endpoints
