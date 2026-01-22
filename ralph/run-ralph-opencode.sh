#!/bin/bash
set -e
set -o pipefail

# ═══════════════════════════════════════════════════════════════
# RALPH V3 - Overnight-Safe AI Coding Loop
# ═══════════════════════════════════════════════════════════════

ITERATIONS="${1:-10}"
UNATTENDED=false
for arg in "$@"; do
    [[ "$arg" == "--unattended" || "$arg" == "-u" ]] && UNATTENDED=true
done

# Configuration
CONTEXT_PIN="context_pin.md"
PRD_FILE="PRD-Technical-Debt-Remediation.md"
TASK_FILE="task_list.md"
ERROR_LOG="error_log.txt"
SYSTEM_RULES="system_rules.md"
LOCK_FILE=".ralph.lock"
MAX_RETRIES=2
MAX_RULES=10
PAUSE_EVERY=10
TEMP_DIR="${TMPDIR:-./tmp}"

mkdir -p "$TEMP_DIR"

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
    trap 'rm -f "$LOCK_FILE"' EXIT
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
# TASK MANAGEMENT (line-number based)
# ─────────────────────────────────────────────────────────────────
get_task_line() { grep -nEi "^\- ?\[ \]" "$TASK_FILE" 2>/dev/null | head -1 | cut -d: -f1; }
get_task_text() { sed -n "${1}p" "$TASK_FILE" 2>/dev/null; }
mark_done() { [ -n "$1" ] && sed -i "${1}s/\[ \]/[x]/" "$TASK_FILE" 2>/dev/null; }

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
echo "  RALPH V3 | Iterations: $ITERATIONS | Unattended: $UNATTENDED"
echo "═══════════════════════════════════════════════════════════════"

acquire_lock
preflight
init_rules
comprehension_check

for ((i=1; i<=ITERATIONS; i++)); do
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
            git add -A && git commit -m "Ralph: $(date +%H:%M)" --no-verify 2>/dev/null || true
            break  # Only break retry loop, continue to next iteration
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
echo "🏁 Run complete. Check $ERROR_LOG for details."
