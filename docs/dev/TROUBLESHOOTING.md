# Troubleshooting Guide

## Database Connection Issues

### Symptoms
- "failed to ping database. Server will start without database"
- "context deadline exceeded"
- Server starts but database operations fail

### Common Causes & Solutions

#### 1. Neon Database Connection Timeouts

**Cause**: Neon serverless databases may have cold start delays or regional connectivity issues.

**Solutions**:
```bash
# Option A: Try simpler connection string
DB_DSN="postgresql://neondb_owner:your_password@your-host.neon.tech/neondb?sslmode=require"

# Option B: Use direct endpoint (not pooler)
# In your Neon dashboard, try the "Direct connection" string instead of "Pooled connection"

# Option C: Development without database
DB_DSN=""
# App will run in mock mode for development
```

#### 2. Local Development Setup

**Option 1: Run without database**
```bash
# Remove or comment out DB_DSN
# DB_DSN=""
./run-dev.sh
```

**Option 2: Use local PostgreSQL**
```bash
# Install PostgreSQL locally
brew install postgresql  # macOS
sudo apt-get install postgresql  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start  # Ubuntu

# Create database
createdb diana

# Update .env.local
echo 'DB_DSN="postgres://$(whoami)@localhost:5432/diana?sslmode=disable"' > .env.local
```

#### 3. Network Issues

**Check connectivity**:
```bash
# Test basic network connectivity
ping ep-blue-king-a14l0x0l-pooler.ap-southeast-1.aws.neon.tech

# Test database connection
./test-db.sh
```

**Common fixes**:
- Check VPN/firewall settings
- Try from different network
- Verify Neon database is not paused/sleeping

#### 4. Credentials Issues

**Verify in Neon Dashboard**:
1. Go to your Neon project dashboard
2. Check if database is running
3. Regenerate password if needed
4. Copy fresh connection string

## Frontend/Backend Communication Issues

### Symptoms
- "Backend responded with HTML"
- CORS errors in browser console
- 404 errors on API calls

### Solutions

**Check ports match**:
```bash
# Ensure backend port matches frontend API_BASE
grep PORT .env                    # Should show PORT=8080 or 8080
grep VITE_API_BASE .env          # Should match backend port
```

**CORS configuration**:
```bash
# Add your frontend URL to CORS_ORIGINS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**API base path**:
```bash
# Frontend should use full API path
VITE_API_BASE=http://localhost:8080/api/v1
```

## Development Commands

```bash
# Quick health check
curl http://localhost:8080/api/v1/healthz

# Test database connectivity
./test-db.sh

# Clean start
rm -rf frontend/node_modules
cd frontend && npm install
cd .. && ./run-dev.sh

# Check logs
go run ./cmd/server  # Run in foreground to see all logs
```

## Mock Mode Development

The application can run without a database for frontend development:

1. Set `DB_DSN=""` in `.env`
2. Run `./run-dev.sh`
3. Use demo credentials: `demo@diana.app` / `demo123`
4. All API calls will work with mock data

This is perfect for:
- Frontend development
- UI/UX testing
- Demo purposes
- When database is unavailable

## Getting Help

1. Check this troubleshooting guide
2. Review logs in terminal
3. Test individual components with provided scripts
4. Use mock mode for frontend development