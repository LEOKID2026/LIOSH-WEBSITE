@echo off
setlocal EnableExtensions
REM Runs on 3002 so it never fights with "npm run dev" on 3001.
REM Always stops any existing Node listener on this port before starting — never reuses a stale server.
cd /d "%~dp0"

set "PORT=3002"
set "URL=http://127.0.0.1:%PORT%"

echo Starting MLEO website (port %PORT%)...
echo Open in browser: %URL%
echo.
echo [INFO] Stopping any existing Node process on port %PORT% so code changes are picked up.
echo [INFO] If you need a production build instead of dev, use scripts\dev\restart-local-3002.bat
echo.

call :FreePortNode %PORT%

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
    echo Close that program or change the port in run.bat / package.json.
    pause
    exit /b 1
  )
  echo [INFO] Stopping old Node process on port %P% ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)
if "%FOUND%"=="1" (
  timeout /t 2 /nobreak >nul
  echo [OK] Port %P% cleared — starting fresh dev server.
) else (
  echo [OK] Port %P% was free — starting dev server.
)
exit /b 0
