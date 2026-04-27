#!/usr/bin/env bash
# ========================================
#  Warehouse Management System - Dev Mode
#  Starts both backend and frontend
# ========================================
set -e
cd "$(dirname "$0")"

# Check dependencies
if [ ! -d backend/node_modules ]; then
    echo "❌ Backend dependencies not installed. Run ./install.sh first."
    exit 1
fi
if [ ! -d frontend/node_modules ]; then
    echo "❌ Frontend dependencies not installed."
    echo "   Run: cd frontend && npm install"
    exit 1
fi

# Initialize database if needed
if [ ! -f data/warehouse.db ]; then
    echo "📦 Initializing database..."
    (cd backend && node db/init.js)
fi

echo "======================================"
echo "  Dev Mode - Starting services"
echo "======================================"
echo ""

# Start backend
echo "  [1] Backend  (port 3000)..."
(cd backend && npx nodemon server.js) &
BACKEND_PID=$!

# Start frontend
echo "  [2] Frontend (port 5173)..."
(cd frontend && npx vite) &
FRONTEND_PID=$!

echo ""
echo "======================================"
echo "  Both services started:"
echo "    Backend:  http://localhost:3000  (PID $BACKEND_PID)"
echo "    Frontend: http://localhost:5173  (PID $FRONTEND_PID)"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop both."

# Trap Ctrl+C to kill both
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo "Stopped."
}
trap cleanup INT TERM

wait
