# Task List Template for Ralph Loop

> **Format**: Each task must be a single `- [ ]` line with a `*.spec.js` or actionable filename for auto-verification.

---

## Prerequisites
- [ ] Backend running at localhost:8080
- [ ] Frontend running at localhost:4000
- [ ] Database seeded

---

## Phase 1: [Category Name] (CRITICAL)

- [ ] Fix filename.spec.js:linenum - short description of what to fix
- [ ] Fix another-file.spec.js:linenum - short description
- [ ] Fix third-file.spec.js - description without line number also works

---

## Phase 2: [Category Name] (HIGH)

- [ ] Fix feature.spec.js - description
- [ ] Fix feature-crud.spec.js - description

---

## Phase 3: [Category Name] (MEDIUM)

- [ ] Fix analytics.spec.js - description
- [ ] Fix export.spec.js - description

---

## Phase 4: [Category Name] (LOW)

- [ ] Fix edge-case.spec.js - description
- [ ] Fix performance.spec.js - may skip if flaky

---

## Final

- [ ] Run full suite: npx playwright test --reporter=list
- [ ] All tests pass

---

## Reference

```javascript
// Credentials
const ADMIN = { email: 'admin@example.com', password: 'admin123' };
const USER = { email: 'user@example.com', password: 'user123' };

// Helpers
import { waitForNetworkIdle } from './fixtures/test-data';
```

---

> **Task Format Rules**:
> 1. Each task MUST start with `- [ ]`
> 2. Include `*.spec.js` filename for auto-verification
> 3. Optional `:linenum` for specific test targeting
> 4. Keep descriptions under 80 chars
> 5. Use `[x]` for complete, `[BLOCKED]` for blocked
