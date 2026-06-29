@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "NODE=C:\Program Files\nodejs\node.exe"
set "SUBJECTS=math,geometry,hebrew,english,science,moledet-geography"
set "LOG=reports\mass-simulation\_logs\mass-1000-all-subjects-run.log"

if not exist reports\mass-simulation\_logs mkdir reports\mass-simulation\_logs

echo.
echo ============================================================
echo   MASS 1000 — ALL LAUNCH SUBJECTS (new runId)
echo   subjects: %SUBJECTS%
echo   NOTE: moledet + geography = single key moledet-geography
echo   NOT touching mass-2026-06-28T06-22-20 (closed PASS)
echo   DO NOT CLOSE (~many hours: provision + seed + verify)
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

set ALLOW_PRODUCTION_WRITE=true
set CONFIRM_PROJECT_REF=ajxwmlwbzxwffrtlfuoe
set CONFIRM_OPERATION=mass virtual students QA seed

echo [%date% %time%] all-subjects 1000 start subjects=%SUBJECTS%>> "%LOG%"

"%NODE%" --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs --students=1000 --parents=50 --days=30 --minutesPerDay=30 --password=747975 --subjects=%SUBJECTS% --grades=g1,g2,g3,g4,g5,g6 --mode=staging --timestampStamping=1 --progress-every=25 --write

set EXITCODE=%ERRORLEVEL%
echo [%date% %time%] exit=%EXITCODE%>> "%LOG%"

echo.
if %EXITCODE% NEQ 0 (
  echo [FAILED] exit code %EXITCODE%
  echo Log: %LOG%
  echo Check reports\mass-simulation\ for new runId folder
) else (
  echo [DONE] see latest reports\mass-simulation\mass-*\summary.json
)
echo.
pause
exit /b %EXITCODE%

:fail
echo.
pause
exit /b 1
