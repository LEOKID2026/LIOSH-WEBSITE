@echo off

chcp 65001 >nul

setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"



set "NODE=C:\Program Files\nodejs\node.exe"

set "PREFERRED_PORT=3200"



echo.

echo ============================================================

echo   FINAL SUBJECT SIMULATION (7 subjects incl. history)

echo   Server: next start production (.next-final-subject-sim, no HMR)

echo   Display levels: regular/advanced (science regular-only)

echo   Port range: 3200-3210 (default %PREFERRED_PORT%)

echo   Does NOT use dev ports 3000-3003

echo   Logs: reports\simulations\final-subjects-YYYY-MM-DD-HH-mm\

echo ============================================================

echo.



if not exist "%NODE%" (

  echo [ERROR] Node not found: %NODE%

  goto :fail

)

if not exist ".env.local" (

  echo [ERROR] Missing .env.local

  goto :fail

)

echo [INFO] Launching simulation (server + browser checks)...

echo [INFO] Window stays open at the end so you can read PASS/FAIL.

echo.



"%NODE%" --env-file=.env.local scripts/qa/run-final-subject-simulation.mjs



set EXITCODE=%ERRORLEVEL%

echo.

if %EXITCODE% EQU 0 (

  echo [DONE] ALL SUBJECTS PASS — see latest reports\simulations\final-subjects-*\

) else (

  echo [DONE] FAILURES FOUND exit=%EXITCODE% — see failures.json in report folder

)

echo.

pause

exit /b %EXITCODE%



:fail

echo.

pause

exit /b 1

