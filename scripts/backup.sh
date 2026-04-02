#!/bin/bash
# DianaV2 Database Backup Script
# Automated PostgreSQL backup with retention policy and durable storage
#
# Security Feature: Uses .pgpass file for credential authentication instead of
# PGPASSWORD environment variable. This prevents credential exposure in process
# listings (ps, top) and shell history. The .pgpass file is created in a secure
# temp directory with 0600 permissions and cleaned up after each operation.
#
# Usage:
#   ./scripts/backup.sh                  # Create backup
#   ./scripts/backup.sh --restore FILE   # Restore from backup
#   ./scripts/backup.sh --list           # List available backups
#   ./scripts/backup.sh --test           # Test restoration - monthly test
#
# Environment variables:
#   DB_DSN - PostgreSQL connection string - required
#   BACKUP_STORAGE - Storage type: local or s3 - default: local
#   BACKUP_S3_BUCKET - S3 bucket name for backups - required if BACKUP_STORAGE=s3
#   BACKUP_RETENTION_DAYS - Days to keep backups - default: 30
#   BACKUP_DIR - Local backup directory - default: ./backups
#
# Validation Contract: VAL-DP-002
# Security: Credentials handled via secure .pgpass file (not PGPASSWORD export)

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="diana_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Parse database connection from DB_DSN or individual DB_* variables
# Supports standard database connection string format
parse_db_dsn() {
    # If DB_DSN is set, use it; otherwise construct from individual vars
    if [[ -n "$DB_DSN" ]]; then
        # Extract components from DSN string
        DB_USER=$(echo "$DB_DSN" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASS=$(echo "$DB_DSN" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo "$DB_DSN" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo "$DB_DSN" | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo "$DB_DSN" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    elif [[ -n "$DB_HOST" ]]; then
        # Use individual environment variables
        : "${DB_USER:?DB_USER or DB_DSN required}"
        : "${DB_PASS:?DB_PASS or DB_DSN required}"
        : "${DB_NAME:?DB_NAME or DB_DSN required}"
        DB_PORT="${DB_PORT:-5432}"
        # DSN not needed for operations - use individual vars directly
    else
        echo "ERROR: DB_DSN or DB_HOST/DB_USER/DB_PASS/DB_NAME environment variables required"
        exit 1
    fi
    
    # Set defaults
    DB_PORT="${DB_PORT:-5432}"
}

# Initialize backup directory
init_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "${BACKUP_DIR}/restoration_tests"
    
    if [[ ! -f "$LOG_FILE" ]]; then
        touch "$LOG_FILE"
        echo "[$(date)] Backup system initialized" >> "$LOG_FILE"
    fi
}

# Log backup operation
log_backup() {
    local status="$1"
    local message="$2"
    echo "[$(date)] ${status}: ${message}" >> "$LOG_FILE"
}

# Setup secure password file (.pgpass) for PostgreSQL authentication
# This avoids exposing credentials in environment variables or process listings
setup_pgpass() {
    # Create secure temporary directory for pgpass file
    local pgpass_dir
    pgpass_dir=$(mktemp -d -t diana_backup_XXXXXX)
    
    # Create pgpass file with restricted permissions (0600 - only owner can read)
    local pgpass_file="${pgpass_dir}/.pgpass"
    
    # Format: hostname:port:database:username:password
    # Using wildcard for database to allow connection to any database on this host
    echo "${DB_HOST}:${DB_PORT}:*:${DB_USER}:${DB_PASS}" > "$pgpass_file"
    
    # Set restrictive permissions - PostgreSQL requires 0600 or refuses to use the file
    chmod 0600 "$pgpass_file"
    
    # Return the file path via global variable
    PGPASS_FILE="$pgpass_file"
    PGPASS_DIR="$pgpass_dir"
    
    log_backup "INFO" "Created secure .pgpass file at: ${pgpass_file}"
}

# Cleanup secure password file - must be called after pg operations complete
cleanup_pgpass() {
    if [[ -n "$PGPASS_FILE" && -f "$PGPASS_FILE" ]]; then
        rm -f "$PGPASS_FILE"
        log_backup "INFO" "Removed secure .pgpass file"
    fi
    if [[ -n "$PGPASS_DIR" && -d "$PGPASS_DIR" ]]; then
        rm -rf "$PGPASS_DIR"
    fi
    unset PGPASS_FILE PGPASS_DIR
}

# Create database backup
create_backup() {
    parse_db_dsn
    init_backup_dir
    
    log_backup "INFO" "Starting backup for database: $DB_NAME"
    
    # Setup secure pgpass file (avoids PGPASSWORD environment variable exposure)
    setup_pgpass
    
    # Ensure cleanup happens even on error
    trap cleanup_pgpass EXIT
    
    # Set PGPASSFILE to use our secure temp file instead of default ~/.pgpass
    export PGPASSFILE="$PGPASS_FILE"
    
    local backup_path="${BACKUP_DIR}/${BACKUP_NAME}"
    
    # Use pg_dump with --clean --if-exists for safe restoration
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip > "$backup_path"; then
        local size=$(ls -lh "$backup_path" | awk '{print $5}')
        log_backup "SUCCESS" "Backup created: ${BACKUP_NAME} - size: ${size}"
        
        # Upload to S3 if configured
        if [[ "$BACKUP_STORAGE" == "s3" ]]; then
            upload_to_s3 "$backup_path"
        fi
        
        # Apply retention policy
        apply_retention
        
        echo "Backup created successfully: ${backup_path}"
        echo "Size: ${size}"
    else
        log_backup "ERROR" "Backup failed for database: $DB_NAME"
        rm -f "$backup_path"
        echo "ERROR: Backup failed"
        exit 1
    fi
    
    # Cleanup handled by trap on EXIT
}

# Upload backup to S3
upload_to_s3() {
    local backup_path="$1"
    
    if [[ -z "$BACKUP_S3_BUCKET" ]]; then
        log_backup "WARNING" "S3 bucket not configured, skipping upload"
        return
    fi
    
    log_backup "INFO" "Uploading backup to S3: ${BACKUP_S3_BUCKET}"
    
    if command -v aws &> /dev/null; then
        if aws s3 cp "$backup_path" "s3://${BACKUP_S3_BUCKET}/${BACKUP_NAME}"; then
            log_backup "SUCCESS" "Backup uploaded to S3: s3://${BACKUP_S3_BUCKET}/${BACKUP_NAME}"
        else
            log_backup "ERROR" "S3 upload failed"
            echo "WARNING: S3 upload failed, local backup retained"
        fi
    else
        log_backup "WARNING" "AWS CLI not available, skipping S3 upload"
        echo "WARNING: AWS CLI not installed, backup stored locally only"
    fi
}

# Apply retention policy - delete backups older than RETENTION_DAYS
apply_retention() {
    log_backup "INFO" "Applying retention policy: ${RETENTION_DAYS} days"
    
    # Find and delete old local backups
    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log_backup "INFO" "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "diana_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -print0 2>/dev/null || true)
    
    if [[ $deleted_count -gt 0 ]]; then
        log_backup "INFO" "Retention policy applied: ${deleted_count} old backups deleted"
    fi
}

# Restore database from backup
restore_backup() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        echo "ERROR: Backup file required for restoration"
        echo "Usage: ./scripts/backup.sh --restore FILE"
        exit 1
    fi
    
    parse_db_dsn
    
    local backup_path
    if [[ "$backup_file" == "s3://"* ]]; then
        # Download from S3 first
        backup_path="${BACKUP_DIR}/temp_restore.sql.gz"
        if command -v aws &> /dev/null; then
            aws s3 cp "$backup_file" "$backup_path"
        else
            echo "ERROR: AWS CLI required for S3 restoration"
            exit 1
        fi
    elif [[ -f "$backup_file" ]]; then
        backup_path="$backup_file"
    elif [[ -f "${BACKUP_DIR}/${backup_file}" ]]; then
        backup_path="${BACKUP_DIR}/${backup_file}"
    else
        echo "ERROR: Backup file not found: ${backup_file}"
        exit 1
    fi
    
    log_backup "INFO" "Starting restoration from: $(basename "$backup_path")"
    
    # Setup secure pgpass file (avoids PGPASSWORD environment variable exposure)
    setup_pgpass
    
    # Ensure cleanup happens even on error
    trap cleanup_pgpass EXIT
    
    # Set PGPASSFILE to use our secure temp file
    export PGPASSFILE="$PGPASS_FILE"
    
    # Restore database
    if gunzip -c "$backup_path" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
        log_backup "SUCCESS" "Restoration completed from: $(basename "$backup_path")"
        echo "Restoration completed successfully"
    else
        log_backup "ERROR" "Restoration failed from: $(basename "$backup_path")"
        echo "ERROR: Restoration failed"
        exit 1
    fi
    
    # Cleanup handled by trap on EXIT
    
    # Cleanup temp file if downloaded from S3
    if [[ "$backup_file" == "s3://"* ]]; then
        rm -f "$backup_path"
    fi
}

# List available backups
list_backups() {
    echo "=== Local Backups ==="
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -lht "${BACKUP_DIR}/diana_backup_*.sql.gz" 2>/dev/null || echo "No local backups found"
    else
        echo "Backup directory not initialized"
    fi
    
    if [[ "$BACKUP_STORAGE" == "s3" ]] && [[ -n "$BACKUP_S3_BUCKET" ]]; then
        echo ""
        echo "=== S3 Backups ==="
        if command -v aws &> /dev/null; then
            aws s3 ls "s3://${BACKUP_S3_BUCKET}/" --recursive | grep "diana_backup_" || echo "No S3 backups found"
        else
            echo "AWS CLI not available"
        fi
    fi
}

# Test restoration - monthly restoration test
test_restoration() {
    parse_db_dsn
    init_backup_dir
    
    log_backup "INFO" "Starting monthly restoration test"
    
    # Find most recent backup
    local latest_backup=$(ls -t "${BACKUP_DIR}/diana_backup_*.sql.gz" 2>/dev/null | head -1)
    
    if [[ -z "$latest_backup" ]]; then
        log_backup "WARNING" "No backup available for restoration test"
        echo "WARNING: No backup available for restoration test"
        return 1
    fi
    
    # Create test database name
    local test_db="${DB_NAME}_restore_test_${TIMESTAMP}"
    
    log_backup "INFO" "Creating test database: ${test_db}"
    
    # Setup secure pgpass file (avoids PGPASSWORD environment variable exposure)
    setup_pgpass
    
    # Ensure cleanup happens even on error
    trap cleanup_pgpass EXIT
    
    # Set PGPASSFILE to use our secure temp file
    export PGPASSFILE="$PGPASS_FILE"
    
    # Create test database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE ${test_db};"
    
    # Restore backup to test database
    local test_success=false
    local table_count=0
    if gunzip -c "$latest_backup" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db"; then
        # Verify restoration by checking tables exist
        table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
        
        if [[ $table_count -gt 0 ]]; then
            test_success=true
            log_backup "SUCCESS" "Restoration test passed: ${table_count} tables restored in test database"
            echo "Restoration test PASSED"
            echo "Tables restored: ${table_count}"
        else
            log_backup "ERROR" "Restoration test failed: No tables found in test database"
            echo "Restoration test FAILED: No tables restored"
        fi
    else
        log_backup "ERROR" "Restoration test failed: SQL execution error"
        echo "Restoration test FAILED"
    fi
    
    # Cleanup test database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${test_db};"
    
    # Cleanup handled by trap on EXIT
    
    # Record test result
    local test_log="${BACKUP_DIR}/restoration_tests/test_${TIMESTAMP}.log"
    {
        echo "Restoration Test Report"
        echo "Date: $(date)"
        echo "Backup: $(basename "$latest_backup")"
        echo "Test Database: ${test_db}"
        echo "Result: ${test_success}"
        echo "Tables Count: ${table_count}"
    } > "$test_log"
    
    if [[ "$test_success" == true ]]; then
        return 0
    else
        return 1
    fi
}

# Show backup status
show_status() {
    echo "=== DianaV2 Backup Status ==="
    echo ""
    echo "Configuration:"
    echo "  Backup Directory: ${BACKUP_DIR}"
    echo "  Retention Days: ${RETENTION_DAYS}"
    echo "  Storage Type: ${BACKUP_STORAGE:-local}"
    if [[ "$BACKUP_STORAGE" == "s3" ]]; then
        echo "  S3 Bucket: ${BACKUP_S3_BUCKET:-not configured}"
    fi
    echo ""
    
    if [[ -f "$LOG_FILE" ]]; then
        echo "Recent Operations:"
        tail -10 "$LOG_FILE"
    fi
}

# Show help
show_help() {
    echo "DianaV2 Database Backup Script"
    echo ""
    echo "Usage:"
    echo "  ./scripts/backup.sh                  Create backup"
    echo "  ./scripts/backup.sh --restore FILE   Restore from backup"
    echo "  ./scripts/backup.sh --list           List available backups"
    echo "  ./scripts/backup.sh --test           Test restoration"
    echo "  ./scripts/backup.sh --status         Show backup status"
    echo ""
    echo "Environment Variables:"
    echo "  DB_DSN               PostgreSQL connection string - required"
    echo "  BACKUP_STORAGE       Storage type: local or s3 - default: local"
    echo "  BACKUP_S3_BUCKET     S3 bucket name - required if BACKUP_STORAGE=s3"
    echo "  BACKUP_RETENTION_DAYS  Days to keep backups - default: 30"
    echo "  BACKUP_DIR           Local backup directory - default: ./backups"
}

# Main entry point
main() {
    local cmd="${1:-}"
    
    case "$cmd" in
        --restore)
            restore_backup "$2"
            ;;
        --list)
            list_backups
            ;;
        --test)
            test_restoration
            ;;
        --status)
            show_status
            ;;
        --help)
            show_help
            ;;
        *)
            create_backup
            ;;
    esac
}

main "$@"
