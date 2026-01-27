# PRD Template for Ralph Loop

> **Purpose**: Define the scope and goals for an autonomous Ralph run. Keep concise for context efficiency.

## Overview

[1-2 sentences describing what this run will accomplish]

## Background

- **Context**: [What led to this task]
- **Completed**: [What's already done, if any]
- **Scope**: [Number of items to address]

## Goals

1. [Primary goal]
2. [Secondary goal]
3. [Success metric]

## Technical Context

### Stack
- **Frontend**: [e.g., React 18, Vite, TypeScript]
- **Backend**: [e.g., Go/Gin, PostgreSQL]
- **Testing**: [e.g., Playwright, Jest]

### Running Services
- Backend: `localhost:8080`
- Frontend: `localhost:4000`
- Database: `localhost:5432`

## Constraints

- [ ] [Constraint 1 - e.g., Do not modify database schema]
- [ ] [Constraint 2 - e.g., All changes must pass lint]
- [ ] [Constraint 3 - e.g., Commit after each fix]

## Success Criteria

- [ ] All tasks in task list marked `[x]`
- [ ] All tests pass (`npx playwright test` exits 0)
- [ ] No new lint errors introduced

## Reference

```javascript
// Key credentials or constants
const DEMO_USER = { email: 'demo@example.com', password: 'demo123' };
const API_BASE = 'http://localhost:8080/api/v1';
```

---

> **Note to AI**: Read this file first. Then read `context_pin.md` and `task_list.md`. Complete tasks in order. Mark `[x]` when verified.
