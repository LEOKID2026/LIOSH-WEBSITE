@echo off

setlocal EnableExtensions EnableDelayedExpansion

REM Runs on 3002 so it never fights with "npm run dev" on 3001.

cd /d "%~dp0"



set "PORT=3002"

set "URL=http://127.0.0.1:%PORT%"



echo Starting MLEO website (port %PORT%)...

echo Open in browser: %URL%

echo.

echo [INFO] Stopping any existing Node process on port %PORT% so code changes are picked up.

echo [INFO] For a forced full cold restart, use scripts\dev\restart-local-3002-clean.bat

echo [INFO] For a production build locally, use scripts\dev\restart-local-3002.bat

echo [WARN] Close localhost:%PORT% tabs if startup fails with ENOENT / MODULE_NOT_FOUND.

echo.



call :FreePortNode %PORT%



node scripts\dev\start-dev-3002.mjs

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

    taskkill /PID %%a /T /F >nul 2>&1

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

  timeout /t 2 /nobreak >nul

  echo [OK] Port %P% cleared — starting fresh dev server.

) else (

  echo [OK] Port %P% was free — starting dev server.

)

exit /b 0

