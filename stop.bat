@echo off
REM Warehouse Management System - Stop
REM Delegates to backend\wms-control.js for reliable detection and shutdown.
setlocal

set "PROJECT_DIR=%~dp0"

node "%PROJECT_DIR%backend\wms-control.js" stop --port 3000 --also-port 5173
set "RC=%ERRORLEVEL%"

echo.
pause
endlocal & exit /b %RC%
