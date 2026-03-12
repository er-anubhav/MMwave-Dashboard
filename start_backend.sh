#!/bin/bash
# Linux/Mac startup script for MMWave Dashboard (SQLite Edition)

echo ""
echo "========================================"
echo "MMWave Dashboard - Quick Start"
echo "========================================"
echo ""

echo "[1/2] Installing backend dependencies..."
cd backend
pip install -q -r requirements_sqlite.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install backend dependencies"
    exit 1
fi

echo ""
echo "[2/2] Starting simulated backend..."
echo ""
echo "Backend will start at: http://localhost:8000"
echo "API Docs will be at: http://localhost:8000/docs"
echo ""
echo "Simulated Device ID: SIM_ABC123"
echo ""
echo "========================================"
echo "Please start frontend in another terminal:"
echo "  cd frontend"
echo "  npm install"
echo "  npm start"
echo "========================================"
echo ""

python3 simulated_backend.py
