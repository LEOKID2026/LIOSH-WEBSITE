@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "NODE=C:\Program Files\nodejs\node.exe"
set "RUN_ID=mass-2026-06-28T06-22-20"
set "LOG=reports\mass-simulation\_logs\mass-1000-verify-%RUN_ID%.log"

if not exist reports\mass-simulation\_logs mkdir reports\mass-simulation\_logs

echo.
echo ============================================================
echo   MASS 1000 VERIFY-ONLY
echo   runId: %RUN_ID%
echo   DO NOT CLOSE (~2-4 hours for 1000 reports)
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
if not exist "reports\mass-simulation\%RUN_ID%\manifest.json" (
  echo [ERROR] Missing manifest.json
  goto :fail
)

set ALLOW_PRODUCTION_WRITE=true
set CONFIRM_PROJECT_REF=ajxwmlwbzxwffrtlfuoe
set CONFIRM_OPERATION=mass virtual students QA verify

echo [%date% %time%] verify-only start runId=%RUN_ID%>> "%LOG%"

"%NODE%" --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs --verify-only --runId=%RUN_ID% --students=1000 --parents=50 --days=30 --minutesPerDay=30 --password=747975 --subjects=math,geometry,hebrew,english,science --grades=g1,g2,g3,g4,g5,g6 --mode=staging --timestampStamping=1 --write

set EXITCODE=%ERRORLEVEL%
echo [%date% %time%] exit=%EXITCODE%>> "%LOG%"

echo.
if %EXITCODE% NEQ 0 (
  echo [FAILED] exit code %EXITCODE%
) else (
  echo [DONE] artifacts: reports\mass-simulation\%RUN_ID%\
)
echo.
pause
exit /b %EXITCODE%

:fail
echo.
pause
exit /b 1
