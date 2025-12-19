#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Diana V2 Local Development Setup"
echo "=================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Check if .env exists
if [[ ! -f .env ]]; then
    echo "📋 Creating .env from env.example..."
    cp env.example .env
    echo "✅ .env created. Please update DB_DSN if needed."
else
    echo "✅ .env file exists"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if npm install; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
cd ..

# Check Go installation
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21+ from https://golang.org/dl/"
    exit 1
fi

echo "🔍 Checking Go version..."
GO_VERSION=$(go version | cut -d' ' -f3 | sed 's/go//')
echo "✅ Go version: $GO_VERSION"

# Download Go dependencies
echo "📦 Downloading Go dependencies..."
if go mod download; then
    echo "✅ Go dependencies downloaded"
else
    echo "❌ Failed to download Go dependencies"
    exit 1
fi

# Test database connection if DB_DSN is set
if [[ -f .env ]]; then
    set -a
    . .env
    set +a
    
    if [[ -n "${DB_DSN:-}" ]]; then
        echo "🔍 Testing database connection..."
        if go run -ldflags="-s -w" ./cmd/server &
        then
            SERVER_PID=$!
            sleep 3
            if kill -0 "$SERVER_PID" 2>/dev/null; then
                echo "✅ Database connection successful"
                kill "$SERVER_PID" 2>/dev/null || true
            else
                echo "⚠️  Server started but may have database issues. Check logs."
            fi
        else
            echo "⚠️  Could not test database connection"
        fi
    else
        echo "⚠️  DB_DSN not set - will run without database"
    fi
fi

echo ""
echo "🎉 Setup complete! To start development:"
echo ""
echo "  Option 1 (Recommended):"
echo "    ./run-dev.sh"
echo ""
echo "  Option 2 (Separate terminals):"
echo "    Terminal 1: go run ./cmd/server"
echo "    Terminal 2: cd frontend && npm run dev"
echo ""
echo "  Backend will run on: http://localhost:8080"
echo "  Frontend will run on: http://localhost:3000 or http://localhost:5173"
echo "  API Health Check: http://localhost:8080/api/v1/healthz"
echo ""