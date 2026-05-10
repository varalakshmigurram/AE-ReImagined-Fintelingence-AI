#!/bin/bash

# AE Rule Engine - Start Script
# Starts both backend and frontend servers

set -e

echo "🚀 Starting AE Rule Engine..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v java &> /dev/null; then
    echo "${YELLOW}❌ Java not found. Please install Java 17+${NC}"
    exit 1
fi
echo "${GREEN}✅ Java found: $(java -version 2>&1 | head -1)${NC}"

if ! command -v node &> /dev/null; then
    echo "${YELLOW}❌ Node.js not found. Please install Node.js 16+${NC}"
    exit 1
fi
echo "${GREEN}✅ Node.js found: $(node -v)${NC}"

echo ""

# Start Backend
echo "${BLUE}🔧 Starting Backend (Spring Boot)...${NC}"
cd Rule-Engine

# Check if Maven wrapper exists
if [ ! -f "mvnw" ]; then
    echo "${YELLOW}⚠️  Maven wrapper not found. Using system Maven...${NC}"
    mvn clean install > /dev/null 2>&1 &
else
    ./mvnw clean install > /dev/null 2>&1 &
fi

BACKEND_PID=$!
echo "${GREEN}✅ Backend starting (PID: $BACKEND_PID)${NC}"

# Wait for backend to start
echo "${YELLOW}⏳ Waiting for backend to start on port 8080...${NC}"
sleep 10

# Check if backend is running
if ! curl -s http://localhost:8080/api/dashboard/stats > /dev/null 2>&1; then
    echo "${YELLOW}⚠️  Backend may still be starting, continuing anyway...${NC}"
fi

cd ..

# Start Frontend
echo ""
echo "${BLUE}⚛️  Starting Frontend (React + Vite)...${NC}"
cd UI_UX

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}📦 Installing npm dependencies...${NC}"
    npm install > /dev/null 2>&1
fi

npm run dev &
FRONTEND_PID=$!
echo "${GREEN}✅ Frontend starting (PID: $FRONTEND_PID)${NC}"

cd ..

echo ""
echo "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo "${GREEN}🎉 AE Rule Engine Started Successfully!${NC}"
echo "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "${BLUE}📍 URLs:${NC}"
echo "   Backend:  ${BLUE}http://localhost:8080${NC}"
echo "   Frontend: ${BLUE}http://localhost:5173${NC}"
echo "   H2 DB:    ${BLUE}http://localhost:8080/h2-console${NC}"
echo ""
echo "${YELLOW}💡 Tips:${NC}"
echo "   • Open http://localhost:5173 in your browser"
echo "   • Check browser console (F12) for errors"
echo "   • Backend logs: Rule-Engine/target/logs/"
echo "   • Frontend logs: Terminal output"
echo ""
echo "${YELLOW}🛑 To stop:${NC}"
echo "   Press Ctrl+C in this terminal"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
