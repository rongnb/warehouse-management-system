@echo off
REM ========================================
REM  Warehouse Management System - Dev Mode
REM  Starts both backend (with nodemon hot-reload) and frontend (Vite)
REM ========================================
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

REM --- Dependency checks ---
if not exist backend\node_modules (
    echo [X] Backend dependencies not installed. Run install.bat first.
    pause
    exit /b 1
)
if not exist frontend\node_modules (
    echo [X] Frontend dependencies not installed.
    echo     Run: cd frontend ^&^& npm install
    pause
    exit /b 1
)

REM --- Initialize database if needed ---
if not exist data\warehouse.db (
    echo [i] Initializing database...
    pushd backend
    call node db\init.js
    if errorlevel 1 (
        echo [X] Database initialization failed.
        popd
        pause
        exit /b 1
    )
    popd
)

REM --- Backend status check (system-aware, not just port binding) ---
node "%PROJECT_DIR%backend\wms-control.js" status --port 3000
set "BSTATUS=%ERRORLEVEL%"
if "%BSTATUS%"=="0" (
    echo [i] WMS backend already running on port 3000. Skip backend startup.
    set "BACKEND_SKIP=1"
)
if "%BSTATUS%"=="2" (
    echo     Free port 3000 ^(or change PORT in backend\.env^) and try again.
    pause
    exit /b 1
)

REM --- Frontend status check ---
node "%PROJECT_DIR%backend\wms-control.js" status --port 5173 >nul 2>&1
set "FSTATUS=%ERRORLEVEL%"
if "%FSTATUS%"=="0" (
    echo [i] Frontend already running on port 5173. Skip frontend startup.
    set "FRONTEND_SKIP=1"
)
if "%FSTATUS%"=="2" (
    echo [X] Port 5173 already in use by another process. Close it first.
    pause
    exit /b 1
)

echo.
echo ======================================
echo   Dev Mode - Hot-reload enabled
echo ======================================
echo.

if defined BACKEND_SKIP goto :backend_ready
echo [1] Starting backend  (port 3000, nodemon hot-reload)...
start "WMS-Backend" cmd /k "cd /d "%PROJECT_DIR%backend" && npx nodemon "%PROJECT_DIR%backend\server.js""
echo [i] Waiting for backend to be ready (nodemon may take a moment)...
node "%PROJECT_DIR%backend\wms-control.js" wait-up --port 3000 --timeout 60
if errorlevel 1 (
    echo [X] Backend timed out. Check the WMS-Backend window for errors.
    pause
    exit /b 1
)
:backend_ready
echo [OK] Backend ready   http://localhost:3000

if defined FRONTEND_SKIP goto :frontend_ready
echo [2] Starting frontend (port 5173, Vite dev server)...
start "WMS-Frontend" cmd /k "cd /d "%PROJECT_DIR%frontend" && npx vite"
echo [i] Waiting for frontend to be ready...
set "TRIES=0"
:wait_frontend
node "%PROJECT_DIR%backend\wms-control.js" status --port 5173 >nul 2>&1
if not errorlevel 1 goto :frontend_ready
set /a TRIES+=1
if %TRIES% GEQ 60 (
    echo [X] Frontend timed out. Check the WMS-Frontend window for errors.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto :wait_frontend
:frontend_ready
echo [OK] Frontend ready  http://localhost:5173

echo.
echo ======================================
echo   Dev mode is running:
echo     Backend  : http://localhost:3000   (nodemon hot-reload)
echo     Frontend : http://localhost:5173   (Vite HMR)
echo ======================================
echo.
echo Edit files in backend\ or frontend\ - changes auto-reload.
echo Close the WMS-Backend / WMS-Frontend windows to stop, or run stop.bat.
endlocal
pause
