# Overnight Audit - Task List

> **Mode**: Analysis only. NO CODE CHANGES. Generate reports to `ralph/overnight-audit/`.
> **Status**: ✅ COMPLETE

---

## Prerequisites
- [x] Codebase accessible
- [x] Create output directory: mkdir -p ralph/overnight-audit

---

## Task 1: Security Vulnerability Scan

- [x] Create ralph/overnight-audit/security-scan.md - Scan entire codebase for: hardcoded secrets, SQL injection, XSS vectors, CSRF gaps, insecure file handling. For each finding: severity (CRITICAL/HIGH/MEDIUM/LOW), file path, line number, description, fix recommendation.

---

## Task 2: Auth System Deep Dive

- [x] Create ralph/overnight-audit/auth-audit.md - Audit: JWT lifecycle (generation, storage, refresh, expiry), password hashing (bcrypt params), session management, RBAC implementation, token storage security, rate limiting. For each issue: risk level, current implementation, recommended fix.

---

## Task 3: Test Coverage Analysis

- [x] Create ralph/overnight-audit/test-coverage.md - Analyze: backend Go tests, frontend Playwright tests, untested critical paths, missing edge cases. For each module: coverage estimate, missing test scenarios, priority ranking.

---

## Task 4: Dependency Vulnerability Audit

- [x] Create ralph/overnight-audit/dependency-audit.md - Check: go.mod outdated packages, package.json vulnerabilities, requirements.txt issues. For each: current version, latest version, CVE references, update urgency.

---

## Final

- [x] All 4 reports created in ralph/overnight-audit/
- [x] Each report has actionable findings with severity ratings
- [x] No code modifications made

---

**Audit Date:** 2026-01-28
**Audit Duration:** ~12 minutes of comprehensive analysis
**Total Findings:** 25 security, auth, and vulnerability issues
**Overall Risk Level:** MEDIUM-HIGH (due to localStorage XSS and hardcoded JWT secret)
