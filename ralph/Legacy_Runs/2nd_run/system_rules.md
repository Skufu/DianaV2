# System Rules & Memory
# This file contains critical lessons learned from previous errors.
# You MUST follow these rules above all else.

## Learned Rules

### Rule 1: ES Module Export Verification (CRITICAL)
**Problem**: Using `require()` to verify ES module exports causes `ERR_REQUIRE_ESM` errors
**Context**: Frontend files (`.js`, `.jsx`) use ES modules with `export const`
**Solution**: 
- **NEVER** use `node -e "require('./path/to/file.js')"` to verify exports
- **ALWAYS** use `grep` or `read` to check for export statements directly
- **Example**: `grep "export const signupApi" frontend/src/api.js`
- **Alternative**: Check import usage in consuming components to verify export exists

### Rule 2: Task Completion Verification
**Problem**: Don't confuse "task done" with "verification failed"
**Context**: A task might be complete even if your verification method crashes
**Solution**:
- If verification fails but code clearly exists, try a different verification method first
- Don't mark a task as failed just because your test script crashed
- Use multiple verification approaches: grep, read, check imports