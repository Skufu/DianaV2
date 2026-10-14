#!/bin/bash
# scan-tech-debt.sh - Scans codebase for TODO/FIXME/HACK markers
# Usage: ./scripts/ci/scan-tech-debt.sh [--output=report.md]

set -e

OUTPUT_FILE=""
MIN_CONFIDENCE=80

# Parse arguments
for arg in "$@"; do
  case $arg in
    --output=*)
      OUTPUT_FILE="${arg#*=}"
      shift
      ;;
  esac
done

echo "🔍 Scanning for technical debt markers..."

# Create reports directory if output file specified
if [ -n "$OUTPUT_FILE" ]; then
  mkdir -p "$(dirname "$OUTPUT_FILE")"
fi

# Scan for markers
TODO_COUNT=$(grep -r "TODO" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | wc -l | tr -d ' ' || echo "0")
FIXME_COUNT=$(grep -r "FIXME" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | wc -l | tr -d ' ' || echo "0")
HACK_COUNT=$(grep -r "HACK" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | wc -l | tr -d ' ' || echo "0")
XXX_COUNT=$(grep -r "XXX" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | wc -l | tr -d ' ' || echo "0")

TOTAL=$((TODO_COUNT + FIXME_COUNT + HACK_COUNT + XXX_COUNT))

# Generate report
REPORT="## Technical Debt Report
Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

### Summary
| Marker | Count |
|--------|-------|
| TODO   | $TODO_COUNT |
| FIXME  | $FIXME_COUNT |
| HACK   | $HACK_COUNT |
| XXX    | $XXX_COUNT |
| **Total** | **$TOTAL** |

### Details
"

if [ $TOTAL -gt 0 ]; then
  if [ $TODO_COUNT -gt 0 ]; then
    REPORT+="
#### TODO items
"
    REPORT+=$(grep -rn "TODO" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | head -30 || echo "None found")
  fi

  if [ $FIXME_COUNT -gt 0 ]; then
    REPORT+="

#### FIXME items
"
    REPORT+=$(grep -rn "FIXME" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | head -30 || echo "None found")
  fi

  if [ $HACK_COUNT -gt 0 ]; then
    REPORT+="

#### HACK items
"
    REPORT+=$(grep -rn "HACK" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | head -30 || echo "None found")
  fi

  if [ $XXX_COUNT -gt 0 ]; then
    REPORT+="

#### XXX items
"
    REPORT+=$(grep -rn "XXX" --include="*.go" --include="*.py" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.sql" --exclude-dir={node_modules,venv,.venv,__pycache__,.git,vendor,build,dist} . 2>/dev/null | head -30 || echo "None found")
  fi
fi

# Output report
if [ -n "$OUTPUT_FILE" ]; then
  echo "$REPORT" > "$OUTPUT_FILE"
  echo "Report saved to: $OUTPUT_FILE"
else
  echo "$REPORT"
fi

echo ""
echo "📊 Technical Debt Summary:"
echo "  - TODO: $TODO_COUNT"
echo "  - FIXME: $FIXME_COUNT"
echo "  - HACK: $HACK_COUNT"
echo "  - XXX: $XXX_COUNT"
echo "  - Total: $TOTAL"

# Warning thresholds
if [ $FIXME_COUNT -gt 10 ]; then
  echo ""
  echo "⚠️  WARNING: More than 10 FIXME items found"
  exit 1
fi

if [ $HACK_COUNT -gt 5 ]; then
  echo ""
  echo "⚠️  WARNING: More than 5 HACK items found"
  exit 1
fi

echo ""
echo "✅ Technical debt scan complete"
