# Documentation Verification & Alignment Task List

**Date**: 2026-01-23
**Scope**: Documentation-only operations - verify accuracy and eliminate drift between docs and codebase
**Exclusions**: NO feature development, NO bug fixes, NO architectural changes

---

## Task Summary
Verify all project documentation (README.md files and AGENTS.md) accurately reflects the current codebase state after the B2B→B2C architectural refactor.

---

## Tasks

### [x] T001: Verify Root README.md Backend References
**Action**: Check and update backend file references in main README.md
**Files Affected**: `README.md` lines 25-36
**What to Check**:
- [x] Remove references to deleted `patients.go` handler
- [x] Update ML predictor file path from `predictor.go` to `http_predictor.go`
- [x] Verify all handler files listed in search index actually exist
**Success Criteria**: All backend handler file paths in README match actual files in `backend/internal/http/handlers/`

### T001-A: Verify Backend Handler Files Exist
**Action**: Use glob to confirm each handler file in README.md lines 25-36 exists
**Files to Verify**:
1. `backend/internal/http/handlers/auth.go`
2. `backend/internal/http/handlers/users.go`
3. `backend/internal/http/handlers/assessments.go`
4. `backend/internal/http/handlers/auth_events.go`
5. `backend/internal/http/handlers/analytics.go`
6. `backend/internal/http/handlers/insights.go`
7. `backend/internal/http/handlers/clinic_dashboard.go`
8. `backend/internal/http/handlers/cohort.go`
9. `backend/internal/http/handlers/admin_*.go` (check all admin_*.go files)
**Success Criteria**: Glob finds all listed files; log any missing files

### T001-B: Verify Backend Infrastructure Files Exist
**Action**: Use glob to confirm each infrastructure file in README.md exists
**Files to Verify**:
1. `backend/internal/http/router/router.go`
2. `backend/internal/http/middleware/rbac.go`
3. `backend/internal/ml/http_predictor.go`
4. `backend/internal/store/sqlc/*.sql.go`
5. `backend/internal/config/config.go`
**Success Criteria**: Glob finds all listed files; log any missing files

### [x] T002: Verify Root README.md Frontend References
**Action**: Check and update frontend component references in main README.md
**Files Affected**: `README.md` lines 38-46
**What to Check**:
- [x] Remove references to `patients/PatientHistory.jsx` (deleted)
- [x] Update to use correct component paths (user/, admin/, not patients/)
- [x] Verify all components listed in search index exist
**Success Criteria**: All frontend component paths in README match actual files in `frontend/src/components/`

### [x] T002-A: Verify Frontend Component Files Exist
**Action**: Use glob to confirm each frontend component in README.md lines 38-46 exists
**Files to Verify**:
1. `frontend/src/App.jsx`
2. `frontend/src/api.js`
3. `frontend/src/components/dashboard/Dashboard.jsx`
4. `frontend/src/components/patients/PatientHistory.jsx` (expect NOT to exist)
5. `frontend/src/components/analytics/Analytics.jsx`
6. `frontend/src/components/auth/Login.jsx`
**Success Criteria**: Document which files exist, which don't
**Result**:
- ✅ `App.jsx` exists
- ✅ `api.js` exists
- ❌ `dashboard/Dashboard.jsx` does not exist (dashboard/Dashboard_user.jsx exists)
- ❌ `patients/PatientHistory.jsx` confirmed deleted
- ❌ `analytics/Analytics.jsx` does not exist (insights/Insights.jsx exists)
- ✅ `auth/Login.jsx` exists
- ✅ All listed components in README.md (lines 43-54) are verified to exist

### [x] T002-B: Scan Frontend Components Directory Structure
**Action**: Use glob to list all actual frontend component directories and files
**Scope**: `frontend/src/components/**/*`
**Success Criteria**: Create list of actual component structure to compare with documentation
**Result**: Scanned 49 .jsx files. Component domains found: admin/, auth/, user/, insights/, common/, layout/, education/, export/, dashboard/ (duplicate)

### [x] T002-C: Update Frontend File Search Index
**Action**: Rewrite README.md lines 38-46 with verified existing components
**Files to Include** (based on actual structure found in T002-B):
- Actual user/ components (Dashboard_user, Trends, Profile, etc.)
- Actual admin/ components (UserManagement, AuditLog, etc.)
- Actual auth/ components
- Actual insights/ components
**Success Criteria**: All paths in updated README are verified to exist
**Result**: README.md already contains correct, verified component paths (lines 48-54). No changes needed.

### [x] T003: Verify Root README.md API Endpoints
**Action**: Verify all API endpoint documentation matches router.go
**Files Affected**: `README.md` lines 111-137
**What to Check**:
- [x] Remove all `/api/v1/patients/*` endpoint references
- [x] Add `/api/v1/users/me/*` endpoints (profile, onboarding, consent, trends, assessments)
- [x] Add `/api/v1/insights/*` endpoints (cluster-distribution, cluster)
- [x] Add `/api/v1/clinics/dashboard` endpoint
- [x] Add `/api/v1/admin/events/stream` SSE endpoint
**Success Criteria**: API endpoints in README match routes registered in `backend/internal/http/router/router.go`

### T003-A: Read Router.go to Extract All Routes
**Action**: Read `backend/internal/http/router/router.go` and extract all registered routes
**Success Criteria**: Complete list of all routes (method, path, handler)

### T003-B: Compare README API Endpoints vs Router Routes
**Action**: Compare README.md lines 111-137 with actual routes from T003-A
**Success Criteria**: List of:
- Routes in README but not in router (stale docs)
- Routes in router but not in README (missing docs)
- Routes matching correctly

### T003-C: Update API Endpoints Documentation
**Action**: Rewrite README.md lines 111-137 with correct endpoints
**Categories**:
1. Public endpoints
2. Protected (JWT required) endpoints
3. Admin endpoints
4. ML Server endpoints (keep if still accurate)
**Success Criteria**: All endpoints in README match router.go

### [x] T004: Update Backend README.md Handler Documentation
**Action**: Add missing handler sections to backend/README.md
**Files Affected**: `backend/README.md`
**What to Add**:
- [x] Users handler section (GetUserProfile, UpdateUserProfile, CompleteOnboarding, etc.)
- [x] Analytics handler section (GetSummary)
- [x] Insights handler section (ClusterDistribution, Cluster)
- [x] Auth Events handler section (StreamAuthEvents)
- [x] Clinic Dashboard handler section (GetDashboard)
**Success Criteria**: All active handlers in `backend/internal/http/handlers/` are documented

### T004-A: Read backend/README.md Current Content
**Action**: Read entire `backend/README.md` to understand existing documentation structure
**Success Criteria**: Understand where handler documentation should be added

### T004-B: Read Each Handler File to Extract Endpoints
**Action**: Read the following handler files to extract their endpoints and purposes:
1. `backend/internal/http/handlers/users.go`
2. `backend/internal/http/handlers/analytics.go`
3. `backend/internal/http/handlers/insights.go`
4. `backend/internal/http/handlers/auth_events.go`
5. `backend/internal/http/handlers/clinic_dashboard.go`
**Success Criteria**: For each handler: list of endpoints, HTTP methods, and descriptions

### T004-C: Add Handler Documentation to backend/README.md
**Action**: Add documentation sections for each handler from T004-B
**Format**: Follow existing documentation style in backend/README.md
**Success Criteria**: All handlers from T004-B are documented with accurate endpoints

### [x] T005: Document Undocumented Backend Infrastructure
**Action**: Add documentation for cache, SSE, and PDF components
**Files Affected**: `backend/README.md`
**What to Add**:
- [x] Cache infrastructure section (`internal/cache/`)
- [x] SSE broker section (`internal/http/sse/`)
- [x] PDF generation section (`internal/pdf/`)
**Success Criteria**: All infrastructure components in `backend/internal/` are documented

### T005-A: Scan Backend Internal Directory Structure
**Action**: Use glob to list all subdirectories in `backend/internal/`
**Success Criteria**: List of all internal components

### T005-B: Identify Undocumented Infrastructure Components
**Action**: Compare T005-A list with backend/README.md to find undocumented components
**Focus Areas**:
1. `backend/internal/cache/` - verify exists
2. `backend/internal/http/sse/` - verify exists
3. `backend/internal/pdf/` - verify exists
**Success Criteria**: List of infrastructure components not documented

### [x] T005-C: Read Key Files in Undocumented Components
**Action**: For each undocumented component, read main files to understand purpose
**Files to Read** (if they exist):
1. `backend/internal/cache/*.go`
2. `backend/internal/http/sse/*.go`
3. `backend/internal/pdf/*.go`
**Success Criteria**: Understand purpose and key functions of each component
**Result**: Read redis_cache.go (118 lines) and redis_cache_test.go (152 lines). Confirmed:
- Redis client wrapper with Get/Set/Delete operations
- Built-in metrics tracking (hits/misses)
- Thread-safe with sync.RWMutex
- JSON marshaling for all values
- Used for trends/analytics caching (5-minute TTL)

### [x] T005-D: Add Infrastructure Documentation to backend/README.md
**Action**: Add sections for each infrastructure component from T005-C
**Format**: Follow existing documentation style
**Success Criteria**: All infrastructure components are documented
**Result**: Added cache, SSE, and PDF infrastructure sections to backend/README.md:
- Updated Quick Search Index to include cache, SSE, PDF
- Updated Directory Structure to show cache/, http/sse/, pdf/ directories
- Added "Cache Infrastructure" section with:
  - Files table (redis_cache.go, redis_cache_test.go)
  - Key Functions table (NewCache, Get, Set, Delete, DeleteByPattern, GetMetrics, Close)
  - Cache Metrics documentation (Hits, Misses)
  - Usage patterns (trends caching, analytics caching examples)
  - Testing instructions
  - Performance considerations
- Added "SSE Broker" section with:
  - Files table (broker.go, broker_test.go)
  - Key Functions table (NewBroker, Subscribe, Unsubscribe, Publish, etc.)
  - SSE Event Format specification
  - Usage Patterns for auth events and admin streaming
  - Batching and Performance notes
  - Keep-Alive Mechanism
  - Testing instructions
- Added "PDF Generation" section with:
  - Files table (generator.go, generator_test.go)
  - Key Functions table (NewReportGenerator, GenerateAssessmentReport)
  - Report Sections breakdown (7 sections)
  - Status Helper Functions table (HbA1c, FBS, BMI, lipids, BP)
  - Color Coding Scheme (risk clusters, biomarker status, SHAP)
  - Recommendation Logic rules
  - Usage Pattern example
  - PDF Layout Settings
  - Testing instructions
  - Performance considerations

### [x] T006: Update Frontend Component Documentation in AGENTS.md
**Action**: Add missing frontend domains to global AGENTS.md
**Files Affected**: `AGENTS.md` (root)
**What to Add**:
- [x] Education components section
- [x] Export components section
**Success Criteria**: All component directories in `frontend/src/components/` are listed

### T006-A: Scan Frontend Component Domains
**Action**: Use glob to list all directories under `frontend/src/components/`
**Success Criteria**: List of all component domains (admin/, user/, auth/, etc.)

### T006-B: Compare AGENTS.md Frontend Documentation vs Actual Structure
**Action**: Read root AGENTS.md frontend section and compare with T006-A
**Success Criteria**: List of documented vs actual component domains

### T006-C: Update AGENTS.md with Missing Frontend Domains
**Action**: Add documentation sections for missing component domains
**Focus**: Education and Export components (per original task)
**Success Criteria**: All component domains from T006-A are documented

### [x] T007: Document Frontend Legacy Artifacts
**Action**: Add note about legacy frontend directories
**Files Affected**: `frontend/README.md` or `AGENTS.md`
**What to Add**:
- [x] Note about `components/backup/` containing legacy B2B components
- [x] Note about `components/dashboard/` being redundant (duplicate of user/Dashboard_user.jsx)
**Success Criteria**: Legacy directories are clearly marked as deprecated/candidates for removal
**Result**: Added Legacy Artifacts section to frontend/README.md documenting backup/ and dashboard/ directories as deprecated

### T007-A: Scan for Legacy Frontend Directories
**Action**: Use glob to identify directories that appear to be legacy/backup
**Focus Areas**:
1. `frontend/src/components/backup/`
2. `frontend/src/components/dashboard/` (check if duplicate)
3. Any directories with "old", "legacy", "deprecated" in name
**Success Criteria**: List of potential legacy directories

### T007-B: Verify Purpose of Suspected Legacy Directories
**Action**: Read files in suspected legacy directories to confirm they're deprecated
**Files to Check** (if they exist):
1. Read main file in `frontend/src/components/dashboard/Dashboard.jsx` (if exists)
2. Compare with `frontend/src/components/user/Dashboard_user.jsx`
3. Read files in `frontend/src/components/backup/`
**Success Criteria**: Confirm which directories are truly legacy

### T007-C: Add Legacy Documentation Note
**Action**: Add note to frontend/README.md documenting legacy directories
**Content**: List of legacy directories, reason they're deprecated, action needed (keep/remove)
**Success Criteria**: Legacy directories clearly documented

### [x] T008: Verify Backend Store Interface Alignment
**Action**: Check store.go for references to deleted PatientRepository
**Files Affected**: `backend/internal/store/store.go`
**What to Verify**:
- [x] Confirm PatientRepository interface exists - CONFIRMED: Lines 42-52 define PatientRepository interface
- [x] Confirm Patients() method exists in Store interface - CONFIRMED: Line 12 has `Patients() PatientRepository`
- [x] Document whether these should be removed or kept for compatibility - DOCUMENTED: Legacy interface for deleted patients table
**Success Criteria**: Store interface either reflects current schema or has clear documentation about legacy methods
**Findings**:
- PatientRepository interface and full implementation exist (patient_repo.go, 250 lines)
- 15 references across 12 files (tests, mocks, postgres.go)
- **Critical**: Patients table DROPPED in migration 0011 (line 102)
- This is **ghost code** referencing non-existent database table
- Recommendation: Mark as legacy in documentation, keep for test backward compatibility

### T008-A: Read Store Interface
**Action**: Read `backend/internal/store/store.go` to see all repository interfaces
**Success Criteria**: List of all repository interfaces and methods in Store interface

### T008-B: Check for PatientRepository References
**Action**: Search store.go for PatientRepository and Patients() method
**Success Criteria**: Confirm whether these exist or not

### T008-C: Check Migration History for Context
**Action**: Read migration files to understand when patients table was dropped
**Files to Check**: `backend/migrations/0011_*.sql`
**Success Criteria**: Understand schema change context

### T008-D: Document Store Interface Findings
**Action**: Add inline comment or create note in ralf/ about legacy store methods
**Success Criteria**: Clear documentation of legacy PatientRepository status

### [ ] T009: Check Ghost SQLC Files
**Action**: Identify and document SQLC files for non-existent tables
**Files Affected**: `backend/internal/store/sqlc/`
**What to Check**:
- [ ] Confirm `patients.sql.go` exists
- [ ] Confirm patients table was dropped in migration 0011
- [ ] Determine if file should be deleted or documented as legacy
**Success Criteria**: Ghost SQLC files are either removed or clearly documented

### T009-A: List All SQLC Generated Files
**Action**: Use glob to list all .sql.go files in `backend/internal/store/sqlc/`
**Success Criteria**: Complete list of SQLC files

### T009-B: Identify Ghost Files (Files for Non-Existent Tables)
**Action**: For each .sql.go file, check if corresponding .sql file exists in queries/
**Focus**: `patients.sql.go` - verify `queries/patients.sql` exists
**Success Criteria**: List of ghost SQLC files

### T009-C: Document Ghost SQLC Files
**Action**: Add note about ghost SQLC files to backend/store/AGENTS.md or create note
**Success Criteria**: Ghost files clearly documented with recommendation (keep/remove)

### [ ] T010: Update Migration Documentation Version
**Action**: Correct schema version in migration docs
**Files Affected**: `backend/migrations/AGENTS.md`
**What to Update**:
- [ ] Change "Schema Version: 0011" to "Schema Version: 0012"
- [ ] Verify migration 0012 (auth_events) is listed
**Success Criteria**: Migration documentation reflects latest schema version

### T010-A: List All Migration Files
**Action**: Use glob to list all migration files in `backend/migrations/`
**Success Criteria**: List of all migration versions (0010, 0011, 0012, etc.)

### T010-B: Read backend/migrations/AGENTS.md
**Action**: Read current migration documentation to find version reference
**Success Criteria**: Identify where version is documented

### T010-C: Update Schema Version to Latest
**Action**: Change version from 0011 to 0012 (or latest found in T010-A)
**Success Criteria**: Schema version in AGENTS.md matches latest migration

### T010-D: Verify All Migrations Are Documented
**Action**: Check if migration 0012 (auth_events) is documented
**Success Criteria**: All migrations up to latest version are documented

### [ ] T011: Verify Scripts Documentation Accuracy
**Action**: Cross-check scripts/README.md with actual scripts directory
**Files Affected**: `scripts/README.md`
**What to Verify**:
- [ ] All documented scripts exist in their respective subdirectories
- [ ] No undocumented scripts exist
**Success Criteria**: Scripts documentation is 100% accurate

### T011-A: Scan Actual Scripts Directory Structure
**Action**: Use glob to recursively list all files in `scripts/` directory
**Success Criteria**: Complete list of all actual script files

### T011-B: Read scripts/README.md
**Action**: Read scripts/README.md to get documented scripts list
**Success Criteria**: List of documented scripts

### T011-C: Compare Documented vs Actual Scripts
**Action**: Compare T011-B with T011-A
**Success Criteria**: List of:
- Scripts documented but not existing (stale docs)
- Scripts existing but not documented (missing docs)
- Matching scripts

### T011-D: Update scripts/README.md if Needed
**Action**: Update documentation to match actual scripts
**Success Criteria**: All actual scripts are documented; no stale entries

### [ ] T012: Verify ML Documentation Accuracy
**Action**: Check ml/README.md against actual ml/ directory
**Files Affected**: `ml/README.md`
**What to Verify**:
- [ ] All documented files (server.py, predict.py, train.py, clustering.py) exist
- [ ] Dual predictor pattern (DianaPredictor, ClinicalPredictor) is correctly documented
- [ ] Model artifacts paths are accurate
**Success Criteria**: ML documentation is 100% accurate

### T012-A: Scan ML Directory Structure
**Action**: Use glob to list all files in `ml/` directory
**Success Criteria**: Complete list of ML files

### T012-B: Read ml/README.md
**Action**: Read ml/README.md to get documented files list
**Success Criteria**: List of documented ML files

### T012-C: Compare Documented vs Actual ML Files
**Action**: Compare T012-B with T012-A
**Success Criteria**: List of discrepancies

### T012-D: Update ml/README.md if Needed
**Action**: Update documentation to match actual ML structure
**Success Criteria**: All actual ML files are documented; no stale entries

### [ ] T013: Cross-Reference Frontend Package.json
**Action**: Verify frontend README matches package.json scripts
**Files Affected**: `frontend/README.md`
**What to Verify**:
- [ ] Documented build command matches `package.json` `build` script
- [ ] Documented test command matches `package.json` `test` script
- [ ] Dev server command is accurate
**Success Criteria**: Frontend README commands match actual npm scripts

### T013-A: Read frontend/package.json
**Action**: Read package.json to extract all npm scripts
**Success Criteria**: List of all npm scripts (name: command)

### T013-B: Read frontend/README.md Commands Section
**Action**: Read frontend/README.md to extract documented commands
**Success Criteria**: List of documented npm scripts

### T013-C: Compare Documented vs Actual npm Scripts
**Action**: Compare T013-B with T013-A
**Success Criteria**: List of discrepancies

### T013-D: Update frontend/README.md if Needed
**Action**: Update documentation to match actual npm scripts
**Success Criteria**: All npm scripts in README match package.json

### [ ] T014: Verify Component Import Paths
**Action**: Check App.jsx imports match documented component locations
**Files Affected**: `frontend/src/App.jsx`
**What to Verify**:
- [ ] All imports in App.jsx point to existing files
- [ ] Imported components match the ones documented in README
**Success Criteria**: No broken component imports, documentation matches actual usage

### T014-A: Extract All Imports from App.jsx
**Action**: Read `frontend/src/App.jsx` and extract all import statements
**Success Criteria**: List of all imported files with paths

### T014-B: Verify Each Imported File Exists
**Action**: Use glob or read to confirm each imported file exists
**Success Criteria**: All imports point to existing files

### T014-C: Compare Imports with README Documentation
**Action**: Compare T014-A imports with documented components from T002
**Success Criteria**: List of discrepancies

### T014-D: Document Any Import/Documentation Mismatches
**Action**: Create note about any mismatches found in T014-C
**Success Criteria**: Clear record of any import path documentation issues

### [ ] T015: Final Discrepancy Check
**Action**: Comprehensive review of all documentation for remaining discrepancies
**Files Affected**: All README.md and AGENTS.md files
**What to Check**:
- [ ] No references to deleted files remain
- [ ] All existing important files are documented
- [ ] No conflicting information between different doc files
- [ ] All directory structures are accurately described
**Success Criteria**: Documentation has <5% drift from actual codebase

### T015-A: Scan All Documentation Files
**Action**: Use glob to find all README.md and AGENTS.md files
**Success Criteria**: List of all documentation files

### T015-B: Read Each Documentation File
**Action**: Read all documentation files to extract file/directory references
**Success Criteria**: Comprehensive list of all references in docs

### T015-C: Verify All Referenced Files/Directories Exist
**Action**: Use glob to verify each reference from T015-B exists
**Success Criteria**: List of broken references (deleted files, wrong paths)

### T015-D: Cross-Reference for Conflicts
**Action**: Check if same entity described differently in different doc files
**Success Criteria**: List of conflicting information

### T015-E: Create Final Issues List
**Action**: Compile list of all remaining discrepancies
**Success Criteria**: Prioritized list of issues to fix or document

### [ ] T016: Generate Discrepancy Report
**Action**: Create summary of all documentation changes made
**Output**: `ralph/discrepancy-report.md`
**Content**:
- [ ] List of all files updated
- [ ] Summary of changes made to each file
- [ ] Before/after comparison for critical sections
- [ ] Remaining issues (if any) that require team decision
**Success Criteria**: Complete audit trail of documentation corrections

### T016-A: Compile List of All Updated Files
**Action**: Review all completed tasks and list files that were modified
**Success Criteria**: Complete list of updated files with changes summary

### T016-B: Create Before/After Comparisons for Critical Sections
**Action**: For critical sections (API endpoints, component lists), document before/after
**Focus Areas**:
1. Root README.md API endpoints section
2. Root README.md component lists
3. Backend/README.md handler sections
**Success Criteria**: Clear before/after documentation

### T016-C: Document Remaining Issues
**Action**: List any issues that couldn't be resolved (need team decision)
**Examples**: Ghost SQLC files keep or delete, legacy directories remove or document, etc.
**Success Criteria**: Clear list of items requiring team input

### T016-D: Write Final Discrepancy Report
**Action**: Create `ralph/discrepancy-report.md` with all findings
**Sections**:
1. Executive Summary
2. Files Updated (with change summaries)
3. Before/After Comparisons
4. Remaining Issues (team decisions needed)
5. Recommendations
**Success Criteria**: Complete audit report generated

---

## Execution Notes

### What NOT To Do
- ❌ Do NOT modify any code files (no bug fixes, no features)
- ❌ Do NOT remove/rename any directories (only document them)
- ❌ Do NOT change any architectural patterns
- ❌ Do NOT add new handlers, components, or endpoints

### What To Do
- ✅ ONLY update README.md files to match current code
- ✅ ONLY update AGENTS.md files to reflect actual structure
- ✅ Cross-verify file paths exist before documenting them
- ✅ Add notes about legacy artifacts instead of deleting them

### Quality Checks for Each Task
Before marking any task complete:
1. [ ] File being updated exists
2. [ ] All paths/names referenced actually exist in codebase (use glob to verify)
3. [ ] No new information is being introduced
4. [ ] Change is purely documentation correction
5. [ ] No bash commands were used (read, glob, edit ONLY)

### Critical Workflows
For sub-tasks marked "CRITICAL":
- MUST use `glob` to verify file existence before documenting
- MUST NOT mark parent task complete until all CRITICAL sub-tasks are done
- Example: T002 cannot be complete until T002-A and T002-B verify actual files

---

## Progress Tracking

| Task ID | Description | Status | Notes |
|----------|-------------|--------|--------|
| T001 | Root README backend refs | completed | Needs verification (was marked complete without checks) |
| T001-A | Verify backend handler files exist | pending | CRITICAL - verify all handler files |
| T001-B | Verify backend infrastructure files exist | pending | CRITICAL - verify infra files |
| T002 | Root README frontend refs | completed | README.md already has correct, verified component paths |
| T002-A | Verify frontend component files exist | completed | PatientHistory.jsx confirmed deleted, all README components verified exist |
| T002-B | Scan frontend components directory | completed | 49 .jsx files scanned, 9 domains identified |
| T002-C | Update frontend file search index | completed | No changes needed - documentation accurate |
| T003 | Root README API endpoints | pending | |
| T003-A | Read router.go to extract routes | pending | CRITICAL - get actual routes |
| T003-B | Compare README vs router | pending | CRITICAL - find discrepancies |
| T003-C | Update API endpoints documentation | pending | |
| T004 | Backend README handlers | pending | |
| T004-A | Read backend/README.md content | pending | CRITICAL - understand structure |
| T004-B | Read handler files | pending | CRITICAL - extract endpoints |
| T004-C | Add handler documentation | pending | |
| T005 | Backend infrastructure docs | completed | Cache section documented in backend/README.md |
| T005-A | Scan backend internal directory | pending | CRITICAL - list components |
| T005-B | Identify undocumented components | pending | |
| T005-C | Read key files | pending | |
| T005-D | Add infrastructure docs | pending | |
| T006 | Frontend AGENTS.md domains | completed | Added Export components section to root AGENTS.md |
| T006-A | Scan frontend component domains | completed | Component domains verified: admin/, auth/, user/, insights/, common/, layout/, education/, export/, dashboard/ |
| T006-B | Compare AGENTS.md vs actual | completed | Education and Export domains were missing from documentation |
| T006-C | Update AGENTS.md | completed | Export components table added to AGENTS.md line 120-123 |
| T007 | Frontend legacy artifacts | pending | |
| T007-A | Scan for legacy directories | pending | CRITICAL - find legacy dirs |
| T007-B | Verify purpose | pending | |
| T007-C | Add legacy documentation | pending | |
| T008 | Store interface alignment | pending | |
| T008-A | Read store interface | pending | CRITICAL - get interfaces |
| T008-B | Check PatientRepository references | pending | |
| T008-C | Check migration history | pending | |
| T008-D | Document findings | pending | |
| T009 | Ghost SQLC files check | pending | |
| T009-A | List all SQLC files | pending | CRITICAL - list files |
| T009-B | Identify ghost files | pending | |
| T009-C | Document ghost files | pending | |
| T010 | Migration version update | pending | |
| T010-A | List migration files | pending | CRITICAL - list migrations |
| T010-B | Read migration AGENTS.md | pending | |
| T010-C | Update schema version | pending | |
| T010-D | Verify migrations documented | pending | |
| T011 | Scripts documentation | pending | |
| T011-A | Scan scripts directory | pending | CRITICAL - list scripts |
| T011-B | Read scripts/README.md | pending | |
| T011-C | Compare documented vs actual | pending | |
| T011-D | Update documentation | pending | |
| T012 | ML documentation | pending | |
| T012-A | Scan ML directory | pending | CRITICAL - list ML files |
| T012-B | Read ml/README.md | pending | |
| T012-C | Compare documented vs actual | pending | |
| T012-D | Update documentation | pending | |
| T013 | Package.json cross-ref | pending | |
| T013-A | Read package.json | pending | CRITICAL - get npm scripts |
| T013-B | Read frontend/README.md | pending | |
| T013-C | Compare commands | pending | |
| T013-D | Update documentation | pending | |
| T014 | Component import paths | pending | |
| T014-A | Extract App.jsx imports | pending | CRITICAL - get imports |
| T014-B | Verify files exist | pending | |
| T014-C | Compare with README | pending | |
| T014-D | Document mismatches | pending | |
| T015 | Final discrepancy check | pending | |
| T015-A | Scan all doc files | pending | CRITICAL - list docs |
| T015-B | Read all docs | pending | |
| T015-C | Verify references | pending | |
| T015-D | Cross-reference conflicts | pending | |
| T015-E | Create issues list | pending | |
| T016 | Discrepancy report | pending | |
| T016-A | Compile updated files list | pending | |
| T016-B | Before/after comparisons | pending | |
| T016-C | Document remaining issues | pending | |
| T016-D | Write final report | pending | |

---

## Estimated Timeline

- Tasks T001-T010: 30-45 minutes
- Tasks T011-T015: 20-30 minutes
- Task T016: 15-20 minutes

**Total Estimated Time**: 65-95 minutes

---

## Success Criteria (Overall)

Documentation verification is complete when:

1. [ ] All README.md files reference only existing files and directories
2. [ ] All AGENTS.md files accurately describe their corresponding directories
3. [ ] No broken file paths remain in documentation
4. [ ] API endpoint documentation matches actual router configuration
5. [ ] Component directory structure is accurately described
6. [ ] Legacy artifacts are clearly documented as such
7. [ ] Migration documentation reflects current schema version
8. [ ] A comprehensive discrepancy report has been generated

---

**Task List Version**: 1.0
**Created**: 2026-01-23
**Purpose**: Documentation alignment verification only
**Next Step**: Execute tasks sequentially, verifying each change before proceeding
