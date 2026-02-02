# System Rules (Learned Patterns)
## Active Rules
1. Break abstract tasks into subtasks with explicit verification (file exists, contains keywords, artifacts created)
2. **Edit Verification Flow**: Before edit → read file/note line → perform edit → immediately re-read → state verification result → handle failure if needed
3. **Large File Audit/Verification**: For files >50KB or audits of large documents, DO NOT read full content to compare. Instead:
   - Verify file existence and non-zero size.
   - Sample start/end (first 20 lines, last 20 lines) to match expectations.
   - Use `grep` to verify presence of specific unique phrases (anchors).
   - If checks pass, consider consistency verified and mark task complete.
4. **Atomic Task Completion**: When performing a multi-step audit:
   - Perform ONE sub-verification (e.g., check file existence) using low-context tools (ls, grep, read with limit).
   - IMMEDIATELY mark that specific subtask as [x] in the task list.
   - Do NOT batch all verifications into one turn.
   - Do NOT read full files >50KB. Use `read` with `limit` or `grep`.
