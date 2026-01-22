#!/bin/bash
set -e
set -o pipefail  # CRITICAL: Catches errors inside pipes (the "tee trap" fix)

if [ -z "$1" ]; then
    echo "Usage: bash run-ralph-opencode.sh <iterations>"
    exit 1
fi

# Configuration
PRD_FILE="PRD-Technical-Debt-Remediation.md"
TASK_FILE="task_list.md"
ERROR_LOG="error_log.txt"
SYSTEM_RULES="system_rules.md"  # Persistent learning across iterations
MAX_RETRIES=2
MAX_RULES=10  # Cap rules to prevent context bloat
TEMP_DIR="${TMPDIR:-./tmp}"

# Create temp directory (portable for Windows/Linux/Mac)
mkdir -p "$TEMP_DIR"

# Initialize system rules file if it doesn't exist
if [ ! -f "$SYSTEM_RULES" ]; then
    cat > "$SYSTEM_RULES" << 'EOF'
# System Rules (Persistent Learning)
# These rules are learned from past failures and apply to ALL tasks.
# MAX 10 RULES - oldest rules are auto-removed when limit is reached.

## Active Rules
<!-- Rules will be added here by Ralph 2 when failures occur -->
EOF
    echo "📝 Created $SYSTEM_RULES for persistent learning"
fi

# Function to count current rules
count_rules() {
    grep -c "^[0-9]\+\." "$SYSTEM_RULES" 2>/dev/null || echo "0"
}

# Function to prune old rules if over limit
prune_rules() {
    local rule_count=$(count_rules)
    if [ "$rule_count" -gt "$MAX_RULES" ]; then
        echo "🧹 Pruning old rules (keeping newest $MAX_RULES)..."
        # Keep header and last MAX_RULES numbered rules
        head -n 6 "$SYSTEM_RULES" > "$TEMP_DIR/rules_temp.md"
        grep "^[0-9]\+\." "$SYSTEM_RULES" | tail -n "$MAX_RULES" >> "$TEMP_DIR/rules_temp.md"
        mv "$TEMP_DIR/rules_temp.md" "$SYSTEM_RULES"
    fi
}

echo "🚀 Starting Two-Ralph System for $1 iterations"
echo "👷 Ralph 1: Worker Agent"
echo "👔 Ralph 2: Manager Agent"
echo "📚 System Rules: $SYSTEM_RULES ($(count_rules) active rules)"
echo ""

for ((i=1; i<=$1; i++)); do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Iteration $i of $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check for blocked tasks
    if grep -q "\[BLOCKED\]" "$TASK_FILE" 2>/dev/null; then
        blocked_count=$(grep -c "\[BLOCKED\]" "$TASK_FILE" 2>/dev/null || echo "0")
        echo "⚠️  Warning: $blocked_count task(s) marked as [BLOCKED]. Skipping those."
    fi
    
    # Count completed tasks BEFORE this iteration
    before_count=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
    
    retry_count=0
    task_success=false
    
    while [ $retry_count -lt $MAX_RETRIES ] && [ "$task_success" = false ]; do
        echo "👷 Ralph 1 (Worker) attempting task... (attempt $((retry_count + 1))/$MAX_RETRIES)"
        
        ralph1_output="$TEMP_DIR/ralph1_output.txt"
        ralph1_exit_code=0
        
        # Ralph 1: Worker attempts the task (with system rules for compound learning)
        opencode run "Read @$PRD_FILE, @$TASK_FILE, and @$SYSTEM_RULES. Complete the next unchecked task (marked with '- [ ]'). Run tests and commit if successful. Update the checkbox to [x] when done. If you cannot complete the task, explain why but do NOT mark it complete." 2>&1 | tee "$ralph1_output" || ralph1_exit_code=$?
        
        # Check for SUCCESS using observable state change (not LLM self-report)
        after_count=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
        
        if [ "$after_count" -gt "$before_count" ]; then
            echo "✅ Task marked complete in $TASK_FILE ($before_count → $after_count)"
            task_success=true
            break
        elif [ $ralph1_exit_code -ne 0 ]; then
            echo "⚠️  OpenCode exited with code $ralph1_exit_code"
            task_success=false
        else
            echo "⚠️  No new task was marked complete"
            task_success=false
        fi
        
        # Ralph 1 failed - escalate to Ralph 2
        echo "⚠️  Escalating to Ralph 2 (Manager)..."
        echo "───────────────────────────────────────"
        echo "$(date): Iteration $i, Attempt $((retry_count + 1)) failed" >> "$ERROR_LOG"
        echo "Exit code: $ralph1_exit_code" >> "$ERROR_LOG"
        tail -50 "$ralph1_output" >> "$ERROR_LOG"  # Only last 50 lines to prevent bloat
        echo "───────────────────────────────────────" >> "$ERROR_LOG"
        
        echo "👔 Ralph 2 (Manager) analyzing the problem..."
        
        ralph2_output="$TEMP_DIR/ralph2_output.txt"
        
        # Ralph 2: Manager debugs AND updates system rules for compound learning
        opencode run "You are Ralph 2, the Manager Agent. Ralph 1 failed. 
1. Read @$ERROR_LOG (last failure), @$PRD_FILE, and @$TASK_FILE.
2. Analyze what went wrong.
3. Take ONE action: break down task in @$TASK_FILE, fix config, or mark as [BLOCKED].
4. CRITICAL: If this failure reveals a pattern, add a numbered rule to @$SYSTEM_RULES (format: 'N. [DATE] Rule text'). 
5. Do NOT write code yourself - only prepare for Ralph 1 retry." 2>&1 | tee "$ralph2_output" || true
        
        # Prune rules if over limit
        prune_rules
        
        echo ""
        echo "📝 Ralph 2 provided guidance. Ralph 1 will retry..."
        echo "📚 System Rules: $(count_rules) active rules"
        retry_count=$((retry_count + 1))
        
        # Update before_count for next attempt
        before_count=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
        
        # Brief pause before retry
        sleep 3
    done
    
    # If still failed after retries
    if [ "$task_success" = false ]; then
        echo "❌ Task failed after $MAX_RETRIES attempts."
        echo "$(date): Iteration $i - Task failed permanently after $MAX_RETRIES attempts" >> "$ERROR_LOG"
        echo ""
        echo "💡 Options:"
        echo "   1. Check $ERROR_LOG for details"
        echo "   2. Manually fix the issue and re-run"
        echo "   3. Mark the task as [BLOCKED] in $TASK_FILE"
        echo ""
        
        # Continue to next task
        echo "⏭️  Moving to next task..."
    fi
    
    # Progress report
    remaining=$(grep -cEi "\- ?\[ \]" "$TASK_FILE" 2>/dev/null || echo "0")
    completed=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
    blocked=$(grep -c "\[BLOCKED\]" "$TASK_FILE" 2>/dev/null || echo "0")
    
    echo ""
    echo "📊 Progress: $completed completed, $remaining remaining, $blocked blocked"
    
    if [ "$remaining" -eq 0 ]; then
        echo ""
        echo "🎉 All tasks complete after $i iterations!"
        exit 0
    fi
    
    echo "⏳ Waiting 5 seconds before next iteration..."
    sleep 5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Completed $1 iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Remaining tasks: $(grep -cEi "\- ?\[ \]" "$TASK_FILE" 2>/dev/null || echo "0")"
echo "✅ Completed tasks: $(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")"
echo "🚫 Blocked tasks: $(grep -c "\[BLOCKED\]" "$TASK_FILE" 2>/dev/null || echo "0")"
echo "📚 System rules learned: $(count_rules)"
echo "📊 Check $ERROR_LOG for escalation history."
