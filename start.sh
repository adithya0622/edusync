#!/bin/bash

# Upgrade - Quick Start Script
# This script starts both backend and frontend servers

echo "🚀 Starting Upgrade Application..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

echo -e "${BLUE}Setting up Backend...${NC}"

# Backend setup
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate venv (platform-specific)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

echo "Installing backend dependencies..."
pip install -q -r requirements.txt

echo -e "${GREEN}✓ Backend ready${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}Starting FastAPI server...${NC}"
python app.py &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"
echo "   📍 API: http://localhost:8000"
echo "   📚 Docs: http://localhost:8000/docs"
echo ""

# Frontend setup
echo -e "${BLUE}Setting up Frontend...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install -q
fi

echo -e "${GREEN}✓ Frontend ready${NC}"
echo ""

# Start frontend
echo -e "${BLUE}Starting React development server...${NC}"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend running (PID: $FRONTEND_PID)${NC}"
echo "   🌐 App: http://localhost:5173"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Upgrade is running!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Open: http://localhost:5173"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
