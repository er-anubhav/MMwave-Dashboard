@echo off
REM Windows startup script for MMWave Dashboard (SQLite Edition)

echo.
echo ========================================
echo MMWave Dashboard - Quick Start
echo ========================================
echo.

echo [1/2] Installing backend dependencies...
cd backend
pip install -q -r requirements_sqlite.txt
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo [2/2] Starting simulated backend...
echo.
echo Backend will start at: http://localhost:8000
echo API Docs will be at: http://localhost:8000/docs
echo.
echo Simulated Device ID: SIM_ABC123
echo.
echo ========================================
echo Please start frontend in another terminal:
echo   cd frontend
echo   npm install
echo   npm start
echo ========================================
echo.

python simulated_backend.py

pause
