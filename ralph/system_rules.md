# System Rules & Memory
# This file contains critical lessons learned from previous errors.
# You MUST follow these rules above all else.

## Learned Rules

### RULE #1: NEVER RUN BUILD, TEST, OR LINT COMMANDS
**Ralph 1 Error**: Attempted `go test` which caused 120s timeout and build failure.
**Reason**: This task is DOCUMENTATION-ONLY verification. No code execution is required.
**Action**: Only use `read`, `glob`, and `edit` tools. Never use `bash` for build/test/lint commands.

### RULE #2: USE FILE EXISTENCE CHECKS BEFORE UPDATING DOCS
**Reason**: Ralph 1 marked T001 complete without actually verifying file paths exist.
**Action**: Before documenting any file path:
1. Use `glob` to confirm the file exists
2. If file doesn't exist, DO NOT document it
3. Only update documentation with VERIFIED existing files

### RULE #3: DOCUMENTATION-ONLY SCOPE - NO CODE CHANGES
**Reason**: Task list explicitly states "Exclusions: NO feature development, NO bug fixes, NO architectural changes"
**Action**: Only update README.md and AGENTS.md files. Never modify:
- Go source files (.go)
- React source files (.jsx, .js)
- Python source files (.py)
- SQL files (.sql)
- Configuration files (.env, package.json, etc.)
- Migration files

### RULE #4: BREAK DOWN TASKS AT FILE/SECTION LEVEL
**Reason**: T001 was too broad, leading to incomplete verification.
**Action**: Each task should focus on ONE specific file section or ONE specific file path verification.

### RULE #5: VERIFICATION-FIRST WORKFLOW
**Reason**: Ralph 1 marked T001 complete without actually verifying file paths.
**Action Pattern**:
1. FIRST: Use `glob` to verify files exist (NEVER assume)
2. SECOND: Read files to understand current content
3. THIRD: Compare documentation vs actual structure
4. FINALLY: Update documentation (only if verified)

**Example WRONG** (Ralph 1):
- ✗ Assume patients.go was deleted
- ✗ Update README without checking
- ✗ Mark task complete

**Example CORRECT**:
- ✓ `glob("backend/internal/http/handlers/patients.go")` → returns nothing
- ✓ Confirm: patients.go doesn't exist
- ✓ Update README
- ✓ Mark task complete

### RULE #6: ALWAYS USE GLOB FOR FILE EXISTENCE CHECKS
**Reason**: Never assume files exist or don't exist.
**Action**: Before any documentation update involving file paths:
```bash
# Correct pattern
glob pattern="backend/internal/http/handlers/*.go"
glob pattern="frontend/src/components/**/*.jsx"
glob pattern="backend/internal/store/sqlc/*.sql.go"

# Wrong pattern (NEVER do this)
read filePath="backend/internal/http/handlers/patients.go"  # This will fail if file doesn't exist
```

### RULE #7: NEVER CREATE SELF-REFERENTIAL TASKS
**Ralph 1 Error**: Task T001 asked to "Remove references to deleted `patients.go` handler" but the task_list.md itself contained that reference on line 20.
**Reason**: This creates an impossible task because completing the task requires modifying the task definition itself, creating a paradox.
**Action**: When reviewing/creating tasks, check if:
1. The task refers to something that appears IN the task description itself
2. Completing the task would require modifying the task list
3. The task asks to remove/update something that's part of the task framework

**Self-Referential Task Pattern to AVOID**:
```
❌ WRONG:
Task T001: Remove references to deleted `patients.go` handler
- [ ] Remove references to deleted `patients.go` handler  # Self-reference!
```

**Correct Task Pattern**:
```
✅ CORRECT:
Task T001: Remove `patients.go` references from project README files
- [ ] Search for "patients.go" in README.md files
- [ ] Update found references
- [ ] Verify no remaining references exist
```

**Detection Rule**: If a task mentions removing/updating something, and that something appears in the task definition text, it's likely self-referential and must be rewritten.