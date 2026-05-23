@echo off
setlocal EnableExtensions
REM Clean rebuild + production server on port 3002 (use after API/route changes).
cd /d "%~dp0\..\.."

set "PORT=3002"
set "URL=http://127.0.0.1:%PORT%"

echo ============================================================
echo  LEO KIDS — safe local restart (port %PORT%)
echo  Removes .next, rebuilds, starts next start -p %PORT%
echo  Do NOT rely on run.bat when testing new API routes — it
echo  previously reused stale servers and caused 404 confusion.
echo ============================================================
echo.

call :FreePortNode %PORT%

if exist .next (
  echo [INFO] Removing stale .next build output...
  rmdir /s /q .next
)

echo [INFO] Running npm run build...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo [INFO] Starting production server on %URL%
echo [INFO] Press Ctrl+C in this window to stop the server.
echo.
start "" "%URL%"
call npx next start -p %PORT%
set "EXITCODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXITCODE%

:FreePortNode
set "P=%~1"
set "FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%P%" ^| findstr LISTENING') do (
  set "FOUND=1"
  tasklist /FI "PID eq %%a" 2>nul | findstr /I "node.exe" >nul
  if errorlevel 1 (
    echo [ERROR] Port %P% is used by another program ^(PID %%a^), not Node.
    echo Close that program first, then re-run this script.
    pause
    exit /b 1
  )
  echo [INFO] Stopping Node on port %P% ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)
if "%FOUND%"=="1" timeout /t 2 /nobreak >nul
exit /b 0
