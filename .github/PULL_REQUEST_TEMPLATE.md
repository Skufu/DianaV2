## Summary
<!-- What does this PR do? 1-2 sentences -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Refactor
- [ ] Documentation

## Checklist

### Before Requesting Review
- [ ] **Linting passes**: `make lint` (backend), `npm run lint` (frontend), `flake8 .` (ML)
- [ ] **Tests pass**: `make test` (backend), tests run green
- [ ] **Build succeeds**: `npm run build` (frontend)
- [ ] **DB changes**: If you modified migrations, run `make sqlc` and commit generated files

### Backend Changes (Go)
- [ ] Used standardized error helpers (`ErrBadRequest`, `ErrInternal`) from `handlers/utils.go`
- [ ] DB queries added to `internal/store/queries/*.sql` (not inline SQL)
- [ ] Used `pgtype.*` types for nullable DB fields, checked `.Valid` before access
- [ ] No manual `gin.H{"error": ...}` or `strconv.Atoi` for pagination

### Frontend Changes (React)
- [ ] Used `apiFetch()` or `mlFetch()` from `api.js` — no raw `fetch()`
- [ ] No TypeScript suppression (`as any`, `@ts-ignore`, `@ts-expect-error`)
- [ ] Followed existing component patterns in the appropriate domain folder
- [ ] Added to appropriate domain folder: `admin/`, `auth/`, `user/`, `insights/`, `common/`, `layout/`

### ML Changes (Python)
- [ ] Flake8 passes: `flake8 . --count --select=E9,F63,F7,F82`
- [ ] Import check passes: `python -c "from service.predict import DianaPredictor"`
- [ ] Configuration loaded from environment variables, not hardcoded

## Testing
<!-- How did you test this? -->

## Related Issues
<!-- Link to any issues this closes -->

## Screenshots (if UI changes)
<!-- Before/after screenshots -->
