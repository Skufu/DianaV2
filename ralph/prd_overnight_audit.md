# PRD: Overnight Security & Quality Audit

## Overview
Run 4 focused analysis tasks overnight to generate security and quality reports. **NO CODE CHANGES** — analysis only.

## Goals
1. Identify security vulnerabilities before production
2. Audit authentication/authorization implementation  
3. Map test coverage gaps
4. Find CVEs in dependencies

## Output Directory
All reports go to: `ralph/overnight-audit/`

## Success Criteria
- [ ] 4 markdown reports generated
- [ ] Each report has actionable findings
- [ ] No code modifications made

## Reference
- Backend: Go/Gin at `localhost:8080`
- Frontend: React/Vite at `localhost:4000`
- Database: PostgreSQL
- Auth: JWT with refresh tokens
