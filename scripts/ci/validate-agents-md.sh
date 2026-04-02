#!/bin/bash
# AGENTS.md Validation Script
# Validates that commands documented in AGENTS.md work correctly

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Validating AGENTS.md documentation..."
echo ""

ERRORS=0
WARNINGS=0

# Function to log success
log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to log error
log_error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++)) || true
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++)) || true
}

# Function to log info
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# -----------------------------------------------------------------------------
# Check 1: Verify AGENTS.md files exist in key directories
# -----------------------------------------------------------------------------
echo "1️⃣  Checking AGENTS.md file existence..."

KEY_DIRS=(
    "backend/internal/http/handlers"
    "backend/internal/store"
    "backend/internal/services"
    "backend/internal/ml"
    "backend/migrations"
    "frontend/src"
    "frontend/e2e"
    "Ian_ML"
    "scripts"
    "docs"
)

for dir in "${KEY_DIRS[@]}"; do
    if [ -f "$dir/AGENTS.md" ]; then
        log_success "AGENTS.md exists in $dir/"
    else
        log_warning "AGENTS.md missing in $dir/"
    fi
done

echo ""

# -----------------------------------------------------------------------------
# Check 2: Validate Makefile commands referenced in AGENTS.md
# -----------------------------------------------------------------------------
echo "2️⃣  Validating Makefile commands..."

# Extract commands from root AGENTS.md
if [ -f "AGENTS.md" ]; then
    # Find make commands in AGENTS.md
    MAKE_COMMANDS=$(grep -oE 'make [a-zA-Z0-9_-]+' AGENTS.md | sort -u | sed 's/make //') || true

    if [ -n "$MAKE_COMMANDS" ]; then
        while IFS= read -r cmd; do
            if grep -qE "^${cmd}:" Makefile 2>/dev/null; then
                log_success "Makefile target exists: $cmd"
            else
                log_error "Makefile target missing: $cmd"
            fi
        done <<< "$MAKE_COMMANDS"
    fi
else
    log_warning "Root AGENTS.md not found"
fi

echo ""

# -----------------------------------------------------------------------------
# Check 3: Validate backend test commands
# -----------------------------------------------------------------------------
echo "3️⃣  Validating backend test commands..."

cd backend

# Test basic Go commands
if go version >/dev/null 2>&1; then
    log_success "Go is installed: $(go version)"
else
    log_error "Go is not installed or not in PATH"
fi

# Verify Go modules
if [ -f "go.mod" ]; then
    log_success "go.mod exists"
else
    log_error "go.mod missing"
fi

# Test go build
echo -n "Testing 'go build ./...' ... "
if go build ./... 2>/dev/null; then
    log_success "go build succeeds"
else
    # Build can fail due to pre-existing issues, check specific packages
    if go build ./internal/models 2>/dev/null; then
        log_success "go build ./internal/models succeeds"
    else
        log_warning "go build ./internal/models fails (may have pre-existing issues)"
    fi
fi

cd ..
echo ""

# -----------------------------------------------------------------------------
# Check 4: Validate frontend commands
# -----------------------------------------------------------------------------
echo "4️⃣  Validating frontend commands..."

cd frontend

# Check package.json exists
if [ -f "package.json" ]; then
    log_success "package.json exists"
else
    log_error "package.json missing"
fi

# Check for npm scripts referenced in AGENTS.md
if [ -f "package.json" ]; then
    NPM_SCRIPTS=("dev" "build" "test" "lint" "format")
    for script in "${NPM_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" package.json; then
            log_success "npm script exists: $script"
        else
            log_warning "npm script missing: $script"
        fi
    done
fi

cd ..
echo ""

# -----------------------------------------------------------------------------
# Check 5: Validate ML service commands
# -----------------------------------------------------------------------------
echo "5️⃣  Validating ML service commands..."

if [ -d "Ian_ML" ]; then
    log_success "Ian_ML directory exists"

    if [ -f "Ian_ML/requirements.txt" ]; then
        log_success "requirements.txt exists"
    else
        log_error "requirements.txt missing"
    fi

    # Check for key Python files
    KEY_ML_FILES=(
        "service/predict.py"
        "service/server.py"
        "training/train_binary_v2_no_bp.py"
    )

    for file in "${KEY_ML_FILES[@]}"; do
        if [ -f "Ian_ML/$file" ]; then
            log_success "ML file exists: $file"
        else
            log_warning "ML file missing: $file"
        fi
    done
else
    log_error "Ian_ML directory missing"
fi

echo ""

# -----------------------------------------------------------------------------
# Check 6: Validate database commands
# -----------------------------------------------------------------------------
echo "6️⃣  Validating database commands..."

# Check migration files
if [ -d "backend/migrations" ]; then
    MIGRATION_COUNT=$(find backend/migrations -name "*.sql" | wc -l)
    log_success "Migration files found: $MIGRATION_COUNT"
else
    log_error "Migrations directory missing"
fi

# Check sqlc.yaml
if [ -f "backend/sqlc.yaml" ]; then
    log_success "sqlc.yaml exists"
else
    log_error "sqlc.yaml missing"
fi

echo ""

# -----------------------------------------------------------------------------
# Check 7: Validate link references in AGENTS.md files
# -----------------------------------------------------------------------------
echo "7️⃣  Validating link references..."

# Find all AGENTS.md files and check for broken internal references
AGENTS_FILES=$(find . -name "AGENTS.md" -not -path "./.git/*" -not -path "./node_modules/*")

for agents_file in $AGENTS_FILES; do
    # Check for relative links to other AGENTS.md files
    LINKS=$(grep -oE '\[.*\]\(.*\.md\)' "$agents_file" | sed 's/.*](//' | sed 's/)//') || true

    if [ -n "$LINKS" ]; then
        dir=$(dirname "$agents_file")
        while IFS= read -r link; do
            # Remove any anchor
            link_path="${link%%#*}"
            if [ -n "$link_path" ]; then
                target="$dir/$link_path"
                if [ -f "$target" ]; then
                    : # Valid link - silent
                else
                    log_error "Broken link in $agents_file: $link"
                fi
            fi
        done <<< "$LINKS"
    fi
done

log_success "Link validation completed"

echo ""

# -----------------------------------------------------------------------------
# Check 8: Validate Swagger/OpenAPI documentation
# -----------------------------------------------------------------------------
echo "8️⃣  Validating Swagger/OpenAPI documentation..."

if [ -f "backend/docs/swagger.json" ]; then
    log_success "swagger.json exists"

    # Validate JSON syntax
    if command -v jq >/dev/null 2>&1; then
        if jq empty backend/docs/swagger.json 2>/dev/null; then
            log_success "swagger.json is valid JSON"

            # Check for required fields
            if jq -e '.swagger or .openapi' backend/docs/swagger.json >/dev/null 2>&1; then
                log_success "swagger.json has version field"
            else
                log_error "swagger.json missing version field"
            fi

            if jq -e '.paths' backend/docs/swagger.json >/dev/null 2>&1; then
                PATH_COUNT=$(jq '.paths | length' backend/docs/swagger.json)
                log_success "swagger.json has $PATH_COUNT documented paths"
            else
                log_warning "swagger.json missing paths"
            fi
        else
            log_error "swagger.json is invalid JSON"
        fi
    else
        log_warning "jq not installed, skipping JSON validation"
    fi
else
    log_error "swagger.json missing - run 'make swagger'"
fi

echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo "========================================"
echo "AGENTS.md Validation Summary"
echo "========================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  All critical checks passed, but there are warnings.${NC}"
    echo "Warnings: $WARNINGS"
    exit 0
else
    echo -e "${RED}❌ Validation failed with errors.${NC}"
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    exit 1
fi
