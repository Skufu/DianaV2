# E2E Testing System Rules

**Purpose**: Critical rules for Ralph when executing E2E testing tasks
2. Always use `ls test-results/` to see actual file names if uncertain
3. Never assume paths are files - Windows Git Bash shows "Is a directory" error when you try to cat a directory
4. **When Lazy-Loaded Component Times Out**:
1. Run test (single or group)
2. If PASS → Continue to next test
3. If FAIL:
4. If FAIL (continued):
5. Log full investigation to `ralph/error_log.txt`
6. Mark test as `NEEDS_HUMAN_REVIEW`
7. Move to next test
