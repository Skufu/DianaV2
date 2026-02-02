# PRD: Complete Documentation Audit & Update

> **Purpose**: Comprehensive audit and update of ALL documentation to ensure accuracy and consistency with the current DianaV2 codebase.

## Overview

Systematically review and update every documentation file in the DianaV2 project - READMEs, architecture docs, guides, ML documentation, research papers, and the main manuscript - to reflect the current state of the codebase.

## Background

- **Context**: DianaV2 has evolved with many features (admin dashboard, cohort analysis, auth events, PDF export, Ian_ML rename). Documentation may be stale.
- **Completed**: None - fresh audit starting
- **Scope**: 40+ documentation files across all directories

## Goals

1. Audit ALL documentation files for accuracy
2. Fix any outdated references (e.g., `ml/` → `Ian_ML/`)
3. Ensure consistency between manuscript and implementation
4. Verify all internal links and file paths are valid
5. Success: All docs accurately reflect current codebase

## Technical Context

### Stack
- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Go 1.21+, Gin, PostgreSQL, SQLC
- **ML**: Python 3.10+, Flask, scikit-learn, XGBoost
- **Testing**: Playwright (E2E), Go tests, pytest

### Running Services
- Backend: `localhost:8080`
- Frontend: `localhost:4000`
- ML Server: `localhost:5001`
- Database: `localhost:5432`

## Constraints

- [ ] **NO CODE CHANGES** - documentation updates only
- [ ] Do not delete any documentation files
- [ ] Preserve existing formatting style in each doc
- [ ] Commit after each major doc category update

## Success Criteria

- [ ] All tasks in task list marked `[x]`
- [ ] No broken internal links in documentation
- [ ] All file paths in docs point to existing files
- [ ] No references to deprecated `ml/` directory (now `Ian_ML/`)
- [ ] Manuscript aligns with current implementation

## Reference

```javascript
// Key documentation locations
const DOC_LOCATIONS = {
  root: ['README.md', 'DOCKER-QUICKSTART.md', 'Knowledge_base.md', 'manuscript.md'],
  docs: 'docs/',
  backend: 'backend/',
  frontend: 'frontend/',
  ml: 'Ian_ML/',
  scripts: 'scripts/',
  data: 'data/',
  models: 'models/'
};

// Key code reference files for verification
const VERIFY_AGAINST = {
  routes: 'backend/internal/http/router/router.go',
  handlers: 'backend/internal/http/handlers/',
  mlServer: 'Ian_ML/server.py',
  frontend: 'frontend/src/components/'
};
```

---

> **Note to AI**: Read this file first. Then read `context_pin.md` and `task_list.md`. Complete tasks in order. Mark `[x]` when verified. **NO CODE CHANGES - DOCUMENTATION ONLY.**
