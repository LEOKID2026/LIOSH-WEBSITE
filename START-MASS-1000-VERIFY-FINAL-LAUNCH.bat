@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "NODE=C:\Program Files\nodejs\node.exe"
set "RUN_ID=mass-2026-06-30T20-32-14"
set "SUBJECTS=math,geometry,hebrew,english,science,moledet-geography,history"
set "LOG=reports\mass-simulation\_logs\mass-1000-verify-final-launch-%RUN_ID%.log"
set "REPORT_DIR=reports\mass-simulation\%RUN_ID%"

if not exist reports\mass-simulation\_logs mkdir reports\mass-simulation\_logs

echo.
echo ============================================================
echo   MASS 1000 VERIFY-ONLY — FINAL LAUNCH (existing runId)
echo   runId: %RUN_ID%
echo   subjects: %SUBJECTS%
echo.
echo   Seed already complete (1000/1000) — DO NOT re-seed.
echo   NO --resume  NO --patch-speed-pressure  NO cleanup
echo   DO NOT CLOSE (~2-4 hours for 1000 report verify)
echo.
echo   On FAILURE: do NOT re-run. Save log + partial artifacts.
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
if not exist "%REPORT_DIR%\manifest.json" (
  echo [ERROR] Missing manifest.json for runId %RUN_ID%
  goto :fail
)
if not exist "%REPORT_DIR%\checkpoint.json" (
  echo [ERROR] Missing checkpoint.json — seed may not have finished
  goto :fail
)

set ALLOW_PRODUCTION_WRITE=true
set CONFIRM_PROJECT_REF=ajxwmlwbzxwffrtlfuoe
set CONFIRM_OPERATION=mass virtual students QA verify

echo [%date% %time%] verify-only final-launch start runId=%RUN_ID% subjects=%SUBJECTS%>> "%LOG%"

"%NODE%" --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs --verify-only --runId=%RUN_ID% --students=1000 --parents=50 --days=30 --minutesPerDay=30 --password=747975 --subjects=%SUBJECTS% --grades=g1,g2,g3,g4,g5,g6 --mode=staging --timestampStamping=1 --write

set EXITCODE=%ERRORLEVEL%
echo [%date% %time%] exit=%EXITCODE%>> "%LOG%"

echo.
if %EXITCODE% NEQ 0 (
  echo [VERIFY FAILED] exit code %EXITCODE%
  echo.
  echo DO NOT re-run automatically. Inspect:
  echo   Log: %LOG%
  echo   Dir: %REPORT_DIR%\
  echo   Partial: summary.json summary.md errors.json (if present^)
) else (
  echo [VERIFY DONE] artifacts: %REPORT_DIR%\
  echo.
  echo Expected console tail:
  echo   verify progress 1000/1000
  echo   infrastructure=PASS engineCoverage=PASS final=PASS
  echo.
  echo Check summary.json:
  echo   reportsGenerated / reportsFailed / blockers / missingDecisions
  echo   decisionsSeen (all 7 engine decisions incl. speed_pressure_pattern^)
  echo   englishIssues=0 technicalIssues=0
  echo   history + moledet-geography in coverage
  echo   coverage-level.csv: regular+advanced per subject, science regular only
  echo.
  echo Files: summary.json summary.md coverage.csv coverage-level.csv engine-findings.csv
)
echo.
pause
exit /b %EXITCODE%

:fail
echo.
pause
exit /b 1
