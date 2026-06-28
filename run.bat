@echo off
setlocal EnableExtensions EnableDelayedExpansion
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

call :PrepareDevNextCache

call npm run dev:run-button
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
      echo Close that program or change the port in run.bat / package.json.
      pause
      exit /b 1
    )
    echo [INFO] Stopping old Node process on port %P% ^(PID %%a^)...
    taskkill /PID %%a /F >nul 2>&1
  )
)
if "!FOUND!"=="1" (
  timeout /t 3 /nobreak >nul
  echo [OK] Port %P% cleared — starting fresh dev server.
) else (
  echo [OK] Port %P% was free — starting dev server.
)
exit /b 0

:PrepareDevNextCache
if not exist .next goto :CleanWebpackCacheOnly
if not exist .next\routes-manifest.json goto :RemoveFullNext
if not exist .next\required-server-files.json goto :RemoveFullNext
goto :CleanWebpackCacheOnly

:RemoveFullNext
echo [INFO] Broken .next build detected — removing full .next folder...
rmdir /s /q .next 2>nul
exit /b 0

:CleanWebpackCacheOnly
if exist .next\cache (
  echo [INFO] Clearing .next\cache before dev start ^(prevents Windows webpack corruption^)...
  rmdir /s /q .next\cache 2>nul
)
exit /b 0
