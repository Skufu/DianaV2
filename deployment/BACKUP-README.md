# DianaV2 Database Backup System

## Overview

This directory contains the database backup configuration for the DianaV2 production deployment. The backup system ensures data durability and enables recovery from data loss scenarios.

**Validation Contract: VAL-DP-002**

## Components

| File | Description |
|------|-------------|
| `backup-cron.yml` | Kubernetes CronJob configuration for automated backups |
| `BACKUP-README.md` | This documentation file |
| `restoration-test-log.json` | Monthly restoration test results |

## Backup Schedule

- **Daily Backup**: Runs at 2:00 AM UTC (off-peak hours)
- **Retention Policy**: 30 days
- **Restoration Test**: Monthly on the 1st at 3:00 AM UTC

## Storage Options

### Local Storage (Default)

Backups are stored in the `/backups` directory (mounted via PVC). Suitable for single-node deployments.

### S3 Storage (Production)

For production deployments, enable S3 storage by setting:

```yaml
# In diana-backup-config ConfigMap
storage-type: "s3"
```

And configuring the S3 bucket secret:

```bash
kubectl create secret generic diana-backup-secret \
  --from-literal=s3-bucket=diana-backups \
  -n diana
```

## Manual Operations

### Run Backup Manually

```bash
# Using the backup script
./scripts/backup.sh

# Using Kubernetes
kubectl create job --from=cronjob/diana-backup diana-backup-manual-$(date +%s) -n diana
```

### List Available Backups

```bash
./scripts/backup.sh --list

# Kubernetes PVC
kubectl exec -n diana deployment/diana-backend -- ls -lht /backups/
```

### Restore from Backup

```bash
# Restore latest backup
./scripts/backup.sh --restore backups/diana_backup_YYYYMMDD_HHMMSS.sql.gz

# Restore from S3
./scripts/backup.sh --restore s3://diana-backups/diana_backup_YYYYMMDD_HHMMSS.sql.gz
```

### Test Restoration

```bash
./scripts/backup.sh --test
```

## Restoration Test Log

The monthly restoration test results are logged in `restoration-test-log.json`:

```json
{
  "tests": [
    {
      "date": "2026-04-01T03:00:00Z",
      "backup_file": "diana_backup_20260401_020000.sql.gz",
      "result": "passed",
      "tables_restored": 15,
      "duration_seconds": 45
    }
  ],
  "last_test": "2026-04-01T03:00:00Z",
  "pass_rate": "100%"
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backups` | Local backup directory |
| `BACKUP_STORAGE` | `local` | Storage type (`local` or `s3`) |
| `BACKUP_S3_BUCKET` | - | S3 bucket name (required if `BACKUP_STORAGE=s3`) |
| `BACKUP_RETENTION_DAYS` | `30` | Days to retain backups |

### Kubernetes Secrets Required

```bash
# Database credentials
kubectl create secret generic diana-db-secret \
  --from-literal=host=postgres-service \
  --from-literal=user=diana \
  --from-literal=password=your-password \
  --from-literal=database=diana \
  -n diana

# AWS credentials (for S3 storage)
kubectl create secret generic diana-aws-credentials \
  --from-file=config=~/.aws/config \
  --from-file=credentials=~/.aws/credentials \
  -n diana

# Backup configuration
kubectl create secret generic diana-backup-secret \
  --from-literal=s3-bucket=diana-backups \
  -n diana
```

## Alerting

Restoration test failures should trigger alerts. Configure alerting integration:

```yaml
# Example Prometheus alert rule
groups:
  - name: backup
    rules:
      - alert: BackupJobFailed
        expr: kube_job_status_failed{job_name=~"diana-backup.*"} > 0
        for: 5m
        annotations:
          summary: "DianaV2 backup job failed"
          
      - alert: RestorationTestFailed
        expr: kube_job_status_failed{job_name=~"diana-restoration-test.*"} > 0
        for: 1h
        annotations:
          summary: "DianaV2 restoration test failed"
```

## Disaster Recovery Procedure

1. **Identify the backup to restore**:
   ```bash
   ./scripts/backup.sh --list
   ```

2. **Stop the application** (optional, for safety):
   ```bash
   kubectl scale deployment diana-backend --replicas=0 -n diana
   ```

3. **Restore the database**:
   ```bash
   ./scripts/backup.sh --restore backups/diana_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

4. **Verify restoration**:
   ```bash
   ./scripts/backup.sh --test
   ```

5. **Restart the application**:
   ```bash
   kubectl scale deployment diana-backend --replicas=1 -n diana
   ```

6. **Verify application health**:
   ```bash
   kubectl exec -n diana deployment/diana-backend -- curl -sf http://localhost:8080/api/v1/healthz
   ```

## Monitoring Backup Storage

Monitor backup storage usage to prevent disk exhaustion:

```bash
# Check backup directory size
kubectl exec -n diana deployment/diana-backend -- du -sh /backups/

# Check individual backup sizes
kubectl exec -n diana deployment/diana-backend -- ls -lhS /backups/
```

## Compliance

This backup system satisfies:

- **VAL-DP-002**: Database backups automated with daily schedule
- **Retention policy**: 30 days (configurable)
- **Durable storage**: S3 option available
- **Restoration testing**: Monthly automated tests

## Changelog

| Date | Change |
|------|--------|
| 2026-04-01 | Initial backup system implementation |
