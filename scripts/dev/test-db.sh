#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Testing database connection..."

# Load environment
if [[ -f .env ]]; then
    source .env
fi

if [[ -z "${DB_DSN:-}" ]]; then
    echo "❌ DB_DSN not set"
    exit 1
fi

echo "Database: ${DB_DSN%%@*}@***"

# Test with psql if available
if command -v psql >/dev/null 2>&1; then
    echo "📡 Testing with psql..."
    if timeout 10s psql "$DB_DSN" -c "SELECT version();" 2>/dev/null; then
        echo "✅ Direct psql connection successful"
    else
        echo "⚠️  psql connection failed (this doesn't mean Go connection will fail)"
    fi
else
    echo "⚠️  psql not available for testing"
fi

# Test Go connection
echo "🔗 Testing Go database connection..."
cat > /tmp/test_db.go << 'EOF'
package main

import (
    "context"
    "fmt"
    "os"
    "time"
    
    "github.com/jackc/pgx/v5/pgxpool"
)

func main() {
    dsn := os.Args[1]
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    fmt.Println("Creating connection pool...")
    pool, err := pgxpool.New(ctx, dsn)
    if err != nil {
        fmt.Printf("Failed to create pool: %v\n", err)
        os.Exit(1)
    }
    defer pool.Close()
    
    fmt.Println("Testing ping...")
    pingCtx, pingCancel := context.WithTimeout(context.Background(), 15*time.Second)
    defer pingCancel()
    
    if err := pool.Ping(pingCtx); err != nil {
        fmt.Printf("Ping failed: %v\n", err)
        os.Exit(1)
    }
    
    fmt.Println("Testing simple query...")
    var version string
    err = pool.QueryRow(context.Background(), "SELECT version()").Scan(&version)
    if err != nil {
        fmt.Printf("Query failed: %v\n", err)
        os.Exit(1)
    }
    
    fmt.Printf("✅ Success! PostgreSQL version: %.50s...\n", version)
}
EOF

if go mod tidy && go run /tmp/test_db.go "$DB_DSN"; then
    echo "✅ Go database connection test passed"
else
    echo "❌ Go database connection test failed"
    echo ""
    echo "🔧 Possible fixes:"
    echo "1. Check if your Neon database is running"
    echo "2. Verify credentials in DB_DSN"
    echo "3. Try connecting from Neon's web console first"
    echo "4. Check if you need to whitelist your IP"
    echo "5. Consider using connection pooling parameters:"
    echo "   DB_DSN=\"your_url?pool_max_conns=10&pool_min_conns=2\""
fi

rm -f /tmp/test_db.go