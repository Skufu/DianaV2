#!/bin/bash
# Diana V2 Demo Video Recording Setup Script
# This script prepares the environment for recording the demo video

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       Diana V2 Demo Video Recording Setup                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Checking if Diana V2 is running...${NC}"

# Check if services are running
BACKEND_URL="http://localhost:8080/api/v1/healthz"
FRONTEND_URL="http://localhost:4000"
ML_URL="http://localhost:5001/health"

BACKEND_UP=false
FRONTEND_UP=false
ML_UP=false

if curl -s "$BACKEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    BACKEND_UP=true
else
    echo -e "${YELLOW}✗ Backend is not running${NC}"
fi

if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
    FRONTEND_UP=true
else
    echo -e "${YELLOW}✗ Frontend is not running${NC}"
fi

if curl -s "$ML_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ML server is running${NC}"
    ML_UP=true
else
    echo -e "${YELLOW}✗ ML server is not running${NC}"
fi

if [ "$BACKEND_UP" = false ] || [ "$FRONTEND_UP" = false ] || [ "$ML_UP" = false ]; then
    echo ""
    echo -e "${YELLOW}Some services are not running. Starting them now...${NC}"
    echo "Run: bash scripts/dev/start-all.sh"
    echo ""
    read -p "Press Enter to continue after starting services, or Ctrl+C to exit..."
fi

echo ""
echo -e "${BLUE}Step 2: Seeding demo data...${NC}"

# Run seed to ensure demo accounts exist
cd "$(dirname "$0")/.."
if [ -f "./seed" ]; then
    ./seed || echo "Seed script completed (may have already been run)"
else
    echo "Seed binary not found, skipping..."
fi

echo ""
echo -e "${BLUE}Step 3: Creating demo assessments...${NC}"

# Demo credentials
DEMO_EMAIL="demo@diana.app"
DEMO_PASS="demopassword123"
ADMIN_EMAIL="admin@diana.app"
ADMIN_PASS="admin123"

echo "Demo User: $DEMO_EMAIL / $DEMO_PASS"
echo "Admin User: $ADMIN_EMAIL / $ADMIN_PASS"

echo ""
echo -e "${BLUE}Step 4: Recording Environment Checklist${NC}"
echo ""
echo "Please verify the following before recording:"
echo ""
echo "[ ] Screen resolution set to 1920x1080"
echo "[ ] Browser zoom at 100%"
echo "[ ] Notifications disabled (Do Not Disturb ON)"
echo "[ ] Desktop clean (hide icons if possible)"
echo "[ ] Browser: Chrome in Incognito mode"
echo "[ ] Cursor highlighting enabled (Cursor Pro or similar)"
echo "[ ] Microphone muted (unless doing voiceover)"
echo "[ ] Screen recording software ready (OBS/Screen Studio)"
echo ""

echo -e "${BLUE}Step 5: Recording Scene Guide${NC}"
echo ""
echo "Scene 3 - Registration (1:00-1:45):"
echo "  → Navigate to http://localhost:4000"
echo "  → Show login screen"
echo "  → Click 'Sign up' and fill registration"
echo "  → Complete onboarding flow"
echo ""

echo "Scene 4 - Assessment (1:45-3:00):"
echo "  → Login as demo@diana.app"
echo "  → Click 'New Assessment'"
echo "  → Input: Age=52, BMI=28.5, Waist=88, HDL=45, Triglycerides=150"
echo "  → Submit and wait for result"
echo "  → Show SHAP explanations"
echo ""

echo "Scene 5 - Dashboard (3:00-4:00):"
echo "  → Show main dashboard with risk score"
echo "  → Navigate to Insights tab"
echo "  → Scroll through visualizations"
echo "  → Show trend charts"
echo ""

echo "Scene 6 - Admin (4:00-4:45):"
echo "  → Login as admin@diana.app"
echo "  → Show admin dashboard"
echo "  → Navigate to User Management"
echo "  → Show Audit Logs"
echo "  → Show Model Traceability"
echo ""

echo "Scene 8 - Mobile & Export (5:30-6:15):"
echo "  → Show responsive design (resize browser)"
echo "  → Generate PDF export"
echo "  → Show exported PDF"
echo ""

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Setup Complete! Ready to record.                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Access Points:"
echo "  Frontend: http://localhost:4000"
echo "  Backend:  http://localhost:8080"
echo ""
echo "Demo Accounts:"
echo "  User:  demo@diana.app / demopassword123"
echo "  Admin: admin@diana.app / admin123"
echo ""
echo "Video Plan: ./demo-video/VIDEO_PLAN.md"
echo ""
