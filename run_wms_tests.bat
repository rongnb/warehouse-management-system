@echo off
REM Test runner for WMS control script
setlocal enabledelayedexpansion

echo.
echo === WMS CONTROL SCRIPT TEST SUITE ===
echo.

REM STEP 1: Clean temp files
echo === STEP 1: Cleaning up temporary files ===
if exist "start.bat.new" (
    del /f /q "start.bat.new"
    echo [OK] Deleted: start.bat.new
) else (
    echo [i] Not found: start.bat.new
)

if exist "stop.bat.new" (
    del /f /q "stop.bat.new"
    echo [OK] Deleted: stop.bat.new
) else (
    echo [i] Not found: stop.bat.new
)

if exist "dev.bat.new" (
    del /f /q "dev.bat.new"
    echo [OK] Deleted: dev.bat.new
) else (
    echo [i] Not found: dev.bat.new
)
echo.

REM STEP 2: Run without args
echo === STEP 2: Run without args (should show usage, exit 64) ===
node backend\wms-control.js
set "EXIT2=!ERRORLEVEL!"
echo [Exit code: !EXIT2!] (Expected: 64)
echo.

REM STEP 3: Status on port 3000
echo === STEP 3: Status check on port 3000 ===
node backend\wms-control.js status --port 3000
set "EXIT3=!ERRORLEVEL!"
echo [Exit code: !EXIT3!] (Expected: 0, 1, or 2)
echo.

REM STEP 4: Syntax check
echo === STEP 4: Syntax check (node --check) ===
node --check backend\wms-control.js
set "EXIT4=!ERRORLEVEL!"
echo [Exit code: !EXIT4!] (Expected: 0)
echo.

REM STEP 5: Status on free port 65530
echo === STEP 5: Status check on port 65530 (free port) ===
node backend\wms-control.js status --port 65530
set "EXIT5=!ERRORLEVEL!"
echo [Exit code: !EXIT5!] (Expected: 1)
echo.

echo === TEST RESULTS ===
echo Test 2 (no args): Exit code !EXIT2! ^| Expected 64
echo Test 3 (port 3000): Exit code !EXIT3! ^| Expected 0/1/2
echo Test 4 (syntax): Exit code !EXIT4! ^| Expected 0
echo Test 5 (port 65530): Exit code !EXIT5! ^| Expected 1
echo.

endlocal
