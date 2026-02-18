@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: DIANA V2 - Start All Services (Windows Batch)
:: Starts: ML Server, Go Backend, Frontend

echo ============================================================
echo DIANA V2 - Starting All Services
echo ============================================================

set "PROJECT_DIR=%~dp0\..\.."
cd /d "%PROJECT_DIR%"

:: Create logs directory
if not exist "logs" mkdir logs

:: Detect Python
set "PYTHON="
if exist "venv\Scripts\python.exe" (
    set "PYTHON=venv\Scripts\python.exe"
    echo Using virtual environment (venv\Scripts)
    goto :python_found
)
if exist "venv\bin\python.exe" (
    set "PYTHON=venv\bin\python.exe"
    echo Using virtual environment (venv\bin)
    goto :python_found
)
where python >nul 2>&1 && (
    set "PYTHON=python"
    goto :python_found
)
where python3 >nul 2>&1 && (
    set "PYTHON=python3"
    goto :python_found
)

echo Error: Python not found. Please install Python 3.10+
exit /b 1

:python_found

:: Check ML models
if not exist "models\clinical_v2\random_forest.joblib" (
    if not exist "models\clinical_v2\xgboost.joblib" (
        if not exist "models\clinical_v2\best_model.joblib" (
            echo ML models not found. Run 'bash scripts/dev/retrain-all.sh' first.
            exit /b 1
        )
    )
)

:: Load environment
if exist ".env" (
    for /f "usebackq delims=" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            for /f "tokens=1,2 delims==" %%b in ("%%a") do (
                set "%%b=%%c"
            )
        )
    )
    if not exist "backend\.env" (
        copy ".env" "backend\.env" >nul
    )
)

:: Set default ports
if not defined ML_PORT set "ML_PORT=5001"
if not defined PORT set "PORT=8080"
set "MODEL_URL=http://localhost:%ML_PORT%/predict"

:: Kill processes on ports
echo Checking ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%ML_PORT%.*LISTENING" 2^>nul') do (
    echo Killing process %%a on port %ML_PORT%
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%.*LISTENING" 2^>nul') do (
    echo Killing process %%a on port %PORT%
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000.*LISTENING" 2^>nul') do (
    echo Killing process %%a on port 4000
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo.
echo [1/3] Starting ML Server...
echo    Port: %ML_PORT%
echo    Log: logs/ml-server.log
start "ML Server" /MIN cmd /c ""%PYTHON%" "Ian_ML\server.py" ^> logs\ml-server.log 2^>^&1"
timeout /t 4 /nobreak >nul
echo    ML Server starting...

echo.
echo [2/3] Starting Go Backend...
echo    Port: %PORT%
echo    Log: logs/backend.log
cd backend

:: Check if air is available
where air >nul 2>&1
if %errorlevel% == 0 (
    echo    Using 'air' for live reloading...
    echo    Config: .air.toml
    start "Backend" /MIN cmd /c "air ^> ..\logs\backend.log 2^>^&1"
) else (
    echo    Using 'go run' (install air for live reloading)...
    start "Backend" /MIN cmd /c "go run .\cmd\server ^> ..\logs\backend.log 2^>^&1"
)
cd ..
timeout /t 4 /nobreak >nul
echo    Backend starting...

echo.
echo [3/3] Starting Frontend...
echo    Port: 4000
echo    Log: logs/frontend.log
cd frontend
start "Frontend" /MIN cmd /c "npm run dev ^> ..\logs\frontend.log 2^>^&1"
cd ..
timeout /t 4 /nobreak >nul
echo    Frontend starting...

echo.
echo ============================================================
echo All services started!
echo ============================================================
echo.
echo Services:
echo   ML Server:  http://localhost:%ML_PORT%/health
echo   Backend:    http://localhost:%PORT%/api/v1/healthz
echo   Frontend:   http://localhost:4000
echo.
echo Logs:
echo   ML Server:  logs/ml-server.log
echo   Backend:    logs/backend.log
echo   Frontend:   logs/frontend.log
echo.
echo Press Ctrl+C to stop all services
echo.
echo To stop, run: taskkill /F /IM python.exe /IM python3.exe /IM go.exe /IM npm.cmd /IM node.exe 2^>nul
echo.

:: Keep script running
:waitloop
timeout /t 5 /nobreak >nul
goto waitloop
