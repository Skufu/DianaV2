# E2E Testing System Rules

**Purpose**: Critical rules for Ralph when executing E2E testing tasks
3. You log justification in `ralph/error_log.txt` when modifying any test file
1. Log full investigation to `ralph/error_log.txt`
2. Mark test as `NEEDS_HUMAN_REVIEW`
3. Move to next test
1. After configuring JSON reporter, verify `test-results/results.json` exists as a FILE
2. Always use `ls test-results/` to see actual file names if uncertain
3. Never assume paths are files - Windows Git Bash shows "Is a directory" error when you try to cat a directory
1. Run test (single or group)
2. If PASS → Continue to next test
3. If FAIL:
