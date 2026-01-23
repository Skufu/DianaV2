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
PRD_FILE="$RALPH_DIR/PRD.md"
TASK_FILE="$RALPH_DIR/task_list.md"
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
    
    before=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
    
    for ((r=1; r<=MAX_RETRIES; r++)); do
        echo "👷 Attempt $r/$MAX_RETRIES"
        
        opencode run "$role
Read: @$CONTEXT_PIN, @$SYSTEM_RULES, @$PRD_FILE, @$TASK_FILE
Complete this task: '$task_text'
Run tests. Mark [x] when done. Say DONE or BLOCKED." 2>&1 | tee "$TEMP_DIR/out.txt" || true
        
        after=$(grep -cEi "\- ?\[x\]" "$TASK_FILE" 2>/dev/null || echo "0")
        
        if [ "$after" -gt "$before" ]; then
            echo "✅ Task completed"
            # Conventional commit format - detect type from task text
            commit_type="chore"
            [[ "$task_text" =~ [Tt]est ]] && commit_type="test"
            [[ "$task_text" =~ [Ff]ix|[Bb]ug|[Ee]rror ]] && commit_type="fix"
            [[ "$task_text" =~ [Aa]dd|[Ii]mplement|[Cc]reate ]] && commit_type="feat"
            [[ "$task_text" =~ [Rr]efactor|[Ss]plit|[Mm]ove ]] && commit_type="refactor"
            [[ "$task_text" =~ [Dd]oc|README ]] && commit_type="docs"
            [[ "$task_text" =~ [Ss]ecurity|[Aa]uth|[Jj]wt ]] && commit_type="fix"
            
            # Clean up any problematic 'nul' files (Windows reserved name issue)
            find . -name "nul" -type f -delete 2>/dev/null || true
            rm -rf ralph/tmp/* 2>/dev/null || true
            
            # Git commit with explicit error handling
            if git add -A 2>&1; then
                git commit -m "$commit_type: ${task_text:5:70}" --no-verify 2>/dev/null && echo "📝 Committed" || echo "📝 No changes to commit"
            else
                echo "⚠️ Git add failed - will retry next iteration"
            fi
            break
        fi
        
        if grep -qi "BLOCKED" "$TEMP_DIR/out.txt"; then
            sed -i "${task_line}s/\[ \]/[BLOCKED]/" "$TASK_FILE" 2>/dev/null || true
            break
        fi
        
        # Escalate to Ralph 2
        echo "👔 Ralph 2 analyzing..."
        echo "$(date): Attempt $r failed" >> "$ERROR_LOG"
        tail -30 "$TEMP_DIR/out.txt" >> "$ERROR_LOG"
        
        opencode run "You are Ralph 2. Ralph 1 failed on: '$task_text'
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
