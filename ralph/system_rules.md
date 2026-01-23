# System Rules (Learned Patterns)

## Active Rules
3. If the requirement already exists, verify it matches the specification:
4. Only proceed with edits if the requirement is genuinely missing or incorrect
1. Read the function definition in `utils.go` or relevant helper file
2. Verify exact parameter count and types
3. Match the signature exactly when calling the function
4. If you need a different signature, check if it already exists before creating a new one
1. Check if task is already marked complete (has `[x]` in `task_list.md`)
2. If task is complete, verify actual code matches completion claim:
3. If task is incomplete, verify the target file and related dependencies:
4. Only start implementation after confirming task is genuinely incomplete and environment is ready
