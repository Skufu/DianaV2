# Scripts - Shell Utilities

This folder contains shell scripts for development and operations.

## Quick Reference

| Script | What it does | When to use |
|--------|--------------|-------------|
| `setup.sh` | Install dependencies, create `.env` | First time setup |
| `run-dev.sh` | Start frontend + backend servers | Daily development |
| `start-ml.sh` | Train/start ML models | ML development |
| `test-db.sh` | Test database connection | Debugging DB issues |
| `start-all.sh` | Start all services together | Full stack testing |

## Usage

```bash
# First time setup
bash scripts/setup.sh

# Start development servers
bash scripts/run-dev.sh

# Start ML server only  
bash scripts/start-ml-server.sh

# Test database connection
bash scripts/test-db.sh
```

## Other Scripts

- `debug-neon.sh` - Debug Neon database connectivity
- `download_nhanes.sh` - Download NHANES dataset
