#!/bin/bash
# check-file-sizes.sh - Detects files over 500KB in the repository
# Usage: ./scripts/ci/check-file-sizes.sh [--maxkb=500] [--strict]

set -e

MAX_SIZE_KB=500
STRICT_MODE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --maxkb=*)
      MAX_SIZE_KB="${arg#*=}"
      shift
      ;;
    --strict)
      STRICT_MODE=true
      shift
      ;;
  esac
done

MAX_SIZE_BYTES=$((MAX_SIZE_KB * 1024))

echo "🔍 Scanning for files over ${MAX_SIZE_KB}KB..."

# Find large files, excluding standard directories
LARGE_FILES=$(find . -type f -size +${MAX_SIZE_BYTES}c \
  ! -path "./.git/*" \
  ! -path "./node_modules/*" \
  ! -path "./venv/*" \
  ! -path "./.venv/*" \
  ! -path "./__pycache__/*" \
  ! -path "./frontend/node_modules/*" \
  ! -path "./frontend/dist/*" \
  ! -path "./frontend/playwright-report/*" \
  ! -path "./frontend/e2e/screenshots/*" \
  ! -path "./backend/vendor/*" \
  ! -path "./backend/tmp/*" \
  ! -path "./Ian_ML/.venv/*" \
  ! -path "./Ian_ML/venv/*" \
  ! -path "./Ian_ML/mlruns/*" \
  ! -name "*.lock" \
  ! -name "package-lock.json" \
  ! -name "Pipfile.lock" \
  ! -name "go.sum" \
  ! -name "*.bin" \
  ! -name "*.pb" \
  ! -name "*.parquet" \
  ! -name "*.log" \
  ! -path "./data/*" \
  ! -path "./models/*" \
  ! -path "./mlruns/*" \
  ! -path "./logs/*" \
  ! -path "./reports/*" \
  ! -path "./seed" \
  ! -path "./server" \
  ! -path "./backend/server" \
  ! -path "./.pytest_cache/*" \
  ! -name "test-results*.json" \
  ! -name "*.pyc" \
  2>/dev/null | head -50)

if [ -n "$LARGE_FILES" ]; then
  echo ""
  echo "❌ ERROR: Found files over ${MAX_SIZE_KB}KB limit:"
  echo ""
  echo "$LARGE_FILES" | while read -r file; do
    SIZE=$(du -h "$file" | cut -f1)
    echo "  - $file ($SIZE)"
  done
  echo ""
  echo "Please consider:"
  echo "  1. Removing these large files from the repository"
  echo "  2. Adding them to .gitignore if they should be excluded"
  echo "  3. Using Git LFS for binary assets if needed"
  echo ""

  if [ "$STRICT_MODE" = true ]; then
    exit 1
  else
    exit 0
  fi
else
  echo "✅ No files over ${MAX_SIZE_KB}KB found"
fi

# Check git history for large files if in a git repo
if [ -d ".git" ]; then
  echo ""
  echo "🔍 Checking git history for large files..."

  # Check the last 20 commits for large files
  git rev-list --objects --all --max-count=20 2>/dev/null | \
    git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' 2>/dev/null | \
    awk -v limit="$MAX_SIZE_BYTES" '$1 == "blob" && $3 > limit {print $3, $4}' | \
    sort -rn | head -20 > /tmp/large_in_history.txt 2>/dev/null || true

  if [ -s /tmp/large_in_history.txt ]; then
    echo "⚠️  WARNING: Large files found in recent git history:"
    echo ""
    while read -r size file; do
      SIZE_HUMAN=$(numfmt --to=iec "$size" 2>/dev/null || echo "${size}B")
      echo "  - $file ($SIZE_HUMAN)"
    done < /tmp/large_in_history.txt
    echo ""
    echo "Note: These may be acceptable if they're binary assets (images, models, etc.)"
    echo "      Use Git LFS for files that need to be tracked:"
    echo "      git lfs track '*.large_extension'"
    echo ""
  else
    echo "✅ No large files in recent git history"
  fi
fi

echo ""
echo "✅ File size check complete"
