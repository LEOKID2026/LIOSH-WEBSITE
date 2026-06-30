@echo off
setlocal EnableExtensions EnableDelayedExpansion
REM Full .next delete + dev server with internal warmup (port 3002).
REM Use when dev cache is corrupted (ENOENT / MODULE_NOT_FOUND on manifests).
cd /d "%~dp0\..\.."

set "PORT=3002"
set "URL=http://127.0.0.1:%PORT%"

echo ============================================================
echo  LEO KIDS — clean DEV restart (port %PORT%)
echo  Removes entire .next, starts next dev, waits for warmup.
echo  For normal daily dev use run.bat instead.
echo ============================================================
echo.

call :FreePortNode %PORT%

if exist .next (
  echo [INFO] Removing entire .next folder...
  node scripts\dev\remove-next-dir.mjs
  if errorlevel 1 (
    echo [ERROR] Could not remove .next — close localhost:%PORT% tabs and retry.
    pause
    exit /b 1
  )
  echo [OK] .next removed.
) else (
  echo [INFO] No .next folder — cold start from scratch.
)

echo.
echo [WARN] Cold start: wait until server is fully warmed before opening browser.
echo [WARN] Avoid opening multiple tabs on localhost during warmup.
echo [WARN] Especially: /learning/book/... , /student/learning , API routes.
echo.

node scripts\dev\start-dev-3002.mjs --open-browser
set "EXITCODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXITCODE%

:FreePortNode
set "P=%~1"
set "FOUND=0"
set "LAST_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%P%" ^| findstr LISTENING') do (
  if not "%%a"=="!LAST_PID!" (
    set "LAST_PID=%%a"
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
)
if "!FOUND!"=="1" (
  set "WAITED=0"
  :WaitPortFree
  netstat -ano 2>nul | findstr ":%P%" | findstr LISTENING >nul
  if not errorlevel 1 (
    if !WAITED! lss 10 (
      timeout /t 1 /nobreak >nul
      set /a WAITED+=1
      goto :WaitPortFree
    )
    echo [WARN] Port %P% still busy after 10s — proceeding anyway.
  )
  echo [OK] Port %P% cleared.
) else (
  echo [OK] Port %P% was free.
)
exit /b 0
