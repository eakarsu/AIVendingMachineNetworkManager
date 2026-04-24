#!/bin/bash

# ============================================
# AI Vending Machine Network Manager - Startup
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════╗"
echo "║   AI Vending Machine Network Manager         ║"
echo "║   Starting Application...                    ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Clean used ports ----
echo -e "${YELLOW}[1/6] Cleaning up ports 3000 and 3001...${NC}"
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  ${RED}Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "  ${GREEN}Port $port is free${NC}"
  fi
}
kill_port 3000
kill_port 3001

# ---- Check PostgreSQL ----
echo -e "\n${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "  ${GREEN}PostgreSQL is running${NC}"
  else
    echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
    if ! pg_isready -q 2>/dev/null; then
      echo -e "  ${RED}PostgreSQL is not running. Please start it manually.${NC}"
      exit 1
    fi
  fi
else
  echo -e "  ${YELLOW}pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ---- Create database if needed ----
echo -e "\n${YELLOW}[3/6] Setting up database...${NC}"

# Load env vars
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | grep -v '^$' | xargs)
fi

DB_NAME="${DB_NAME:-vending_network}"
DB_USER="${DB_USER:-postgres}"

# Try to create database (ignore if exists)
createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null && echo -e "  ${GREEN}Database '$DB_NAME' created${NC}" || echo -e "  ${GREEN}Database '$DB_NAME' already exists${NC}"

# ---- Install dependencies ----
echo -e "\n${YELLOW}[4/6] Installing dependencies...${NC}"
cd "$PROJECT_DIR/backend" && npm install --silent 2>&1 | tail -1
echo -e "  ${GREEN}Backend dependencies installed${NC}"
cd "$PROJECT_DIR/frontend" && npm install --silent 2>&1 | tail -1
echo -e "  ${GREEN}Frontend dependencies installed${NC}"

# ---- Seed database ----
echo -e "\n${YELLOW}[5/6] Seeding database...${NC}"
cd "$PROJECT_DIR/backend" && node src/seed.js

# ---- Start services ----
echo -e "\n${YELLOW}[6/6] Starting services with hot reload...${NC}"

# Start backend with nodemon (hot reload)
cd "$PROJECT_DIR/backend"
npx nodemon src/server.js &
BACKEND_PID=$!
echo -e "  ${GREEN}Backend starting on http://localhost:${BACKEND_PORT:-3001} (PID: $BACKEND_PID)${NC}"

# Wait for backend
sleep 2

# Start frontend with Vite (hot reload built-in)
cd "$PROJECT_DIR/frontend"
npx vite --port ${FRONTEND_PORT:-3000} &
FRONTEND_PID=$!
echo -e "  ${GREEN}Frontend starting on http://localhost:${FRONTEND_PORT:-3000} (PID: $FRONTEND_PID)${NC}"

echo -e "\n${PURPLE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}  ${GREEN}Application is running!${NC}                      ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                              ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${CYAN}Frontend:${NC} http://localhost:${FRONTEND_PORT:-3000}           ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${CYAN}Backend:${NC}  http://localhost:${BACKEND_PORT:-3001}            ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                              ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${YELLOW}Login:${NC} admin@vendingnet.com / admin123       ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${YELLOW}Quick:${NC} Click 'Quick Login' button             ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                              ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${BLUE}Hot reload is enabled for both services${NC}      ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${RED}Press Ctrl+C to stop${NC}                        ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}Done.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
