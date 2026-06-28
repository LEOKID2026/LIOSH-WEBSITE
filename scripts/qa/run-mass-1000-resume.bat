@echo off
setlocal EnableExtensions
cd /d "%~dp0\..\.."

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] node not found in PATH.
  echo Open cmd and run: node --version
  echo If missing - install Node.js or use the same cmd where node works.
  echo.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo [ERROR] Missing .env.local in project root.
  pause
  exit /b 1
)

if not exist "reports\mass-simulation\mass-2026-06-28T06-22-20\manifest.json" (
  echo [ERROR] Missing manifest for runId mass-2026-06-28T06-22-20
  pause
  exit /b 1
)

set ALLOW_PRODUCTION_WRITE=true
set CONFIRM_PROJECT_REF=ajxwmlwbzxwffrtlfuoe
set CONFIRM_OPERATION=mass virtual students QA seed
set RUN_ID=mass-2026-06-28T06-22-20

echo.
echo ============================================================
echo  Mass 1000 RESUME  runId=%RUN_ID%
echo  Project: %CD%
echo  DO NOT CLOSE THIS WINDOW  (~13-15 hours)
echo  Progress lines look like: seed progress 50/1000
echo ============================================================
echo.

node --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs ^
  --runId=%RUN_ID% ^
  --resume ^
  --students=1000 ^
  --parents=50 ^
  --days=30 ^
  --minutesPerDay=30 ^
  --password=747975 ^
  --subjects=math,geometry,hebrew,english,science ^
  --grades=g1,g2,g3,g4,g5,g6 ^
  --mode=staging ^
  --timestampStamping=1 ^
  --progress-every=25 ^
  --write

set EXITCODE=%ERRORLEVEL%
echo.
echo ============================================================
echo  Finished with exit code %EXITCODE%
echo ============================================================
pause
exit /b %EXITCODE%
