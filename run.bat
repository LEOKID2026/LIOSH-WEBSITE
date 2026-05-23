@echo off
setlocal EnableExtensions
REM Runs on 3002 so it never fights with "npm run dev" on 3001.
cd /d "%~dp0"

set "PORT=3002"
set "URL=http://127.0.0.1:%PORT%"

echo Starting MLEO website (port %PORT%)...
echo Open in browser: %URL%
echo.

REM Server already up? Reuse it instead of failing with EADDRINUSE.
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo [OK] Server is already running on port %PORT%.
  start "" "%URL%"
  echo.
  pause
  exit /b 0
)

REM Port taken but not responding — stop stale Node listener on this port.
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
  echo [INFO] Port %P% was busy — stopping old Node process ^(PID %%a^)...
  taskkill /PID %%a /F >nul 2>&1
)
if "%FOUND%"=="1" timeout /t 2 /nobreak >nul
exit /b 0
