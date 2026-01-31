# System Rules & Memory
# This file contains critical lessons learned from previous errors.
# You MUST follow these rules above all else.
3. Task was too abstract to verify automatically
1. Subtask with explicit verification (file exists, is readable)
2. Subtask with content verification (contains specific keywords/phrases)
3. Subtask with artifact creation (create summary document)
4. Final subtask with file output
1. **Before Edit**: Read the file and note the exact line number and current state
2. **Perform Edit**: Use Edit tool with exact oldString/newString match
3. **After Edit**: Read the file again IMMEDIATELY and verify:
4. **Explicit Confirmation**: State the verification result:
5. **Failure Handling**: If verification fails:
