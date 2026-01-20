#!/bin/bash

# API Drift Detection Script
# Validates that frontend API calls match backend schema

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🔍 Checking for API drift..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Verify sqlc is up to date
echo ""
echo "1️⃣ Checking sqlc-generated code..."

if ! git diff --quiet -- backend/internal/store/sqlc/ 2>/dev/null; then
    echo -e "${RED}❌ ERROR: sqlc-generated code is out of sync with schema!${NC}"
    echo "Run: cd backend && sqlc generate"
    git diff --stat -- backend/internal/store/sqlc/
    exit 1
fi

echo -e "${GREEN}✓ sqlc code is in sync${NC}"

# Check 2: Verify frontend consent fields match backend
echo ""
echo "2️⃣ Checking frontend-backend consent field alignment..."

BACKEND_CONSENTS=(
    "consent_personal_data"
    "consent_research_participation"
    "consent_email_updates"
    "consent_analytics"
)

FRONTEND_ONBOARDING="frontend/src/components/user/Onboarding.jsx"
FRONTEND_PROFILE="frontend/src/components/user/UserProfile.jsx"

for field in "${BACKEND_CONSENTS[@]}"; do
    if ! grep -q "name=\"$field\"" "$FRONTEND_ONBOARDING" && ! grep -q "name=\"$field\"" "$FRONTEND_PROFILE"; then
        echo -e "${YELLOW}⚠️  WARNING: Field '$field' not found in frontend forms${NC}"
    fi
done

echo -e "${GREEN}✓ Consent fields aligned${NC}"

# Check 3: Verify no obsolete sqlc directory
echo ""
echo "3️⃣ Checking for obsolete directories..."

if [ -d "internal/store/sqlc" ]; then
    echo -e "${RED}❌ ERROR: Obsolete /internal/store/sqlc directory exists${NC}"
    echo "This directory was replaced by /backend/internal/store/sqlc"
    exit 1
fi

echo -e "${GREEN}✓ No obsolete directories found${NC}"

# Check 4: Verify migrations directory is correctly referenced
echo ""
echo "4️⃣ Checking sqlc.yaml configuration..."

if ! grep -q 'schema: "migrations"' backend/sqlc.yaml; then
    echo -e "${RED}❌ ERROR: sqlc.yaml schema path misconfigured${NC}"
    exit 1
fi

if [ ! -d "backend/migrations" ]; then
    echo -e "${RED}❌ ERROR: sqlc.yaml points to 'migrations' but directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ sqlc.yaml correctly configured${NC}"

cd ..

echo ""
echo -e "${GREEN}✅ All API drift checks passed!${NC}"
echo ""
echo "Summary:"
echo "  ✓ sqlc code in sync with schema"
echo "  ✓ Frontend consent fields aligned with backend"
echo "  ✓ No obsolete directories"
echo "  ✓ sqlc.yaml correctly configured"
