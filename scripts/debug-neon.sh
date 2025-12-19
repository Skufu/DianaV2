#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Debugging Neon Connection Issues"
echo "=================================="

# Load environment
if [[ -f .env ]]; then
    source .env
fi

BASE_URL="postgresql://neondb_owner:npg_5Ad0LptOrYZR@ep-blue-king-a14l0x0l-pooler.ap-southeast-1.aws.neon.tech/neondb"

echo "Testing different connection string variations..."
echo ""

# Test 1: Without channel_binding
echo "🧪 Test 1: Without channel_binding"
TEST1="${BASE_URL}?sslmode=require"
echo "URL: ${TEST1}"
if timeout 15s go run -ldflags="-s -w" /tmp/test_db.go "$TEST1" 2>/dev/null; then
    echo "✅ SUCCESS: channel_binding was the issue!"
    echo "Use: DB_DSN=\"$TEST1\""
    exit 0
else
    echo "❌ Still failed"
fi
echo ""

# Test 2: Different SSL mode
echo "🧪 Test 2: SSL prefer instead of require"
TEST2="${BASE_URL}?sslmode=prefer"
echo "URL: ${TEST2}"
if timeout 15s go run -ldflags="-s -w" /tmp/test_db.go "$TEST2" 2>/dev/null; then
    echo "✅ SUCCESS: SSL mode was the issue!"
    echo "Use: DB_DSN=\"$TEST2\""
    exit 0
else
    echo "❌ Still failed"
fi
echo ""

# Test 3: Try direct connection (non-pooled)
echo "🧪 Test 3: Try direct endpoint"
DIRECT_URL="postgresql://neondb_owner:npg_5Ad0LptOrYZR@ep-blue-king-a14l0x0l.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
echo "URL: ${DIRECT_URL}"
if timeout 15s go run -ldflags="-s -w" /tmp/test_db.go "$DIRECT_URL" 2>/dev/null; then
    echo "✅ SUCCESS: Pooled connection was the issue!"
    echo "Use: DB_DSN=\"$DIRECT_URL\""
    exit 0
else
    echo "❌ Still failed"
fi
echo ""

# Test 4: Basic connectivity test
echo "🧪 Test 4: Basic network connectivity"
if timeout 10s nc -z ep-blue-king-a14l0x0l-pooler.ap-southeast-1.aws.neon.tech 5432 2>/dev/null; then
    echo "✅ Port 5432 is reachable"
else
    echo "❌ Cannot reach port 5432 - network issue"
fi

echo ""
echo "🔧 Recommendations:"
echo "1. Check your Neon dashboard - database might be sleeping"
echo "2. Try connecting from Neon's web console first"
echo "3. Your IP might need whitelisting"
echo "4. The database could be in a cold start state"
echo "5. Try again in a few minutes"
echo ""
echo "For immediate development, use mock mode:"
echo "   echo 'DB_DSN=\"\"' > .env.local"
echo "   ./run-dev.sh"