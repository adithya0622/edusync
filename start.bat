@echo off
REM Upgrade - Quick Start Script for Windows
REM This scripts starts both backend and frontend servers

echo.
echo 🚀 Starting Upgrade Application...
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+
    pause
    exit /b 1
)

REM Backend setup
echo.
echo 🔧 Setting up Backend...
cd backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing backend dependencies...
pip install -q -r requirements.txt

echo ✓ Backend ready
echo.

REM Start backend
echo 🔌 Starting FastAPI server...
start "Backend" python app.py
echo ✓ Backend running on http://localhost:8000
echo   📚 API Docs: http://localhost:8000/docs
echo.

REM Frontend setup
echo.
echo 🔧 Setting up Frontend...
cd ..\frontend

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install -q
)

echo ✓ Frontend ready
echo.

REM Start frontend
echo 🌐 Starting React development server...
start "Frontend" cmd /k "npm run dev"
echo ✓ Frontend running on http://localhost:5173
echo.

REM Summary
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✓ Upgrade is running!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📱 Open Browser: http://localhost:5173
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo Note: Two terminal windows will open
echo Close them to stop all services
echo.
pause
