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