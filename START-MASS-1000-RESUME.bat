@echo off
chcp 65001 >nul
setlocal EnableExtensions

REM === Project root = folder where THIS file lives ===
cd /d "%~dp0"

set "NODE=C:\Program Files\nodejs\node.exe"
set "RUN_ID=mass-2026-06-28T06-22-20"

echo.
echo ============================================================
echo   START MASS 1000 RESUME
echo   Folder: %CD%
echo   runId:  %RUN_ID%
echo ============================================================
echo.

if not exist "%NODE%" (
  echo [ERROR] Node not found at:
  echo   %NODE%
  echo Install Node.js from https://nodejs.org
  goto :fail
)

if not exist ".env.local" (
  echo [ERROR] Missing file: %CD%\.env.local
  goto :fail
)

if not exist "reports\mass-simulation\%RUN_ID%\manifest.json" (
  echo [ERROR] Missing manifest for runId %RUN_ID%
  goto :fail
)

set ALLOW_PRODUCTION_WRITE=true
set CONFIRM_PROJECT_REF=ajxwmlwbzxwffrtlfuoe
set CONFIRM_OPERATION=mass virtual students QA seed

echo [OK] Node: %NODE%
echo [OK] .env.local found
echo [OK] manifest found
echo.
echo Starting in 3 seconds... DO NOT CLOSE THIS WINDOW (~13-15 hours)
timeout /t 3 /nobreak >nul
echo.

"%NODE%" --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs --runId=%RUN_ID% --resume --students=1000 --parents=50 --days=30 --minutesPerDay=30 --password=747975 --subjects=math,geometry,hebrew,english,science --grades=g1,g2,g3,g4,g5,g6 --mode=staging --timestampStamping=1 --progress-every=25 --write

set EXITCODE=%ERRORLEVEL%
echo.
if %EXITCODE% NEQ 0 (
  echo [FAILED] exit code %EXITCODE%
) else (
  echo [DONE] exit code 0
)
goto :end

:fail
set EXITCODE=1

:end
echo.
echo Press any key to close...
pause >nul
exit /b %EXITCODE%
