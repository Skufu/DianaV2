# Docker Setup for Diana V2

Complete Docker containerization for running Diana V2 on macOS (or any Docker-compatible system).

## Quick Start

```bash
# 1. Ensure your .env file is configured
cp .env.example .env  # if you don't have one
# Edit .env and set: JWT_SECRET, ML_API_KEY, POSTGRES_PASSWORD

# 2. Build and start all services
docker-compose up --build

# 3. Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8080/api/v1/healthz
# ML Server: http://localhost:5000/health
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Nginx) | 80 | React/Vite SPA served via Nginx |
| Backend (Go) | 8080 | Go/Gin REST API |
| ML Server (Python) | 5000 | Flask ML prediction server |
| PostgreSQL | 5432 | Database (exposed for debugging) |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend    │────▶│  PostgreSQL │
│  (Nginx)    │     │    (Go)      │     │   :5432     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  ML Server   │
                    │   (Flask)    │
                    │   :5000      │
                    └──────────────┘
```

## Prerequisites

- Docker Desktop for Mac (or Docker Engine on Linux)
- Docker Compose v2+
- At least 4GB RAM allocated to Docker

## Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Database
POSTGRES_USER=diana
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=diana

# Security (generate strong secrets)
JWT_SECRET=$(openssl rand -base64 32)
ML_API_KEY=$(openssl rand -base64 32)

# CORS (adjust for your domain)
CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:5173

# Frontend API URLs (for production build)
VITE_API_BASE=http://localhost:8080
VITE_ML_BASE=http://localhost:5000
```

### Generating Secrets

```bash
# Generate JWT secret (must be at least 32 characters)
openssl rand -base64 32

# Generate ML API key
openssl rand -base64 32
```

## Usage

### Development Mode

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f ml
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

### Production Mode

```bash
# Use production docker-compose (if available)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Rebuilding After Code Changes

```bash
# Rebuild specific service
docker-compose up -d --build backend

# Rebuild all services
docker-compose up -d --build
```

## Development with Hot Reload

For development with hot reload, use the development override:

```bash
# Start with development settings (bind mounts for live code changes)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

This enables:
- Live code reloading for backend (using Air)
- Volume mounts for ML models
- Hot reload for frontend (Vite dev server on port 5173)

## Database Management

### Run Migrations

Migrations run automatically on backend startup. To run manually:

```bash
# Access backend container
docker-compose exec backend sh

# Run migrations (inside container)
go run ./cmd/migrate up

# Or use goose directly
goose -dir ./migrations postgres "postgres://diana:password@postgres:5432/diana?sslmode=require" up
```

### Seed Demo Data

```bash
# Access backend container
docker-compose exec backend sh

# Run seeder
go run ./cmd/seed
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U diana diana > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U diana diana < backup.sql
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 80
lsof -i :80

# Kill process or change port in docker-compose.yml
# Edit ports section: "8080:80" to use port 8080 instead
```

### Container Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart backend
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker-compose ps

# Access postgres directly
docker-compose exec postgres psql -U diana -d diana

# Check backend logs for connection errors
docker-compose logs backend
```

### ML Models Not Found

Ensure models are in the `models/` directory:

```bash
# Check models exist
ls models/

# Should see: clinical/, visualizations/, *.joblib files
```

### CORS Errors

Update `CORS_ORIGINS` in your `.env` file to include your frontend URL:

```bash
CORS_ORIGINS=http://localhost,http://localhost:80,http://your-domain.com
```

## File Structure

```
.
├── docker-compose.yml          # Main orchestration
├── docker-compose.override.yml # Development overrides
├── build/
│   └── Dockerfile              # Go backend
├── frontend/
│   ├── Dockerfile              # React frontend
│   └── nginx.conf              # Nginx configuration
├── Ian_ML/
│   └── Dockerfile              # Python ML server
├── models/                     # ML models (mounted as volume)
└── docker/
    └── README.md               # This file
```

## Health Checks

All services include health checks:

- **Backend**: `http://localhost:8080/api/v1/healthz`
- **ML Server**: `http://localhost:5000/health`
- **PostgreSQL**: `pg_isready` command

Check health status:
```bash
docker-compose ps
```

## Resource Limits

Default resource allocation:

| Service | Memory Limit | CPU Limit |
|---------|--------------|-----------|
| Backend | 512MB | 1.0 |
| ML Server | 1GB | 1.0 |
| Frontend | 128MB | 0.5 |
| PostgreSQL | 512MB | 1.0 |

Adjust in `docker-compose.yml` if needed:

```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '2.0'
```

## Security Notes

1. **Change default passwords** in `.env` before production use
2. **JWT_SECRET** must be at least 32 characters
3. **ML_API_KEY** should be a secure random string
4. PostgreSQL is exposed on port 5432 for debugging - consider removing this in production
5. All containers run as non-root users (except postgres)

## macOS Specific Notes

### Apple Silicon (M1/M2/M3)

Docker Desktop for Mac handles architecture automatically. The images used support both amd64 and arm64.

### Performance

For better performance on macOS:
1. Allocate at least 4GB RAM to Docker Desktop
2. Enable VirtioFS for file sharing (Docker Desktop Settings)
3. Use `delegated` volume mounts for better I/O performance

### AirPlay Receiver Conflict

Port 5000 is used by macOS AirPlay Receiver. The ML server uses port 5001 by default in development, but Docker uses 5000 internally (mapped to 5000 on host). If you have issues:

```bash
# Disable AirPlay Receiver
# System Settings → General → AirDrop & Handoff → AirPlay Receiver → OFF
```

## Updating

To update after pulling new code:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run any new migrations
docker-compose exec backend go run ./cmd/migrate up
```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (DELETES DATABASE)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Prune unused Docker data
docker system prune -a
```

## Support

For issues specific to the application, see the main [README.md](../README.md).

For Docker issues:
1. Check `docker-compose logs`
2. Verify `.env` configuration
3. Ensure ports are not in use
4. Check Docker Desktop resources allocation
