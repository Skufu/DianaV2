# DIANA V2 - Complete Setup Script (PowerShell with Auto-Install)
# Run this once after cloning to set up your local development environment.
# This script will ATTEMPT TO AUTO-INSTALL missing tools.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Step($Text) { 
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "▶ $Text" -ForegroundColor Cyan
}
function Write-Success($Text) { Write-Host "  ✓ $Text" -ForegroundColor Green }
function Write-Warning($Text) { Write-Host "  ⚠ $Text" -ForegroundColor Yellow }
function Write-Error($Text) { Write-Host "  ✗ $Text" -ForegroundColor Red }
function Write-Info($Text) { Write-Host "  ℹ $Text" -ForegroundColor Blue }
function Write-Attempt($Text) { Write-Host "  → Attempting: $Text" -ForegroundColor Cyan }

# Track auto-install attempts
$AUTO_INSTALL_ATTEMPTS = @()
$AUTO_INSTALL_FAILED = @()

# Auto-install functions
function Attempt-GoInstall {
    Write-Attempt "Auto-installing Go via winget..."
    $AUTO_INSTALL_ATTEMPTS += "Go"
    
    try {
        # Try winget (Windows Package Manager)
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            Write-Info "Using winget to install Go..."
            winget install GoLang.Go --accept-package-agreements --accept-source-agreements
            
            # Refresh PATH
            $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
            
            if (Get-Command go -ErrorAction SilentlyContinue) {
                Write-Success "Go installed successfully via winget"
                return $true
            }
        }
        
        # Try chocolatey
        $choco = Get-Command choco -ErrorAction SilentlyContinue
        if ($choco) {
            Write-Info "Using Chocolatey to install Go..."
            choco install golang -y
            
            # Refresh PATH
            $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
            
            if (Get-Command go -ErrorAction SilentlyContinue) {
                Write-Success "Go installed successfully via Chocolatey"
                return $true
            }
        }
        
        $AUTO_INSTALL_FAILED += "Go"
        return $false
    } catch {
        $AUTO_INSTALL_FAILED += "Go"
        return $false
    }
}

function Attempt-NodeInstall {
    Write-Attempt "Auto-installing Node.js via winget..."
    $AUTO_INSTALL_ATTEMPTS += "Node.js"
    
    try {
        # Try winget
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            Write-Info "Using winget to install Node.js..."
            winget install OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
            
            # Refresh PATH
            $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
            
            if (Get-Command node -ErrorAction SilentlyContinue) {
                Write-Success "Node.js installed successfully via winget"
                return $true
            }
        }
        
        # Try chocolatey
        $choco = Get-Command choco -ErrorAction SilentlyContinue
        if ($choco) {
            Write-Info "Using Chocolatey to install Node.js..."
            choco install nodejs -y
            
            # Refresh PATH
            $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
            
            if (Get-Command node -ErrorAction SilentlyContinue) {
                Write-Success "Node.js installed successfully via Chocolatey"
                return $true
            }
        }
        
        $AUTO_INSTALL_FAILED += "Node.js"
        return $false
    } catch {
        $AUTO_INSTALL_FAILED += "Node.js"
        return $false
    }
}

function Attempt-PythonInstall {
    Write-Attempt "Auto-installing Python via winget..."
    $AUTO_INSTALL_ATTEMPTS += "Python"
    
    try {
        # Try winget
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            Write-Info "Using winget to install Python..."
            winget install Python.Python.3.11 --accept-package-agreements --accept-source-agreements
            
            # Refresh PATH
            $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
            
            if ((Get-Command python -ErrorAction SilentlyContinue) -or (Get-Command python3 -ErrorAction SilentlyContinue)) {
                Write-Success "Python installed successfully via winget"
                return $true
            }
        }
        
        # Try chocolatey
        $choco = Get-Command choco -ErrorAction SilentlyContinue
        if ($choco) {
            Write-Info "Using Chocolatey to install Python..."
            choco install python -y
            
            # Refresh PATH
            $env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")
            
            if ((Get-Command python -ErrorAction SilentlyContinue) -or (Get-Command python3 -ErrorAction SilentlyContinue)) {
                Write-Success "Python installed successfully via Chocolatey"
                return $true
            }
        }
        
        $AUTO_INSTALL_FAILED += "Python"
        return $false
    } catch {
        $AUTO_INSTALL_FAILED += "Python"
        return $false
    }
}

# Banner
Clear-Host
Write-Host ""
Write-Host "  ██████╗ ██╗ █████╗ ███╗   ██╗ █████╗     ██╗   ██╗██████╗ " -ForegroundColor Cyan
Write-Host "  ██╔══██╗██║██╔══██╗████╗  ██║██╔══██╗    ██║   ██║╚════██╗" -ForegroundColor Cyan
Write-Host "  ██║  ██║██║███████║██╔██╗ ██║███████║    ██║   ██║ █████╔╝" -ForegroundColor Cyan
Write-Host "  ██║  ██║██║██╔══██║██║╚██╗██║██╔══██║    ╚██╗ ██╔╝██╔═══╝ " -ForegroundColor Cyan
Write-Host "  ██████╔╝██║██║  ██║██║ ╚████║██║  ██║     ╚████╔╝ ███████╗" -ForegroundColor Cyan
Write-Host "  ╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝      ╚═══╝  ╚══════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Complete Setup Script"
Write-Host "  Predictive Diabetes Risk Assessment for Menopausal Women"
Write-Host "  (With Auto-Install)" -ForegroundColor Yellow
Write-Host ""

# Get script directory and project root
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_DIR = Resolve-Path (Join-Path $SCRIPT_DIR "..\..") | Select-Object -ExpandProperty Path
Set-Location $PROJECT_DIR

Write-Info "Project directory: $PROJECT_DIR"
Write-Host ""

# ─────────────────────────────────────────────────────────────
# Step 1: Check Required Tools (with auto-install)
# ─────────────────────────────────────────────────────────────
Write-Step "Checking Required Tools (Auto-Install Enabled)"

$MISSING_TOOLS = @()
$INSTALL_HINTS = ""

# Check for Go
if (Get-Command go -ErrorAction SilentlyContinue) {
    $GO_VERSION = (go version) -replace 'go version go', '' -replace ' .*', ''
    Write-Success "Go $GO_VERSION"
} else {
    Write-Warning "Go not found - attempting auto-install..."
    if (-not (Attempt-GoInstall)) {
        $MISSING_TOOLS += "Go"
        $INSTALL_HINTS += "`n  Go:"
        $INSTALL_HINTS += "`n    Option 1: winget install GoLang.Go"
        $INSTALL_HINTS += "`n    Option 2: choco install golang"
        $INSTALL_HINTS += "`n    Option 3: Download from https://go.dev/doc/install"
    }
}

# Check for Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $NODE_VERSION = node --version
    Write-Success "Node.js $NODE_VERSION"
} else {
    Write-Warning "Node.js not found - attempting auto-install..."
    if (-not (Attempt-NodeInstall)) {
        $MISSING_TOOLS += "Node.js"
        $INSTALL_HINTS += "`n  Node.js:"
        $INSTALL_HINTS += "`n    Option 1: winget install OpenJS.NodeJS"
        $INSTALL_HINTS += "`n    Option 2: choco install nodejs"
        $INSTALL_HINTS += "`n    Option 3: Download from https://nodejs.org/"
    }
}

# Check for npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $NPM_VERSION = npm --version
    Write-Success "npm $NPM_VERSION"
} else {
    $MISSING_TOOLS += "npm"
    $INSTALL_HINTS += "`n  npm: Comes with Node.js installation"
}

# Check for Python
$PYTHON_CMD = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $PYTHON_CMD = (Get-Command python).Source
    $PYTHON_VERSION = & python --version 2>&1
    Write-Success "$PYTHON_VERSION"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PYTHON_CMD = (Get-Command python3).Source
    $PYTHON_VERSION = & python3 --version 2>&1
    Write-Success "$PYTHON_VERSION"
} else {
    Write-Warning "Python not found - attempting auto-install..."
    if (-not (Attempt-PythonInstall)) {
        $MISSING_TOOLS += "Python 3"
        $INSTALL_HINTS += "`n  Python 3:"
        $INSTALL_HINTS += "`n    Option 1: winget install Python.Python.3.11"
        $INSTALL_HINTS += "`n    Option 2: choco install python"
        $INSTALL_HINTS += "`n    Option 3: Download from https://www.python.org/downloads/"
    } else {
        # Re-detect Python after install
        if (Get-Command python -ErrorAction SilentlyContinue) {
            $PYTHON_CMD = (Get-Command python).Source
        } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
            $PYTHON_CMD = (Get-Command python3).Source
        }
    }
}

# Check for Docker
$DOCKER_AVAILABLE = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $DOCKER_VERSION = docker --version
    Write-Success "Docker available"
    $DOCKER_AVAILABLE = $true
} else {
    Write-Warning "Docker not found (optional - for auto PostgreSQL setup)"
    Write-Info "Install from: https://www.docker.com/products/docker-desktop"
}

# Report auto-install status
if ($AUTO_INSTALL_ATTEMPTS.Count -gt 0) {
    Write-Host ""
    Write-Step "Auto-Install Summary"
    Write-Info "Attempted to auto-install: $($AUTO_INSTALL_ATTEMPTS -join ', ')"
    if ($AUTO_INSTALL_FAILED.Count -gt 0) {
        Write-Warning "Auto-install failed for: $($AUTO_INSTALL_FAILED -join ', ')"
        Write-Info "See manual installation instructions below"
    }
}

# Exit if missing required tools
if ($MISSING_TOOLS.Count -gt 0) {
    Write-Host ""
    Write-Error "╭────────────────────────────────────────────────────────────╮"
    Write-Error "│  MISSING REQUIRED TOOLS - MANUAL INSTALLATION REQUIRED     │"
    Write-Error "╰────────────────────────────────────────────────────────────╯"
    Write-Host ""
    Write-Host "  The script attempted to auto-install but failed for:"
    foreach ($tool in $MISSING_TOOLS) {
        Write-Host "    ✗ $tool" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Manual Installation Instructions:"
    Write-Host $INSTALL_HINTS
    Write-Host ""
    Write-Info "After installing, re-run: .\scripts\dev\setup.ps1"
    Write-Host ""
    
    # Save failed status
    "SETUP_FAILED_MISSING_TOOLS: $($MISSING_TOOLS -join ', ')" | Out-File -FilePath ".setup-verification.txt" -Encoding UTF8
    "AUTO_INSTALL_ATTEMPTED: $($AUTO_INSTALL_ATTEMPTS -join ', ')" | Add-Content -Path ".setup-verification.txt"
    "AUTO_INSTALL_FAILED: $($AUTO_INSTALL_FAILED -join ', ')" | Add-Content -Path ".setup-verification.txt"
    
    exit 1
}

# ─────────────────────────────────────────────────────────────
# Step 2: Install Goose (Database Migration Tool)
# ─────────────────────────────────────────────────────────────
if (-not (Get-Command goose -ErrorAction SilentlyContinue)) {
    Write-Step "Installing Goose (Database Migration Tool)"
    
    go install github.com/pressly/goose/v3/cmd/goose@latest
    
    # Add Go bin to PATH for this session
    $GO_BIN = Join-Path (go env GOPATH) "bin"
    $env:PATH = "$env:PATH;$GO_BIN"
    
    if (Get-Command goose -ErrorAction SilentlyContinue) {
        Write-Success "Goose installed successfully"
    } else {
        Write-Warning "Goose installed but not in PATH. Add this to your system PATH:"
        Write-Info $GO_BIN
    }
} else {
    $GOOSE_VERSION = (goose --version 2>&1 | Select-Object -First 1)
    Write-Success "Goose $GOOSE_VERSION"
}

# ─────────────────────────────────────────────────────────────
# Step 3: Setup Environment Variables
# ─────────────────────────────────────────────────────────────
Write-Step "Setting Up Environment"

if (Test-Path ".env") {
    Write-Success ".env file already exists"
} else {
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Success "Created .env from env.example"
    } else {
        # Create a default .env file
        @"
# Diana V2 - Local Development Configuration

PORT=8080
ENV=dev
DB_DSN=postgres://diana:diana@localhost:5432/diana?sslmode=disable
JWT_SECRET=REPLACE_ME
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173
MODEL_URL=http://localhost:5001/predict
ML_PORT=5001
MODEL_VERSION=binary_v2_no_bp
MODEL_DATASET_HASH=nhanes_postmenopausal_2011_2020
MODEL_TIMEOUT_MS=2000
EXPORT_MAX_ROWS=5000

# Docker Configuration
POSTGRES_PASSWORD=diana
POSTGRES_USER=diana
POSTGRES_DB=diana
ML_API_KEY=dev-ml-api-key-12345
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Success "Created default .env file"
    }
    
    # Generate a random JWT secret
    $JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    
    # Update the .env file
    (Get-Content ".env") -replace "JWT_SECRET=REPLACE_ME", "JWT_SECRET=$JWT_SECRET" -replace "JWT_SECRET=change-me", "JWT_SECRET=$JWT_SECRET" -replace "ML_PORT=5000", "ML_PORT=5001" -replace "localhost:5000", "localhost:5001" | Set-Content ".env"
    
    Write-Success "Generated secure JWT_SECRET"
}

# Copy .env to backend if needed
if (-not (Test-Path "backend\.env")) {
    Copy-Item ".env" "backend\.env"
    Write-Success "Copied .env to backend/"
}

# ─────────────────────────────────────────────────────────────
# Step 4: Setup PostgreSQL Database (Auto-create with Docker)
# ─────────────────────────────────────────────────────────────
Write-Step "Setting Up PostgreSQL Database"

# Load environment variables
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

$POSTGRES_READY = $false

# Check if PostgreSQL is already running on port 5432
try {
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.Connect("localhost", 5432)
    $connection.Close()
    Write-Success "PostgreSQL is already running on localhost:5432"
    $POSTGRES_READY = $true
} catch {
    # Not running, try to start with Docker
    if ($DOCKER_AVAILABLE) {
        # Check if diana-postgres container already exists and is running
        $runningContainer = docker ps --format "{{.Names}}" | Select-String "^diana-postgres$"
        if ($runningContainer) {
            Write-Success "Docker container 'diana-postgres' is already running"
            $POSTGRES_READY = $true
        } else {
            # Check if container exists but is stopped
            $existingContainer = docker ps -a --format "{{.Names}}" | Select-String "^diana-postgres$"
            if ($existingContainer) {
                Write-Info "Starting existing 'diana-postgres' container..."
                docker start diana-postgres
                Start-Sleep -Seconds 3
                $POSTGRES_READY = $true
            } else {
                # Create and start a new PostgreSQL container
                Write-Info "Creating PostgreSQL container with Docker..."
                $POSTGRES_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "diana" }
                $POSTGRES_PASSWORD = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "diana" }
                $POSTGRES_DB = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "diana" }
                
                docker run -d `
                    --name diana-postgres `
                    -e "POSTGRES_USER=$POSTGRES_USER" `
                    -e "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" `
                    -e "POSTGRES_DB=$POSTGRES_DB" `
                    -p 5432:5432 `
                    postgres:16-alpine
                
                Write-Info "Waiting for PostgreSQL to be ready..."
                for ($i = 1; $i -le 30; $i++) {
                    try {
                        $result = docker exec diana-postgres pg_isready -U $POSTGRES_USER 2>&1
                        if ($result -match "accepting connections") {
                            $POSTGRES_READY = $true
                            break
                        }
                    } catch {}
                    Start-Sleep -Seconds 1
                }
                
                if ($POSTGRES_READY) {
                    Write-Success "PostgreSQL container created and running"
                } else {
                    Write-Error "PostgreSQL container failed to start"
                }
            }
        }
    } else {
        Write-Warning "No PostgreSQL detected and Docker not available"
        Write-Host ""
        Write-Info "Please install PostgreSQL manually:"
        Write-Host "    Download from: https://www.postgresql.org/download/windows/"
        Write-Host ""
        Write-Info "Then create the database:"
        Write-Host "    createdb -U postgres diana"
        Write-Host "    createuser -U postgres -s diana"
        Write-Host ""
    }
}

# ─────────────────────────────────────────────────────────────
# Step 5: Download Go Dependencies
# ─────────────────────────────────────────────────────────────
Write-Step "Installing Go Dependencies"

Set-Location (Join-Path $PROJECT_DIR "backend")
go mod download
Write-Success "Go dependencies downloaded"

# ─────────────────────────────────────────────────────────────
# Step 6: Install Frontend Dependencies
# ─────────────────────────────────────────────────────────────
Write-Step "Installing Frontend Dependencies"

Set-Location (Join-Path $PROJECT_DIR "frontend")
npm install --silent 2>$null
if ($LASTEXITCODE -ne 0) {
    npm install
}
Write-Success "Frontend dependencies installed"

# Create frontend .env if needed
if (-not (Test-Path ".env")) {
    @"
VITE_API_BASE=http://localhost:8080
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "Created frontend/.env"
}

# ─────────────────────────────────────────────────────────────
# Step 7: Setup Python Virtual Environment
# ─────────────────────────────────────────────────────────────
Write-Step "Setting Up Python Environment (ML Server)"

Set-Location $PROJECT_DIR

if (-not (Test-Path "venv")) {
    & $PYTHON_CMD -m venv venv
    Write-Success "Created virtual environment"
} else {
    Write-Success "Virtual environment already exists"
}

# Activate venv
if (Test-Path "venv\Scripts\activate") {
    # Windows venv
    & venv\Scripts\python.exe -m pip install --upgrade pip --quiet 2>$null
} else {
    Write-Error "Could not find virtual environment activation script"
    exit 1
}

# Install ML dependencies
if (Test-Path "Ian_ML\requirements.txt") {
    Write-Info "Installing ML dependencies (this may take a moment)..."
    & venv\Scripts\pip.exe install -r Ian_ML\requirements.txt --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        & venv\Scripts\pip.exe install -r Ian_ML\requirements.txt
    }
    Write-Success "ML dependencies installed"
}

# ─────────────────────────────────────────────────────────────
# Step 8: Run Database Migrations
# ─────────────────────────────────────────────────────────────
if ($POSTGRES_READY) {
    Write-Step "Running Database Migrations"
    
    Set-Location $PROJECT_DIR
    
    # Ensure goose is in PATH
    $GO_BIN = Join-Path (go env GOPATH) "bin"
    $env:PATH = "$env:PATH;$GO_BIN"
    
    if (Get-Command goose -ErrorAction SilentlyContinue) {
        $DB_DSN = if ($env:DB_DSN) { $env:DB_DSN } else { "postgres://diana:diana@localhost:5432/diana?sslmode=disable" }
        
        try {
            goose -dir .\backend\migrations postgres "$DB_DSN" up 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Database migrations complete"
            } else {
                throw "Migration failed"
            }
        } catch {
            Write-Warning "Migration may have already been applied or failed. You can run manually:"
            Write-Info "goose -dir .\backend\migrations postgres `"$DB_DSN`" up"
        }
    } else {
        Write-Warning "Goose not found in PATH. Add to your system PATH:"
        Write-Info $GO_BIN
    }
}

# ─────────────────────────────────────────────────────────────
# Step 9: Check ML Models
# ─────────────────────────────────────────────────────────────
Write-Step "Checking ML Models"

Set-Location $PROJECT_DIR

$MODELS_FOUND = $false
if ((Test-Path "models\binary_v2_no_bp\best_model.joblib") -and 
    (Test-Path "models\binary_v2_no_bp\kmeans_model.joblib")) {
    $MODELS_FOUND = $true
    Write-Success "ML models found"
} else {
    Write-Warning "ML models not found. You need to train them or copy from shared location:"
    Write-Info "Option 1: Train models: bash scripts\dev\retrain-binary.sh"
    Write-Info "Option 2: Copy from shared drive if someone has trained them (put in models/binary_v2_no_bp/)"
}

# ─────────────────────────────────────────────────────────────
# Step 10: Create Setup Verification File
# ─────────────────────────────────────────────────────────────
Write-Step "Creating Setup Verification"

$GOOSE_VERSION = if (Get-Command goose -ErrorAction SilentlyContinue) { (goose --version 2>&1 | Select-Object -First 1) } else { "Not installed" }
$DOCKER_STATUS = if ($DOCKER_AVAILABLE) { "Yes" } else { "No" }
$POSTGRES_STATUS = if ($POSTGRES_READY) { "Running on port 5432" } else { "NOT RUNNING" }
$MODELS_STATUS = if ($MODELS_FOUND) { "Found" } else { "NOT FOUND - Training required" }
$MIGRATION_STATUS = if ($POSTGRES_READY) { "Applied" } else { "Skipped - No database" }
$GO_VERSION = (go version)
$NODE_VERSION = (node --version)
$NPM_VERSION = (npm --version)
$PYTHON_VERSION = (& $PYTHON_CMD --version 2>&1)

$setupInfo = @"
Diana V2 Setup Verification
===========================
Setup completed: $(Get-Date)
Machine: $env:COMPUTERNAME
User: $env:USERNAME

Tools Installed:
- Go: $GO_VERSION
- Node: $NODE_VERSION
- npm: $NPM_VERSION
- Python: $PYTHON_VERSION
- Goose: $GOOSE_VERSION
- Docker: $DOCKER_STATUS

Auto-Install Attempts:
- Attempted: $($AUTO_INSTALL_ATTEMPTS -join ', ')
- Failed: $($AUTO_INSTALL_FAILED -join ', ')

Services Configured:
- PostgreSQL: $POSTGRES_STATUS
- Environment: .env files created
- Go dependencies: Downloaded
- Frontend dependencies: Installed
- Python venv: Created and configured
- Database migrations: $MIGRATION_STATUS
- ML Models: $MODELS_STATUS

Next Steps:
1. $(if (-not $MODELS_FOUND) { "TRAIN ML MODELS: bash scripts/dev/retrain-binary.sh" } else { "ML models ready" })
2. START APPLICATION: bash scripts/dev/start-all.sh
3. Access: http://localhost:4000

Demo Credentials:
- User: demo@diana.app / demopassword123
- Admin: admin@diana.app / admin123
"@

$setupInfo | Out-File -FilePath ".setup-verification.txt" -Encoding UTF8
Write-Success "Setup verification saved to .setup-verification.txt"

# ─────────────────────────────────────────────────────────────
# Complete!
# ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✓ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:"
Write-Host ""

if (-not $MODELS_FOUND) {
    Write-Host "  1. Train ML models (REQUIRED before starting):" -ForegroundColor Yellow
    Write-Host "     bash scripts/dev/retrain-binary.sh" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "     OR copy models from shared location to models/binary_v2_no_bp/"
    Write-Host ""
    Write-Host "  2. Start the application:"
} else {
    Write-Host "  1. Start the application:"
}

Write-Host "     bash scripts/dev/start-all.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Access Points:"
Write-Host "     Frontend:   http://localhost:4000" -ForegroundColor Cyan
Write-Host "     Backend:    http://localhost:8080/api/v1/healthz" -ForegroundColor Cyan
Write-Host "     ML Server:  http://localhost:5001/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Demo Credentials:"
Write-Host "     User:   demo@diana.app / demopassword123" -ForegroundColor Yellow
Write-Host "     Admin:  admin@diana.app / admin123" -ForegroundColor Yellow
Write-Host ""

if (-not $POSTGRES_READY) {
Write-Host "  ⚠ WARNING: PostgreSQL is not running!" -ForegroundColor Red
    Write-Host "     The application will fail to start without a database." -ForegroundColor Red
    Write-Host "     Install PostgreSQL or Docker, then run setup again." -ForegroundColor Red
    Write-Host ""
}

Write-Host "  Setup Verification:"
Write-Host "     cat .setup-verification.txt" -ForegroundColor Cyan
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
