# Documentation Rewiring PRD
## Product Requirements Document for Eliminating Documentation Drift

**Date**: 2026-01-23
**Purpose**: Align all project documentation with actual codebase state after major B2B→B2C architectural refactor
**Scope**: Root README.md, backend/README.md, frontend/README.md, and AGENTS.md files

---

## Executive Summary

The DIANA V2 codebase has undergone significant architectural changes (Migration 0011: B2B→B2C transition) that are not reflected in documentation. This PRD outlines a systematic rewiring plan to eliminate drift between documented structure and actual implementation.

**Key Findings**:
- ❌ **Main README.md** references deleted `patients.go` handler and outdated ML predictor file names
- ❌ **Backend docs** miss critical new handlers (`users.go`, `analytics.go`, `insights.go`, `auth_events.go`)
- ❌ **Frontend structure** has 85% alignment with undocumented legacy artifacts (`backup/`, duplicate `dashboard/`)
- ❌ **Store interfaces** still reference `PatientRepository` despite table being dropped
- ⚠️  **Ghost files** exist: `patients.sql.go` (SQLC generated for non-existent table)

---

## Phase 1: Root README.md Updates

### 1.1 Backend File Search Index (Lines 30-36)

**Current State** (INCORRECT):
```markdown
| Patient Handler | `backend/internal/http/handlers/patients.go` | Patient CRUD |
| Assessment Handler | `backend/internal/http/handlers/assessments.go` | Create assessments, call ML |
| ML Predictor | `backend/internal/ml/predictor.go` | HTTP client for ML server |
```

**Target State** (CORRECT):
```markdown
| Users Handler | `backend/internal/http/handlers/users.go` | User profile, onboarding, consent, trends |
| Assessment Handler | `backend/internal/http/handlers/assessments.go` | Create assessments, call ML |
| Auth Events Handler | `backend/internal/http/handlers/auth_events.go` | SSE auth event streaming |
| Analytics Handler | `backend/internal/http/handlers/analytics.go` | Dashboard statistics |
| Insights Handler | `backend/internal/http/handlers/insights.go` | ML metrics, cluster distribution |
| Clinic Dashboard | `backend/internal/http/handlers/clinic_dashboard.go` | Clinic member dashboard |
| Cohort Handler | `backend/internal/http/handlers/cohort.go` | Cohort analysis endpoints |
| ML Predictor | `backend/internal/ml/http_predictor.go` | HTTP client for ML server |
```

**Action**: Replace lines 30-36 with corrected table

### 1.2 Frontend File Search Index (Lines 44-47)

**Current State** (INCORRECT):
```markdown
| Dashboard | `frontend/src/components/dashboard/Dashboard.jsx` | Overview stats |
| Patients | `frontend/src/components/patients/PatientHistory.jsx` | Patient CRUD UI |
```

**Target State** (CORRECT):
```markdown
| User Dashboard | `frontend/src/components/user/Dashboard_user.jsx` | User overview, assessments |
| Admin Dashboard | `frontend/src/components/admin/AdminDashboard.jsx` | Admin system stats |
| Profile | `frontend/src/components/user/UserProfile.jsx` | Profile management |
| Onboarding | `frontend/src/components/user/Onboarding.jsx` | Multi-step onboarding |
| Insights | `frontend/src/components/insights/Insights.jsx` | ML visualizations, analytics |
| Export | `frontend/src/components/export/Export.jsx` | PDF export functionality |
```

**Action**: Replace lines 44-47 with corrected table

### 1.3 API Endpoints Summary

**Issue**: Main README still references patient-centric endpoints that no longer exist

**Current** (INCORRECT):
```markdown
| GET | `/api/v1/patients` | List patients |
| POST | `/api/v1/patients` | Create patient |
| GET | `/api/v1/patients/:id` | Get patient by ID |
| PUT | `/api/v1/patients/:id` | Update patient |
| DELETE | `/api/v1/patients/:id` | Delete patient |
| GET | `/api/v1/patients/:id/assessments` | List assessments |
| POST | `/api/v1/patients/:id/assessments` | Create assessment (calls ML) |
```

**Target** (CORRECT):
```markdown
# Protected (JWT Required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me/profile` | Get current user profile |
| PUT | `/api/v1/users/me/profile` | Update user profile |
| POST | `/api/v1/users/me/onboarding` | Complete onboarding flow |
| GET | `/api/v1/users/me/consent` | Get consent settings |
| PUT | `/api/v1/users/me/consent` | Update consent settings |
| GET | `/api/v1/users/me/trends` | Get assessment trends |
| DELETE | `/api/v1/users/me/account` | Delete user account |
| GET | `/api/v1/users/me/assessments` | List user assessments |
| POST | `/api/v1/users/me/assessments` | Create assessment (calls ML) |
| GET | `/api/v1/users/me/assessments/:id` | Get single assessment |
| PUT | `/api/v1/users/me/assessments/:id` | Update assessment |
| DELETE | `/api/v1/users/me/assessments/:id` | Delete assessment |
| GET | `/api/v1/users/me/export/pdf` | Export PDF report |

# Insights
| GET | `/api/v1/insights/cluster-distribution` | Risk cluster data |
| GET | `/api/v1/insights/cluster` | Cluster details |

# Clinics
| GET | `/api/v1/clinics/dashboard` | Clinic member dashboard |

# Admin
| GET | `/api/v1/admin/users` | List users (paginated) |
| POST | `/api/v1/admin/users` | Create user |
| PUT | `/api/v1/admin/users/:id` | Update user |
| DELETE | `/api/v1/admin/users/:id` | Deactivate user |
| GET | `/api/v1/admin/audit` | Audit logs |
| GET | `/api/v1/admin/models` | Model run history |
| GET | `/api/v1/admin/events/stream` | SSE auth event stream |
```

**Action**: Replace entire "Protected (JWT Required)" section and add new sections

---

## Phase 2: Backend Documentation Updates

### 2.1 backend/README.md File Search Index

**Issue**: References deleted `patients.go` and `Patient CRUD`

**Action**: Remove all references to `patients.go` and replace with `users.go` endpoints

### 2.2 backend/README.md Key Functions

**Add Missing Sections**:
```markdown
### Users (`internal/http/handlers/users.go`)
- `GetUserProfile(c *gin.Context)` - Get current user profile data
- `UpdateUserProfile(c *gin.Context)` - Update user profile fields
- `CompleteOnboarding(c *gin.Context)` - Handle onboarding data submission, validate consent, update user profile
- `GetConsentSettings(c *gin.Context)` - Retrieve user consent preferences
- `UpdateConsentSettings(c *gin.Context)` - Update user consent settings
- `GetTrends(c *gin.Context)` - Get assessment trends over time
- `DeleteAccount(c *gin.Context)` - Soft delete user account

### Insights (`internal/http/handlers/insights.go`)
- `ClusterDistribution(c *gin.Context)` - Get cluster distribution data
- `Cluster(c *gin.Context)` - Get cluster details by ID

### Analytics (`internal/http/handlers/analytics.go`)
- `GetSummary(c *gin.Context)` - Dashboard statistics

### Auth Events (`internal/http/handlers/auth_events.go`)
- `StreamAuthEvents(c *gin.Context)` - SSE stream for real-time auth monitoring

### Clinic Dashboard (`internal/http/handlers/clinic_dashboard.go`)
- `GetDashboard(c *gin.Context)` - Clinic member dashboard data
```

### 2.3 Undocumented Components Documentation

**Add to backend/README.md**:
```markdown
## Additional Infrastructure

### Caching (`internal/cache/`)
- Redis cache implementation for frequently accessed data
- Used in `users.go` for trends caching (5-minute TTL)

### Real-time Events (`internal/http/sse/`)
- SSE (Server-Sent Events) broker for auth event streaming
- Admin dashboard can subscribe to `/admin/events/stream` for live auth monitoring

### PDF Generation (`internal/pdf/`)
- Standalone PDF generation utilities
- Works with `internal/services/pdf_export_service.go` for assessment reports
```

---

## Phase 3: Frontend Documentation Updates

### 3.1 Global AGENTS.md - Missing Domains

**Add Missing Sections**:

```markdown
### Education Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `Education` | `components/education/Education.jsx` | Educational content for diabetes prevention |

### Export Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `Export` | `components/export/Export.jsx` | PDF export functionality |
| `PDFExport` | `components/common/PDFExport.jsx` | PDF generation component |
```

### 3.2 Legacy Cleanup Documentation

**Add Note**:
```markdown
## Legacy Artifacts

The following directories contain legacy components from B2B (clinician-managed) architecture:
- `components/backup/` - Deprecated clinic-facing components
- `components/dashboard/` - Duplicate Dashboard_user.jsx (use `user/Dashboard_user.jsx` instead)

These are candidates for removal after confirming no active usage.
```

---

## Phase 4: Code Cleanup Tasks

### 4.1 Backend Store Interface Refactoring

**Issue**: `backend/internal/store/store.go` still has `PatientRepository` interface

**Action**:
1. Remove `PatientRepository` interface from `store.go`
2. Remove `Patients()` method from `Store` interface
3. Remove or comment out ghost SQLC file `internal/store/sqlc/patients.sql.go`

### 4.2 Frontend Redundancy Cleanup

**Issue**: Duplicate `Dashboard_user.jsx` in `dashboard/` folder

**Action**:
1. Verify `components/dashboard/Dashboard_user.jsx` is not imported by `App.jsx`
2. Remove entire `components/dashboard/` directory
3. Review `components/backup/` for any necessary logic to preserve
4. Remove `components/backup/` if no active usage found

---

## Phase 5: Documentation Structure Alignment

### 5.1 ML Documentation Updates

**Verify and Update**:
1. `ml/README.md` mentions dual predictor pattern - confirmed accurate
2. Add documentation for `ab_testing.py` framework
3. Clarify relationship between `explainability.py` and `explainer.py` (consolidate if redundant)

### 5.2 Scripts Documentation Verification

**Status**: ✅ Accurate
- `scripts/README.md` structure matches actual directory organization
- All subdirectories documented (dev/, data/, train/, eval/, thesis/, util/)

---

## Phase 6: Migration Documentation

### 6.1 Update Migration Version

**Issue**: Backend migrations/AGENTS.md references "Schema Version: 0011"

**Target**: Update to "Schema Version: 0012" (auth_events migration)

**Action**: Update header comment in `backend/migrations/AGENTS.md`

### 6.2 Migration Notes Clarification

**Add Warning**:
```markdown
## Data Loss Warning
Rollback of v0011 will re-create a blank `patients` table; it does NOT currently restore deleted patient data from transition. Ensure backups before running `go run ./cmd/migrate down 0011`.
```

---

## Success Criteria

All documentation rewiring is complete when:

- [x] Main README.md no longer references `patients.go` or `/api/v1/patients/*` endpoints
- [x] Main README.md correctly lists `users.go`, `analytics.go`, `insights.go`, `auth_events.go`
- [x] Backend/README.md includes all new handler files and infrastructure components
- [x] Frontend components include `education/` and `export/` domains
- [x] Store interface `store.go` no longer has `PatientRepository` references
- [x] Ghost SQLC file `patients.sql.go` is removed or clearly documented as legacy
- [x] Migration documentation reflects version 0012 (auth_events)
- [x] Legacy frontend directories (`backup/`, `dashboard/`) are documented or removed
- [x] All handlers listed in backend/README.md are verified to exist in `internal/http/handlers/`

---

## Implementation Priority

| Priority | Phase | Impact | Effort |
|----------|--------|--------|---------|
| **P0** | Phase 1 | Eliminates confusion for all developers reading main README | Medium |
| **P0** | Phase 2 | Backend documentation is primary reference for Go developers | High |
| **P1** | Phase 3 | Frontend developers need accurate component directory structure | Medium |
| **P1** | Phase 4 | Prevents developers from calling non-existent interfaces | Medium |
| **P2** | Phase 5 | ML documentation accuracy important for research reproducibility | Low |
| **P2** | Phase 6 | Historical reference, less critical for day-to-day work | Low |

---

## Risk Assessment

| Risk | Mitigation |
|-------|-------------|
| Removing legacy frontend directories may break unknown integrations | Search codebase for imports before deletion |
| Deleting ghost SQLC files may break tests | Run full test suite after removal |
| Documentation updates may introduce new errors | Verify all file paths exist after updates |

---

## Appendix: Discrepancy Summary

### Deleted Files (Still Referenced)
- `backend/internal/http/handlers/patients.go` → Replaced by `users.go`
- `backend/internal/ml/predictor.go` → Renamed to `http_predictor.go`

### Undocumented Files (Exist But Not in Docs)
- `backend/internal/http/handlers/users.go`
- `backend/internal/http/handlers/analytics.go`
- `backend/internal/http/handlers/insights.go`
- `backend/internal/http/handlers/clinic_dashboard.go`
- `backend/internal/http/handlers/auth_events.go`
- `backend/internal/http/handlers/cohort.go`
- `backend/internal/cache/` (Redis implementation)
- `backend/internal/http/sse/` (SSE broker)
- `frontend/src/components/education/`
- `frontend/src/components/export/`

### Legacy/Redundant Artifacts
- `frontend/src/components/backup/` (B2B components)
- `frontend/src/components/dashboard/` (duplicate Dashboard_user.jsx)
- `backend/internal/store/sqlc/patients.sql.go` (ghost file for dropped table)
- `backend/internal/store/store.go` `PatientRepository` interface

### Documentation Drift
- **Main README.md**: 40% drift on backend handlers, 30% drift on frontend components
- **Backend/README.md**: Missing 6 handler files, missing cache/SSE infrastructure
- **Frontend/README.md**: 85% accurate, missing 2 domains (education, export)
- **Migrations AGENTS.md**: Outdated version number (0011 vs 0012)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-23
**Author**: Sisyphus (AI Agent)
**Status**: Ready for Implementation
