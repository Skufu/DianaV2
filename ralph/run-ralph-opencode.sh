#!/bin/bash
set -e
set -o pipefail

# ═══════════════════════════════════════════════════════════════
# RALPH V3.2 - Overnight-Safe AI Coding Loop
# Features: Hallucination detection, auto-archive, improved verification
# ═══════════════════════════════════════════════════════════════

# CRITICAL: Change to project root (parent of ralph/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"
echo "📂 Working directory: $(pwd)"

ITERATIONS="${1:-10}"
UNATTENDED=false
ARCHIVE_ON_EXIT=false
ARCHIVE_ONLY=false

for arg in "$@"; do
    [[ "$arg" == "--unattended" || "$arg" == "-u" ]] && UNATTENDED=true
    [[ "$arg" == "--archive" || "$arg" == "-a" ]] && ARCHIVE_ON_EXIT=true
    [[ "$arg" == "--archive-only" ]] && ARCHIVE_ONLY=true
done

# Configuration (paths relative to project root)
RALPH_DIR="ralph"
CONTEXT_PIN="$RALPH_DIR/context_pin.md"
PRD_FILE="$RALPH_DIR/manuscript-merge/PRD.md"
TASK_FILE="$RALPH_DIR/manuscript-merge/task_list.md"
ERROR_LOG="$RALPH_DIR/error_log.txt"
SYSTEM_RULES="$RALPH_DIR/system_rules.md"
LOCK_FILE="$RALPH_DIR/.ralph.lock"
SUMMARY_FILE="$RALPH_DIR/ralph_summary.txt"
MAX_RETRIES=2
MAX_RULES=10
PAUSE_EVERY=10
TEMP_DIR="${TMPDIR:-$RALPH_DIR/tmp}"
ARCHIVE_DIR="$RALPH_DIR/archive"

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

# ─────────────────────────────────────────────────────────────────
# ARCHIVE / CLEANUP (call after run completes)
# ─────────────────────────────────────────────────────────────────
archive_run() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local run_name=$(basename "$(dirname "$TASK_FILE")")
    local archive_path="$ARCHIVE_DIR/${run_name}_${timestamp}"
    
    echo ""
    echo "📦 Archiving run to $archive_path..."
    mkdir -p "$archive_path"
    
    # Archive logs and artifacts
    [ -f "$SUMMARY_FILE" ] && cp "$SUMMARY_FILE" "$archive_path/" && echo "   ✔ Summary"
    [ -f "$ERROR_LOG" ] && cp "$ERROR_LOG" "$archive_path/" && echo "   ✔ Error log"
    [ -f "$SYSTEM_RULES" ] && cp "$SYSTEM_RULES" "$archive_path/" && echo "   ✔ System rules"
    [ -f "$TASK_FILE" ] && cp "$TASK_FILE" "$archive_path/" && echo "   ✔ Task list"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$archive_path/" && echo "   ✔ PRD"
    
    # Archive any output files from tmp
    if [ -d "$TEMP_DIR" ] && [ "$(ls -A "$TEMP_DIR" 2>/dev/null)" ]; then
        cp -r "$TEMP_DIR"/* "$archive_path/" 2>/dev/null && echo "   ✔ Temp files"
    fi
    
    # Clear error log
    echo "" > "$ERROR_LOG"
    echo "   ✔ Cleared error log"
    
    # Reset system rules to fresh state
    cat > "$SYSTEM_RULES" << 'RULES_EOF'
# System Rules (Learned Patterns)
## Active Rules
RULES_EOF
    echo "   ✔ Reset system rules"
    
    # Clean up temp directory
    rm -rf "$TEMP_DIR"/* 2>/dev/null || true
    echo "   ✔ Cleared temp files"
    
    # Remove lock file
    rm -f "$LOCK_FILE" 2>/dev/null || true
    
    # Clean up stray 'nul' files (Windows artifact)
    find . -name "nul" -type f -delete 2>/dev/null || true
    
    echo "🌟 Archive complete: $archive_path"
    echo ""
}

# Handle --archive-only mode (just archive, don't run)
if [ "$ARCHIVE_ONLY" = true ]; then
    echo "📦 Archive-only mode"
    archive_run
    exit 0
fi

# Trap: write summary on exit, optionally archive
cleanup_on_exit() {
    write_summary
    if [ "$ARCHIVE_ON_EXIT" = true ]; then
        archive_run
    fi
}
trap cleanup_on_exit EXIT

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

count_rules() { grep -c "^[0-9]\+\." "$SYSTEM_RULES" 2>/dev/null || echo "0"; true; }

prune_rules() {
    local c=$(count_rules)
    if [ "$c" -gt "$MAX_RULES" ]; then
        # Keep header (first 3 lines)
        head -n 3 "$SYSTEM_RULES" > "$TEMP_DIR/r.md"
        
        # Extract complete rules (handle multi-line by getting content between numbered lines)
        # Use awk to properly extract the last MAX_RULES complete rules
        awk -v max="$MAX_RULES" '
            /^[0-9]+\./ { 
                if (rule != "") rules[++count] = rule
                rule = $0
                next
            }
            rule != "" { rule = rule "\n" $0 }
            END {
                if (rule != "") rules[++count] = rule
                start = (count > max) ? count - max + 1 : 1
                for (i = start; i <= count; i++) print rules[i]
            }
        ' "$SYSTEM_RULES" >> "$TEMP_DIR/r.md"
        
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
    echo "$task" | grep -oE '[a-zA-Z0-9_/-]+\.spec\.(js|ts)' | head -1 || true
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
    
    # Use absolute path for results file
    local results_file="$PROJECT_ROOT/$TEST_RESULTS"
    mkdir -p "$(dirname "$results_file")"
    
    echo "🧪 Running: npx playwright test $test_file"
    cd "$FRONTEND_DIR"
    npx playwright test "$test_file" --reporter=json > "$results_file" 2>&1 || true
    local exit_code=${PIPESTATUS[0]}
    # Fallback: check if results file indicates failure
    if [ $exit_code -eq 0 ] && grep -q '"status":"failed"' "$results_file" 2>/dev/null; then
        exit_code=1
    fi
    cd "$PROJECT_ROOT"
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ Test PASSED"
    else
        local failed=$(grep -o '"status":"failed"' "$results_file" 2>/dev/null | wc -l)
        echo "❌ Test FAILED ($failed failures)"
    fi
    return $exit_code
}

# Get failure summary from JSON results
get_failure_summary() {
    local results_file="$PROJECT_ROOT/$TEST_RESULTS"
    if [ -f "$results_file" ]; then
        # Extract first error message (using extended regex for portability)
        grep -oE '"message":"[^"]*"' "$results_file" 2>/dev/null | head -3 | sed 's/"message":"//g' | sed 's/"//g' || true
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
# HALLUCINATION DETECTION
# ─────────────────────────────────────────────────────────────────
detect_hallucination() {
    local output_file="$1"
    # Detect excessive non-ASCII (Chinese, etc.) - indicates model confusion
    local non_ascii_count=$(grep -oP '[^\x00-\x7F]' "$output_file" 2>/dev/null | wc -l)
    local total_chars=$(wc -c < "$output_file" 2>/dev/null || echo "1")
    
    # If more than 20% non-ASCII, likely hallucination
    if [ "$total_chars" -gt 100 ] && [ "$non_ascii_count" -gt $((total_chars / 5)) ]; then
        echo "🚨 HALLUCINATION DETECTED: Excessive non-ASCII content ($non_ascii_count chars)"
        echo "$(date): HALLUCINATION - Non-English response detected" >> "$ERROR_LOG"
        return 0  # true = hallucination detected
    fi
    
    # Detect completely irrelevant responses (no mention of task-related keywords)
    if ! grep -qiE '(read|file|task|done|blocked|edit|verify|fix|create)' "$output_file" 2>/dev/null; then
        echo "🚨 HALLUCINATION DETECTED: No task-related keywords found"
        echo "$(date): HALLUCINATION - No task keywords in response" >> "$ERROR_LOG"
        return 0
    fi
    
    return 1  # false = no hallucination
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
    
    # Capture current checkbox count BEFORE attempt (for non-test verification)
    before=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
    
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

IMPORTANT: After completing the task, you MUST:
1. Edit the task_list.md file to change '- [ ]' to '- [x]' for this exact task
2. Re-read the file to verify the checkbox was saved
3. Say DONE if successful, or BLOCKED if you cannot complete it

Do NOT just say DONE without editing the checkbox!" 2>&1 | tee "$TEMP_DIR/out.txt" || true
        
        # Allow filesystem to sync after AI completes
        sync 2>/dev/null || true
        sleep 1
        
        # Check for hallucination before proceeding
        if detect_hallucination "$TEMP_DIR/out.txt"; then
            echo "⚠️ Retrying due to hallucination..."
            sleep 2
            continue
        fi
        
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
            # Re-read file to ensure we have latest state (filesystem sync)
            sync 2>/dev/null || true
            sleep 0.5
            after=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
            
            # Also check if THIS specific task line changed
            current_task=$(get_task_text "$task_line")
            if [ "$after" -gt "$before" ] || [[ "$current_task" == *"[x]"* ]]; then
                echo "✅ Task marked complete (no test verification)"
                commit_type="chore"
                [[ "$task_text" =~ [Ff]ix ]] && commit_type="fix"
                find . -name "nul" -type f -delete 2>/dev/null || true
                git add -A 2>&1 && git commit -m "$commit_type: ${task_text:5:70}" --no-verify 2>/dev/null && echo "📝 Committed" || true
                break
            else
                echo "⚠️ Task not marked complete after AI attempt $r"
                echo "   Expected line $task_line to be [x], found: ${current_task:0:50}..."
            fi
        fi
        
        if grep -qi "BLOCKED" "$TEMP_DIR/out.txt" 2>/dev/null; then
            sed -i "${task_line}s/\[ \]/[BLOCKED]/" "$TASK_FILE" 2>/dev/null || true
            break
        fi
        
        # Escalate to Ralph 2 for BOTH test failures AND unmarked checkboxes
        echo "👔 Ralph 2 analyzing failure..."
        echo "$(date): Attempt $r failed - Task: $task_text" >> "$ERROR_LOG"
        if [ -n "$test_file" ]; then
            echo "Test exit code: ${post_status:-unknown}" >> "$ERROR_LOG"
            echo "Failure details: $(get_failure_summary)" >> "$ERROR_LOG"
        else
            echo "Reason: Checkbox not marked [x] after AI attempt" >> "$ERROR_LOG"
        fi
        tail -30 "$TEMP_DIR/out.txt" >> "$ERROR_LOG" 2>/dev/null || true
        
        # Ralph 2 prompt - works for both test and non-test tasks
        failure_info=""
        if [ -n "$test_file" ]; then
            failure_info="Test exit code: ${post_status:-unknown}. Error: $(get_failure_summary)"
        else
            failure_info="AI did not mark task [x] complete. Check if fix was applied correctly."
        fi
        
        opencode run "You are Ralph 2. Ralph 1 failed on: '$task_text'
$failure_info
Read @$ERROR_LOG, @$TASK_FILE. Either break down the task into subtasks OR add a rule to @$SYSTEM_RULES. Do NOT code." 2>&1 || true
        
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
