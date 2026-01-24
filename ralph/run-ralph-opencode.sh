#!/bin/bash
set -e
set -o pipefail

# ═══════════════════════════════════════════════════════════════
# RALPH V3.1 - Overnight-Safe AI Coding Loop
# Fixed: Working directory, Summary output
# ═══════════════════════════════════════════════════════════════

# CRITICAL: Change to project root (parent of ralph/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"
echo "📂 Working directory: $(pwd)"

ITERATIONS="${1:-10}"
UNATTENDED=false
for arg in "$@"; do
    [[ "$arg" == "--unattended" || "$arg" == "-u" ]] && UNATTENDED=true
done

# Configuration (paths relative to project root)
RALPH_DIR="ralph"
CONTEXT_PIN="$RALPH_DIR/context_pin.md"
PRD_FILE="$RALPH_DIR/E2E-Stabilization-PRD.md"
TASK_FILE="$RALPH_DIR/E2E-Stabilization-Tasks.md"
ERROR_LOG="$RALPH_DIR/error_log.txt"
SYSTEM_RULES="$RALPH_DIR/system_rules.md"
LOCK_FILE="$RALPH_DIR/.ralph.lock"
SUMMARY_FILE="$RALPH_DIR/ralph_summary.txt"
MAX_RETRIES=2
MAX_RULES=10
PAUSE_EVERY=10
TEMP_DIR="${TMPDIR:-$RALPH_DIR/tmp}"

mkdir -p "$TEMP_DIR"

START_TIME=$(date +%s)
ITERATIONS_COMPLETED=0

# ─────────────────────────────────────────────────────────────────
# SUMMARY (called on exit - forced or natural)
# ─────────────────────────────────────────────────────────────────
write_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local hours=$((duration / 3600))
    local minutes=$(((duration % 3600) / 60))
    
    local rem=$(grep -cEi "\- ?\[ \]" "$TASK_FILE" 2>/dev/null || echo "0")
    local completed=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
    local blk=$(grep -ci "BLOCKED" "$TASK_FILE" 2>/dev/null || echo "0")
    
    cat > "$SUMMARY_FILE" << EOF
═══════════════════════════════════════════════════════════════
  RALPH SUMMARY - $(date)
═══════════════════════════════════════════════════════════════

Duration: ${hours}h ${minutes}m
Iterations: $ITERATIONS_COMPLETED / $ITERATIONS

📊 Task Status:
   ✅ Completed: $completed
   ⏳ Remaining: $rem
   🚫 Blocked:   $blk

📝 Recent Commits:
$(git log --oneline -10 2>/dev/null || echo "No commits")

📋 Remaining Tasks (first 10):
$(grep -E "^\- ?\[ \]" "$TASK_FILE" 2>/dev/null | head -10 || echo "None")

Check $ERROR_LOG for failure details.
EOF
    echo ""
    echo "📄 Summary written to $SUMMARY_FILE"
}

# Trap to write summary on ANY exit (Ctrl+C, error, natural end)
trap write_summary EXIT

# ─────────────────────────────────────────────────────────────────
# LOCK FILE
# ─────────────────────────────────────────────────────────────────
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE" 2>/dev/null)
        if kill -0 "$pid" 2>/dev/null; then
            echo "❌ Another Ralph running (PID: $pid)"
            exit 1
        fi
        rm -f "$LOCK_FILE"
    fi
    echo $$ > "$LOCK_FILE"
    # Lock cleanup happens via EXIT trap
}

# ─────────────────────────────────────────────────────────────────
# PREFLIGHT
# ─────────────────────────────────────────────────────────────────
preflight() {
    local err=0
    [ ! -f "$CONTEXT_PIN" ] && echo "❌ Missing $CONTEXT_PIN" && err=$((err+1))
    [ ! -f "$TASK_FILE" ] && echo "❌ Missing $TASK_FILE" && err=$((err+1))
    [ ! -f "$PRD_FILE" ] && echo "❌ Missing $PRD_FILE" && err=$((err+1))
    [ $err -gt 0 ] && exit 1
    echo "✅ Preflight passed"
}

# ─────────────────────────────────────────────────────────────────
# SYSTEM RULES
# ─────────────────────────────────────────────────────────────────
init_rules() {
    [ -f "$SYSTEM_RULES" ] && return
    cat > "$SYSTEM_RULES" << 'EOF'
# System Rules (Learned Patterns)
## Active Rules
EOF
}

count_rules() { grep -c "^[0-9]\+\." "$SYSTEM_RULES" 2>/dev/null || echo "0"; }

prune_rules() {
    local c=$(count_rules)
    if [ "$c" -gt "$MAX_RULES" ]; then
        head -n 3 "$SYSTEM_RULES" > "$TEMP_DIR/r.md"
        grep "^[0-9]\+\." "$SYSTEM_RULES" | tail -n "$MAX_RULES" >> "$TEMP_DIR/r.md"
        mv "$TEMP_DIR/r.md" "$SYSTEM_RULES"
    fi
}

# ─────────────────────────────────────────────────────────────────
# TASK MANAGEMENT
# ─────────────────────────────────────────────────────────────────
get_task_line() { grep -nEi "^\- ?\[ \]" "$TASK_FILE" 2>/dev/null | head -1 | cut -d: -f1; }
get_task_text() { sed -n "${1}p" "$TASK_FILE" 2>/dev/null; }

# ─────────────────────────────────────────────────────────────────
# TEST EXTRACTION & VERIFICATION (NEW: Closed-loop ground truth)
# ─────────────────────────────────────────────────────────────────
FRONTEND_DIR="frontend"
TEST_RESULTS="$TEMP_DIR/test-results.json"

# Extract test file name from task text (e.g., "Fix auth.spec.js" -> "auth.spec.js")
extract_test_file() {
    local task="$1"
    echo "$task" | grep -oE '[a-zA-Z0-9_-]+\.spec\.(js|ts)' | head -1
}

# Run a specific test file and return exit code (0=pass, non-zero=fail)
run_test() {
    local test_file="$1"
    if [ -z "$test_file" ]; then
        echo "⚠️ No test file detected in task"
        return 2  # Skip - no test to run
    fi
    
    local test_path="$FRONTEND_DIR/e2e/$test_file"
    if [ ! -f "$test_path" ]; then
        echo "⚠️ Test file not found: $test_path"
        return 2
    fi
    
    echo "🧪 Running: npx playwright test $test_file"
    cd "$FRONTEND_DIR"
    npx playwright test "$test_file" --reporter=json > "../$TEST_RESULTS" 2>&1
    local exit_code=$?
    cd "$PROJECT_ROOT"
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ Test PASSED"
    else
        local failed=$(grep -o '"status":"failed"' "../$TEST_RESULTS" 2>/dev/null | wc -l)
        echo "❌ Test FAILED ($failed failures)"
    fi
    return $exit_code
}

# Get failure summary from JSON results
get_failure_summary() {
    if [ -f "$TEST_RESULTS" ]; then
        # Extract first error message
        grep -oP '"message":"[^"]*"' "$TEST_RESULTS" 2>/dev/null | head -3 | sed 's/"message":"//g' | sed 's/"//g'
    fi
}

# ─────────────────────────────────────────────────────────────────
# ROLE SWITCHING
# ─────────────────────────────────────────────────────────────────
get_role() {
    case "$1" in
        *[Tt]est*) echo "You are a QA Engineer." ;;
        *[Ss]ecurity*|*[Aa]uth*) echo "You are a Security Engineer." ;;
        *[Ff]rontend*|*[Rr]eact*) echo "You are a Frontend Engineer." ;;
        *) echo "You are a Software Engineer." ;;
    esac
}

# ─────────────────────────────────────────────────────────────────
# COMPREHENSION CHECK
# ─────────────────────────────────────────────────────────────────
comprehension_check() {
    [ "$UNATTENDED" = true ] && return
    opencode run "Read @$CONTEXT_PIN. Summarize: project purpose and tech stack in 2 sentences." 2>&1 | head -15
    read -p "AI understands correctly? (y/n): " c
    [[ "$c" != "y" ]] && exit 1
}

# ─────────────────────────────────────────────────────────────────
# MAIN LOOP
# ─────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "  RALPH V3.1 | Iterations: $ITERATIONS | Unattended: $UNATTENDED"
echo "═══════════════════════════════════════════════════════════════"

acquire_lock
preflight
init_rules
comprehension_check

for ((i=1; i<=ITERATIONS; i++)); do
    ITERATIONS_COMPLETED=$i
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Iteration $i/$ITERATIONS"
    
    # Pause point
    if (( i % PAUSE_EVERY == 0 )) && [ "$UNATTENDED" = false ]; then
        read -p "⏸️  Continue? (y/n): " p
        [[ "$p" != "y" ]] && exit 0
    fi
    
    task_line=$(get_task_line)
    [ -z "$task_line" ] && echo "🎉 All done!" && break
    
    task_text=$(get_task_text "$task_line")
    role=$(get_role "$task_text")
    echo "📋 Line $task_line: ${task_text:0:70}..."
    
    # Extract test file from task for verification
    test_file=$(extract_test_file "$task_text")
    
    # Run test BEFORE to establish baseline (optional but useful for tracking)
    if [ -n "$test_file" ]; then
        echo "📊 Pre-check: Testing $test_file"
        run_test "$test_file"
        pre_status=$?
    else
        pre_status=2  # No test file = skip verification
    fi
    
    for ((r=1; r<=MAX_RETRIES; r++)); do
        echo "👷 Attempt $r/$MAX_RETRIES"
        
        # Include test failure info if available
        failure_context=""
        if [ -f "$TEST_RESULTS" ] && [ -n "$test_file" ]; then
            failure_context="Recent test failures: $(get_failure_summary)"
        fi
        
        opencode run "$role
Read: @$CONTEXT_PIN, @$SYSTEM_RULES, @$PRD_FILE, @$TASK_FILE
Complete this task: '$task_text'
$failure_context
Fix the code, then mark [x] when done. Say DONE or BLOCKED." 2>&1 | tee "$TEMP_DIR/out.txt" || true
        
        # ═══════════════════════════════════════════════════════════════
        # GROUND TRUTH VERIFICATION: Run the actual test
        # ═══════════════════════════════════════════════════════════════
        if [ -n "$test_file" ]; then
            echo "🔍 Verifying fix with actual test..."
            run_test "$test_file"
            post_status=$?
            
            if [ $post_status -eq 0 ]; then
                echo "✅ VERIFIED: Test actually passes now!"
                # Mark as complete (in case AI didn't)
                sed -i "${task_line}s/\[ \]/[x]/" "$TASK_FILE" 2>/dev/null || true
                
                # Commit
                commit_type="fix"
                [[ "$task_text" =~ [Tt]est ]] && commit_type="test"
                find . -name "nul" -type f -delete 2>/dev/null || true
                rm -rf ralph/tmp/* 2>/dev/null || true
                git add -A 2>&1 && git commit -m "$commit_type: ${task_text:5:70}" --no-verify 2>/dev/null && echo "📝 Committed" || echo "📝 No changes"
                break
            else
                echo "⚠️ Test still fails after AI fix attempt $r"
            fi
        else
            # No test file to verify - fall back to checkbox detection
            after=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
            if [ "$after" -gt "$before" ]; then
                echo "✅ Task marked complete (no test verification)"
                commit_type="chore"
                [[ "$task_text" =~ [Ff]ix ]] && commit_type="fix"
                find . -name "nul" -type f -delete 2>/dev/null || true
                git add -A 2>&1 && git commit -m "$commit_type: ${task_text:5:70}" --no-verify 2>/dev/null && echo "📝 Committed" || true
                break
            fi
        fi
        
        if grep -qi "BLOCKED" "$TEMP_DIR/out.txt"; then
            sed -i "${task_line}s/\[ \]/[BLOCKED]/" "$TASK_FILE" 2>/dev/null || true
            break
        fi
        
        # Escalate to Ralph 2 with real test failure info
        echo "👔 Ralph 2 analyzing failure..."
        echo "$(date): Attempt $r failed - Test exit code: ${post_status:-unknown}" >> "$ERROR_LOG"
        echo "Failure details: $(get_failure_summary)" >> "$ERROR_LOG"
        tail -30 "$TEMP_DIR/out.txt" >> "$ERROR_LOG"
        
        opencode run "You are Ralph 2. Ralph 1 failed on: '$task_text'
Test exit code: ${post_status:-unknown}
Error: $(get_failure_summary)
Read @$ERROR_LOG, @$TASK_FILE. Either break down the task or add a rule to @$SYSTEM_RULES. Do NOT code." 2>&1 || true
        
        prune_rules
        sleep 2
    done
    
    # Progress
    rem=$(grep -cEi "\- ?\[ \]" "$TASK_FILE" 2>/dev/null || echo "0")
    completed=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
    blk=$(grep -ci "BLOCKED" "$TASK_FILE" 2>/dev/null || echo "0")
    echo "📊 $completed done | $rem remaining | $blk blocked"
    
    [ "$rem" -eq 0 ] && echo "🎉 All complete!" && break
    sleep 3
done

echo ""
echo "🏁 Run complete."
# Summary written automatically by EXIT trap
