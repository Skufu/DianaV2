# Ralph V3.1 Context Pin

> **DO NOT MODIFY THIS FILE VIA AI** - This is human-curated Ralph context.

## What is Ralph?

Ralph is an **autonomous AI coding loop** that uses [opencode](https://opencode.ai) to automatically complete coding tasks from a task list. It runs unattended (overnight-safe), iteratively processing tasks, running tests, committing changes, and learning from failures.

## Ralph Core Features

| Feature | Description |
|---------|-------------|
| **Task Iteration** | Loops through `task_list.md`, processing one `- [ ]` task per iteration |
| **Role Switching** | Dynamically assigns AI persona based on task keywords (QA, Security, Frontend, etc.) |
| **Comprehension Check** | Optional pre-run verification that AI understood the context correctly |
| **Retry with Escalation** | Failed tasks escalate to "Ralph 2" which analyzes errors and adds learned rules |
| **System Rules** | Accumulated patterns in `system_rules.md` to prevent recurring mistakes |
| **Conventional Commits** | Auto-commits with type prefixes (`feat:`, `fix:`, `chore:`, etc.) |
| **Summary on Exit** | Generates `ralph_summary.txt` on any exit (Ctrl+C, error, or completion) |
| **Lock File** | Prevents concurrent Ralph instances via `.ralph.lock` |

## File Structure

```
ralph/
├── run-ralph-opencode.sh   # Main Ralph V3.1 script
├── context_pin.md          # THIS FILE - project context for AI
├── PRD.md                   # Current problem/requirement document
├── task_list.md             # Task checklist ([ ] pending, [x] done, [BLOCKED])
├── system_rules.md          # Learned patterns from past failures
├── error_log.txt            # Detailed error logs for debugging
├── ralph_summary.txt        # Generated run summary
├── .ralph.lock              # Process lock (PID)
└── Legacy_Runs/             # Historical runs archive
```

## Running Ralph

```bash
# From project root (parent of ralph/)
cd ralph

# Interactive mode (default 10 iterations)
./run-ralph-opencode.sh

# Custom iterations
./run-ralph-opencode.sh 50

# Unattended/overnight mode (skips pauses and comprehension check)
./run-ralph-opencode.sh 50 --unattended
./run-ralph-opencode.sh 50 -u
```

## Configuration Constants

| Constant | Default | Description |
|----------|---------|-------------|
| `ITERATIONS` | 10 | Number of task iterations |
| `MAX_RETRIES` | 2 | Retries per task before moving on |
| `MAX_RULES` | 10 | Maximum system rules before pruning |
| `PAUSE_EVERY` | 10 | Interactive pause interval |

## Task List Format

```markdown
# Task List Title

## Category

- [ ] Uncompleted task description
- [x] Completed task description
- [BLOCKED] Task blocked due to external dependency
```

Ralph finds the **first** `- [ ]` task and works on it until:
1. Task is marked `[x]` (success → commit)
2. Task is marked `[BLOCKED]` (cannot proceed)
3. Max retries exceeded (escalates to Ralph 2)

## AI Prompt Structure

Each iteration sends this prompt to opencode:

```
{Role based on task keywords}
Read: @context_pin.md, @system_rules.md, @PRD.md, @task_list.md
Complete this task: '{task text}'
Run tests. Mark [x] when done. Say DONE or BLOCKED.
```

## Role Assignment Logic

| Task Contains | Assigned Role |
|---------------|---------------|
| `test` | QA Engineer |
| `security`, `auth` | Security Engineer |
| `frontend`, `react` | Frontend Engineer |
| *(default)* | Software Engineer |

## Commit Type Detection

| Task Contains | Commit Type |
|---------------|-------------|
| `test` | `test:` |
| `fix`, `bug`, `error` | `fix:` |
| `add`, `implement`, `create` | `feat:` |
| `refactor`, `split`, `move` | `refactor:` |
| `doc`, `readme` | `docs:` |
| `security`, `auth`, `jwt` | `fix:` (security) |
| *(default)* | `chore:` |

## Ralph 2 (Escalation Agent)

When Ralph 1 fails after max retries, Ralph 2 is invoked:

```
You are Ralph 2. Ralph 1 failed on: '{task}'
Read @error_log.txt, @task_list.md.
Either break down the task or add a rule to @system_rules.md.
Do NOT code.
```

Ralph 2 either:
- Breaks the task into smaller subtasks
- Adds a new rule to prevent the same failure

## Project Context (DianaV2)

Ralph operates on the **DianaV2** project:

| Aspect | Details |
|--------|---------|
| **Purpose** | Medical AI Platform for diabetes risk assessment |
| **Backend** | Go 1.21+, Gin, PostgreSQL, SQLC |
| **Frontend** | React 18, Vite, Tailwind CSS |
| **ML Service** | Python, Flask, scikit-learn |
| **Auth** | JWT tokens (access + refresh) |

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `backend/internal/http/handlers/` | REST API handlers |
| `backend/internal/store/` | Database layer (SQLC) |
| `frontend/src/components/` | React components |
| `Ian_ML/` | Python ML service |

### Important Patterns

- **Error Helpers**: Use `ErrBadRequest()`, `ErrInternal()`, `ErrUnauthorized()`
- **Pagination**: Use `ParsePagination()` + `NewPaginatedResponse()`
- **API Calls**: Use `apiFetch()` (frontend), never raw `fetch`
- **SQLC**: Regenerate after schema changes: `make sqlc`

## Test Commands

```bash
# Backend tests
cd backend && go test ./...

# Frontend E2E
cd frontend && npx playwright test

# ML tests
cd ml && pytest

# Full test suite
make test
```

## Safety Notes

- Ralph creates commits with `--no-verify` (bypasses hooks for speed)
- Lock file prevents parallel execution
- Summary is written on ANY exit (trap)
- Temp files cleaned up between iterations
- Windows `nul` files are auto-cleaned (reserved name issue)
