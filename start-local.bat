@echo off
setlocal EnableExtensions EnableDelayedExpansion
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

call :FreePortNode %PORT%
if errorlevel 1 exit /b 1

if not exist "node_modules\.bin\next.cmd" (
  echo [INFO] Dependencies missing - running npm ci...
  call npm ci
  if errorlevel 1 (
    echo [ERROR] npm ci failed.
    pause
    exit /b 1
  )
)

npm run dev:run-button
set "EXITCODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXITCODE%

:FreePortNode
set "P=%~1"
set "FOUND=0"
set "LAST_PID="

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%P%" ^| findstr LISTENING') do (
  if not "%%a"=="!LAST_PID!" (
    set "LAST_PID=%%a"
    set "FOUND=1"
    tasklist /FI "PID eq %%a" 2>nul | findstr /I "node.exe" >nul
    if errorlevel 1 (
      echo [ERROR] Port %P% is used by another program ^(PID %%a^), not Node.
      pause
      exit /b 1
    )
    echo [INFO] Stopping old Node process on port %P% ^(PID %%a^)...
    taskkill /PID %%a /F >nul 2>&1
  )
)

if not "!FOUND!"=="1" (
  echo [OK] Port %P% was free.
  exit /b 0
)

set "WAITED=0"
:WaitPortFree
netstat -ano 2>nul | findstr ":%P%" | findstr LISTENING >nul
if not errorlevel 1 (
  if !WAITED! lss 10 (
    timeout /t 1 /nobreak >nul
    set /a WAITED+=1
    goto WaitPortFree
  )
)
echo [OK] Port %P% cleared.
exit /b 0
