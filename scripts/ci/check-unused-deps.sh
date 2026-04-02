#!/bin/bash
# check-unused-deps.sh - Checks for unused dependencies across all components
# Usage: ./scripts/ci/check-unused-deps.sh [--frontend] [--ml] [--backend]

set -e

CHECK_FRONTEND=false
CHECK_ML=false
CHECK_BACKEND=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --frontend)
      CHECK_FRONTEND=true
      shift
      ;;
    --ml)
      CHECK_ML=true
      shift
      ;;
    --backend)
      CHECK_BACKEND=true
      shift
      ;;
    --all)
      CHECK_FRONTEND=true
      CHECK_ML=true
      CHECK_BACKEND=true
      shift
      ;;
  esac
done

# If no specific flags, check all
if [ "$CHECK_FRONTEND" = false ] && [ "$CHECK_ML" = false ] && [ "$CHECK_BACKEND" = false ]; then
  CHECK_FRONTEND=true
  CHECK_ML=true
  CHECK_BACKEND=true
fi

mkdir -p reports

# Frontend - depcheck
if [ "$CHECK_FRONTEND" = true ]; then
  echo ""
  echo "Checking frontend for unused dependencies..."

  if ! command -v depcheck &> /dev/null; then
    echo "Installing depcheck..."
    npm install -g depcheck
  fi

  cd frontend

  # Run depcheck
  if depcheck --json > ../reports/frontend-unused-deps.json 2>/dev/null; then
    echo "Frontend dependencies are clean"
  else
    echo "Unused dependencies detected in frontend:"
    if command -v jq &> /dev/null; then
      jq -r '.dependencies[] | "  - "' ../reports/frontend-unused-deps.json 2>/dev/null || echo "  (parsing error)"
    else
      cat ../reports/frontend-unused-deps.json
    fi
  fi

  cd ..
fi

# ML - deptry
if [ "$CHECK_ML" = true ]; then
  echo ""
  echo "Checking ML service for unused dependencies..."

  if [ -d "Ian_ML" ]; then
    cd Ian_ML

    if command -v python3 &> /dev/null; then
      if ! python3 -c "import deptry" 2>/dev/null; then
        echo "Installing deptry..."
        python3 -m pip install deptry -q
      fi

      if python3 -m deptry . --output ../reports/ml-unused-deps.txt 2>/dev/null; then
        echo "ML dependencies are clean"
      else
        echo "Unused dependencies detected in ML:"
        if [ -f ../reports/ml-unused-deps.txt ]; then
          cat ../reports/ml-unused-deps.txt
        else
          echo "  (check manually with: deptry .)"
        fi
      fi
    else
      echo "Python 3 not available, skipping ML check"
    fi

    cd ..
  else
    echo "Ian_ML directory not found, skipping ML check"
  fi
fi

# Go Backend - go mod tidy check
if [ "$CHECK_BACKEND" = true ]; then
  echo ""
  echo "Checking Go backend for unused dependencies..."

  if [ -d "backend" ]; then
    cd backend

    if command -v go &> /dev/null; then
      cp go.mod go.mod.before
      cp go.sum go.sum.before

      go mod tidy

      if ! diff -q go.mod.before go.mod >/dev/null 2>&1 || ! diff -q go.sum.before go.sum >/dev/null 2>&1; then
        echo "Go module changes required:"
        diff go.mod.before go.mod > ../reports/go-mod-diff.txt 2>&1 || true
        diff go.sum.before go.sum > ../reports/go-sum-diff.txt 2>&1 || true

        if [ -s ../reports/go-mod-diff.txt ]; then
          echo "  go.mod changes:"
          cat ../reports/go-mod-diff.txt | head -20
        fi

        mv go.mod.before go.mod
        mv go.sum.before go.sum

        exit 1
      else
        echo "Go module dependencies are clean"
      fi
    else
      echo "Go not available, skipping backend check"
    fi

    cd ..
  else
    echo "Backend directory not found, skipping backend check"
  fi
fi

echo ""
echo "Unused dependencies check complete"
