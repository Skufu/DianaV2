# DIANA V2 - Start All Services (PowerShell Version)
# Starts: ML Server, Go Backend, Frontend

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_DIR = Resolve-Path (Join-Path $SCRIPT_DIR "..\..")
Set-Location $PROJECT_DIR

function Write-Green($Text) { Write-Host $Text -ForegroundColor Green }
function Write-Yellow($Text) { Write-Host $Text -ForegroundColor Yellow }
function Write-Red($Text) { Write-Host $Text -ForegroundColor Red }
function Write-Cyan($Text) { Write-Host $Text -ForegroundColor Cyan }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "DIANA V2 - Starting All Services" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Detect Python
$PYTHON = $null
if (Test-Path "venv\Scripts\python.exe") {
    $PYTHON = (Resolve-Path "venv\Scripts\python.exe").Path
    Write-Green "Using virtual environment (venv\Scripts)"
} elseif (Test-Path "venv\bin\python.exe") {
    $PYTHON = (Resolve-Path "venv\bin\python.exe").Path
    Write-Green "Using virtual environment (venv\bin)"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $PYTHON = (Get-Command python).Source
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PYTHON = (Get-Command python3).Source
} else {
    Write-Red "Error: Python not found. Please install Python 3.10+"
    exit 1
}

# Function to kill process on port
function Stop-ProcessOnPort($Port) {
    Write-Cyan "Checking port $Port..."
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Yellow "Killing process $($proc.Id) on port $Port..."
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }
        }
    } catch {}
}

# Cleanup function
$script:PROCESSES = @()

function Clear-AllProcesses {
    Write-Host ""
    Write-Yellow "Shutting down services..."
    Get-Job | Stop-Job -ErrorAction SilentlyContinue | Remove-Job -ErrorAction SilentlyContinue
    Get-Process | Where-Object { $_.Name -in @("python", "python3", "go", "node", "npm") } | Stop-Process -Force -ErrorAction SilentlyContinue
}

try {
    [Console]::TreatControlCAsInput = $true
} catch {}

# Check ML models
if (-not (Test-Path "models/clinical_3class/random_forest.joblib") -and 
    -not (Test-Path "models/clinical_3class/xgboost.joblib") -and 
    -not (Test-Path "models/clinical_3class/best_model.joblib")) {
    Write-Red "ML models not found. Run 'bash scripts/dev/retrain-clinical.sh' first."
    exit 1
}

# Load environment
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    if (-not (Test-Path "backend/.env")) {
        Copy-Item ".env" "backend/.env" -Force
    }
}

# Set default ports
$env:ML_PORT = if ($env:ML_PORT) { $env:ML_PORT } else { "5001" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "8080" }
$env:MODEL_URL = "http://localhost:$($env:ML_PORT)/predict"

# Create logs directory
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

# Cleanup ports first
Stop-ProcessOnPort -Port $env:ML_PORT
Stop-ProcessOnPort -Port $env:PORT
Stop-ProcessOnPort -Port 4000
Start-Sleep -Seconds 2

# ============================================
# Start ML Server
# ============================================
Write-Host ""
Write-Yellow "[1/3] Starting ML Server..."
Write-Cyan "   Port: $($env:ML_PORT)"
Write-Cyan "   Log: logs/ml-server.log"

$mlPath = Join-Path $PROJECT_DIR "Ian_ML\server.py"
$mlLog = Join-Path $PROJECT_DIR "logs\ml-server.log"

# Start ML server - explicitly set ML_PORT in the command
$mlPort = $env:ML_PORT
$mlCmd = "set ML_PORT=$mlPort && `"$PYTHON`" `"$mlPath`" > `"$mlLog`" 2>&1"
$mlProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $mlCmd -PassThru -WindowStyle Hidden
$script:PROCESSES += $mlProc
Start-Sleep -Seconds 5

# Check if ML server started
$mlRunning = $false
for ($i = 0; $i -lt 8; $i++) {
    if (-not $mlProc.HasExited) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:$($env:ML_PORT)/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $mlRunning = $true
                break
            }
        } catch {}
    }
    Start-Sleep -Seconds 1
}

if (-not $mlRunning) {
    Write-Red "Failed to start ML Server"
    Write-Yellow "Last 10 lines of logs/ml-server.log:"
    Get-Content $mlLog -Tail 10 -ErrorAction SilentlyContinue | Write-Host
    Clear-AllProcesses
    exit 1
}
Write-Green "   ML Server running on port $($env:ML_PORT) (PID: $($mlProc.Id))"

# ============================================
# Start Go Backend
# ============================================
Write-Host ""
Write-Yellow "[2/3] Starting Go Backend..."
Write-Cyan "   Port: $($env:PORT)"
Write-Cyan "   Log: logs/backend.log"

# Check if air is available
$USE_AIR = $false
try {
    $airVersion = & air version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $USE_AIR = $true
    }
} catch {}

$backendDir = Join-Path $PROJECT_DIR "backend"
$backendLog = Join-Path $PROJECT_DIR "logs\backend.log"

Push-Location $backendDir
if ($USE_AIR) {
    Write-Green "   Using 'air' for live reloading..."
    Write-Cyan "   Config: .air.toml"
    $backendCmd = "air > `"$backendLog`" 2>&1"
    $backendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $backendCmd -PassThru -WindowStyle Hidden
} else {
    Write-Yellow "   Using 'go run' (install air for live reloading)..."
    $backendCmd = "go run .\cmd\server > `"$backendLog`" 2>&1"
    $backendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $backendCmd -PassThru -WindowStyle Hidden
}
Pop-Location

$script:PROCESSES += $backendProc
Start-Sleep -Seconds 5

# Check if backend started
$backendRunning = $false
for ($i = 0; $i -lt 8; $i++) {
    if (-not $backendProc.HasExited) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:$($env:PORT)/api/v1/healthz" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $backendRunning = $true
                break
            }
        } catch {}
    }
    Start-Sleep -Seconds 1
}

if (-not $backendRunning) {
    Write-Red "Failed to start Backend"
    Write-Yellow "Last 10 lines of logs/backend.log:"
    Get-Content $backendLog -Tail 10 -ErrorAction SilentlyContinue | Write-Host
    Clear-AllProcesses
    exit 1
}
Write-Green "   Backend running on port $($env:PORT) (PID: $($backendProc.Id))"

# ============================================
# Start Frontend
# ============================================
Write-Host ""
Write-Yellow "[3/3] Starting Frontend..."
Write-Cyan "   Port: 4000"
Write-Cyan "   Log: logs/frontend.log"

$frontendDir = Join-Path $PROJECT_DIR "frontend"
$frontendLog = Join-Path $PROJECT_DIR "logs\frontend.log"

Push-Location $frontendDir
$frontendCmd = "npm run dev > `"$frontendLog`" 2>&1"
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $frontendCmd -PassThru -WindowStyle Hidden
Pop-Location

$script:PROCESSES += $frontendProc
Start-Sleep -Seconds 5

Write-Green "   Frontend starting on port 4000 (PID: $($frontendProc.Id))"

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Green "All services started!"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:"
Write-Cyan "  ML Server:  http://localhost:$($env:ML_PORT)/health"
Write-Cyan "  Backend:    http://localhost:$($env:PORT)/api/v1/healthz"
Write-Cyan "  Frontend:   http://localhost:4000"
Write-Host ""
Write-Host "Logs:"
Write-Cyan "  ML Server:  logs/ml-server.log"
Write-Cyan "  Backend:    logs/backend.log"
Write-Cyan "  Frontend:   logs/frontend.log"
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Keep running and monitor processes
try {
    while ($true) {
        Start-Sleep -Seconds 2
        
        # Check if processes died
        if ($mlProc.HasExited) {
            Write-Red "ML Server stopped unexpectedly!"
            Clear-AllProcesses
            break
        }
        if ($backendProc.HasExited) {
            Write-Red "Backend stopped unexpectedly!"
            Clear-AllProcesses
            break
        }
    }
} finally {
    Clear-AllProcesses
}
