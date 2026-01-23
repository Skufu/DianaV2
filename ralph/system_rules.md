# System Rules & Memory
# This file contains critical lessons learned from previous errors.
# You MUST follow these rules above all else.

## Learned Rules

1. [2026-01-22] **Atomic Task Granularity Rule**: When a task involves making changes to 3+ files or affects 100+ lines across multiple files, BREAK IT DOWN into smaller, atomic, file-by-file tasks. Each atomic task must:
   - Affect only ONE file
   - Be testable independently (run tests for that specific file/module)
   - Be commitable independently (atomic commits)
   - Have a clear rollback strategy (git revert works cleanly)
    - Rationale: Mass changes across multiple files create:
      - Increased failure surface (one mistake breaks many files)
      - Hard debugging (can't isolate which file caused the failure)
      - Difficult rollback (must revert entire large change, losing good work)
      - Long feedback loops (must complete all work before testing)
    - Example: REQ-1.2 originally asked to replace 155+ error responses across all handlers in one task. This was broken down into 13 per-file tasks, each testable and commitable independently.

2. [2026-01-23] **Task List Synchronization Rule**: After successfully completing any task from task_list.md, you MUST:
    - Mark the corresponding checkbox(es) as complete (change `- [ ]` to `- [x]`)
    - Update progress tracking section at the bottom of task_list.md
    - Do this BEFORE reporting task completion to the user
    - Rationale: Ralph 1 completed `refresh_token_repo.go` successfully (86 lines, tests pass, build pass) but failed to update task_list.md line 399. This caused confusion about task status and wasted time re-analyzing completed work.

3. [2026-01-23] **Manual Testing Prerequisite Rule**: For tasks requiring browser-based measurements (React DevTools, Lighthouse audits, Chrome Memory profiler, etc.):
    - Do NOT attempt code-only solutions when the success criteria depend on manual testing
    - Verify if the task can be automated with available tools (Playwright, E2E tests, headless browsers)
    - If NOT automatable, mark the task as BLOCKED with reason: "Manual browser testing required"
    - Rationale: Ralph 1 attempted to optimize React re-renders (REQ-3.3) by adding `useCallback`/`useMemo`/`memo` hooks, but the success metric "React Re-renders per Session: >100 → <20" requires React DevTools Profiler in a browser. Code changes were correct, but verification is impossible without manual testing.