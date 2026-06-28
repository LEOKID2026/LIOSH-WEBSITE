@echo off
setlocal EnableExtensions
REM Local dev launcher - same behavior as run.bat (port 3002, fresh dev server).
REM Does NOT deploy or touch Production.
cd /d "%~dp0"

set "PORT=3002"
set "URL=http://127.0.0.1:%PORT%"

title LIOSH-WEBSITE - Start Local Dev

echo.
echo ================================
echo LIOSH-WEBSITE - Start Local Dev
echo ================================
echo.
echo Port:   %PORT%
echo Open:   %URL%
echo.
echo [INFO] Stopping any existing Node process on port %PORT% so code changes are picked up.
echo [INFO] Standard QA dev uses port 3001 ^(npm run dev^). This script uses 3002 like run.bat.
echo [INFO] For a clean production build locally, use scripts\dev\restart-local-3002.bat
echo.

call :FreePortNode %PORT%

if not exist "node_modules\.bin\next.cmd" (
  echo [INFO] Dependencies missing - running npm ci ^(first time or after pull^)...
  echo.
  call npm ci
  if errorlevel 1 (
    echo [ERROR] npm ci failed. Close other Node windows and try again.
    pause
    exit /b 1
  )
  echo.
)

call npm run dev:run-button
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
    echo Close that program or change the port in start-local.bat / package.json.
    pause
    exit /b 1
  )
  echo [INFO] Stopping old Node process on port %P% ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)
if "%FOUND%"=="1" (
  timeout /t 2 /nobreak >nul
  echo [OK] Port %P% cleared - starting fresh dev server.
) else (
  echo [OK] Port %P% was free - starting dev server.
)
exit /b 0
