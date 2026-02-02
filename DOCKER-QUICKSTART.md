# Docker Quick Reference for Diana V2

## 🚀 Quick Start (macOS)

```bash
# 1. Navigate to project directory
cd /path/to/DianaV2

# 2. Start everything (development mode)
./docker-start.sh dev

# 3. Open browser to http://localhost:5173
```

## 📋 Prerequisites

1. **Docker Desktop for Mac** installed and running
2. **.env file** configured with your secrets

### Setting up .env

```bash
# Copy example
cp .env.example .env

# Generate secrets
export JWT_SECRET=$(openssl rand -base64 32)
export ML_API_KEY=$(openssl rand -base64 32)

# Edit .env and update:
# - JWT_SECRET=$JWT_SECRET
# - ML_API_KEY=$ML_API_KEY
# - POSTGRES_PASSWORD=your-password
```

## 🎯 Common Commands

### Using the helper script (recommended)

```bash
./docker-start.sh dev      # Start development mode
./docker-start.sh prod     # Start production mode
./docker-start.sh stop     # Stop all services
./docker-start.sh logs     # View logs
./docker-start.sh status   # Check service health
./docker-start.sh clean    # Remove everything (WARNING: deletes data)
```

### Using docker-compose directly

```bash
# Development (with hot reload)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build

# Production
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🌐 Access Points

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | http://localhost:5173 | http://localhost |
| Backend API | http://localhost:8080 | http://localhost:8080 |
| ML Server | http://localhost:5000 | http://localhost:5000 |
| PostgreSQL | localhost:5432 | (internal only) |

## 🔧 Development Workflow

### 1. Start Development Server

```bash
./docker-start.sh dev
```

This starts:
- Frontend on port 5173 (Vite dev server with hot reload)
- Backend on port 8080 (Go with Air hot reload)
- ML Server on port 5000 (Flask with auto-reload)
- PostgreSQL on port 5432

### 2. Make Code Changes

Changes are automatically detected and services reload:
- **Frontend**: Edit files in `frontend/src/` → Auto-reloads
- **Backend**: Edit files in `backend/` → Air auto-rebuilds
- **ML Server**: Edit files in `Ian_ML/` → Flask auto-reloads

### 3. View Logs

```bash
# All services
./docker-start.sh logs

# Specific service
docker-compose logs -f backend
docker-compose logs -f ml
docker-compose logs -f frontend
```

### 4. Database Operations

```bash
# Open PostgreSQL console
./docker-start.sh db

# Run migrations manually
./docker-start.sh migrate

# Seed demo data
./docker-start.sh seed
```

## 🐛 Troubleshooting

### "Port already in use"

```bash
# Find what's using port 80
lsof -i :80

# Kill it or change port in docker-compose.yml
```

### "Docker not running"

```bash
# Start Docker Desktop
open -a Docker

# Wait for it to start, then retry
./docker-start.sh dev
```

### "JWT_SECRET not configured"

```bash
# Generate and set JWT_SECRET
export SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$SECRET" >> .env
```

### "Cannot connect to database"

```bash
# Check if postgres is running
./docker-start.sh status

# Check postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### "ML models not found"

```bash
# Ensure models directory exists
ls models/

# Should see joblib files and clinical/ directory
```

## 📊 Monitoring

### Check Service Status

```bash
./docker-start.sh status
```

### Health Endpoints

```bash
# Backend
curl http://localhost:8080/api/v1/healthz

# ML Server
curl http://localhost:5000/health

# Frontend
curl http://localhost:5173  # or http://localhost for prod
```

### Resource Usage

```bash
# View container stats
docker stats

# View disk usage
docker system df
```

## 🧹 Cleanup

```bash
# Stop services
./docker-start.sh stop

# Remove containers and volumes (DELETES DATABASE)
./docker-start.sh clean

# Prune unused Docker data
docker system prune -a
```

## 🔄 Updates

When pulling new code:

```bash
# Pull latest
git pull

# Rebuild and restart
./docker-start.sh stop
./docker-start.sh dev

# Run any new migrations
./docker-start.sh migrate
```

## 💾 Backup & Restore

### Backup Database

```bash
docker-compose exec postgres pg_dump -U diana diana > backup.sql
```

### Restore Database

```bash
docker-compose exec -T postgres psql -U diana diana < backup.sql
```

## 🔐 Security Notes

1. **Never commit .env file** - it contains secrets
2. **Change default passwords** before production use
3. **JWT_SECRET must be at least 32 characters**
4. **ML_API_KEY should be a secure random string**

## 🍎 macOS Specific

### Apple Silicon (M1/M2/M3)

Docker Desktop handles architecture automatically. All images support arm64.

### Performance Tips

1. **Allocate at least 4GB RAM** to Docker Desktop
2. **Enable VirtioFS** in Docker Desktop Settings
3. **Disable AirPlay Receiver** if using port 5000:
   - System Settings → General → AirDrop & Handoff → AirPlay Receiver → OFF

### Keyboard Shortcuts

```bash
# Quick start (add to .zshrc or .bash_profile)
alias diana-up='cd /path/to/DianaV2 && ./docker-start.sh dev'
alias diana-down='cd /path/to/DianaV2 && ./docker-start.sh stop'
alias diana-logs='cd /path/to/DianaV2 && ./docker-start.sh logs'
```

## 📚 Additional Resources

- Full Docker documentation: `docker/README.md`
- Application README: `README.md`
- Backend docs: `backend/README.md`
- Frontend docs: `frontend/README.md`
- ML docs: `Ian_ML/README.md`

## 🆘 Getting Help

1. Check logs: `./docker-start.sh logs`
2. Check status: `./docker-start.sh status`
3. Review Docker docs: `docker/README.md`
4. Check application README: `README.md`
