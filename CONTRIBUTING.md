# Contributing to Diana V2


## Development Workflow

1. **Create a branch**: `git checkout -b feature/your-feature-name` or `fix/issue-description`
2. **Make changes**: Follow the conventions below
3. **Test locally**: Run linters and tests before pushing
4. **Push and open PR**: Use the PR template
5. **Address review comments**: CI must pass before merge

## Pre-Push Checklist

Run these commands before creating a PR:

```bash
# Backend (Go)
cd backend
make lint           # or: golangci-lint run --timeout=5m
go test -race ./... # Run tests with race detector
make sqlc           # If you changed migrations

# Frontend (React)
cd frontend
npm run lint
npm run build       # Must build successfully

# ML (Python)
cd Ian_ML
flake8 . --count --select=E9,F63,F7,F82 --show-source
python -c "from service.predict import DianaPredictor; print('Import OK')"
```

## Code Conventions

### Backend (Go)

**Error Handling:**
```go
// ✅ GOOD - Use standardized helpers
return c.JSON(http.StatusBadRequest, ErrBadRequest("Invalid biomarker value"))

// ❌ BAD - Manual JSON
c.JSON(400, gin.H{"error": "bad request"})
```

**Database Queries:**
- Add SQL to `internal/store/queries/*.sql`
- Run `make sqlc` to regenerate Go code
- Never write inline SQL in handlers

**Nullable Fields:**
```go
// ✅ GOOD - Use pgtype and check Valid
if user.Age.Valid {
    age = int(user.Age.Int32)
}

// ❌ BAD - Direct access without checking
age = user.Age.Int32  // May be zero value, not actually null
```

### Frontend (React)

**API Calls:**
```javascript
// ✅ GOOD - Use centralized fetch wrappers
import { apiFetch, mlFetch } from '../api';
const response = await apiFetch('/users/me/profile');

// ❌ BAD - Raw fetch
const response = await fetch('http://localhost:8080/api/v1/users/me/profile');
```

**TypeScript:**
- Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
- Fix the actual type issue

### ML (Python)

**Configuration:**
```python
# ✅ GOOD - Environment variables
import os
MODEL_PATH = os.getenv('MODEL_PATH', 'models/default.joblib')

# ❌ BAD - Hardcoded paths
MODEL_PATH = '/Users/john/models/best_model.joblib'
```

**Linting:**
- Follow PEP 8
- Run `flake8` before committing

## CI/CD

All PRs trigger GitHub Actions that run:
1. **Backend**: Lint, sqlc drift check, tests with race detector
2. **Frontend**: Build and lint
3. **ML**: Flake8 lint and import check
4. **Docker**: Build all images (depends on above passing)

**CI must pass before merging.**

## Common Issues

### "sqlc-generated code is out of sync"
You changed a migration but didn't regenerate SQLC code:
```bash
cd backend
sqlc generate
git add internal/store/sqlc/
git commit -m "Regenerate sqlc"
```

### TypeScript errors in CI but not locally
Make sure you're using the same Node version (check `package.json` engines).

### Flake8 failures
Python linting is strict. Common issues:
- Unused imports
- Lines > 100 characters
- Missing whitespace around operators

## Questions?

- Check existing code in the same domain folder for patterns
- Ask in your group chat if stuck

## Review Process

1. **Self-review**: Go through the PR template checklist
2. **Peer review**: At least one teammate approves
3. **CI passes**: All GitHub Actions checks green
4. **Merge**: Use "Squash and merge" for clean history
