#!/bin/bash
# Manual Database Setup Script for Windows
# Run this in Git Bash if the automated setup fails due to password prompts.

echo "Please enter your PostgreSQL password for user 'postgres' when prompted."
psql -U postgres -c "CREATE USER diana WITH PASSWORD 'diana' SUPERUSER;"
psql -U postgres -c "CREATE DATABASE diana OWNER diana;"

echo "Database 'diana' and user 'diana' created."
echo "Running migrations..."

export DB_DSN="postgres://diana:diana@localhost:5432/diana?sslmode=disable"
goose -dir ./backend/migrations postgres "$DB_DSN" up

echo "Done!"
